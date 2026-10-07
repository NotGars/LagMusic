/**
 * Almacén de canciones de LagMusic.
 *
 * Cuando se pide una canción:
 *   1. Si ya está guardada en el canal de canciones de Discord  -> se baja de ahí (rápido, no toca YouTube).
 *   2. Si no está -> se baja con yt-dlp, se convierte a mp3, se SUBE al canal (queda guardada para siempre) y se reproduce.
 * Así cada canción se descarga de YouTube una sola vez.
 *
 * Variables de entorno opcionales:
 *   SONGS_CHANNEL_ID   canal donde se guardan los mp3 (por defecto 1557170112023363625)
 *   YT_COOKIES         contenido de un cookies.txt (formato Netscape) de YouTube. Si está configurada, se usa SIEMPRE
 *                      (no se pierde tiempo probando antes sin cookies, que desde Render YouTube bloquea).
 *   YT_COOKIES_B64     lo mismo pero en base64 (más seguro para pegar en una sola línea en Render)
 *   YT_COOKIES_FILE    ruta a ese cookies.txt (alternativa)
 *   YT_PROXY           proxy para yt-dlp (http://usuario:clave@host:puerto)
 *   YTDLP_PATH         ruta a un yt-dlp ya instalado (si no, se usa el del sistema o se descarga solo)
 *   MAX_SONG_SECONDS   duración máxima (por defecto 3 horas)
 *   UPLOAD_LIMIT_MB    límite de subida de archivos del servidor (por defecto según el nivel de boost: 10/50/100)
 *   SOUNDCLOUD_FALLBACK=1   (apagado por defecto) si YouTube falla, busca en SoundCloud. Solo reproduce, NO guarda en el canal,
 *                      porque puede ser otra versión de la canción.
 */
import { spawn } from 'child_process';
import { promises as fsp, existsSync, statSync, utimesSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AttachmentBuilder, TextChannel } from 'discord.js';
import type { ExtendedClient } from '../types';
import { config } from '../config';
import { ffmpegPath } from './ffmpeg';

const log = (m: string) => console.log('[Songs]', m);
const logErr = (m: string) => console.error('[Songs]', m);

export type SongErrorKind = 'blocked' | 'cookies' | 'update' | 'unavailable' | 'long' | 'other';

export class SongError extends Error {
  constructor(message: string, public userMessage: string, public kind: SongErrorKind = 'other') {
    super(message);
  }
}

export interface SongFile {
  /** mp3 local listo para reproducir */
  path: string;
  /** true si la canción quedó guardada en el canal de Discord */
  saved: boolean;
  /** true si se tuvo que bajar de internet en este momento */
  downloaded: boolean;
}

export interface SongRequest {
  title?: string;
  durationSec?: number;
  /** se llama solo cuando de verdad hay que bajarla (para avisar "bajando..."). */
  onDownloading?: () => void;
}

const CACHE_DIR = path.join(os.tmpdir(), 'lagmusic-songs');
const BIN_DIR = path.join(os.tmpdir(), 'lagmusic-bin');
const MAX_CACHE_FILES = 40;
const DOWNLOAD_TIMEOUT = 4 * 60_000;
const BITRATES = [192, 160, 128, 96, 64];
const MAX_SECONDS = Number(process.env.MAX_SONG_SECONDS) || 3 * 3600;
const MIN_YTDLP_VERSION = '2025.11.01'; // desde aquí existe --js-runtimes (YouTube lo necesita)

// ───────────────────────── Utilidades ─────────────────────────
export function videoIdFromUrl(url: string): string | null {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/youtube\.com\/(?:embed|shorts)\/([\w-]{11})/);
  return m ? m[1] : null;
}

