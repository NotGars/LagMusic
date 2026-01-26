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
import play from 'play-dl';
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
  getSpotifyClient,
} from './spotifyClient';

// Initialize play-dl with cookies if available
async function initPlayDl() {
  try {
    // Set YouTube cookies for authentication
    if (process.env.YOUTUBE_COOKIES) {
      const cookies = JSON.parse(process.env.YOUTUBE_COOKIES);
      // Convert cookie array to cookie string format for play-dl
      const cookieString = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
      
      await play.setToken({
        youtube: {
          cookie: cookieString
        }
      });
      console.log('play-dl initialized with YouTube cookies');
    } else {
      console.log('play-dl initialized without cookies');
    }
  } catch (error) {
    console.warn('Warning: Failed to initialize play-dl with cookies:', error);
    console.log('Continuing without YouTube authentication...');
  }
}
initPlayDl();

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
    
    player.on('error', (error) => {
      console.error('Error en el reproductor:', error);
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

function isSpotifyUrlLocal(query: string): boolean {
  return query.includes('spotify.com');
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
        const info = await play.video_basic_info(query);
        videoInfo = {
          title: info.video_details.title || 'Título desconocido',
          url: info.video_details.url,
          duration: { seconds: info.video_details.durationInSec },
          thumbnail: info.video_details.thumbnails[0]?.url || '',
        };
      } catch (error: any) {
        console.error('Error getting video info:', error.message);
        if (error.message?.includes('Sign in') || error.message?.includes('age')) {
          return { error: 'Este video requiere iniciar sesión o tiene restricción de edad.' };
        }
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
    const spotify = await getSpotifyClient();
    if (!spotify) {
      return { error: 'Spotify no está configurado. Necesitas agregar SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET.' };
    }
    
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
    console.log('Intentando reproducir URL:', track.url);
    
    // Validate the URL first
    const validated = await play.validate(track.url);
    console.log('URL validada como:', validated);
    
    if (validated === false) {
      throw new Error('Invalid URL');
    }
    
    const streamInfo = await play.stream(track.url);
    
    const resource = createAudioResource(streamInfo.stream, {
      inputType: streamInfo.type,
    });
    
    queue.player.play(resource);
    queue.isPlaying = true;
    queue.isPaused = false;
    
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
    console.error('Error reproduciendo canción:', error.message || error);
    
    const textChannel = await client.channels.fetch(queue.textChannelId) as TextChannel;
    if (textChannel) {
      if (error.message?.includes('403') || error.message?.includes('Status code: 403')) {
        await textChannel.send({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ YouTube bloqueó el acceso a este video. Esto puede pasar con videos con restricciones o por límites de solicitudes. Intenta con otro video.')]
        });
      } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        await textChannel.send({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ YouTube está bloqueando las solicitudes. Intenta de nuevo en unos minutos.')]
        });
      } else {
        await textChannel.send({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Error al reproducir. Saltando a la siguiente canción...')]
        });
      }
    }
    
    if (queue.tracks.length > 0) {
      return playTrack(client, queue);
    }
    queue.isPlaying = false;
    return false;
  }
}

async function handleTrackEnd(client: ExtendedClient, queue: MusicQueue) {
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
