/**
 * Sistema de audio para LagMusic - compatible con Render.
 * Múltiples fuentes: Piped, Cobalt, Invidious. Sin play-dl/ytdl/cookies.
 */

import { createRequire } from 'node:module';
import { Readable } from 'stream';
import { spawn, ChildProcess } from 'child_process';
import { PassThrough } from 'stream';

const _require = createRequire(import.meta.url);
let ffmpegPath: string | null = null;
try {
  const p = _require('ffmpeg-static') as string | { default: string };
  ffmpegPath = typeof p === 'string' ? p : (p?.default ?? null);
} catch {
  ffmpegPath = 'ffmpeg';
}

const REQUEST_TIMEOUT = 18000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const activeProcesses = new Set<ChildProcess>();

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.syncpundit.io',
  'https://api-piped.mha.fi',
  'https://pipedapi.rivo.lol',
];

const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt-api.hyper.lol',
  'https://api.cobalt.lol',
  'https://cobalt.api.timelessnesses.me',
];

const INVIDIOUS_INSTANCES = [
  'https://api.invidious.io',
  'https://invidious.flokinet.to',
  'https://invidious.nerdvpn.de',
];

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function normalizeYoutubeUrl(url: string, videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms: number
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  const headers = {
    ...(options.headers && typeof options.headers === 'object'
      ? (options.headers as Record<string, string>)
      : {}),
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };
  try {
    return await fetch(url, {
      ...options,
      signal: ctrl.signal,
      headers,
    });
  } finally {
    clearTimeout(t);
  }
}

const log = (msg: string) => console.log('[Audio]', msg);
const logErr = (msg: string) => console.error('[Audio]', msg);

/** Piped: GET /streams/:videoId → audioStreams[].url */
async function getAudioUrlPiped(
  videoId: string
): Promise<{ url: string; instance: string } | null> {
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetchWithTimeout(
        `${base}/streams/${videoId}`,
        {},
        REQUEST_TIMEOUT
      );
      if (!res.ok) {
        log(`Piped ${base}: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const streams = data?.audioStreams;
      if (!Array.isArray(streams) || streams.length === 0) {
        log(`Piped ${base}: sin audioStreams`);
        continue;
      }
      const withBitrate = streams.filter((s: any) => (s.bitrate ?? 0) > 0);
      const list = withBitrate.length > 0 ? withBitrate : streams;
      const best = list.reduce((a: any, b: any) =>
        (b.bitrate ?? 0) > (a.bitrate ?? 0) ? b : a
      );
      const u = best?.url;
      if (typeof u === 'string' && u) {
        log(`Piped OK: ${base}`);
        return { url: u, instance: base };
      }
    } catch (e: any) {
      log(`Piped ${base}: ${e?.message || String(e)}`);
    }
  }
  return null;
}

/** Cobalt: POST con url de YouTube → tunnel/redirect/stream url */
async function getAudioUrlCobalt(
  videoUrl: string
): Promise<{ url: string; instance: string } | null> {
  const bodyLegacy = {
    url: videoUrl,
    audioFormat: 'opus',
    isAudioOnly: true,
    aFormat: 'opus',
    filenameStyle: 'basic',
  };
  const bodyNew = {
    url: videoUrl,
    audioFormat: 'opus',
    downloadMode: 'audio',
    filenameStyle: 'basic',
  };
  for (const base of COBALT_INSTANCES) {
    for (const body of [bodyNew, bodyLegacy]) {
      try {
        const res = await fetchWithTimeout(
          base,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(body),
          },
          REQUEST_TIMEOUT
        );
        if (!res.ok) {
          log(`Cobalt ${base}: HTTP ${res.status}`);
          break;
        }
        const data = await res.json();
        const status = data?.status;
        const u = data?.url;
        if ((status === 'tunnel' || status === 'stream' || status === 'redirect') && typeof u === 'string' && u) {
          log(`Cobalt OK: ${base} (${status})`);
          return { url: u, instance: base };
        }
        if (status === 'picker' && Array.isArray(data?.urls) && data.urls.length > 0) {
          const pickerUrl = data.urls[0];
          if (typeof pickerUrl === 'string' && pickerUrl) {
            log(`Cobalt OK (picker): ${base}`);
            return { url: pickerUrl, instance: base };
          }
        }
        if (status === 'local-processing' && Array.isArray(data?.tunnel) && data.tunnel?.length > 0) {
          const tunnelUrl = data.tunnel[0];
          if (typeof tunnelUrl === 'string' && tunnelUrl) {
            log(`Cobalt OK (local-processing): ${base}`);
            return { url: tunnelUrl, instance: base };
          }
        }
        log(`Cobalt ${base}: status=${status} error=${data?.error?.code || data?.error?.context || '?'}`);
      } catch (e: any) {
        log(`Cobalt ${base}: ${e?.message || String(e)}`);
      }
    }
  }
  return null;
}

/** Invidious: GET /api/v1/videos/:id → adaptiveFormats (audio-only con url) */
async function getAudioUrlInvidious(
  videoId: string
): Promise<{ url: string; instance: string } | null> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetchWithTimeout(
        `${base}/api/v1/videos/${videoId}`,
        {},
        REQUEST_TIMEOUT
      );
      if (!res.ok) {
        log(`Invidious ${base}: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const formats = data?.adaptiveFormats;
      if (!Array.isArray(formats)) {
        log(`Invidious ${base}: sin adaptiveFormats`);
        continue;
      }
      const audio = formats.filter(
        (f: any) =>
          typeof f?.url === 'string' &&
          String(f?.type || '').startsWith('audio/')
      );
      if (audio.length === 0) {
        log(`Invidious ${base}: sin formatos audio con url`);
        continue;
      }
      const best = audio.reduce((a: any, b: any) => {
        const ba = parseInt(String(b.bitrate || '0'), 10) || 0;
        const aa = parseInt(String(a.bitrate || '0'), 10) || 0;
        return ba > aa ? b : a;
      });
      let u = best?.url;
      if (typeof u === 'string' && u) {
        if (u.startsWith('//')) u = `https:${u}`;
        else if (u.startsWith('/')) u = `${base.replace(/\/$/, '')}${u}`;
        log(`Invidious OK: ${base}`);
        return { url: u, instance: base };
      }
    } catch (e: any) {
      log(`Invidious ${base}: ${e?.message || String(e)}`);
    }
  }
  return null;
}