export function nameForFile(title: string): string {
  const noise =
    /[([{][^)\]}]*(?:official|oficial|video|v[ií]deo|audio|lyric|letra|hd|4k|mv|visualizer|remaster)[^)\]}]*[)\]}]/gi;
  const t = (title || '')
    .replace(noise, ' ')
    .replace(/[\\/:*?"<>|\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—_.]+|[\s\-–—_.]+$/g, '')
    .slice(0, 100)
    .trim();
  return t || 'cancion';
}

function pickBitrate(durationSec: number, limitBytes: number): number | null {
  const max = ((limitBytes * 8) / 1000 / Math.max(durationSec, 1)) * 0.9;
  return BITRATES.find((b) => b <= max) ?? null;
}

function uploadLimitBytes(channel: TextChannel | null): number {
  const env = Number(process.env.UPLOAD_LIMIT_MB);
  if (env > 0) return env * 1024 * 1024;
  const tier = Number((channel as any)?.guild?.premiumTier ?? 0);
  return (tier >= 3 ? 100 : tier === 2 ? 50 : 10) * 1024 * 1024;
}

function cachePath(id: string): string {
  return path.join(CACHE_DIR, `${id}.mp3`);
}

async function pruneCache(): Promise<void> {
  try {
    const names = (await fsp.readdir(CACHE_DIR)).filter((n) => n.endsWith('.mp3'));
    if (names.length <= MAX_CACHE_FILES) return;
    const withTime = names.map((n) => ({ n, t: statSync(path.join(CACHE_DIR, n)).mtimeMs })).sort((a, b) => a.t - b.t);
    for (const f of withTime.slice(0, names.length - MAX_CACHE_FILES)) {
      await fsp.rm(path.join(CACHE_DIR, f.n), { force: true });
    }
  } catch {
    /* no pasa nada */
  }
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const t = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', (e) => {
      clearTimeout(t);
      reject(e);
    });
    p.on('close', (code) => {
      clearTimeout(t);
      resolve({ code, stdout, stderr });
    });
  });
}

// Una sola descarga a la vez (el servidor gratis no aguanta más) y sin repetir la misma canción.
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn, fn);
  chain = p.then(() => undefined, () => undefined);
  return p;
}
const inflight = new Map<string, Promise<SongFile>>();

// ───────────────────────── yt-dlp ─────────────────────────
let ytdlpBin: string | null = null;
let lastUpdate = 0;

async function versionOf(bin: string): Promise<string | null> {
  try {
    const r = await run(bin, ['--version'], 15_000);
    const v = r.stdout.trim();
    return r.code === 0 && /^\d{4}\.\d{2}\.\d{2}/.test(v) ? v : null;
  } catch {
    return null;
  }
}

function assetName(): string {
  if (process.platform === 'win32') return 'yt-dlp.exe';
  if (process.platform === 'darwin') return 'yt-dlp_macos';
  return process.arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
}

