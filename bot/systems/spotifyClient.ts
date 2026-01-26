import SpotifyWebApi from 'spotify-web-api-node';

let spotifyApi: SpotifyWebApi | null = null;
let tokenExpiresAt: number = 0;

async function initSpotify(): Promise<SpotifyWebApi | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('Spotify credentials not configured');
    return null;
  }

  spotifyApi = new SpotifyWebApi({
    clientId,
    clientSecret,
  });

  return spotifyApi;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!spotifyApi) {
    await initSpotify();
  }

  if (!spotifyApi) {
    return false;
  }

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    tokenExpiresAt = Date.now() + (data.body['expires_in'] - 60) * 1000;
    console.log('Spotify access token refreshed');
    return true;
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    return false;
  }
}

export async function getSpotifyClient(): Promise<SpotifyWebApi | null> {
  if (!spotifyApi) {
    await initSpotify();
  }

  if (!spotifyApi) {
    return null;
  }

  if (Date.now() >= tokenExpiresAt) {
    const success = await refreshAccessToken();
    if (!success) {
      return null;
    }
  }

  return spotifyApi;
}

export interface SpotifyTrackInfo {
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumbnail: string;
  searchQuery: string;
}

export async function getSpotifyTrackInfo(url: string): Promise<SpotifyTrackInfo | null> {
  const spotify = await getSpotifyClient();
  if (!spotify) {
    return null;
  }

  try {
    const trackId = extractSpotifyTrackId(url);
    if (!trackId) {
      console.log('Could not extract Spotify track ID from URL:', url);
      return null;
    }

    const track = await spotify.getTrack(trackId);
    const artists = track.body.artists.map(a => a.name).join(', ');
    
    return {
      title: track.body.name,
      artist: artists,
      album: track.body.album.name,
      duration: Math.floor(track.body.duration_ms / 1000),
      thumbnail: track.body.album.images[0]?.url || '',
      searchQuery: `${track.body.name} ${artists}`,
    };
  } catch (error) {
    console.error('Error getting Spotify track info:', error);
    return null;
  }
}

export async function getSpotifyPlaylistTracks(url: string): Promise<SpotifyTrackInfo[]> {
  const spotify = await getSpotifyClient();
  if (!spotify) {
    return [];
  }

  try {
    const playlistId = extractSpotifyPlaylistId(url);
    if (!playlistId) {
      console.log('Could not extract Spotify playlist ID from URL:', url);
      return [];
    }

    const tracks: SpotifyTrackInfo[] = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const playlist = await spotify.getPlaylistTracks(playlistId, { offset, limit });
      
      for (const item of playlist.body.items) {
        if (item.track && item.track.type === 'track') {
          const track = item.track;
          const artists = track.artists.map(a => a.name).join(', ');
          
          tracks.push({
            title: track.name,
            artist: artists,
            album: track.album.name,
            duration: Math.floor(track.duration_ms / 1000),
            thumbnail: track.album.images[0]?.url || '',
            searchQuery: `${track.name} ${artists}`,
          });
        }
      }

      if (playlist.body.items.length < limit || tracks.length >= 100) {
        break;
      }
      offset += limit;
    }

    return tracks;
  } catch (error) {
    console.error('Error getting Spotify playlist:', error);
    return [];
  }
}

export async function getSpotifyAlbumTracks(url: string): Promise<SpotifyTrackInfo[]> {
  const spotify = await getSpotifyClient();
  if (!spotify) {
    return [];
  }

  try {
    const albumId = extractSpotifyAlbumId(url);
    if (!albumId) {
      console.log('Could not extract Spotify album ID from URL:', url);
      return [];
    }

    const album = await spotify.getAlbum(albumId);
    const tracks: SpotifyTrackInfo[] = [];

    for (const track of album.body.tracks.items) {
      const artists = track.artists.map(a => a.name).join(', ');
      
      tracks.push({
        title: track.name,
        artist: artists,
        album: album.body.name,
        duration: Math.floor(track.duration_ms / 1000),
        thumbnail: album.body.images[0]?.url || '',
        searchQuery: `${track.name} ${artists}`,
      });
    }

    return tracks;
  } catch (error) {
    console.error('Error getting Spotify album:', error);
    return [];
  }
}

function extractSpotifyTrackId(url: string): string | null {
  const match = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractSpotifyPlaylistId(url: string): string | null {
  const match = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractSpotifyAlbumId(url: string): string | null {
  const match = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?album\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
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
