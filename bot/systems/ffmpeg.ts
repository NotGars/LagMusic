import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);

/** Ruta del binario de ffmpeg (el de ffmpeg-static; si no está, el `ffmpeg` del sistema). */
export const ffmpegPath: string = (() => {
  try {
    const p = _require('ffmpeg-static') as string | { default: string } | null;
    const found = typeof p === 'string' ? p : p?.default;
    return found || 'ffmpeg';
  } catch {
    return 'ffmpeg';
  }
})();
