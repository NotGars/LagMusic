import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { Command } from '../types';
import { config } from '../config';
import { hasPermission } from '../systems/musicPlayer';
import { client } from '../index';

export const stopBucleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('stopbucle')
    .setDescription('Desactiva el bucle de la canción actual'),
  
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
    
    const queue = client.musicQueues.get(interaction.guildId!);
    
    if (!queue) {
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
    
    if (!queue.loop) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription('⚠️ El bucle no está activado.')
        ],
        ephemeral: true
      });
      return;
    }
    
    queue.loop = false;
    
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${config.emojis.stop} Bucle desactivado.`)
      ]
    });
  }
};
