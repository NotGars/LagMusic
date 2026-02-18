import { VoiceState, ChannelType, PermissionFlagsBits } from 'discord.js';
import { ExtendedClient, UserLevel, TempChannelData, RANKCARD_STYLES } from '../types';
import { config, levelFromXp } from '../config';

function getHighestUnlockedRankcard(level: number): number {
  const unlocked = RANKCARD_STYLES.filter(style => level >= style.unlockLevel);
  if (unlocked.length === 0) return 1;
  return unlocked.reduce((highest, style) => 
    style.unlockLevel > highest.unlockLevel ? style : highest
  ).id;
}

export async function handleVoiceStateUpdate(
  client: ExtendedClient,
  oldState: VoiceState,
  newState: VoiceState
) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;
  
  const guildId = newState.guild.id;
  const userId = member.id;
  const userKey = `${guildId}-${userId}`;
  
  if (!oldState.channel && newState.channel) {
    startVoiceXPTimer(client, userKey, guildId, userId);
    await handleTempVoiceJoin(client, newState);
  }
  
  if (oldState.channel && !newState.channel) {
    stopVoiceXPTimer(client, userKey);
    await handleTempVoiceLeave(client, oldState);
  }
  
  if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
    await handleTempVoiceLeave(client, oldState);
    await handleTempVoiceJoin(client, newState);
  }
}

function startVoiceXPTimer(client: ExtendedClient, userKey: string, guildId: string, userId: string) {
  if (client.voiceTimers.has(userKey)) return;
  
  const timer = setInterval(() => {
    let userLevel = client.userLevels.get(userKey);
    if (!userLevel) {
      userLevel = {
        discordId: userId,
        guildId: guildId,
        xp: 0,
        level: 0,
        totalVoiceTime: 0,
        totalMusicTime: 0,
        messagesCount: 0,
        selectedRankcard: 1,
        lastXpGain: Date.now(),
      };
    }
    
    userLevel.xp += config.xp.voicePerMinute;
    userLevel.totalVoiceTime += 1;
    
    const queue = client.musicQueues.get(guildId);
    if (queue && queue.isPlaying) {
      userLevel.xp += config.xp.musicPerMinute;
      userLevel.totalMusicTime += 1;
    }
    
    const oldLevel = userLevel.level;
    const newLevel = levelFromXp(userLevel.xp);
    userLevel.level = newLevel;
    
    if (newLevel > oldLevel) {
      userLevel.selectedRankcard = getHighestUnlockedRankcard(newLevel);
    }
    
    client.userLevels.set(userKey, userLevel);
  }, 60000);
  
  client.voiceTimers.set(userKey, timer);
}

function stopVoiceXPTimer(client: ExtendedClient, userKey: string) {
  const timer = client.voiceTimers.get(userKey);
  if (timer) {
    clearInterval(timer);
    client.voiceTimers.delete(userKey);
  }
}

async function handleTempVoiceJoin(client: ExtendedClient, state: VoiceState) {
  const guild = state.guild;
  const channel = state.channel;
  const member = state.member;
  
  if (!channel || !member) return;
  
  const parentCategory = channel.parent;
  if (!parentCategory || parentCategory.name !== config.tempVoice.categoryName) return;
  
  if (channel.name === config.tempVoice.creatorChannelName) {
    try {
      const tempChannel = await guild.channels.create({
        name: `🎵 ${member.displayName}'s Channel`,
        type: ChannelType.GuildVoice,
        parent: parentCategory.id,
        userLimit: config.tempVoice.defaultUserLimit,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
            ],
          },
        ],
      });
      
      await member.voice.setChannel(tempChannel);
      
      const tempData: TempChannelData = {
        channelId: tempChannel.id,
        ownerId: member.id,
        guildId: guild.id,
        createdAt: new Date(),
        trusted: new Set(),
        blocked: new Set(),
        isLocked: false,
        userLimit: 0,
        name: tempChannel.name,
      };
      
      client.tempChannels.set(tempChannel.id, tempData);
      
    } catch (error) {
      console.error('Error creando canal temporal:', error);
    }
  }
}

async function handleTempVoiceLeave(client: ExtendedClient, state: VoiceState) {
  const channel = state.channel;
  if (!channel) return;
  
  const tempData = client.tempChannels.get(channel.id);
  if (!tempData) return;
  
  if (channel.members.size === 0) {
    try {
      await channel.delete();
      client.tempChannels.delete(channel.id);
    } catch (error) {
      console.error('Error eliminando canal temporal:', error);
    }
  }
}
