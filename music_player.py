import discord
import yt_dlp
import asyncio
import re
from typing import Optional, List, Dict
from queue_manager import Song
from config import YTDL_OPTIONS, FFMPEG_OPTIONS

class MusicPlayer:
    def __init__(self):
        self.ytdl = yt_dlp.YoutubeDL(YTDL_OPTIONS)
    
    async def search_song(self, query: str) -> Optional[Dict]:
        """Busca una canción en YouTube/otras plataformas"""
        try:
            loop = asyncio.get_event_loop()
            
            # Detectar si es URL o búsqueda
            if not query.startswith('http'):
                query = f"ytsearch:{query}"
            
            data = await loop.run_in_executor(None, lambda: self.ytdl.extract_info(query, download=False))
            
            if 'entries' in data:
                # Tomar el primer resultado
                data = data['entries'][0]
            
            return data
        except Exception as e:
            print(f"Error buscando canción: {e}")
            return None
    
    async def search_karaoke(self, query: str) -> Optional[Dict]:
        """Busca versión karaoke de una canción"""
        try:
            karaoke_query = f"ytsearch:{query} karaoke"
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, lambda: self.ytdl.extract_info(karaoke_query, download=False))
            
            if 'entries' in data:
                data = data['entries'][0]
            
            return data
        except Exception as e:
            print(f"Error buscando karaoke: {e}")
            return None
    
    async def get_playlist(self, url: str, platform: str = "youtube") -> List[Dict]:
        """Obtiene canciones de una playlist"""
        try:
            loop = asyncio.get_event_loop()
            
            # Configurar opciones para playlist
            ytdl_playlist = yt_dlp.YoutubeDL({
                **YTDL_OPTIONS,
                'noplaylist': False,
                'extract_flat': True
            })
            
            data = await loop.run_in_executor(None, lambda: ytdl_playlist.extract_info(url, download=False))
            
            if 'entries' not in data:
                return []
            
            songs = []
            for entry in data['entries']:
                if entry:
                    songs.append(entry)
            
            return songs
        except Exception as e:
            print(f"Error obteniendo playlist: {e}")
            return []
    
    def create_song_from_data(self, data: Dict, requester_id: int) -> Song:
        """Crea un objeto Song desde los datos extraídos"""
        url = data.get('url') or data.get('webpage_url')
        title = data.get('title', 'Desconocido')
        duration = int(data.get('duration', 0)) if data.get('duration') else 0
        thumbnail = data.get('thumbnail')
        
        return Song(url=url, title=title, duration=duration, requester=requester_id, thumbnail=thumbnail)
    
    async def get_audio_source(self, song: Song) -> Optional[discord.FFmpegPCMAudio]:
        """Obtiene la fuente de audio para reproducir"""
        try:
            loop = asyncio.get_event_loop()
            
            # Re-extraer info para obtener URL directa actualizada
            data = await loop.run_in_executor(
                None, 
                lambda: self.ytdl.extract_info(song.url, download=False)
            )
            
            if 'entries' in data:
                data = data['entries'][0]
            
            url = data.get('url')
            
            if not url:
                return None
            
            source = discord.FFmpegPCMAudio(url, **FFMPEG_OPTIONS)
            return source
        except Exception as e:
            print(f"Error obteniendo audio: {e}")
            return None
    
    def format_duration(self, seconds: int) -> str:
        """Formatea la duración en formato legible"""
        # Convertir a int para evitar errores con floats
        seconds = int(seconds)
        
        if seconds == 0:
            return "En vivo"
        
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        
        if hours > 0:
            return f"{hours}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes}:{secs:02d}"
    
    def detect_platform(self, url: str) -> str:
        """Detecta la plataforma de música"""
        if 'spotify.com' in url:
            return 'spotify'
        elif 'youtube.com' in url or 'youtu.be' in url:
            return 'youtube'
        elif 'music.apple.com' in url:
            return 'apple_music'
        elif 'soundcloud.com' in url:
            return 'soundcloud'
        elif 'music.youtube.com' in url:
            return 'youtube_music'
        else:
            return 'youtube'  # Por defecto
