import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';
import { hasPermission, getOrCreateQueue } from '../systems/musicPlayer';

export const autoplayCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Activa/desactiva reproducción automática basada en el historial'),
  
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
    const queue = getOrCreateQueue(client, interaction.guildId!);
    
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
    
    queue.autoplay = !queue.autoplay;
    
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(
            queue.autoplay
              ? `🔄 **Autoplay activado!** El bot reproducirá canciones similares automáticamente.`
              : `⏹️ **Autoplay desactivado.** La música se detendrá cuando termine la cola.`
          )
      ]
    });
  }
};
