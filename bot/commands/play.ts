import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';
import { connectToVoice, searchAndAddTrack, searchPlaylist, playTrack, getOrCreateQueue } from '../systems/musicPlayer';

export const playCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una canción o playlist de YouTube')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Nombre de la canción o URL de YouTube')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('playlist')
        .setDescription('Buscar como playlist en YouTube')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;
    
    if (!voiceChannel) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Debes estar en un canal de voz para usar este comando.')
        ]
      });
      return;
    }
    
    const query = interaction.options.getString('query', true);
    const isPlaylist = interaction.options.getBoolean('playlist') || false;
    const client = interaction.client as ExtendedClient;
    
    try {
      const queue = await connectToVoice(client, voiceChannel as any, interaction.channelId);
      
      if (isPlaylist || query.includes('youtube.com/playlist')) {
        const playlistResult = await searchPlaylist(query, 'youtube', member.displayName);
        
        if ('error' in playlistResult) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.error)
                .setDescription(`❌ ${playlistResult.error}`)
            ]
          });
          return;
        }
        
        const tracks = playlistResult;
        if (tracks.length === 0) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.error)
                .setDescription('❌ No se encontró la playlist o no tiene canciones.')
            ]
          });
          return;
        }
        
        queue.tracks.push(...tracks);
        
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.success)
              .setTitle(`${config.emojis.queue} Playlist agregada`)
              .setDescription(`Se agregaron **${tracks.length}** canciones a la cola.`)
              .addFields(
                { name: '🎵 Primera canción', value: tracks[0].title, inline: true },
                { name: '📀 Fuente', value: 'YOUTUBE', inline: true }
              )
          ]
        });
      } else {
        const result = await searchAndAddTrack(query, member.displayName);
        
        if (!result) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.error)
                .setDescription('❌ No se encontró ninguna canción con esa búsqueda.')
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
        
        const position = queue.tracks.length;
        
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.success)
              .setTitle(`${config.emojis.music} Canción agregada`)
              .setDescription(`**[${track.title}](${track.url})**`)
              .addFields(
                { name: '⏱️ Duración', value: track.duration, inline: true },
                { name: '📍 Posición', value: `#${position}`, inline: true },
                { name: '📀 Fuente', value: track.source.toUpperCase(), inline: true }
              )
              .setThumbnail(track.thumbnail)
          ]
        });
      }
      
      if (!queue.isPlaying) {
        await playTrack(client, queue);
      }
      
    } catch (error) {
      console.error('Error en comando play:', error);
      try {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setDescription('❌ Hubo un error al reproducir la canción.')
          ]
        });
      } catch (e: any) {
        if (e?.code !== 10062 && e?.code !== 40060) console.error('Error editReply play:', e);
      }
    }
  }
};
