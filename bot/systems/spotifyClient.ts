import { getData, getPreview, getTracks } from 'spotify-url-info';

export interface SpotifyTrackInfo {
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumbnail: string;
  searchQuery: string;
}

export async function getSpotifyTrackInfo(url: string): Promise<SpotifyTrackInfo | null> {
  try {
    const preview = await getPreview(url);
    
    return {
      title: preview.title || 'Unknown',
      artist: preview.artist || 'Unknown Artist',
      album: '',
      duration: 0,
      thumbnail: preview.image || '',
      searchQuery: `${preview.title} ${preview.artist}`,
    };
  } catch (error) {
    console.error('Error getting Spotify track info:', error);
    return null;
  }
}

export async function getSpotifyPlaylistTracks(url: string): Promise<SpotifyTrackInfo[]> {
  try {
    const tracks = await getTracks(url);
    
    return tracks.slice(0, 50).map(track => ({
      title: track.name || 'Unknown',
      artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      album: track.album?.name || '',
      duration: Math.floor((track.duration_ms || 0) / 1000),
      thumbnail: track.album?.images?.[0]?.url || '',
      searchQuery: `${track.name} ${track.artists?.map((a: any) => a.name).join(' ')}`,
    }));
  } catch (error) {
    console.error('Error getting Spotify playlist tracks:', error);
    return [];
  }
}

export async function getSpotifyAlbumTracks(url: string): Promise<SpotifyTrackInfo[]> {
  return getSpotifyPlaylistTracks(url);
}

export function isSpotifyTrackUrl(url: string): boolean {
  return /(?:open\.)?spotify\.com\/(?:intl-[a-z]+\/)?track\//.test(url);
}

export function isSpotifyPlaylistUrl(url: string): boolean {
  return /(?:open\.)?spotify\.com\/(?:intl-[a-z]+\/)?playlist\//.test(url);
}

export function isSpotifyAlbumUrl(url: string): boolean {
  return /(?:open\.)?spotify\.com\/(?:intl-[a-z]+\/)?album\//.test(url);
}

export function isSpotifyUrl(url: string): boolean {
  return url.includes('spotify.com') || url.includes('open.spotify');
}

export async function getSpotifyClient(): Promise<boolean> {
  return true;
}
