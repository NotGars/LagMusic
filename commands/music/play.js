import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una canción o playlist')
    .addStringOption((option) =>
      option
        .setName('cancion')
        .setDescription('Nombre de la canción o URL')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.editReply({
        content: '❌ Debes estar en un canal de voz para usar este comando.',
        ephemeral: true,
      });
    }

    const query = interaction.options.getString('cancion');

    try {
      const { track, searchResult } = await client.player.play(channel, query, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            client: interaction.guild.members.me,
            requestedBy: interaction.user,
          },
        },
      });

      const queue = useQueue(interaction.guild.id);

      if (searchResult.playlist) {
        const embed = new EmbedBuilder()
          .setColor('#9b59b6')
          .setTitle('📃 Playlist añadida a la cola')
          .setDescription(`**${searchResult.playlist.title}**`)
          .addFields(
            { name: '🎵 Canciones', value: `${searchResult.playlist.tracks.length}`, inline: true },
            { name: '👤 Solicitado por', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setThumbnail(searchResult.playlist.thumbnail)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor('#9b59b6')
          .setTitle(queue.size > 1 ? '➕ Añadido a la cola' : '🎵 Reproduciendo ahora')
          .setDescription(`**${track.title}**\n${track.author}`)
          .addFields(
            { name: '⏱️ Duración', value: track.duration, inline: true },
            { name: '👤 Solicitado por', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setThumbnail(track.thumbnail)
          .setFooter({ text: queue.size > 1 ? `Posición en cola: ${queue.size}` : '' })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error en comando play:', error);
      return interaction.editReply({
        content: '❌ No se pudo reproducir la canción. Intenta con otra búsqueda.',
      });
    }
  },
};
