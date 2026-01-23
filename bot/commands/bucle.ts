import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';
import { hasPermission } from '../systems/musicPlayer';

export const bucleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('bucle')
    .setDescription('Activa la repetición de la canción actual'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;
    
    if (!voiceChannel) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Debes estar en un canal de voz.')
        ],
        ephemeral: true
      });
      return;
    }
    
    const client = interaction.client as ExtendedClient;
    const queue = client.musicQueues.get(interaction.guildId!);
    
    if (!queue || !queue.isPlaying) {
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
    
    if (!hasPermission(client, interaction.guildId!, voiceChannel.id, member.id)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ No tienes permiso para usar este comando.')
        ],
        ephemeral: true
      });
      return;
    }
    
    queue.loop = true;
    
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${config.emojis.loopOne} Bucle activado para: **${queue.currentTrack?.title || 'Canción actual'}**`)
          .setFooter({ text: 'Usa /stop bucle para desactivar' })
      ]
    });
  }
};
