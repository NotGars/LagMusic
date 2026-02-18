import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder, 
  ChannelType, 
  PermissionFlagsBits,
  GuildMember 
} from 'discord.js';
import { Command } from '../types';
import { config } from '../config';

export const setupTempVoiceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('setuptempvoice')
    .setDescription('Configura el sistema de canales de voz temporales (Solo Admins)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Necesitas permisos de Administrador para usar este comando.')
        ],
        ephemeral: true
      });
      return;
    }
    
    await interaction.deferReply();
    
    const guild = interaction.guild!;
    
    try {
      const existingCategory = guild.channels.cache.find(
        c => c.name === config.tempVoice.categoryName && c.type === ChannelType.GuildCategory
      );
      
      if (existingCategory) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setDescription(`⚠️ El sistema TempVoice ya está configurado.\n\nCategoría existente: ${existingCategory}`)
          ]
        });
        return;
      }
      
      const category = await guild.channels.create({
        name: config.tempVoice.categoryName,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
        ],
      });
      
      const creatorChannel = await guild.channels.create({
        name: config.tempVoice.creatorChannelName,
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
        ],
      });
      
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Sistema TempVoice Configurado!')
            .setDescription('Los usuarios pueden crear canales de voz temporales uniéndose al canal creador.')
            .addFields(
              { name: '📁 Categoría', value: category.name, inline: true },
              { name: '🔊 Canal Creador', value: creatorChannel.name, inline: true }
            )
            .addFields({
              name: '📋 Comandos disponibles para dueños de canal',
              value: [
                '`/voice name <nombre>` - Renombrar canal',
                '`/voice limit <número>` - Establecer límite de usuarios',
                '`/voice lock` - Bloquear canal',
                '`/voice unlock` - Desbloquear canal',
                '`/voice trust <usuario>` - Dar confianza a usuario',
                '`/voice untrust <usuario>` - Quitar confianza',
                '`/voice kick <usuario>` - Expulsar usuario',
                '`/voice claim` - Reclamar canal abandonado',
              ].join('\n'),
              inline: false
            })
            .setFooter({ text: 'LagMusic TempVoice System' })
        ]
      });
      
    } catch (error) {
      console.error('Error configurando TempVoice:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Hubo un error configurando el sistema TempVoice.')
        ]
      });
    }
  }
};
