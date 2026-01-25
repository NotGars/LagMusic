import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember, MessageFlags } from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';
import { connectToVoice, searchAndAddTrack, playTrack, getOrCreateQueue } from '../systems/musicPlayer';

export const karaokeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('karaoke')
    .setDescription('Busca y reproduce la versión karaoke de una canción')
    .addStringOption(option =>
      option.setName('cancion')
        .setDescription('Nombre de la canción')
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
            .setDescription('❌ Debes estar en un canal de voz para usar este comando.')
        ],
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    
    await interaction.deferReply();
    
    const songName = interaction.options.getString('cancion', true);
    const karaokeQuery = `${songName} karaoke instrumental`;
    const client = interaction.client as ExtendedClient;
    
    try {
      const queue = await connectToVoice(client, voiceChannel as any, interaction.channelId);
      
      const result = await searchAndAddTrack(karaokeQuery, member.displayName);
      
      if (!result) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setDescription('❌ No se encontró versión karaoke de esta canción.')
          ]
        });
        return;
      }
      
      if ('error' in result) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setDescription(`❌ ${result.error}`)
          ]
        });
        return;
      }
      
      const track = result;
      queue.tracks.push(track);
      
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`🎤 Versión Karaoke agregada`)
            .setDescription(`**[${track.title}](${track.url})**`)
            .addFields(
              { name: '⏱️ Duración', value: track.duration, inline: true },
              { name: '📍 Posición', value: `#${queue.tracks.length}`, inline: true }
            )
            .setThumbnail(track.thumbnail)
            .setFooter({ text: 'Versión instrumental/karaoke' })
        ]
      });
      
      if (!queue.isPlaying) {
        await playTrack(client, queue);
      }
      
    } catch (error) {
      console.error('Error en comando karaoke:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Hubo un error buscando la versión karaoke.')
        ]
      });
    }
  }
};
