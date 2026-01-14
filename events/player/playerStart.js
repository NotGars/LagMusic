import { EmbedBuilder } from 'discord.js';
import { addMusicHistory } from '../../utils/musicHistory.js';

export default {
  name: 'playerStart',
  async execute(queue, track) {
    const embed = new EmbedBuilder()
      .setColor('#9b59b6')
      .setTitle('🎵 Reproduciendo ahora')
      .setDescription(`**${track.title}**\n${track.author}`)
      .addFields(
        { name: '⏱️ Duración', value: track.duration, inline: true },
        { name: '👤 Solicitado por', value: `<@${track.requestedBy.id}>`, inline: true }
      )
      .setThumbnail(track.thumbnail)
      .setTimestamp();

    await queue.metadata.channel.send({ embeds: [embed] });

    await addMusicHistory(
      track.requestedBy.id,
      queue.guild.id,
      track.title,
      track.url,
      track.author,
      track.source,
      track.durationMS ? Math.floor(track.durationMS / 1000) : 0
    );
  },
};
