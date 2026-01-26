import { Readable, PassThrough } from 'stream';
import { spawn, ChildProcess } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

interface CobaltResponse {
  status: 'stream' | 'redirect' | 'picker' | 'error';
  url?: string;
  urls?: string[];
  text?: string;
  error?: {
    code: string;
  };
}

interface AudioResult {
  url: string;
  source: string;
}

interface AudioStreamResult {
  stream: Readable;
  cleanup: () => void;
}

const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt-api.hyper.lol',
  'https://cobalt.api.timelessnesses.me',
  'https://api.cobalt.lol',
];

const REQUEST_TIMEOUT = 15000;
const FAILURE_COOLDOWN = 60000;

interface InstanceStats {
  failures: number;
  lastFailure: number;
  lastSuccess: number;
}

const instanceStats: Map<string, InstanceStats> = new Map();

function getStats(instance: string): InstanceStats {
  if (!instanceStats.has(instance)) {
    instanceStats.set(instance, { failures: 0, lastFailure: 0, lastSuccess: 0 });
  }
  return instanceStats.get(instance)!;
}

function sortInstancesByReliability(): string[] {
  const now = Date.now();
  return [...COBALT_INSTANCES].sort((a, b) => {
    const statsA = getStats(a);
    const statsB = getStats(b);
    
    const cooledA = now - statsA.lastFailure > FAILURE_COOLDOWN;
    const cooledB = now - statsB.lastFailure > FAILURE_COOLDOWN;
    
    if (cooledA && !cooledB) return -1;
    if (!cooledA && cooledB) return 1;
    
    if (statsA.failures !== statsB.failures) {
      return statsA.failures - statsB.failures;
    }
    
    return statsB.lastSuccess - statsA.lastSuccess;
  });
}

function recordFailure(instance: string): void {
  const stats = getStats(instance);
  stats.failures = Math.min(stats.failures + 1, 10);
  stats.lastFailure = Date.now();
}

