/**
 * Elige el resultado de YouTube que de verdad es la canción pedida.
 * Antes se tomaba SIEMPRE el primer resultado, que muchas veces es un cover, un remix, un "slowed + reverb", un directo
 * o un mix de 1 hora. Aquí se puntúan los primeros resultados y se prefiere la versión original.
 */
export interface VideoLike {
  title: string;
  url: string;
  seconds: number;
  views?: number;
  thumbnail?: string;
  author?: { name?: string } | null;
}

const STOP = new Set(['official', 'oficial', 'video', 'audio', 'lyrics', 'lyric', 'letra', 'ft', 'feat', 'featuring', 'hd', 'mv', 'de', 'la', 'el', 'the', 'and', 'con']);

// Versiones "distintas" de la canción. Penalizan SOLO si el usuario no las pidió.
const UNWANTED: Array<[string, RegExp]> = [
  ['cover', /\b(cover|covers|versi[oó]n)\b/],
  ['remix', /\b(remix|rmx|bootleg|flip)\b/],
  ['nightcore', /\bnightcore\b/],
  ['slowed', /\b(slowed|reverb|sped up|speed up|spedup)\b/],
  ['8d', /\b(8d|16d|bass boosted|boosted)\b/],
  ['karaoke', /\b(karaoke|instrumental|backing track|pista)\b/],
  ['live', /\b(live|en vivo|concert|concierto|acoustic|ac[uú]stic[oa])\b/],
  ['reaction', /\b(reaction|reacci[oó]n|reacting|tutorial|lesson|clase|review|an[aá]lisis)\b/],
  ['parody', /\b(parody|parodia|mashup|amv|fanmade|fan made|tiktok)\b/],
  ['loop', /\b(1 hour|10 hours|1 hora|10 horas|loop)\b/],
];

export function tokens(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !STOP.has(t));
}

function plain(s: string): string {
  return (s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

export function scoreVideo(query: string, v: VideoLike, index: number): number {
  const q = plain(query);
  const t = plain(v.title);
  const author = plain(v.author?.name || '');
  const qt = tokens(query);
  const have = new Set(tokens(`${v.title} ${v.author?.name || ''}`));
  let score = qt.length ? qt.filter((x) => have.has(x)).length / qt.length : 0;

  if (/official (audio|video|music video|lyric)|audio oficial|video oficial|\bvevo\b|- topic$/.test(`${t} ${author}`)) score += 0.12;

  for (const [, rx] of UNWANTED) {
    if (rx.test(t) && !rx.test(q)) score -= 0.45;
  }

  const secs = Number(v.seconds) || 0;
  if (secs > 0 && secs < 45) score -= 0.4;
  if (secs > 720 && !/\b(mix|album|full|completo|hora|hour|compilation|recopilaci[oó]n|discografia)\b/.test(q)) score -= 0.5;

  score += Math.min(0.1, Math.log10((Number(v.views) || 0) + 1) / 80); // desempate: el más visto
  score -= index * 0.015; // y el motor de búsqueda ya ordena por relevancia
  return score;
}

export function pickBestVideo<T extends VideoLike>(query: string, videos: T[]): T {
  const candidates = videos.slice(0, 10);
  let best = candidates[0];
  let bestScore = -Infinity;
  candidates.forEach((v, i) => {
    const sc = scoreVideo(query, v, i);
    if (sc > bestScore) {
      best = v;
      bestScore = sc;
    }
  });
  return best;
}
