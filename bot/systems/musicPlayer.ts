import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  VoiceConnection,
  StreamType,
} from '@discordjs/voice';
import yts from 'yt-search';
import { VoiceChannel, TextChannel, EmbedBuilder, GuildMember, Message } from 'discord.js';
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
import { prefetchSong, SongError } from './songStore';

console.log('[MusicPlayer] Inicializado (yt-dlp + canal de canciones)');

/** '3:25' / '1:02:10' -> segundos (0 si no se entiende). */
function parseDuration(text: string): number {
  const parts = (text || '').split(':').map((n) => parseInt(n, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

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

/** Error de conexión de voz con un mensaje listo para mostrarle al usuario. */
export class VoiceConnectError extends Error {}

const VOICE_READY_TIMEOUT_MS = Number(process.env.VOICE_READY_TIMEOUT_MS) || 20_000;

/** Espera a que la conexión de voz esté lista; si no lo logra, limpia todo y lanza VoiceConnectError con el motivo. */
async function waitForVoiceReady(client: ExtendedClient, connection: VoiceConnection, guildId: string): Promise<void> {
  if (connection.state.status === VoiceConnectionStatus.Ready) return;
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, VOICE_READY_TIMEOUT_MS);
  } catch {
    const st: any = connection.state;
    const code = st.closeCode;
    console.error(`[Voice] No llegó a Ready (estado: ${st.status}${code ? `, código ${code}` : ''})`);
    destroyQueue(client, guildId);
    if (code === 4017) {
      throw new VoiceConnectError('Discord exige el cifrado DAVE para la voz y al bot le falta soportarlo (`@snazzah/davey`). Avisa al dueño del bot.');
    }
    throw new VoiceConnectError(
      `No pude conectarme al canal de voz${code ? ` (código ${code})` : ''}. Revisa que tenga permisos de **Conectar** y **Hablar** ahí.`
    );
  }
}

export async function connectToVoice(client: ExtendedClient, voiceChannel: VoiceChannel, textChannelId: string): Promise<MusicQueue> {
  const guildId = voiceChannel.guild.id;
  let queue = getOrCreateQueue(client, guildId);

  // Conexión muerta de antes (nos sacaron, se cayó...): se descarta y se crea una nueva.
  if (queue.connection && queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
    destroyQueue(client, guildId);
    queue = getOrCreateQueue(client, guildId);
  }
  
  if (!queue.connection) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      // Cifrado DAVE activado (por defecto): Discord lo exige en las llamadas de voz. Necesita el paquete @snazzah/davey.
    });
    
    queue.connection = connection;
    queue.voiceChannelId = voiceChannel.id;
    queue.textChannelId = textChannelId;

    connection.on('stateChange', (oldState, newState) => {
      const ns: any = newState;
      const extra = newState.status === VoiceConnectionStatus.Disconnected ? ` (razón ${ns.reason}${ns.closeCode ? `, código ${ns.closeCode}` : ''})` : '';
      console.log(`[Voice] ${oldState.status} -> ${newState.status}${extra}`);
    });
    connection.on('error', (error) => console.error('[Voice] Error de conexión:', error.message));
    connection.on('debug', (msg) => {
      if (/DAVE/i.test(msg)) console.log('[Voice]', msg);
    });
    
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });
    
    queue.player = player;
    connection.subscribe(player);
    player.on('stateChange', (o, n) => console.log(`[Player] ${o.status} -> ${n.status}`));
    
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

  // No seguir hasta que la voz esté realmente lista (antes se decía "Reproduciendo" aunque no hubiera conexión).
  await waitForVoiceReady(client, queue.connection!, guildId);
  
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
    
    const durationSec = parseDuration(track.duration);
    let notice: Message | null = null;
    const streamResult = await getAudioStream(client, track.url, {
      title: track.title,
      durationSec,
      // Solo avisa cuando de verdad hay que bajarla (la primera vez que alguien la pide).
      onDownloading: () => {
        client.channels
          .fetch(queue.textChannelId)
          .then((ch) => (ch as TextChannel).send({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.info)
              .setDescription(`⬇️ Descargando **${track.title}**... la primera vez tarda unos segundos, luego queda guardada.`)],
          }))
          .then((m) => { notice = m; })
          .catch(() => undefined);
      },
    });
    const downloadNotice = notice as Message | null;
    if (downloadNotice) downloadNotice.delete().catch(() => undefined);

    // La descarga puede tardar: comprueba que la conexión de voz siga viva antes de reproducir.
    const conn = queue.connection;
    const sigueViva = !!conn && conn.state.status !== VoiceConnectionStatus.Destroyed && client.musicQueues.get(conn.joinConfig.guildId) === queue;
    if (!sigueViva) {
      console.warn('[MusicPlayer] La conexión de voz se cerró mientras se descargaba; no se reproduce.');
      streamResult.cleanup();
      return false;
    }
    try {
      await entersState(conn, VoiceConnectionStatus.Ready, 15_000);
    } catch {
      console.error(`[MusicPlayer] La voz no está lista (estado: ${conn.state.status}); no se reproduce.`);
      streamResult.cleanup();
      const ch = (await client.channels.fetch(queue.textChannelId).catch(() => null)) as TextChannel | null;
      await ch?.send({
        embeds: [new EmbedBuilder().setColor(config.colors.error)
          .setDescription('❌ Perdí la conexión con el canal de voz. Usa `/play` otra vez.')],
      }).catch(() => undefined);
      destroyQueue(client, conn.joinConfig.guildId);
      return false;
    }

    queue.currentCleanup = streamResult.cleanup;
    
    const resource = createAudioResource(streamResult.stream, {
      inputType: streamResult.inputType ?? StreamType.Raw,
      inlineVolume: true,
    });
    
    queue.player.play(resource);
    queue.isPlaying = true;
    queue.isPaused = false;
    (queue as any)._retryCount = 0;

    // Mientras suena esta, deja lista la siguiente (bajarla/sacarla del canal) para que no haya silencio.
    const next = queue.tracks[0];
    if (next) prefetchSong(client, next.url, { title: next.title, durationSec: parseDuration(next.duration) });
    
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
    const motivo = error instanceof SongError ? `\n${error.userMessage}` : '';
    
    const textChannel = await client.channels.fetch(queue.textChannelId) as TextChannel;
    if (textChannel) {
      await textChannel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(`❌ No pude reproducir **${track.title}**.${motivo}\nSaltando a la siguiente canción...`)]
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
