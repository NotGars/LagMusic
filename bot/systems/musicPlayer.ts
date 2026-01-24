import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import play from 'play-dl';
import { VoiceChannel, TextChannel, EmbedBuilder, GuildMember } from 'discord.js';
import { ExtendedClient, MusicQueue, Track } from '../types';
import { config } from '../config';

const ytCookies = process.env.YOUTUBE_COOKIES;
if (ytCookies) {
  play.setToken({
    youtube: {
      cookie: ytCookies
    }
  });
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

export async function searchAndAddTrack(query: string, requestedBy: string): Promise<Track | null> {
  try {
    let searchResult;
    
    if (play.yt_validate(query) === 'video') {
      const info = await play.video_info(query);
      return {
        title: info.video_details.title || 'Unknown',
        url: info.video_details.url,
        duration: formatDuration(info.video_details.durationInSec),
        thumbnail: info.video_details.thumbnails[0]?.url || '',
        requestedBy,
        source: 'youtube',
      };
    }
    
    if (query.includes('spotify.com')) {
      if (play.is_expired()) {
        await play.refreshToken();
      }
      
      const spotifyData = await play.spotify(query);
      if (spotifyData.type === 'track') {
        const ytSearch = await play.search(`${spotifyData.name} ${spotifyData.artists?.[0]?.name || ''}`, { limit: 1 });
        if (ytSearch.length > 0) {
          return {
            title: spotifyData.name,
            url: ytSearch[0].url,
            duration: formatDuration(spotifyData.durationInSec),
            thumbnail: spotifyData.thumbnail?.url || '',
            requestedBy,
            source: 'spotify',
          };
        }
      }
    }
    
    searchResult = await play.search(query, { limit: 1 });
    if (searchResult.length > 0) {
      const video = searchResult[0];
      return {
        title: video.title || 'Unknown',
        url: video.url,
        duration: formatDuration(video.durationInSec),
        thumbnail: video.thumbnails[0]?.url || '',
        requestedBy,
        source: 'youtube',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error buscando canción:', error);
    return null;
  }
}

export async function searchPlaylist(query: string, source: string, requestedBy: string): Promise<Track[]> {
  const tracks: Track[] = [];
  
  try {
    if (query.includes('spotify.com/playlist')) {
      if (play.is_expired()) {
        await play.refreshToken();
      }
      
      const playlist = await play.spotify(query);
      if (playlist.type === 'playlist' && playlist.fetched_tracks) {
        for (const track of playlist.fetched_tracks.get(1) || []) {
          const ytSearch = await play.search(`${track.name} ${track.artists?.[0]?.name || ''}`, { limit: 1 });
          if (ytSearch.length > 0) {
            tracks.push({
              title: track.name,
              url: ytSearch[0].url,
              duration: formatDuration(track.durationInSec),
              thumbnail: track.thumbnail?.url || '',
              requestedBy,
              source: 'spotify',
            });
          }
        }
      }
    } else if (play.yt_validate(query) === 'playlist') {
      const playlist = await play.playlist_info(query);
      const videos = await playlist.all_videos();
      
      for (const video of videos) {
        tracks.push({
          title: video.title || 'Unknown',
          url: video.url,
          duration: formatDuration(video.durationInSec),
          thumbnail: video.thumbnails[0]?.url || '',
          requestedBy,
          source: 'youtube',
        });
      }
    } else {
      const searchResult = await play.search(`${source} ${query} playlist`, { limit: 1, source: { youtube: 'playlist' } });
      if (searchResult.length > 0) {
        const playlist = await play.playlist_info(searchResult[0].url);
        const videos = await playlist.all_videos();
        
        for (const video of videos) {
          tracks.push({
            title: video.title || 'Unknown',
            url: video.url,
            duration: formatDuration(video.durationInSec),
            thumbnail: video.thumbnails[0]?.url || '',
            requestedBy,
            source: 'youtube',
          });
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
      const relatedTracks = await play.search(lastTrack.title, { limit: 5 });
      
      if (relatedTracks.length > 1) {
        const randomTrack = relatedTracks[Math.floor(Math.random() * (relatedTracks.length - 1)) + 1];
        const track: Track = {
          title: randomTrack.title || 'Unknown',
          url: randomTrack.url,
          duration: formatDuration(randomTrack.durationInSec),
          thumbnail: randomTrack.thumbnails[0]?.url || '',
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
    const stream = await play.stream(track.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
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
  } catch (error) {
    console.error('Error reproduciendo canción:', error);
    return playTrack(client, queue);
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
