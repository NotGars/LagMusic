import { addVoiceTime } from '../utils/levels.js';
import { handleTempVoiceChannel } from '../utils/tempVoice.js';

const voiceTimers = new Map();

export default {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const userId = newState.member.id;

    if (!oldState.channelId && newState.channelId) {
      voiceTimers.set(userId, {
        joinTime: Date.now(),
        channelId: newState.channelId,
      });
    }

    if (oldState.channelId && !newState.channelId) {
      const timer = voiceTimers.get(userId);
      if (timer) {
        const duration = Math.floor((Date.now() - timer.joinTime) / 1000 / 60);
        if (duration > 0) {
          await addVoiceTime(userId, newState.member.user.username, duration);
        }
        voiceTimers.delete(userId);
      }
    }

    await handleTempVoiceChannel(oldState, newState, client);
  },
};