export interface AudioStreamResult {
  stream: Readable;
  cleanup: () => void;
}

function createFfmpegStream(audioUrl: string): AudioStreamResult | null {
  if (!ffmpegPath) {
    logErr('FFmpeg no disponible');
    return null;
  }
  const ff = spawn(ffmpegPath, [
    '-reconnect',
    '1',
    '-reconnect_streamed',
    '1',
    '-reconnect_delay_max',
    '5',
    '-user_agent',
    USER_AGENT,
    '-i',
    audioUrl,
    '-analyzeduration',
    '5000000',
    '-probesize',
    '5000000',
    '-loglevel',
    'error',
    '-f',
    's16le',
    '-ar',
    '48000',
    '-ac',
    '2',
    'pipe:1',
  ]);
  activeProcesses.add(ff);
  const out = new PassThrough();
  ff.stdout.pipe(out);
  ff.stderr.on('data', (d) => logErr(`FFmpeg: ${d.toString().trim()}`));
  ff.on('error', (e) => {
    activeProcesses.delete(ff);
    out.destroy(e);
  });
  ff.on('close', (code) => {
    activeProcesses.delete(ff);
    if (code !== 0 && code != null) log(`FFmpeg exit ${code}`);
    if (!out.destroyed) out.end();
  });
  const cleanup = () => {
    if (!ff.killed) {
      ff.kill('SIGTERM');
      setTimeout(() => {
        if (!ff.killed) ff.kill('SIGKILL');
      }, 1000);
    }
    activeProcesses.delete(ff);
    if (!out.destroyed) out.destroy();
  };
  return { stream: out, cleanup };
}

/**
 * Obtiene un stream de audio listo para Discord.
 * Orden: Piped → Cobalt → Invidious. Múltiples instancias por fuente.
 */
export async function getAudioStream(
  videoUrl: string
): Promise<AudioStreamResult | null> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    logErr(`URL de YouTube no válida: ${videoUrl}`);
    return null;
  }
  const normalizedUrl = normalizeYoutubeUrl(videoUrl, videoId);

  let result: { url: string; source: string } | null = null;

  const piped = await getAudioUrlPiped(videoId);
  if (piped) result = { url: piped.url, source: `Piped (${piped.instance})` };

  if (!result) {
    const cobalt = await getAudioUrlCobalt(normalizedUrl);
    if (cobalt) result = { url: cobalt.url, source: `Cobalt (${cobalt.instance})` };
  }

  if (!result) {
    const invidious = await getAudioUrlInvidious(videoId);
    if (invidious)
      result = { url: invidious.url, source: `Invidious (${invidious.instance})` };
  }

  if (!result) {
    logErr('Todas las fuentes fallaron (Piped, Cobalt, Invidious)');
    return null;
  }

  log(`Reproduciendo vía ${result.source}`);
  return createFfmpegStream(result.url);
}

export function cleanupAllProcesses(): void {
  for (const p of activeProcesses) {
    if (!p.killed) p.kill('SIGTERM');
  }
  activeProcesses.clear();
}
