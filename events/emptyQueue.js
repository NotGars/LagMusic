import { EmbedBuilder } from 'discord.js';

export default {
  name: 'emptyQueue',
  async execute(queue) {
    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setDescription('⏹️ La cola de reproducción ha terminado')
      .setTimestamp();

    await queue.metadata.channel.send({ embeds: [embed] });
  },
};
