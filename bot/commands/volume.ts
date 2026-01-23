import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { Command } from '../types';
import { config } from '../config';
import { hasPermission, getOrCreateQueue } from '../systems/musicPlayer';
import { client } from '../index';

export const volumeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Ajusta el volumen de la música')
    .addIntegerOption(option =>
      option.setName('nivel')
        .setDescription('Nivel de volumen (0-100)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    ),
  
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
    
    const volume = interaction.options.getInteger('nivel', true);
    queue.volume = volume;
    
    let volumeEmoji = '🔊';
    if (volume === 0) volumeEmoji = '🔇';
    else if (volume < 30) volumeEmoji = '🔈';
    else if (volume < 70) volumeEmoji = '🔉';
    
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${volumeEmoji} Volumen ajustado a **${volume}%**`)
      ]
    });
  }
};
