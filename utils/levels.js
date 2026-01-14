import supabase from '../config/supabase.js';

const XP_PER_MINUTE_VOICE = 5;
const XP_PER_MINUTE_MUSIC = 10;
const XP_FOR_LEVEL = (level) => level * 100;

export async function getOrCreateUser(discordId, username) {
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser } = await supabase
    .from('users')
    .insert({
      discord_id: discordId,
      username: username,
      level: 1,
      xp: 0,
      total_xp: 0,
    })
    .select()
    .single();

  return newUser;
}

export async function addVoiceTime(discordId, username, minutes) {
  const user = await getOrCreateUser(discordId, username);
  const xpGained = minutes * XP_PER_MINUTE_VOICE;

  const newXp = user.xp + xpGained;
  const newTotalXp = user.total_xp + xpGained;
  const newVoiceTime = user.voice_time_minutes + minutes;

  let newLevel = user.level;
  let remainingXp = newXp;

  while (remainingXp >= XP_FOR_LEVEL(newLevel)) {
    remainingXp -= XP_FOR_LEVEL(newLevel);
    newLevel++;
  }

  await supabase
    .from('users')
    .update({
      level: newLevel,
      xp: remainingXp,
      total_xp: newTotalXp,
      voice_time_minutes: newVoiceTime,
      updated_at: new Date().toISOString(),
    })
    .eq('discord_id', discordId);

  return { leveledUp: newLevel > user.level, newLevel, xpGained };
}

export async function addMusicTime(discordId, username, minutes) {
  const user = await getOrCreateUser(discordId, username);
  const xpGained = minutes * XP_PER_MINUTE_MUSIC;

  const newXp = user.xp + xpGained;
  const newTotalXp = user.total_xp + xpGained;
  const newMusicTime = user.music_time_minutes + minutes;

  let newLevel = user.level;
  let remainingXp = newXp;

  while (remainingXp >= XP_FOR_LEVEL(newLevel)) {
    remainingXp -= XP_FOR_LEVEL(newLevel);
    newLevel++;
  }

  await supabase
    .from('users')
    .update({
      level: newLevel,
      xp: remainingXp,
      total_xp: newTotalXp,
      music_time_minutes: newMusicTime,
      updated_at: new Date().toISOString(),
    })
    .eq('discord_id', discordId);

  return { leveledUp: newLevel > user.level, newLevel, xpGained };
}

export async function getUserLevel(discordId) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .maybeSingle();

  return data;
}

export async function updateRankcardStyle(discordId, style) {
  await supabase
    .from('users')
    .update({ rankcard_style: style })
    .eq('discord_id', discordId);
}

export async function getLeaderboard(limit = 10) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .order('total_xp', { ascending: false })
    .limit(limit);

  return data || [];
}
