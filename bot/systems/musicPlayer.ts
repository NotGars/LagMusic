import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  StreamType,
} from '@discordjs/voice';
import yts from 'yt-search';
import { VoiceChannel, TextChannel, EmbedBuilder, GuildMember } from 'discord.js';
import { ExtendedClient, MusicQueue, Track } from '../types';
import { config } from '../config';
import {
  isSpotifyUrl,
  isSpotifyTrackUrl,
  isSpotifyPlaylistUrl,
  isSpotifyAlbumUrl,
  getSpotifyTrackInfo,
  getSpotifyPlaylistTracks,
  getSpotifyAlbumTracks,
} from './spotifyClient';
import { getAudioStream } from './audioClient';

console.log('[MusicPlayer] Inicializado con Piped + Cobalt (audioClient)');

export function getOrCreateQueue(client: ExtendedClient, guildId: string): MusicQueue {
  let queue = client.musicQueues.get(guildId);
  if (!queue) {
    queue = {
      guildId,
      textChannelId: '',
      voiceChannelId: '',
      connection: null,
      player: null,
      tracks: [],
      currentTrack: null,
      volume: 100,
      loop: false,
      shuffle: false,
      autoplay: false,
      history: [],
      isPlaying: false,
      isPaused: false,
      currentCleanup: null,
    };
    client.musicQueues.set(guildId, queue);
  }
  return queue;
}

export async function connectToVoice(client: ExtendedClient, voiceChannel: VoiceChannel, textChannelId: string): Promise<MusicQueue> {
  const queue = getOrCreateQueue(client, voiceChannel.guild.id);
  
  if (!queue.connection) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      daveEncryption: false,
    });
    
    queue.connection = connection;
    queue.voiceChannelId = voiceChannel.id;
    queue.textChannelId = textChannelId;
    
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });
    
    queue.player = player;
    connection.subscribe(player);
    
    player.on(AudioPlayerStatus.Idle, async () => {
      await handleTrackEnd(client, queue);
    });
    
    player.on('error', async (error) => {
      console.error('[MusicPlayer] Error en el reproductor:', error);
      
      if (queue.currentCleanup) {
        queue.currentCleanup();
        queue.currentCleanup = null;
      }
      
      const retryCount = (queue as any)._retryCount || 0;
      const currentTrack = queue.currentTrack;
      
      if (retryCount < 2 && currentTrack) {
        (queue as any)._retryCount = retryCount + 1;
        console.log(`[MusicPlayer] Reintentando reproducción (intento ${retryCount + 1}/2)...`);
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        
        queue.tracks.unshift(currentTrack);
        queue.currentTrack = null;
        await playTrack(client, queue);
      } else {
        (queue as any)._retryCount = 0;
        
        const textChannel = await client.channels.fetch(queue.textChannelId) as TextChannel;
        if (textChannel) {
          await textChannel.send({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.error)
              .setDescription('❌ Error durante la reproducción. Saltando a la siguiente canción...')]
          });
        }
        
        await handleTrackEnd(client, queue);
      }
    });
    
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch {
        destroyQueue(client, voiceChannel.guild.id);
      }
    });
  }
  
  return queue;
}

