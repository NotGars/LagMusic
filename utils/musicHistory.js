import supabase from '../config/supabase.js';

export async function addMusicHistory(
  discordId,
  guildId,
  songTitle,
  songUrl,
  songArtist,
  platform,
  durationSeconds
) {
  await supabase.from('music_history').insert({
    discord_id: discordId,
    guild_id: guildId,
    song_title: songTitle,
    song_url: songUrl,
    song_artist: songArtist,
    platform: platform,
    duration_seconds: durationSeconds,
  });
}

export async function getUserMusicHistory(discordId, limit = 50) {
  const { data } = await supabase
    .from('music_history')
    .select('*')
    .eq('discord_id', discordId)
    .order('played_at', { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getRecommendations(discordId, limit = 10) {
  const history = await getUserMusicHistory(discordId, 100);

  if (history.length === 0) {
    return [];
  }

  const artistCounts = {};
  history.forEach((song) => {
    if (song.song_artist) {
      artistCounts[song.song_artist] = (artistCounts[song.song_artist] || 0) + 1;
    }
  });

  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0]);

  return topArtists;
}