async function ensureYtDlp(): Promise<string> {
  if (ytdlpBin) return ytdlpBin;
  const local = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  for (const cand of [process.env.YTDLP_PATH, 'yt-dlp', local]) {
    if (!cand) continue;
    const v = await versionOf(cand);
    if (v && v >= MIN_YTDLP_VERSION) {
      log(`yt-dlp ${v} (${cand})`);
      return (ytdlpBin = cand);
    }
    if (v) log(`yt-dlp ${v} en ${cand} es demasiado viejo, busco uno nuevo`);
  }
  log('Descargando yt-dlp...');
  const res = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName()}`);
  if (!res.ok) throw new SongError(`no pude bajar yt-dlp: HTTP ${res.status}`, 'No pude instalar el descargador (yt-dlp), revisa los logs.');
  await fsp.mkdir(BIN_DIR, { recursive: true });
  await fsp.writeFile(local, Buffer.from(await res.arrayBuffer()), { mode: 0o755 });
  const v = await versionOf(local);
  if (!v) throw new SongError('yt-dlp descargado no funciona', 'El descargador (yt-dlp) no arranca en este servidor, revisa los logs.');
  log(`yt-dlp ${v} instalado en ${local}`);
  return (ytdlpBin = local);
}

/** YouTube cambia seguido: si falla por eso, actualiza yt-dlp (máx. una vez cada 3 horas). */
async function updateYtDlp(bin: string): Promise<boolean> {
  if (Date.now() - lastUpdate < 3 * 3600_000) return false;
  lastUpdate = Date.now();
  try {
    const r = await run(bin, ['-U'], 120_000);
    log(`yt-dlp -U: ${(r.stdout + r.stderr).trim().split('\n').pop()}`);
    return r.code === 0;
  } catch (e: any) {
    logErr(`No pude actualizar yt-dlp: ${e?.message || e}`);
    return false;
  }
}

// ───────────────────────── Cookies de YouTube ─────────────────────────
interface CookieInfo {
  path: string;
  total: number;
  youtube: number;
  loggedIn: boolean;
}
let cookieInfo: CookieInfo | null | undefined;

/** Deja el cookies.txt en el formato exacto que exige yt-dlp (cabecera + 7 campos separados por TAB), aunque se haya pegado mal. */
export function normalizeCookies(raw: string): { text: string; total: number; youtube: number; loggedIn: boolean } {
  const lines = raw.replace(/\r\n?/g, '\n').replace(/\\n/g, '\n').split('\n');
  const out: string[] = ['# Netscape HTTP Cookie File'];
  let total = 0;
  let youtube = 0;
  let loggedIn = false;
  for (const line of lines) {
    const l = line.trim();
    if (!l || (l.startsWith('#') && !l.startsWith('#HttpOnly_'))) continue;
    const tabs = l.split('\t');
    const parts = tabs.length >= 7 ? tabs : l.split(/\s+/); // si al pegar los TAB se volvieron espacios
    if (parts.length < 7) continue;
    const f = [...parts.slice(0, 6), parts.slice(6).join(' ')];
    out.push(f.join('\t'));
    total++;
    if (/youtube\.com|google\./i.test(f[0])) youtube++;
    if (/^(LOGIN_INFO|SAPISID|__Secure-3PSID|SID)$/.test(f[5])) loggedIn = true;
  }
  return { text: out.join('\n') + '\n', total, youtube, loggedIn };
}

async function loadCookies(): Promise<CookieInfo | null> {
  if (cookieInfo !== undefined) return cookieInfo;
  cookieInfo = null;
  try {
    let raw = '';
    if (process.env.YT_COOKIES_B64) raw = Buffer.from(process.env.YT_COOKIES_B64.trim(), 'base64').toString('utf8');
    else if (process.env.YT_COOKIES) raw = process.env.YT_COOKIES;
    else if (process.env.YT_COOKIES_FILE && existsSync(process.env.YT_COOKIES_FILE)) raw = await fsp.readFile(process.env.YT_COOKIES_FILE, 'utf8');
    if (!raw.trim()) return cookieInfo;

    const n = normalizeCookies(raw);
    if (n.total === 0) {
      logErr('Las cookies de YouTube están configuradas pero no pude leer ninguna línea válida (¿formato Netscape / cookies.txt?).');
      return cookieInfo;
    }
    await fsp.mkdir(BIN_DIR, { recursive: true });
    const file = path.join(BIN_DIR, 'cookies.txt'); // copia: yt-dlp reescribe el archivo
    await fsp.writeFile(file, n.text, { mode: 0o600 });
    cookieInfo = { path: file, total: n.total, youtube: n.youtube, loggedIn: n.loggedIn };
    log(`Cookies de YouTube cargadas: ${n.total} (${n.youtube} de youtube/google)`);
    if (n.youtube === 0) logErr('⚠️ Ninguna cookie es de youtube.com/google.com: no servirán.');
    else if (!n.loggedIn) logErr('⚠️ Las cookies no parecen de una sesión iniciada (faltan SID/SAPISID/LOGIN_INFO).');
  } catch (e: any) {
    logErr(`No pude leer las cookies: ${e?.message || e}`);
  }
  return cookieInfo;
}

async function baseArgs(useCookies = false): Promise<string[]> {
  const a = [
    '--ignore-config', '--no-playlist', '--no-warnings', '--no-progress',
    '--socket-timeout', '20', '--retries', '3',
    '--js-runtimes', `node:${process.execPath}`, // YouTube necesita un runtime de JS; ya estás corriendo node
  ];
  if (ffmpegPath !== 'ffmpeg') a.push('--ffmpeg-location', ffmpegPath);
  if (process.env.YT_PROXY) a.push('--proxy', process.env.YT_PROXY);
  if (useCookies) {
    const c = await loadCookies();
    if (c) a.push('--cookies', c.path);
  }
  return a;
}

function classify(stderr: string): SongError {
  const s = stderr.trim();
  const tail = s.split('\n').slice(-3).join(' | ').slice(0, 300);
  if (/cookies are no longer valid|rotated in the browser/i.test(s))
    return new SongError(tail, 'Las cookies de YouTube caducaron 😭 Hay que exportar unas nuevas y actualizar YT_COOKIES.', 'cookies');
  if (/Sign in to confirm|not a bot|confirm you.re not/i.test(s))
    return new SongError(tail, 'YouTube está bloqueando al servidor 😭 (hace falta una cuenta con cookies: variable YT_COOKIES).', 'blocked');
  if (/does not pass filter|is live|live event/i.test(s))
    return new SongError(tail, 'Ese video es un directo o dura demasiado.', 'long');
  if (/Video unavailable|Private video|has been removed|not available in your country|copyright|members-only|age[- ]restricted/i.test(s))
    return new SongError(tail, 'Ese video no está disponible.', 'unavailable');
  if (/nsig|signature|Unable to extract|Requested format is not available|HTTP Error 403|player response|JavaScript runtime/i.test(s))
    return new SongError(tail, 'YouTube cambió algo y no pude bajarla. Intenta de nuevo en un rato.', 'update');
  return new SongError(tail, 'No pude bajar esa canción. Intenta de nuevo o con otra.', 'other');
}

interface RawAudio {
  path: string;
  duration: number | null;
}

async function fetchRaw(bin: string, source: string, dir: string, useCookies = false): Promise<RawAudio> {
  const args = [
    ...(await baseArgs(useCookies)),
    '-f', 'bestaudio/best',
    '--match-filters', `!is_live & duration <=? ${MAX_SECONDS}`,
    '--no-simulate',
    '--print', 'before_dl:DUR=%(duration)s',
    '--print', 'after_move:PATH=%(filepath)s',
    '-o', path.join(dir, '%(id)s.%(ext)s'),
    source,
  ];
  const r = await run(bin, args, DOWNLOAD_TIMEOUT);
  const file = /^PATH=(.+)$/m.exec(r.stdout)?.[1]?.trim();
  if (!file || !existsSync(file)) {
    if (r.code === null) throw new SongError('timeout', 'Se me hizo eterno bajarla, la dejé.', 'other');
    throw classify(r.stderr || r.stdout || 'yt-dlp no dejó ningún archivo');
  }
  const dur = Number(/^DUR=(.+)$/m.exec(r.stdout)?.[1]);
  return { path: file, duration: Number.isFinite(dur) && dur > 0 ? dur : null };
}

// ───────────────────────── Respaldo: SoundCloud (opcional) ─────────────────────────
const STOP_TOKENS = new Set(['official', 'oficial', 'video', 'audio', 'lyrics', 'lyric', 'letra', 'ft', 'feat', 'hd', 'mv', 'de', 'la', 'el', 'the']);
const WRONG_VERSION = /\b(remix|cover|nightcore|slowed|reverb|sped|speed|8d|boosted|karaoke|instrumental|live|mashup|edit|preview|snippet|loop|bootleg|flip)\b/i;
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_TOKENS.has(t));
}

/**
 * Solo si SOUNDCLOUD_FALLBACK=1. Es MUY estricto, porque SoundCloud está lleno de covers, remixes y subidas raras:
 * deben estar todas las palabras pedidas, casi ninguna palabra de más, ninguna "versión" distinta (remix, cover...) y
 * la duración debe ser casi igual a la del video de YouTube pedido.
 */
async function soundcloudFallback(bin: string, title: string, expectedSec: number | null, dir: string): Promise<RawAudio | null> {
  if (process.env.SOUNDCLOUD_FALLBACK !== '1' || !expectedSec) return null;
  try {
    const q = nameForFile(title);
    const r = await run(bin, [...(await baseArgs()), '--flat-playlist', '-J', `scsearch8:${q}`], 60_000);
    if (r.code !== 0) return null;
    const entries: any[] = JSON.parse(r.stdout)?.entries ?? [];
    const qt = tokens(q);
    if (!qt.length) return null;
    const tol = Math.max(10, expectedSec * 0.12);
    for (const e of entries) {
      if (!e?.url || !e.duration || Math.abs(e.duration - expectedSec) > tol) continue;
      const titleTokens = new Set(tokens(e.title || ''));
      const allTokens = new Set([...titleTokens, ...tokens(e.uploader || '')]);
      if (!qt.every((t) => allTokens.has(t))) continue;
      if ([...titleTokens].filter((t) => !qt.includes(t)).length > 3) continue;
      if (WRONG_VERSION.test(e.title || '') && !WRONG_VERSION.test(q)) continue;
      log(`Respaldo SoundCloud: "${e.title}" (${Math.round(e.duration)} s, pedida: ${Math.round(expectedSec)} s)`);
      return await fetchRaw(bin, e.url, dir);
    }
    log('Respaldo SoundCloud: ningún resultado se parece lo bastante, no se usa');
    return null;
  } catch (e: any) {
    logErr(`Respaldo SoundCloud falló: ${e?.message || e}`);
    return null;
  }
}

async function toMp3(input: string, output: string, kbps: number): Promise<void> {
  const r = await run(ffmpegPath, ['-y', '-loglevel', 'error', '-i', input, '-vn', '-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', `${kbps}k`, output], 180_000);
  if (r.code !== 0 || !existsSync(output)) throw new SongError(`ffmpeg: ${r.stderr.trim().slice(0, 300)}`, 'No pude convertir el audio.', 'other');
}

// ───────────────────────── Catálogo (el canal de Discord) ─────────────────────────
const catalog = new Map<string, string>(); // videoId -> id del mensaje con el mp3
let catalogPromise: Promise<void> | null = null;
let catalogFailedAt = 0;

async function getChannel(client: ExtendedClient): Promise<TextChannel> {
  const ch = await client.channels.fetch(config.songs.channelId);
  if (!ch || !ch.isTextBased() || ch.isDMBased()) throw new Error(`canal ${config.songs.channelId} no encontrado o sin acceso`);
  return ch as unknown as TextChannel;
}

function idFromMessage(content: string, hasFile: boolean): string | null {
  if (!hasFile) return null;
  return /(?:[?&]v=|youtu\.be\/)([\w-]{11})/.exec(content)?.[1] ?? null;
}

async function readCatalog(client: ExtendedClient): Promise<void> {
  const channel = await getChannel(client);
  let before: string | undefined;
  for (;;) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (batch.size === 0) break;
    for (const m of batch.values()) {
      const id = idFromMessage(m.content || '', m.attachments.size > 0);
      if (id && !catalog.has(id)) catalog.set(id, m.id); // de más nuevo a más viejo: gana la más nueva
    }
    before = batch.last()!.id;
  }
  log(`Catálogo cargado: ${catalog.size} canciones guardadas en el canal`);
}

/** Lee el canal de canciones (se llama al arrancar; es seguro llamarlo varias veces). */
export function loadCatalog(client: ExtendedClient): Promise<void> {
  if (!catalogPromise) {
    catalogPromise = readCatalog(client).catch((e) => {
      logErr(`No pude leer el canal de canciones: ${e?.message || e}. Revisa que el bot tenga Ver canal, Leer historial, Enviar mensajes y Adjuntar archivos.`);
      catalogFailedAt = Date.now();
      catalogPromise = null;
    });
  }
  return catalogPromise;
}

async function ensureCatalog(client: ExtendedClient): Promise<void> {
  if (!catalogPromise && Date.now() - catalogFailedAt < 60_000) return; // falló hace poco: no insistir en cada canción
  await loadCatalog(client);
}

async function pullFromChannel(client: ExtendedClient, messageId: string, dest: string): Promise<void> {
  const channel = await getChannel(client);
  const msg = await channel.messages.fetch(messageId); // se vuelve a pedir: los enlaces de archivos de Discord caducan
  const att = msg.attachments.first();
  if (!att) throw new Error('el mensaje ya no tiene archivo');
  const res = await fetch(att.url);
  if (!res.ok) throw new Error(`HTTP ${res.status} bajando el adjunto`);
  const tmp = `${dest}.part`;
  await fsp.writeFile(tmp, Buffer.from(await res.arrayBuffer()));
  await fsp.rename(tmp, dest);
}

// ───────────────────────── Punto de entrada ─────────────────────────
async function downloadAndStore(client: ExtendedClient, id: string, dest: string, req: SongRequest): Promise<SongFile> {
  const t0 = Date.now();
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'lagdl-'));
  try {
    const channel = await getChannel(client).catch(() => null);
    const limit = uploadLimitBytes(channel);
    const bin = await ensureYtDlp();
    const ytUrl = `https://www.youtube.com/watch?v=${id}`;
    const expected = req.durationSec && req.durationSec > 0 ? req.durationSec : null;

    // Si hay cookies configuradas se usan SIEMPRE y solo ellas: probar antes sin cookies desde un servidor (Render)
    // acaba en bloqueo y solo hace perder tiempo en cada canción. Sin cookies configuradas, se intenta sin ellas.
    const haveCookies = !!(await loadCookies());
    const withCookies = haveCookies;

    let raw: RawAudio | null = null;
    let lastErr: SongError | null = null;
    for (let attempt = 0; attempt < 2 && !raw; attempt++) {
      try {
        raw = await fetchRaw(bin, ytUrl, dir, withCookies);
      } catch (e: any) {
        lastErr = e instanceof SongError ? e : classify(String(e?.message || e));
        logErr(`yt-dlp [${withCookies ? 'con' : 'sin'} cookies] (${lastErr.kind}): ${lastErr.message}`);
        // Si YouTube cambió algo, actualiza yt-dlp y reintenta UNA vez.
        if (attempt === 0 && lastErr.kind === 'update' && (await updateYtDlp(bin))) continue;
        break;
      }
    }
    // Si bloqueó incluso con cookies, el problema son las cookies (caducadas o de una cuenta marcada).
    if (!raw && haveCookies && lastErr && (lastErr.kind === 'blocked' || lastErr.kind === 'cookies')) {
      lastErr = new SongError(lastErr.message, 'YouTube sigue bloqueando incluso con cookies 😭 Exporta cookies nuevas (de una cuenta que no uses en otro lado) y actualiza YT_COOKIES.', 'cookies');
    }
    const tDownload = Date.now();
    let fromFallback = false;
    if (!raw && lastErr && (lastErr.kind === 'blocked' || lastErr.kind === 'cookies' || lastErr.kind === 'update' || lastErr.kind === 'other') && req.title) {
      raw = await soundcloudFallback(bin, req.title, expected, dir);
      fromFallback = !!raw;
    }
    if (!raw) throw lastErr ?? new SongError('sin audio', 'No pude bajar esa canción.');

    const duration = raw.duration ?? expected;
    let kbps = duration ? pickBitrate(duration, limit) : 128;
    let canUpload = true;
    if (!kbps) {
      kbps = 64;
      canUpload = false; // ni a 64 kbps cabe en Discord: se reproduce pero no se guarda
    }
    await fsp.mkdir(CACHE_DIR, { recursive: true });
    const tBeforeConv = Date.now();
    await toMp3(raw.path, dest, kbps);
    const tConverted = Date.now();
    const size = statSync(dest).size;
    if (size > limit) canUpload = false;

    let saved = false;
    if (fromFallback) {
      canUpload = false; // podría ser otra versión de la canción: se reproduce, pero NO se guarda con el id de YouTube
      log('Audio del respaldo de SoundCloud: se reproduce pero no se guarda en el canal');
    }
    if (canUpload && channel) {
      try {
        const name = nameForFile(req.title || id);
        const msg = await channel.send({
          content: `🎵 **${name}**\n<https://www.youtube.com/watch?v=${id}>`,
          files: [new AttachmentBuilder(dest, { name: `${name}.mp3` })],
          allowedMentions: { parse: [] },
        });
        catalog.set(id, msg.id);
        saved = true;
        log(`Guardada en el canal: ${name} (${Math.round(size / 1024)} KB, ${kbps} kbps)`);
      } catch (e: any) {
        logErr(`No pude subirla al canal de canciones: ${e?.message || e} (¿faltan permisos de Enviar mensajes / Adjuntar archivos?)`);
      }
    } else if (!canUpload && !fromFallback) {
      log(`No se guarda en el canal (pesa ${Math.round(size / 1024 / 1024)} MB y el límite es ${Math.round(limit / 1024 / 1024)} MB), solo se reproduce`);
    }
    const sec = (a: number, b: number) => ((b - a) / 1000).toFixed(1);
    log(`Tiempos: descarga ${sec(t0, tDownload)} s · conversión ${sec(tBeforeConv, tConverted)} s · subida al canal ${sec(tConverted, Date.now())} s · total ${sec(t0, Date.now())} s`);
    void pruneCache();
    return { path: dest, saved, downloaded: true };
  } finally {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function obtain(client: ExtendedClient, id: string, req: SongRequest): Promise<SongFile> {
  await fsp.mkdir(CACHE_DIR, { recursive: true });
  const dest = cachePath(id);
  await ensureCatalog(client);

  const msgId = catalog.get(id);
  if (msgId) {
    try {
      await pullFromChannel(client, msgId, dest);
      return { path: dest, saved: true, downloaded: false };
    } catch (e: any) {
      logErr(`No pude sacarla del canal (${e?.message || e}); la bajo de nuevo`);
      catalog.delete(id);
    }
  }
  req.onDownloading?.();
  return enqueue(() => downloadAndStore(client, id, dest, req));
}

/** Devuelve un mp3 local listo para reproducir la canción de `url` (del canal de Discord o recién bajada). */
export async function getSongFile(client: ExtendedClient, url: string, req: SongRequest = {}): Promise<SongFile> {
  const id = videoIdFromUrl(url);
  if (!id) throw new SongError(`URL sin id de YouTube: ${url}`, 'Ese enlace no es de YouTube.', 'unavailable');

  const dest = cachePath(id);
  if (existsSync(dest) && statSync(dest).size > 0) {
    const now = new Date();
    utimesSync(dest, now, now);
    return { path: dest, saved: catalog.has(id), downloaded: false };
  }
  let p = inflight.get(id);
  if (!p) {
    p = obtain(client, id, req).finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

/** Deja lista la siguiente canción mientras suena la actual (para que no haya silencio entre canciones). */
export function prefetchSong(client: ExtendedClient, url: string, req: SongRequest = {}): void {
  getSongFile(client, url, { ...req, onDownloading: undefined }).catch((e) => logErr(`Precarga falló: ${e?.message || e}`));
}

/** Se llama al arrancar el bot: deja yt-dlp y las cookies listos para que la PRIMERA canción no pague esa espera. */
export async function warmUpDownloader(): Promise<void> {
  try {
    await ensureYtDlp();
    await loadCookies();
  } catch (e: any) {
    logErr(`Calentamiento del descargador falló (se reintentará al pedir una canción): ${e?.message || e}`);
  }
}