function recordSuccess(instance: string): void {
  const stats = getStats(instance);
  stats.failures = Math.max(0, stats.failures - 1);
  stats.lastSuccess = Date.now();
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getAudioUrl(videoUrl: string, retryCount: number = 0): Promise<AudioResult | null> {
  const errors: string[] = [];
  const sortedInstances = sortInstancesByReliability();
  
  for (const instance of sortedInstances) {
    for (let retry = 0; retry <= retryCount; retry++) {
      if (retry > 0) {
        console.log(`[Cobalt] Reintento ${retry} con ${instance}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retry));
      }
      
      try {
        console.log(`[Cobalt] Intentando con instancia: ${instance}`);
        
        const response = await fetchWithTimeout(instance, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: videoUrl,
            audioFormat: 'opus',
            isAudioOnly: true,
            aFormat: 'opus',
            filenameStyle: 'basic',
          }),
        }, REQUEST_TIMEOUT);
        
        if (!response.ok) {
          console.log(`[Cobalt] Instancia ${instance} respondió con status ${response.status}`);
          errors.push(`${instance}: HTTP ${response.status}`);
          
          if (response.status >= 500) {
            recordFailure(instance);
            continue;
          }
          recordFailure(instance);
          break;
        }
        
        const data: CobaltResponse = await response.json();
        
        if (data.status === 'error') {
          console.log(`[Cobalt] Error de instancia ${instance}:`, data.error?.code || data.text);
          errors.push(`${instance}: ${data.error?.code || data.text}`);
          recordFailure(instance);
          break;
        }
        
        if (data.status === 'stream' || data.status === 'redirect') {
          if (data.url) {
            const isValid = await validateAudioUrl(data.url);
            if (!isValid) {
              console.log(`[Cobalt] URL de audio inválida o expirada de ${instance}`);
              errors.push(`${instance}: URL inválida`);
              recordFailure(instance);
              continue;
            }
            
            console.log(`[Cobalt] URL de audio obtenida exitosamente de ${instance}`);
            recordSuccess(instance);
            return {
              url: data.url,
              source: instance,
            };
          }
        }
        
        if (data.status === 'picker' && data.urls && data.urls.length > 0) {
          const validUrl = data.urls[0];
          const isValid = await validateAudioUrl(validUrl);
          if (!isValid) {
            console.log(`[Cobalt] URL picker inválida de ${instance}`);
            errors.push(`${instance}: URL picker inválida`);
            recordFailure(instance);
            continue;
          }
          
          console.log(`[Cobalt] Picker response, usando primera URL de ${instance}`);
          recordSuccess(instance);
          return {
            url: validUrl,
            source: instance,
          };
        }
        
        errors.push(`${instance}: Respuesta inesperada - ${data.status}`);
        recordFailure(instance);
        break;
        
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log(`[Cobalt] Timeout con ${instance}`);
          errors.push(`${instance}: Timeout`);
        } else {
          console.log(`[Cobalt] Error de conexión con ${instance}:`, error.message);
          errors.push(`${instance}: ${error.message}`);
        }
        recordFailure(instance);
      }
    }
  }
  
  console.error('[Cobalt] Todas las instancias fallaron:', errors);
  return null;
}

async function validateAudioUrl(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    }, 5000);
    
    return response.ok;
  } catch {
    return false;
  }
}

let activeProcesses: Set<ChildProcess> = new Set();

export async function getAudioStream(audioUrl: string): Promise<AudioStreamResult | null> {
  try {
    if (!ffmpegPath) {
      console.error('[Cobalt] FFmpeg no está disponible');
      return null;
    }
    
    console.log('[Cobalt] Creando stream de audio con FFmpeg...');
    
    const ffmpeg = spawn(ffmpegPath, [
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-i', audioUrl,
      '-analyzeduration', '0',
      '-loglevel', 'error',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1'
    ]);
    
    activeProcesses.add(ffmpeg);
    
    const passthrough = new PassThrough();
    
    ffmpeg.stdout.pipe(passthrough);
    
    ffmpeg.stderr.on('data', (data) => {
      console.error('[FFmpeg]', data.toString());
    });
    
    ffmpeg.on('error', (error) => {
      console.error('[FFmpeg] Error de proceso:', error.message);
      activeProcesses.delete(ffmpeg);
      passthrough.destroy(error);
    });
    
    ffmpeg.on('close', (code) => {
      activeProcesses.delete(ffmpeg);
      if (code !== 0 && code !== null) {
        console.log(`[FFmpeg] Proceso terminó con código ${code}`);
      }
      if (!passthrough.destroyed) {
        passthrough.end();
      }
    });
    
    const cleanup = () => {
      console.log('[Cobalt] Limpiando proceso FFmpeg...');
      if (!ffmpeg.killed) {
        ffmpeg.kill('SIGTERM');
        setTimeout(() => {
          if (!ffmpeg.killed) {
            ffmpeg.kill('SIGKILL');
          }
        }, 1000);
      }
      activeProcesses.delete(ffmpeg);
      if (!passthrough.destroyed) {
        passthrough.destroy();
      }
    };
    
    return {
      stream: passthrough,
      cleanup,
    };
    
  } catch (error: any) {
    console.error('[Cobalt] Error al crear stream:', error.message);
    return null;
  }
}

export function cleanupAllProcesses(): void {
  console.log(`[Cobalt] Limpiando ${activeProcesses.size} procesos activos...`);
  for (const process of activeProcesses) {
    if (!process.killed) {
      process.kill('SIGTERM');
    }
  }
  activeProcesses.clear();
}

export function isValidYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export function isValidSpotifyUrl(url: string): boolean {
  return url.includes('spotify.com');
}

export function isValidSoundCloudUrl(url: string): boolean {
  return url.includes('soundcloud.com');
}

export function isSupportedUrl(url: string): boolean {
  return isValidYouTubeUrl(url) || isValidSpotifyUrl(url) || isValidSoundCloudUrl(url);
}
