import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('karaoke')
    .setDescription('Versión karaoke de una canción')
    .addStringOption((option) => option.setName('cancion').setDescription('Nombre de la canción').setRequired(true)),
  async execute(interaction, client) {
    await interaction.deferReply();

    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.editReply({ content: '❌ Debes estar en un canal de voz.' });

    const query = `${interaction.options.getString('cancion')} karaoke instrumental`;

    try {
      const { track } = await client.player.play(channel, query, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            client: interaction.guild.members.me,
            requestedBy: interaction.user,
          },
        },
      });

      const embed = new EmbedBuilder()
        .setColor('#e91e63')
        .setTitle('🎤 Modo Karaoke')
        .setDescription(`**${track.title}**\n${track.author}`)
        .addFields({ name: '⏱️ Duración', value: track.duration, inline: true })
        .setThumbnail(track.thumbnail)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error karaoke:', error);
      return interaction.editReply({ content: '❌ No se encontró versión karaoke.' });
    }
  },
};
