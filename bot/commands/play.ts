import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';
import { connectToVoice, searchAndAddTrack, searchPlaylist, playTrack, getOrCreateQueue } from '../systems/musicPlayer';

export const playCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una canción o playlist')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Nombre de la canción o URL')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('playlist')
        .setDescription('Nombre de la plataforma (YouTube, Spotify, etc.) para buscar playlist')
        .setRequired(false)
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
        ephemeral: true
      });
      return;
    }
    
    await interaction.deferReply();
    
    const query = interaction.options.getString('query', true);
    const playlistSource = interaction.options.getString('playlist');
    const client = interaction.client as ExtendedClient;
    
    try {
      const queue = await connectToVoice(client, voiceChannel as any, interaction.channelId);
      
      if (playlistSource) {
        const tracks = await searchPlaylist(query, playlistSource, member.displayName);
        
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
                { name: '📀 Fuente', value: playlistSource.toUpperCase(), inline: true }
              )
          ]
        });
      } else {
        const track = await searchAndAddTrack(query, member.displayName);
        
        if (!track) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(config.colors.error)
                .setDescription('❌ No se encontró ninguna canción con esa búsqueda.')
            ]
          });
          return;
        }
        
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
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Hubo un error al reproducir la canción.')
        ]
      });
    }
  }
};
