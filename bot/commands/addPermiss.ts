import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';
import { isChannelOwner } from '../systems/musicPlayer';

export const addPermissCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('addpermiss')
    .setDescription('Da permisos a un usuario para controlar la música')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario al que dar permisos')
        .setRequired(true)
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
    
    const client = interaction.client as ExtendedClient;
    
    if (!isChannelOwner(client, voiceChannel.id, member.id)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Solo el creador del canal puede usar este comando.')
        ],
        ephemeral: true
      });
      return;
    }
    
    const targetUser = interaction.options.getUser('usuario', true);
    
    const permKey = `${interaction.guildId}-${voiceChannel.id}`;
    let permissions = client.permissions.get(permKey);
    
    if (!permissions) {
      permissions = new Set();
      client.permissions.set(permKey, permissions);
    }
    
    if (permissions.has(targetUser.id)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`⚠️ ${targetUser} ya tiene permisos de música.`)
        ],
        ephemeral: true
      });
      return;
    }
    
    permissions.add(targetUser.id);
    
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`✅ ${targetUser} ahora puede usar \`/skip\`, \`/stop\`, \`/pause\` y \`/resume\`.`)
      ]
    });
  }
};
