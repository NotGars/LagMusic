import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types';
import { config } from '../config';
import { client } from '../index';

export const nowplayingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Muestra la canción que está sonando actualmente'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = client.musicQueues.get(interaction.guildId!);
    
    if (!queue || !queue.currentTrack) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ No hay música reproduciéndose.')
        ],
        ephemeral: true
      });
      return;
    }
    
    const track = queue.currentTrack;
    
    const statusParts = [];
    if (queue.isPaused) statusParts.push(`${config.emojis.pause} Pausado`);
    if (queue.loop) statusParts.push(`${config.emojis.loopOne} Bucle`);
    if (queue.autoplay) statusParts.push('🔄 Autoplay');
    
    const embed = new EmbedBuilder()
      .setColor(config.colors.music)
      .setTitle(`${queue.isPaused ? config.emojis.pause : config.emojis.music} ${queue.isPaused ? 'Pausado' : 'Reproduciendo ahora'}`)
      .setDescription(`**[${track.title}](${track.url})**`)
      .addFields(
        { name: '⏱️ Duración', value: track.duration, inline: true },
        { name: '🎧 Pedido por', value: track.requestedBy, inline: true },
        { name: '📀 Fuente', value: track.source.toUpperCase(), inline: true }
      )
      .setThumbnail(track.thumbnail)
      .setTimestamp();
    
    if (statusParts.length > 0) {
      embed.addFields({
        name: '⚙️ Estado',
        value: statusParts.join(' • '),
        inline: false
      });
    }
    
    if (queue.tracks.length > 0) {
      embed.addFields({
        name: '⏭️ Siguiente',
        value: queue.tracks[0].title,
        inline: false
      });
    }
    
    await interaction.reply({ embeds: [embed] });
  }
};
