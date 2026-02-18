import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  VoiceChannel
} from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';

export const voiceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Gestiona tu canal de voz temporal')
    .addSubcommand(sub =>
      sub.setName('name')
        .setDescription('Cambia el nombre de tu canal')
        .addStringOption(opt =>
          opt.setName('nombre')
            .setDescription('Nuevo nombre del canal')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('limit')
        .setDescription('Establece el límite de usuarios')
        .addIntegerOption(opt =>
          opt.setName('cantidad')
            .setDescription('Límite de usuarios (0 = sin límite)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(99)
        )
    )
    .addSubcommand(sub =>
      sub.setName('lock')
        .setDescription('Bloquea tu canal')
    )
    .addSubcommand(sub =>
      sub.setName('unlock')
        .setDescription('Desbloquea tu canal')
    )
    .addSubcommand(sub =>
      sub.setName('trust')
        .setDescription('Da confianza a un usuario')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario a dar confianza')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('untrust')
        .setDescription('Quita confianza a un usuario')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario a quitar confianza')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('kick')
        .setDescription('Expulsa a un usuario de tu canal')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario a expulsar')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('block')
        .setDescription('Bloquea a un usuario de tu canal')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario a bloquear')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('unblock')
        .setDescription('Desbloquea a un usuario')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario a desbloquear')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('claim')
        .setDescription('Reclama un canal abandonado')
    )
    .addSubcommand(sub =>
      sub.setName('transfer')
        .setDescription('Transfiere la propiedad del canal')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Nuevo dueño del canal')
            .setRequired(true)
        )
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel as VoiceChannel;
    
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
    const tempData = client.tempChannels.get(voiceChannel.id);
    
    if (!tempData) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Este no es un canal temporal.')
        ],
        ephemeral: true
      });
      return;
    }
    
    const subcommand = interaction.options.getSubcommand();
    const isOwner = tempData.ownerId === member.id;
    
    if (!isOwner && subcommand !== 'claim') {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Solo el dueño del canal puede usar este comando.')
        ],
        ephemeral: true
      });
      return;
    }
    
    try {
      switch (subcommand) {
        case 'name': {
          const newName = interaction.options.getString('nombre', true);
          await voiceChannel.setName(newName);
          tempData.name = newName;
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`✅ Canal renombrado a: **${newName}**`)
            ]
          });
          break;
        }
        
        case 'limit': {
          const limit = interaction.options.getInteger('cantidad', true);
          await voiceChannel.setUserLimit(limit);
          tempData.userLimit = limit;
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`✅ Límite de usuarios: **${limit === 0 ? 'Sin límite' : limit}**`)
            ]
          });
          break;
        }
        
        case 'lock': {
          await voiceChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
            Connect: false
          });
          tempData.isLocked = true;
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription('🔒 Canal bloqueado.')
            ]
          });
          break;
        }
        
        case 'unlock': {
          await voiceChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
            Connect: true
          });
          tempData.isLocked = false;
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription('🔓 Canal desbloqueado.')
            ]
          });
          break;
        }
        
        case 'trust': {
          const trustUser = interaction.options.getUser('usuario', true);
          tempData.trusted.add(trustUser.id);
          
          await voiceChannel.permissionOverwrites.edit(trustUser.id, {
            Connect: true,
            Speak: true
          });
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`✅ ${trustUser} ahora tiene confianza en este canal.`)
            ]
          });
          break;
        }
        
        case 'untrust': {
          const untrustUser = interaction.options.getUser('usuario', true);
          tempData.trusted.delete(untrustUser.id);
          
          await voiceChannel.permissionOverwrites.delete(untrustUser.id);
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`✅ ${untrustUser} ya no tiene confianza.`)
            ]
          });
          break;
        }
        
        case 'kick': {
          const kickUser = interaction.options.getUser('usuario', true);
          const kickMember = interaction.guild?.members.cache.get(kickUser.id);
          
          if (kickMember?.voice.channelId === voiceChannel.id) {
            await kickMember.voice.disconnect();
          }
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`👢 ${kickUser} ha sido expulsado del canal.`)
            ]
          });
          break;
        }
        
        case 'block': {
          const blockUser = interaction.options.getUser('usuario', true);
          tempData.blocked.add(blockUser.id);
          
          await voiceChannel.permissionOverwrites.edit(blockUser.id, {
            Connect: false
          });
          
          const blockMember = interaction.guild?.members.cache.get(blockUser.id);
          if (blockMember?.voice.channelId === voiceChannel.id) {
            await blockMember.voice.disconnect();
          }
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`🚫 ${blockUser} ha sido bloqueado del canal.`)
            ]
          });
          break;
        }
        
        case 'unblock': {
          const unblockUser = interaction.options.getUser('usuario', true);
          tempData.blocked.delete(unblockUser.id);
          
          await voiceChannel.permissionOverwrites.delete(unblockUser.id);
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`✅ ${unblockUser} ha sido desbloqueado.`)
            ]
          });
          break;
        }
        
        case 'claim': {
          const ownerInChannel = voiceChannel.members.has(tempData.ownerId);
          
          if (ownerInChannel) {
            await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(config.colors.error)
                  .setDescription('❌ El dueño del canal todavía está presente.')
              ],
              ephemeral: true
            });
            return;
          }
          
          tempData.ownerId = member.id;
          
          await voiceChannel.permissionOverwrites.edit(member.id, {
            ManageChannels: true,
            MoveMembers: true,
            MuteMembers: true,
            DeafenMembers: true
          });
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`👑 ${member} es ahora el dueño del canal.`)
            ]
          });
          break;
        }
        
        case 'transfer': {
          const newOwner = interaction.options.getUser('usuario', true);
          const newOwnerMember = interaction.guild?.members.cache.get(newOwner.id);
          
          if (!newOwnerMember?.voice.channelId || newOwnerMember.voice.channelId !== voiceChannel.id) {
            await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(config.colors.error)
                  .setDescription('❌ El usuario debe estar en el canal.')
              ],
              ephemeral: true
            });
            return;
          }
          
          await voiceChannel.permissionOverwrites.delete(member.id);
          
          await voiceChannel.permissionOverwrites.edit(newOwner.id, {
            ManageChannels: true,
            MoveMembers: true,
            MuteMembers: true,
            DeafenMembers: true
          });
          
          tempData.ownerId = newOwner.id;
          
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`👑 ${newOwner} es ahora el dueño del canal.`)
            ]
          });
          break;
        }
      }
      
      client.tempChannels.set(voiceChannel.id, tempData);
      
    } catch (error) {
      console.error('Error en comando voice:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Hubo un error ejecutando el comando.')
        ],
        ephemeral: true
      });
    }
  }
};
