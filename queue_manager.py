import asyncio
import random
from typing import List, Dict, Optional
from collections import deque

class Song:
    def __init__(self, url: str, title: str, duration: int, requester: int, thumbnail: str = None):
        self.url = url
        self.title = title
        self.duration = duration
        self.requester = requester
        self.thumbnail = thumbnail
    
    def __repr__(self):
        return f"Song({self.title})"

class QueueManager:
    def __init__(self):
        # {guild_id: QueueData}
        self.queues: Dict[int, 'QueueData'] = {}
    
    def get_queue(self, guild_id: int) -> 'QueueData':
        """Obtiene o crea una cola para el servidor"""
        if guild_id not in self.queues:
            self.queues[guild_id] = QueueData()
        return self.queues[guild_id]
    
    def clear_queue(self, guild_id: int):
        """Limpia completamente la cola de un servidor"""
        if guild_id in self.queues:
            del self.queues[guild_id]

class QueueData:
    def __init__(self):
        self.songs: deque = deque()
        self.current_song: Optional[Song] = None
        self.loop_mode: bool = False
        self.random_mode: bool = False
        self.is_playing: bool = False
        self.is_paused: bool = False
        self.vote_skips: set = set()
        self.original_order: List[Song] = []
    
    def add_song(self, song: Song):
        """Añade una canción a la cola"""
        self.songs.append(song)
        if self.random_mode:
            self.original_order.append(song)
    
    def add_songs(self, songs: List[Song]):
        """Añade múltiples canciones a la cola"""
        for song in songs:
            self.add_song(song)
    
    def next_song(self) -> Optional[Song]:
        """Obtiene la siguiente canción"""
        if self.loop_mode and self.current_song:
            return self.current_song
        
        if len(self.songs) > 0:
            self.current_song = self.songs.popleft()
            return self.current_song
        
        self.current_song = None
        return None
    
    def skip_song(self):
        """Salta la canción actual"""
        self.vote_skips.clear()
        if self.loop_mode:
            self.loop_mode = False
    
    def clear_songs(self):
        """Limpia todas las canciones pendientes"""
        self.songs.clear()
        self.original_order.clear()
        self.vote_skips.clear()
    
    def toggle_loop(self) -> bool:
        """Activa/desactiva el modo bucle"""
        self.loop_mode = not self.loop_mode
        return self.loop_mode
    
    def toggle_random(self) -> bool:
        """Activa/desactiva el modo aleatorio"""
        self.random_mode = not self.random_mode
        
        if self.random_mode:
            # Guardar orden original y mezclar
            self.original_order = list(self.songs)
            songs_list = list(self.songs)
            random.shuffle(songs_list)
            self.songs = deque(songs_list)
        else:
            # Restaurar orden original
            if self.original_order:
                self.songs = deque(self.original_order)
                self.original_order.clear()
        
        return self.random_mode
    
    def play_random_from_queue(self) -> Optional[Song]:
        """Reproduce una canción aleatoria de la cola"""
        if len(self.songs) == 0:
            return None
        
        songs_list = list(self.songs)
        random_song = random.choice(songs_list)
        self.songs.remove(random_song)
        self.current_song = random_song
        return random_song
    
    def add_vote_skip(self, user_id: int) -> int:
        """Añade un voto para skip"""
        self.vote_skips.add(user_id)
        return len(self.vote_skips)
    
    def get_vote_count(self) -> int:
        """Obtiene el número de votos"""
        return len(self.vote_skips)
    
    def clear_votes(self):
        """Limpia los votos"""
        self.vote_skips.clear()
    
    def get_queue_list(self) -> List[Song]:
        """Obtiene la lista de canciones en cola"""
        return list(self.songs)
    
    def is_empty(self) -> bool:
        """Verifica si la cola está vacía"""
        return len(self.songs) == 0
