export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  
  colors: {
    primary: 0x9B59B6,
    success: 0x2ECC71,
    error: 0xE74C3C,
    warning: 0xF39C12,
    info: 0x3498DB,
    music: 0x9B59B6,
    level: 0x8E44AD,
  },
  
  emojis: {
    play: '▶️',
    pause: '⏸️',
    stop: '⏹️',
    skip: '⏭️',
    previous: '⏮️',
    shuffle: '🔀',
    loop: '🔁',
    loopOne: '🔂',
    volume: '🔊',
    queue: '📜',
    music: '🎵',
    level: '📈',
    trophy: '🏆',
  },
  
  xp: {
    voicePerMinute: 2,
    musicPerMinute: 3,
    messageMin: 5,
    messageMax: 15,
    cooldown: 60000,
  },
  
  levels: {
    rankcard1Unlock: 0,
    rankcard2Unlock: 25,
    rankcard3Unlock: 50,
  },
  
  tempVoice: {
    categoryName: 'Temp Channels',
    creatorChannelName: '➕ Create Voice',
    defaultUserLimit: 0,
  },
};

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function levelFromXp(xp: number): number {
  let level = 0;
  let totalXpNeeded = 0;
  while (totalXpNeeded <= xp) {
    level++;
    totalXpNeeded += xpForLevel(level);
  }
  return level - 1;
}
