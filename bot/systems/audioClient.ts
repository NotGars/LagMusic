/**
 * Audio de LagMusic.
 *
 * Ya no se hace streaming desde YouTube (play-dl / Piped / Cobalt / Invidious dejaron de funcionar).
 * Ahora cada canción se baja una vez con yt-dlp, se guarda en el canal de canciones de Discord y se reproduce
 * desde ese archivo local (ver songStore.ts).
 */
import { Readable, PassThrough } from 'stream';
import { spawn, ChildProcess } from 'child_process';
import { StreamType } from '@discordjs/voice';
import type { ExtendedClient } from '../types';
import { ffmpegPath } from './ffmpeg';
import { getSongFile, SongRequest } from './songStore';

const activeProcesses = new Set<ChildProcess>();

const log = (msg: string) => console.log('[Audio]', msg);
const logErr = (msg: string) => console.error('[Audio]', msg);

export interface AudioStreamResult {
  stream: Readable;
  inputType?: StreamType;
  cleanup: () => void;
  /** true si la canción quedó guardada en el canal de canciones */
  saved: boolean;
}

/** PCM crudo (s16le, 48 kHz, estéreo) a partir de un archivo local: lo que Discord necesita. */
function createFfmpegStreamFromFile(filePath: string): { stream: Readable; cleanup: () => void } {
  const ff = spawn(ffmpegPath, ['-loglevel', 'error', '-i', filePath, '-vn', '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1']);
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

/** Consigue la canción (del canal o bajándola) y devuelve el audio listo para el reproductor. Lanza SongError si no se pudo. */
export async function getAudioStream(client: ExtendedClient, videoUrl: string, req: SongRequest = {}): Promise<AudioStreamResult> {
  const song = await getSongFile(client, videoUrl, req);
  log(`Reproduciendo desde archivo (${song.downloaded ? 'recién bajada' : 'ya guardada'}${song.saved ? ', en el canal' : ', NO guardada en el canal'})`);
  const { stream, cleanup } = createFfmpegStreamFromFile(song.path);
  return { stream, cleanup, saved: song.saved };
}

export function cleanupAllProcesses(): void {
  for (const p of activeProcesses) {
    if (!p.killed) p.kill('SIGTERM');
  }
  activeProcesses.clear();
}
