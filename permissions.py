from typing import Dict, Set
import discord

class PermissionManager:
    def __init__(self):
        # {guild_id: {channel_id: {'owner': user_id, 'admins': set(user_ids)}}}
        self.permissions: Dict[int, Dict[int, Dict]] = {}
    
    def set_owner(self, guild_id: int, channel_id: int, user_id: int):
        """Establece el dueño del canal de voz"""
        if guild_id not in self.permissions:
            self.permissions[guild_id] = {}
        
        self.permissions[guild_id][channel_id] = {
            'owner': user_id,
            'admins': set()
        }
    
    def add_admin(self, guild_id: int, channel_id: int, user_id: int) -> bool:
        """Añade un admin al canal"""
        if guild_id in self.permissions and channel_id in self.permissions[guild_id]:
            self.permissions[guild_id][channel_id]['admins'].add(user_id)
            return True
        return False
    
    def remove_admin(self, guild_id: int, channel_id: int, user_id: int) -> bool:
        """Remueve un admin del canal"""
        if guild_id in self.permissions and channel_id in self.permissions[guild_id]:
            self.permissions[guild_id][channel_id]['admins'].discard(user_id)
            return True
        return False
    
    def is_owner(self, guild_id: int, channel_id: int, user_id: int) -> bool:
        """Verifica si el usuario es el dueño"""
        if guild_id in self.permissions and channel_id in self.permissions[guild_id]:
            return self.permissions[guild_id][channel_id]['owner'] == user_id
        return False
    
    def is_admin(self, guild_id: int, channel_id: int, user_id: int) -> bool:
        """Verifica si el usuario es admin"""
        if guild_id in self.permissions and channel_id in self.permissions[guild_id]:
            return user_id in self.permissions[guild_id][channel_id]['admins']
        return False
    
    def has_permission(self, guild_id: int, channel_id: int, user_id: int) -> bool:
        """Verifica si el usuario tiene permisos (owner o admin)"""
        return self.is_owner(guild_id, channel_id, user_id) or self.is_admin(guild_id, channel_id, user_id)
    
    def get_owner(self, guild_id: int, channel_id: int) -> int:
        """Obtiene el ID del dueño del canal"""
        if guild_id in self.permissions and channel_id in self.permissions[guild_id]:
            return self.permissions[guild_id][channel_id]['owner']
        return None
    
    def clear_channel(self, guild_id: int, channel_id: int):
        """Limpia los permisos de un canal"""
        if guild_id in self.permissions and channel_id in self.permissions[guild_id]:
            del self.permissions[guild_id][channel_id]
    
    def get_admins(self, guild_id: int, channel_id: int) -> Set[int]:
        """Obtiene la lista de admins"""
        if guild_id in self.permissions and channel_id in self.permissions[guild_id]:
            return self.permissions[guild_id][channel_id]['admins']
        return set()
