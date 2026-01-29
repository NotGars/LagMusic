/**
 * Sistema de audio para LagMusic - compatible con Render.
 * Fuente primaria: Piped API (URLs proxy estables).
 * Fallback: Cobalt API.
 * Sin dependencias de play-dl, ytdl-core ni cookies.
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

const PIPED_API = 'https://pipedapi.kavin.rocks';
const COBALT_API = 'https://api.cobalt.tools';
const REQUEST_TIMEOUT = 15000;
const USER_AGENT = 'LagMusic/1.0 (Discord Bot; +https://github.com)';
const activeProcesses = new Set<ChildProcess>();

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

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms: number
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Obtener URL de audio vía Piped API (proxy estable). */
async function getAudioUrlPiped(videoId: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `${PIPED_API}/streams/${videoId}`,
      { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } },
      REQUEST_TIMEOUT
    );
    if (!res.ok) return null;
    const data = await res.json();
    const streams = data?.audioStreams;
    if (!Array.isArray(streams) || streams.length === 0) return null;
    const withBitrate = streams.filter((s: any) => (s.bitrate ?? 0) > 0);
    const list = withBitrate.length > 0 ? withBitrate : streams;
    const best = list.reduce((a: any, b: any) =>
      (b.bitrate ?? 0) > (a.bitrate ?? 0) ? b : a
    );
    const url = best?.url;
    return typeof url === 'string' && url ? url : null;
  } catch (e) {
    console.error('[Audio] Piped error:', (e as Error).message);
    return null;
  }
}

/** Fallback: obtener URL de audio vía Cobalt API. */
async function getAudioUrlCobalt(videoUrl: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      COBALT_API,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: JSON.stringify({
          url: videoUrl,
          audioFormat: 'opus',
          isAudioOnly: true,
          aFormat: 'opus',
          filenameStyle: 'basic',
        }),
      },
      REQUEST_TIMEOUT
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status === 'stream' || data?.status === 'redirect') {
      const u = data?.url;
      return typeof u === 'string' && u ? u : null;
    }
    if (data?.status === 'picker' && Array.isArray(data?.urls) && data.urls.length > 0) {
      const u = data.urls[0];
      return typeof u === 'string' && u ? u : null;
    }
    return null;
  } catch (e) {
    console.error('[Audio] Cobalt error:', (e as Error).message);
    return null;
  }
}

export interface AudioStreamResult {
  stream: Readable;
  cleanup: () => void;
}

function createFfmpegStream(audioUrl: string): AudioStreamResult | null {
  if (!ffmpegPath) {
    console.error('[Audio] FFmpeg no disponible');
    return null;
  }
  const ff = spawn(ffmpegPath, [
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-user_agent', USER_AGENT,
    '-i', audioUrl,
    '-analyzeduration', '0',
    '-loglevel', 'error',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1',
  ]);
  activeProcesses.add(ff);
  const out = new PassThrough();
  ff.stdout.pipe(out);
  ff.stderr.on('data', (d) => console.error('[FFmpeg]', d.toString().trim()));
  ff.on('error', (e) => {
    activeProcesses.delete(ff);
    out.destroy(e);
  });
  ff.on('close', (code) => {
    activeProcesses.delete(ff);
    if (code !== 0 && code != null) {
      console.log('[FFmpeg] exit code', code);
    }
    if (!out.destroyed) out.end();
  });
  const cleanup = () => {
    if (!ff.killed) {
      ff.kill('SIGTERM');
      setTimeout(() => { if (!ff.killed) ff.kill('SIGKILL'); }, 1000);
    }
    activeProcesses.delete(ff);
    if (!out.destroyed) out.destroy();
  };
  return { stream: out, cleanup };
}

/**
 * Obtiene un stream de audio listo para Discord a partir de una URL de YouTube.
 * Usa Piped primero y Cobalt como respaldo.
 */
export async function getAudioStream(videoUrl: string): Promise<AudioStreamResult | null> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    console.error('[Audio] URL de YouTube no válida:', videoUrl);
    return null;
  }

  let audioUrl: string | null = null;
  let source = '';

  audioUrl = await getAudioUrlPiped(videoId);
  if (audioUrl) source = 'Piped';

  if (!audioUrl) {
    audioUrl = await getAudioUrlCobalt(videoUrl);
    if (audioUrl) source = 'Cobalt';
  }

  if (!audioUrl) {
    console.error('[Audio] No se pudo obtener audio (Piped + Cobalt fallaron)');
    return null;
  }

  console.log('[Audio] Reproduciendo vía', source);
  return createFfmpegStream(audioUrl);
}

export function cleanupAllProcesses(): void {
  for (const p of activeProcesses) {
    if (!p.killed) p.kill('SIGTERM');
  }
  activeProcesses.clear();
}
