import supabase from '../config/supabase.js';

export async function getTempChannelOwner(channelId) {
  const { data } = await supabase
    .from('temp_voice_channels')
    .select('owner_id')
    .eq('channel_id', channelId)
    .single();

  return data?.owner_id || null;
}

export async function addChannelPermission(channelId, userId, grantedBy) {
  await supabase.from('temp_voice_permissions').upsert({
    channel_id: channelId,
    user_id: userId,
    granted_by: grantedBy,
  });
}

export async function hasChannelPermission(channelId, userId) {
  const owner = await getTempChannelOwner(channelId);
  if (owner === userId) return true;

  const { data } = await supabase
    .from('temp_voice_permissions')
    .select('user_id')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .single();

  return !!data;
}

export async function handleTempVoiceChannel(oldState, newState, client) {
  if (oldState.channelId && !newState.channelId) {
    const { data: tempChannel } = await supabase
      .from('temp_voice_channels')
      .select('*')
      .eq('channel_id', oldState.channelId)
      .single();

    if (tempChannel) {
      const channel = await client.channels.fetch(oldState.channelId).catch(() => null);
      if (channel && channel.members.size === 0) {
        await channel.delete().catch(console.error);
        await supabase
          .from('temp_voice_channels')
          .delete()
          .eq('channel_id', oldState.channelId);
        await supabase
          .from('temp_voice_permissions')
          .delete()
          .eq('channel_id', oldState.channelId);
      }
    }
  }
}
