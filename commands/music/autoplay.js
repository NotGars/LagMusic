import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getRecommendations } from '../../utils/musicHistory.js';

export default {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Reproduce música automáticamente según tu historial'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.editReply({
        content: '❌ Debes estar en un canal de voz.',
      });
    }

    try {
      const topArtists = await getRecommendations(interaction.user.id, 5);

      if (topArtists.length === 0) {
        return interaction.editReply({
          content: '❌ No hay suficiente historial. Reproduce canciones primero.',
        });
      }

      const artist = topArtists[0];
      const { track } = await client.player.play(channel, artist, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            client: interaction.guild.members.me,
            requestedBy: interaction.user,
          },
        },
      });

      const embed = new EmbedBuilder()
        .setColor('#1abc9c')
        .setTitle('🎵 Autoplay activado')
        .setDescription(`Basado en tu artista favorito: **${artist}**`)
        .addFields({
          name: 'Reproduciendo ahora',
          value: `**${track.title}**\n${track.author}`,
        })
        .setThumbnail(track.thumbnail)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en autoplay:', error);
      return interaction.editReply({
        content: '❌ Error al activar autoplay.',
      });
    }
  },
};