function isYouTubeUrl(query: string): boolean {
  return query.includes('youtube.com') || query.includes('youtu.be');
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isSoundCloudUrl(query: string): boolean {
  return query.includes('soundcloud.com');
}


export async function searchAndAddTrack(query: string, requestedBy: string): Promise<Track | null | { error: string }> {
  try {
    if (isSoundCloudUrl(query)) {
      return { error: 'SoundCloud no está soportado actualmente. Por favor usa búsquedas de YouTube o URLs de YouTube.' };
    }
    
    if (isSpotifyUrl(query)) {
      if (isSpotifyTrackUrl(query)) {
        const spotifyInfo = await getSpotifyTrackInfo(query);
        if (!spotifyInfo) {
          return { error: 'No se pudo obtener información de Spotify. Verifica que las credenciales estén configuradas.' };
        }
        
        console.log(`Buscando en YouTube: ${spotifyInfo.searchQuery}`);
        const searchResult = await yts(spotifyInfo.searchQuery);
        
        if (!searchResult.videos || searchResult.videos.length === 0) {
          return { error: `No se encontró "${spotifyInfo.title}" en YouTube.` };
        }
        
        const video = searchResult.videos[0];
        return {
          title: `${spotifyInfo.title} - ${spotifyInfo.artist}`,
          url: video.url,
          duration: formatDuration(video.seconds),
          thumbnail: spotifyInfo.thumbnail || video.thumbnail || '',
          requestedBy,
          source: 'spotify',
        };
      } else if (isSpotifyPlaylistUrl(query) || isSpotifyAlbumUrl(query)) {
        return { error: 'Para playlists y álbumes de Spotify, usa el comando con la opción de fuente "spotify".' };
      }
      return { error: 'URL de Spotify no válida.' };
    }

    let videoInfo: { title: string; url: string; duration: { seconds: number }; thumbnail: string };

    if (isYouTubeUrl(query)) {
      const videoId = extractVideoId(query);
      if (!videoId) {
        return { error: 'URL de YouTube inválida. Verifica el enlace.' };
      }
      
      try {
        const info = await yts({ videoId });
        if (!info) {
          return { error: 'No se pudo obtener información del video.' };
        }
        const canonicalUrl = info.url || `https://www.youtube.com/watch?v=${videoId}`;
        videoInfo = {
          title: info.title || 'Título desconocido',
          url: canonicalUrl,
          duration: { seconds: info.seconds || 0 },
          thumbnail: info.thumbnail || '',
        };
      } catch (error: any) {
        console.error('Error getting video info:', error.message);
        return { error: 'No se pudo obtener información del video. Intenta con otro enlace.' };
      }
    } else {
      const searchResult = await yts(query);
      
      if (!searchResult.videos || searchResult.videos.length === 0) {
        console.log('No se encontraron resultados para:', query);
        return null;
      }
      
      const video = searchResult.videos[0];
      videoInfo = {
        title: video.title,
        url: video.url,
        duration: { seconds: video.seconds },
        thumbnail: video.thumbnail || '',
      };
    }

    return {
      title: videoInfo.title,
      url: videoInfo.url,
      duration: formatDuration(videoInfo.duration.seconds),
      thumbnail: videoInfo.thumbnail,
      requestedBy,
      source: 'youtube',
    };
  } catch (error: any) {
    console.error('Error buscando canción:', error.message || error);
    return null;
  }
}

export async function searchPlaylist(query: string, source: string, requestedBy: string): Promise<Track[] | { error: string }> {
  const tracks: Track[] = [];
  
  if (isSoundCloudUrl(query) || source.toLowerCase() === 'soundcloud') {
    return { error: 'SoundCloud no está soportado actualmente. Por favor usa playlists de YouTube.' };
  }
  
  if (isSpotifyUrl(query) || source.toLowerCase() === 'spotify') {
    
    let spotifyTracks: Awaited<ReturnType<typeof getSpotifyPlaylistTracks>> = [];
    
    if (isSpotifyPlaylistUrl(query)) {
      spotifyTracks = await getSpotifyPlaylistTracks(query);
    } else if (isSpotifyAlbumUrl(query)) {
      spotifyTracks = await getSpotifyAlbumTracks(query);
    } else {
      return { error: 'URL de Spotify no válida. Usa un enlace de playlist o álbum.' };
    }
    
    if (spotifyTracks.length === 0) {
      return { error: 'No se pudieron obtener las canciones de Spotify.' };
    }
    
    console.log(`Procesando ${spotifyTracks.length} canciones de Spotify...`);
    
    for (const spotifyTrack of spotifyTracks.slice(0, 50)) {
      try {
        const searchResult = await yts(spotifyTrack.searchQuery);
        if (searchResult.videos && searchResult.videos.length > 0) {
          const video = searchResult.videos[0];
          tracks.push({
            title: `${spotifyTrack.title} - ${spotifyTrack.artist}`,
            url: video.url,
            duration: formatDuration(video.seconds),
            thumbnail: spotifyTrack.thumbnail || video.thumbnail || '',
            requestedBy,
            source: 'spotify',
          });
        }
      } catch (error) {
        console.error(`Error buscando: ${spotifyTrack.searchQuery}`, error);
      }
    }
    
    return tracks.length > 0 ? tracks : { error: 'No se encontraron canciones en YouTube.' };
  }
  
  try {
    if (query.includes('youtube.com/playlist')) {
      const playlistId = query.match(/[?&]list=([^&]+)/)?.[1];
      if (playlistId) {
        const searchResult = await yts({ listId: playlistId });
        
        if (searchResult && searchResult.videos) {
          for (const video of searchResult.videos.slice(0, 50)) {
            tracks.push({
              title: video.title,
              url: `https://www.youtube.com/watch?v=${video.videoId}`,
              duration: formatDuration(video.seconds || 0),
              thumbnail: video.thumbnail || '',
              requestedBy,
              source: 'youtube',
            });
          }
        }
      }
    } else {
      const searchResult = await yts(`${query} playlist`);
      if (searchResult.playlists && searchResult.playlists.length > 0) {
        const playlist = searchResult.playlists[0];
        const playlistDetails = await yts({ listId: playlist.listId });
        
        if (playlistDetails && playlistDetails.videos) {
          for (const video of playlistDetails.videos.slice(0, 50)) {
            tracks.push({
              title: video.title,
              url: `https://www.youtube.com/watch?v=${video.videoId}`,
              duration: formatDuration(video.seconds || 0),
              thumbnail: video.thumbnail || '',
              requestedBy,
              source: 'youtube',
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cargando playlist:', error);
  }
  
  return tracks;
}

export async function playTrack(client: ExtendedClient, queue: MusicQueue): Promise<boolean> {
  if (!queue.player || !queue.connection) return false;
  
  if (queue.tracks.length === 0) {
    queue.isPlaying = false;
    queue.currentTrack = null;
    
    if (queue.autoplay && queue.history.length > 0) {
      const lastTrack = queue.history[queue.history.length - 1];
      const searchResult = await yts(lastTrack.title);
      
      if (searchResult.videos && searchResult.videos.length > 1) {
        const randomIndex = Math.floor(Math.random() * Math.min(5, searchResult.videos.length - 1)) + 1;
        const randomVideo = searchResult.videos[randomIndex];
        const track: Track = {
          title: randomVideo.title,
          url: randomVideo.url,
          duration: formatDuration(randomVideo.seconds),
          thumbnail: randomVideo.thumbnail || '',
          requestedBy: 'Autoplay',
          source: 'youtube',
        };
        queue.tracks.push(track);
      }
    }
    
    if (queue.tracks.length === 0) return false;
  }
  
  const track = queue.tracks.shift()!;
  queue.currentTrack = track;
  queue.history.push(track);
  
  if (queue.history.length > 50) {
    queue.history.shift();
  }
  
  try {
    console.log('[MusicPlayer] Intentando reproducir:', track.title);
    console.log('[MusicPlayer] URL original:', track.url);
    
    const streamResult = await getAudioStream(track.url);
    
    if (!streamResult) {
      throw new Error('No se pudo obtener el stream de audio (Piped/Cobalt)');
    }
    
    queue.currentCleanup = streamResult.cleanup;
    
    const resource = createAudioResource(streamResult.stream, {
      inputType: StreamType.Raw,
      inlineVolume: true,
    });
    
    queue.player.play(resource);
    queue.isPlaying = true;
    queue.isPaused = false;
    (queue as any)._retryCount = 0;
    
    const textChannel = await client.channels.fetch(queue.textChannelId) as TextChannel;
    if (textChannel) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.music)
        .setTitle(`${config.emojis.music} Reproduciendo ahora`)
        .setDescription(`**[${track.title}](${track.url})**`)
        .addFields(
          { name: '⏱️ Duración', value: track.duration, inline: true },
          { name: '🎧 Pedido por', value: track.requestedBy, inline: true },
          { name: '📀 Fuente', value: track.source.toUpperCase(), inline: true }
        )
        .setThumbnail(track.thumbnail)
        .setTimestamp();
      
      await textChannel.send({ embeds: [embed] });
    }
    
    return true;
  } catch (error: any) {
    console.error('[MusicPlayer] Error reproduciendo canción:', error.message || error);
    
    const textChannel = await client.channels.fetch(queue.textChannelId) as TextChannel;
    if (textChannel) {
      await textChannel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription('❌ Error al reproducir. Saltando a la siguiente canción...')]
      });
    }
    
    if (queue.tracks.length > 0) {
      return playTrack(client, queue);
    }
    queue.isPlaying = false;
    return false;
  }
}

async function handleTrackEnd(client: ExtendedClient, queue: MusicQueue) {
  if (queue.currentCleanup) {
    queue.currentCleanup();
    queue.currentCleanup = null;
  }
  
  if (queue.loop && queue.currentTrack) {
    queue.tracks.unshift(queue.currentTrack);
  }
  
  if (queue.tracks.length > 0 || queue.autoplay) {
    await playTrack(client, queue);
  } else {
    queue.isPlaying = false;
    queue.currentTrack = null;
    
    const textChannel = await client.channels.fetch(queue.textChannelId) as TextChannel;
    if (textChannel) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setDescription(`${config.emojis.queue} La cola ha terminado. Usa \`/play\` para agregar más canciones.`);
      
      await textChannel.send({ embeds: [embed] });
    }
  }
}

export function shuffleQueue(queue: MusicQueue): void {
  for (let i = queue.tracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
  }
}

export function destroyQueue(client: ExtendedClient, guildId: string): void {
  const queue = client.musicQueues.get(guildId);
  if (queue) {
    if (queue.currentCleanup) {
      queue.currentCleanup();
      queue.currentCleanup = null;
    }
    queue.player?.stop();
    queue.connection?.destroy();
    client.musicQueues.delete(guildId);
    client.voteskips.delete(guildId);
  }
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function isChannelOwner(client: ExtendedClient, channelId: string, userId: string): boolean {
  const tempData = client.tempChannels.get(channelId);
  return tempData?.ownerId === userId;
}

export function hasPermission(client: ExtendedClient, guildId: string, channelId: string, userId: string): boolean {
  const tempData = client.tempChannels.get(channelId);
  if (!tempData) return true;
  
  if (tempData.ownerId === userId) return true;
  
  const permKey = `${guildId}-${channelId}`;
  const permissions = client.permissions.get(permKey);
  return permissions?.has(userId) || false;
}
