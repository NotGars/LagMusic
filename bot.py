import discord
from discord import app_commands
from discord.ext import commands
import asyncio
from typing import Optional
import config
from music_player import MusicPlayer
from queue_manager import QueueManager, Song
from permissions import PermissionManager

# Configuración de intents
intents = discord.Intents.default()
intents.message_content = True
intents.voice_states = True
intents.guilds = True
intents.members = True

class MusicBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix="!", intents=intents)
        self.music_player = MusicPlayer()
        self.queue_manager = QueueManager()
        self.permission_manager = PermissionManager()
    
    async def setup_hook(self):
        await self.tree.sync()
        print("Comandos sincronizados")

bot = MusicBot()

@bot.event
async def on_ready():
    print(f'Bot conectado como {bot.user}')
    print(f'ID: {bot.user.id}')
    print('------')

@bot.event
async def on_voice_state_update(member, before, after):
    """Detecta cuando alguien crea/entra a un canal de voz"""
    # Si el usuario se unió a un canal nuevo
    if before.channel is None and after.channel is not None:
        # Verificar si es el primer usuario (creador del canal temporal)
        if len(after.channel.members) == 1:
            bot.permission_manager.set_owner(member.guild.id, after.channel.id, member.id)
            print(f"Owner establecido: {member.name} en {after.channel.name}")
    
    # Si el usuario salió de un canal
    if before.channel is not None and after.channel != before.channel:
        # Si el canal quedó vacío, limpiar permisos
        if len(before.channel.members) == 0:
            bot.permission_manager.clear_channel(member.guild.id, before.channel.id)

async def play_next_song(guild_id: int, voice_client: discord.VoiceClient):
    """Reproduce la siguiente canción en la cola"""
    queue = bot.queue_manager.get_queue(guild_id)
    
    if queue.is_playing:
        return
    
    next_song = queue.next_song()
    
    if next_song is None:
        queue.is_playing = False
        return
    
    try:
        source = await bot.music_player.get_audio_source(next_song)
        
        if source is None:
            await play_next_song(guild_id, voice_client)
            return
        
        def after_playing(error):
            if error:
                print(f"Error reproduciendo: {error}")
            
            queue.is_playing = False
            
            # Reproducir siguiente canción
            coro = play_next_song(guild_id, voice_client)
            fut = asyncio.run_coroutine_threadsafe(coro, bot.loop)
            try:
                fut.result()
            except Exception as e:
                print(f"Error en after_playing: {e}")
        
        queue.is_playing = True
        queue.is_paused = False
        voice_client.play(source, after=after_playing)
        
    except Exception as e:
        print(f"Error reproduciendo canción: {e}")
        queue.is_playing = False
        await play_next_song(guild_id, voice_client)

# Comando /play
@bot.tree.command(name="play", description="Reproduce una canción")
@app_commands.describe(query="Nombre de la canción o URL")
async def play(interaction: discord.Interaction, query: str):
    await interaction.response.defer()
    
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.followup.send("❌ Debes estar en un canal de voz para usar este comando.")
        return
    
    voice_channel = interaction.user.voice.channel
    
    # Conectar al canal de voz si no está conectado
    voice_client = interaction.guild.voice_client
    if voice_client is None:
        voice_client = await voice_channel.connect()
    elif voice_client.channel != voice_channel:
        await voice_client.move_to(voice_channel)
    
    # Buscar la canción
    data = await bot.music_player.search_song(query)
    
    if data is None:
        await interaction.followup.send("❌ No se pudo encontrar la canción.")
        return
    
    # Crear objeto Song
    song = bot.music_player.create_song_from_data(data, interaction.user.id)
    
    # Añadir a la cola
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    queue.add_song(song)
    
    # Crear embed
    embed = discord.Embed(
        title="🎵 Canción añadida a la cola",
        description=f"**{song.title}**",
        color=discord.Color.green()
    )
    embed.add_field(name="Duración", value=bot.music_player.format_duration(song.duration), inline=True)
    embed.add_field(name="Solicitado por", value=interaction.user.mention, inline=True)
    
    if song.thumbnail:
        embed.set_thumbnail(url=song.thumbnail)
    
    await interaction.followup.send(embed=embed)
    
    # Si no está reproduciendo, empezar
    if not queue.is_playing:
        await play_next_song(interaction.guild.id, voice_client)

# Comando /play playlist
@bot.tree.command(name="playlist", description="Reproduce una playlist")
@app_commands.describe(
    platform="Plataforma de música",
    url="URL de la playlist"
)
@app_commands.choices(platform=[
    app_commands.Choice(name="YouTube", value="youtube"),
    app_commands.Choice(name="Spotify", value="spotify"),
    app_commands.Choice(name="YouTube Music", value="youtube_music"),
    app_commands.Choice(name="Apple Music", value="apple_music")
])
async def playlist(interaction: discord.Interaction, platform: str, url: str):
    await interaction.response.defer()
    
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.followup.send("❌ Debes estar en un canal de voz para usar este comando.")
        return
    
    voice_channel = interaction.user.voice.channel
    
    # Conectar al canal de voz
    voice_client = interaction.guild.voice_client
    if voice_client is None:
        voice_client = await voice_channel.connect()
    elif voice_client.channel != voice_channel:
        await voice_client.move_to(voice_channel)
    
    await interaction.followup.send(f"🔍 Buscando playlist en {platform}...")
    
    # Obtener canciones de la playlist
    songs_data = await bot.music_player.get_playlist(url, platform)
    
    if not songs_data:
        await interaction.followup.send("❌ No se pudo cargar la playlist.")
        return
    
    # Añadir canciones a la cola
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    songs_added = 0
    
    for song_data in songs_data[:50]:  # Limitar a 50 canciones
        try:
            # Obtener info completa de cada canción
            full_data = await bot.music_player.search_song(song_data.get('url') or song_data.get('webpage_url'))
            if full_data:
                song = bot.music_player.create_song_from_data(full_data, interaction.user.id)
                queue.add_song(song)
                songs_added += 1
        except:
            continue
    
    embed = discord.Embed(
        title="📃 Playlist añadida",
        description=f"Se añadieron **{songs_added}** canciones a la cola",
        color=discord.Color.blue()
    )
    embed.add_field(name="Plataforma", value=platform.title(), inline=True)
    embed.add_field(name="Solicitado por", value=interaction.user.mention, inline=True)
    
    await interaction.followup.send(embed=embed)
    
    # Si no está reproduciendo, empezar
    if not queue.is_playing:
        await play_next_song(interaction.guild.id, voice_client)


# Comando /skip
@bot.tree.command(name="skip", description="Salta la canción actual")
async def skip(interaction: discord.Interaction):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    voice_channel = interaction.user.voice.channel
    
    # Verificar permisos
    has_permission = bot.permission_manager.has_permission(
        interaction.guild.id,
        voice_channel.id,
        interaction.user.id
    )
    
    if not has_permission:
        await interaction.response.send_message(
            "❌ Solo el creador del canal o admins pueden usar /skip. Usa /vote skip para votar.",
            ephemeral=True
        )
        return
    
    voice_client = interaction.guild.voice_client
    
    if voice_client is None or not voice_client.is_playing():
        await interaction.response.send_message("❌ No hay ninguna canción reproduciéndose.", ephemeral=True)
        return
    
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    queue.skip_song()
    
    voice_client.stop()
    
    await interaction.response.send_message("⏭️ Canción saltada.")

# Comando /pause
@bot.tree.command(name="pause", description="Pausa la canción actual")
async def pause(interaction: discord.Interaction):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    voice_channel = interaction.user.voice.channel
    
    # Verificar permisos
    has_permission = bot.permission_manager.has_permission(
        interaction.guild.id,
        voice_channel.id,
        interaction.user.id
    )
    
    if not has_permission:
        await interaction.response.send_message(
            "❌ Solo el creador del canal o admins pueden pausar.",
            ephemeral=True
        )
        return
    
    voice_client = interaction.guild.voice_client
    
    if voice_client is None or not voice_client.is_playing():
        await interaction.response.send_message("❌ No hay ninguna canción reproduciéndose.", ephemeral=True)
        return
    
    if voice_client.is_paused():
        await interaction.response.send_message("⚠️ La canción ya está en pausa.", ephemeral=True)
        return
    
    voice_client.pause()
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    queue.is_paused = True
    
    await interaction.response.send_message("⏸️ Canción pausada.")

# Comando /resume
@bot.tree.command(name="resume", description="Reanuda la canción pausada")
async def resume(interaction: discord.Interaction):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    voice_channel = interaction.user.voice.channel
    
    # Verificar permisos
    has_permission = bot.permission_manager.has_permission(
        interaction.guild.id,
        voice_channel.id,
        interaction.user.id
    )
    
    if not has_permission:
        await interaction.response.send_message(
            "❌ Solo el creador del canal o admins pueden reanudar.",
            ephemeral=True
        )
        return
    
    voice_client = interaction.guild.voice_client
    
    if voice_client is None:
        await interaction.response.send_message("❌ No hay ninguna canción en pausa.", ephemeral=True)
        return
    
    if not voice_client.is_paused():
        await interaction.response.send_message("⚠️ La canción no está en pausa.", ephemeral=True)
        return
    
    voice_client.resume()
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    queue.is_paused = False
    
    await interaction.response.send_message("▶️ Canción reanudada.")

# Comando /bucle
@bot.tree.command(name="bucle", description="Activa/desactiva el modo bucle")
async def bucle(interaction: discord.Interaction):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    loop_status = queue.toggle_loop()
    
    if loop_status:
        await interaction.response.send_message("🔁 Modo bucle **activado**. La canción actual se repetirá.")
    else:
        await interaction.response.send_message("🔁 Modo bucle **desactivado**.")

# Comando /stop (para detener el bucle)
@bot.tree.command(name="stopbucle", description="Detiene el modo bucle")
async def stopbucle(interaction: discord.Interaction):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    voice_channel = interaction.user.voice.channel
    
    # Verificar permisos
    has_permission = bot.permission_manager.has_permission(
        interaction.guild.id,
        voice_channel.id,
        interaction.user.id
    )
    
    if not has_permission:
        await interaction.response.send_message(
            "❌ Solo el creador del canal o admins pueden detener el bucle.",
            ephemeral=True
        )
        return
    
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    
    if queue.loop_mode:
        queue.loop_mode = False
        await interaction.response.send_message("🔁 Modo bucle **desactivado**.")
    else:
        await interaction.response.send_message("⚠️ El modo bucle no está activo.", ephemeral=True)

# Comando /any
@bot.tree.command(name="any", description="Reproduce una canción aleatoria de la cola")
async def any_song(interaction: discord.Interaction):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    voice_client = interaction.guild.voice_client
    
    if voice_client is None:
        await interaction.response.send_message("❌ El bot no está en un canal de voz.", ephemeral=True)
        return
    
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    
    if queue.is_empty():
        await interaction.response.send_message("❌ No hay canciones en la cola.", ephemeral=True)
        return
    
    # Detener canción actual
    if voice_client.is_playing():
        voice_client.stop()
    
    # Reproducir canción aleatoria
    random_song = queue.play_random_from_queue()
    
    if random_song:
        await interaction.response.send_message(f"🎲 Reproduciendo canción aleatoria: **{random_song.title}**")
        await play_next_song(interaction.guild.id, voice_client)
    else:
        await interaction.response.send_message("❌ No se pudo reproducir una canción aleatoria.", ephemeral=True)

# Comando /random
@bot.tree.command(name="random", description="Activa/desactiva el modo aleatorio")
async def random_mode(interaction: discord.Interaction):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    random_status = queue.toggle_random()
    
    if random_status:
        await interaction.response.send_message("🔀 Modo aleatorio **activado**. La cola se ha mezclado.")
    else:
        await interaction.response.send_message("🔀 Modo aleatorio **desactivado**. Orden original restaurado.")


# Comando /vote skip
@bot.tree.command(name="voteskip", description="Vota para saltar la canción actual")
async def vote_skip(interaction: discord.Interaction):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    voice_channel = interaction.user.voice.channel
    voice_client = interaction.guild.voice_client
    
    if voice_client is None or not voice_client.is_playing():
        await interaction.response.send_message("❌ No hay ninguna canción reproduciéndose.", ephemeral=True)
        return
    
    # Verificar si el usuario tiene permisos (owner o admin)
    has_permission = bot.permission_manager.has_permission(
        interaction.guild.id,
        voice_channel.id,
        interaction.user.id
    )
    
    if has_permission:
        await interaction.response.send_message(
            "ℹ️ Tienes permisos de admin. Usa `/skip` en lugar de votar.",
            ephemeral=True
        )
        return
    
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    
    # Añadir voto
    votes = queue.add_vote_skip(interaction.user.id)
    
    # Contar miembros en el canal (excluyendo bots)
    members_in_channel = [m for m in voice_channel.members if not m.bot]
    total_members = len(members_in_channel)
    
    # Calcular votos necesarios
    votes_needed = int(total_members * config.VOTE_SKIP_THRESHOLD)
    if votes_needed < 1:
        votes_needed = 1
    
    if votes >= votes_needed:
        # Suficientes votos, saltar canción
        queue.skip_song()
        voice_client.stop()
        await interaction.response.send_message(f"⏭️ Canción saltada por votación ({votes}/{total_members} votos)")
    else:
        await interaction.response.send_message(
            f"🗳️ Voto registrado. Votos: {votes}/{votes_needed} necesarios para saltar."
        )

# Comando /add permiss
@bot.tree.command(name="addpermiss", description="Otorga permisos de admin a otro usuario")
@app_commands.describe(user="Usuario al que otorgar permisos")
async def add_permiss(interaction: discord.Interaction, user: discord.Member):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    voice_channel = interaction.user.voice.channel
    
    # Verificar que el usuario sea el owner
    is_owner = bot.permission_manager.is_owner(
        interaction.guild.id,
        voice_channel.id,
        interaction.user.id
    )
    
    if not is_owner:
        await interaction.response.send_message(
            "❌ Solo el creador del canal puede otorgar permisos.",
            ephemeral=True
        )
        return
    
    # Verificar que el usuario objetivo esté en el mismo canal
    if user.voice is None or user.voice.channel != voice_channel:
        await interaction.response.send_message(
            "❌ El usuario debe estar en el mismo canal de voz.",
            ephemeral=True
        )
        return
    
    # Añadir permisos
    success = bot.permission_manager.add_admin(
        interaction.guild.id,
        voice_channel.id,
        user.id
    )
    
    if success:
        await interaction.response.send_message(
            f"✅ {user.mention} ahora tiene permisos de admin en este canal."
        )
    else:
        await interaction.response.send_message(
            "❌ Error al otorgar permisos.",
            ephemeral=True
        )

# Comando /clear
@bot.tree.command(name="clear", description="Limpia todas las canciones pendientes de la cola")
async def clear(interaction: discord.Interaction):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    voice_channel = interaction.user.voice.channel
    
    # Verificar que el usuario sea el owner
    is_owner = bot.permission_manager.is_owner(
        interaction.guild.id,
        voice_channel.id,
        interaction.user.id
    )
    
    if not is_owner:
        await interaction.response.send_message(
            "❌ Solo el creador del canal puede limpiar la cola.",
            ephemeral=True
        )
        return
    
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    songs_count = len(queue.get_queue_list())
    
    queue.clear_songs()
    
    await interaction.response.send_message(f"🗑️ Se eliminaron **{songs_count}** canciones de la cola.")

# Comando /karaoke
@bot.tree.command(name="karaoke", description="Reproduce la versión karaoke de una canción")
@app_commands.describe(query="Nombre de la canción")
async def karaoke(interaction: discord.Interaction, query: str):
    await interaction.response.defer()
    
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.followup.send("❌ Debes estar en un canal de voz para usar este comando.")
        return
    
    voice_channel = interaction.user.voice.channel
    
    # Conectar al canal de voz
    voice_client = interaction.guild.voice_client
    if voice_client is None:
        voice_client = await voice_channel.connect()
    elif voice_client.channel != voice_channel:
        await voice_client.move_to(voice_channel)
    
    # Buscar versión karaoke
    data = await bot.music_player.search_karaoke(query)
    
    if data is None:
        await interaction.followup.send("❌ No se pudo encontrar la versión karaoke de la canción.")
        return
    
    # Crear objeto Song
    song = bot.music_player.create_song_from_data(data, interaction.user.id)
    
    # Añadir a la cola
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    queue.add_song(song)
    
    # Crear embed
    embed = discord.Embed(
        title="🎤 Karaoke añadido a la cola",
        description=f"**{song.title}**",
        color=discord.Color.purple()
    )
    embed.add_field(name="Duración", value=bot.music_player.format_duration(song.duration), inline=True)
    embed.add_field(name="Solicitado por", value=interaction.user.mention, inline=True)
    
    if song.thumbnail:
        embed.set_thumbnail(url=song.thumbnail)
    
    await interaction.followup.send(embed=embed)
    
    # Si no está reproduciendo, empezar
    if not queue.is_playing:
        await play_next_song(interaction.guild.id, voice_client)


# Comando /help
@bot.tree.command(name="help", description="Muestra todos los comandos disponibles")
async def help_command(interaction: discord.Interaction):
    # Verificar si el comando se usa en un canal permitido o en un canal de voz
    allowed = False
    
    # Verificar si está en un canal de voz
    if interaction.user.voice:
        allowed = True
    
    # Verificar si está en un canal permitido
    if config.HELP_CHANNELS and interaction.channel.id in config.HELP_CHANNELS:
        allowed = True
    
    if not allowed:
        await interaction.response.send_message(
            "❌ Este comando solo puede usarse en canales de voz o en canales específicos autorizados.",
            ephemeral=True
        )
        return
    
    # Crear embed con todos los comandos
    embed = discord.Embed(
        title="🎵 Comandos del Bot de Música",
        description="Lista completa de comandos disponibles",
        color=discord.Color.blue()
    )
    
    # Comandos de reproducción
    embed.add_field(
        name="🎶 Reproducción",
        value=(
            "`/play <canción>` - Reproduce una canción o la añade a la cola\n"
            "`/play playlist <plataforma> <nombre>` - Reproduce una playlist\n"
            "`/karaoke <canción>` - Reproduce versión karaoke\n"
        ),
        inline=False
    )
    
    # Comandos de control
    embed.add_field(
        name="⏯️ Control",
        value=(
            "`/pause` - Pausa la canción actual\n"
            "`/resume` - Reanuda la reproducción\n"
            "`/skip` - Salta la canción actual (requiere permisos)\n"
            "`/stop` - Detiene la reproducción y desconecta el bot\n"
        ),
        inline=False
    )
    
    # Comandos de cola
    embed.add_field(
        name="📋 Cola",
        value=(
            "`/queue` - Muestra las canciones en cola\n"
            "`/clear` - Limpia la cola (solo creador)\n"
            "`/any` - Reproduce una canción aleatoria de la cola\n"
            "`/random` - Mezcla aleatoriamente la cola\n"
        ),
        inline=False
    )
    
    # Comandos de bucle
    embed.add_field(
        name="🔁 Bucle",
        value=(
            "`/bucle` - Activa el bucle de la canción actual\n"
            "`/stopbucle` - Desactiva el bucle\n"
        ),
        inline=False
    )
    
    # Comandos de votación y permisos
    embed.add_field(
        name="🗳️ Votación y Permisos",
        value=(
            "`/voteskip` - Vota para saltar la canción\n"
            "`/addpermiss <usuario>` - Otorga permisos de admin (solo creador)\n"
        ),
        inline=False
    )
    
    # Información adicional
    embed.add_field(
        name="ℹ️ Información",
        value=(
            "**Plataformas soportadas:** YouTube, Spotify, Apple Music\n"
            "**Permisos:** El creador del canal de voz tiene control total\n"
            "**Votación:** Se requiere mayoría de votos para saltar canciones\n"
        ),
        inline=False
    )
    
    embed.set_footer(text="Disfruta de tu música 🎵")
    
    await interaction.response.send_message(embed=embed)

# Comando /stop
@bot.tree.command(name="stop", description="Detiene la reproducción y desconecta el bot")
async def stop(interaction: discord.Interaction):
    # Verificar que el usuario esté en un canal de voz
    if not interaction.user.voice:
        await interaction.response.send_message("❌ Debes estar en un canal de voz.", ephemeral=True)
        return
    
    voice_channel = interaction.user.voice.channel
    voice_client = interaction.guild.voice_client
    
    if voice_client is None:
        await interaction.response.send_message("❌ El bot no está conectado a ningún canal.", ephemeral=True)
        return
    
    # Verificar permisos
    has_permission = bot.permission_manager.has_permission(
        interaction.guild.id,
        voice_channel.id,
        interaction.user.id
    )
    
    if not has_permission:
        await interaction.response.send_message(
            "❌ No tienes permisos para detener la reproducción.",
            ephemeral=True
        )
        return
    
    # Limpiar cola y desconectar
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    queue.clear_songs()
    queue.current_song = None
    queue.is_playing = False
    
    if voice_client.is_playing():
        voice_client.stop()
    
    await voice_client.disconnect()
    
    # Limpiar permisos
    bot.permission_manager.clear_channel(interaction.guild.id, voice_channel.id)
    
    await interaction.response.send_message("⏹️ Reproducción detenida y bot desconectado.")

# Comando /queue
@bot.tree.command(name="queue", description="Muestra las canciones en la cola")
async def queue_command(interaction: discord.Interaction):
    queue = bot.queue_manager.get_queue(interaction.guild.id)
    
    if queue.current_song is None and not queue.get_queue_list():
        await interaction.response.send_message("❌ No hay canciones en la cola.", ephemeral=True)
        return
    
    embed = discord.Embed(
        title="📋 Cola de Reproducción",
        color=discord.Color.green()
    )
    
    # Canción actual
    if queue.current_song:
        current = queue.current_song
        current_text = f"**{current.title}**\n"
        current_text += f"Duración: {bot.music_player.format_duration(current.duration)}\n"
        current_text += f"Solicitado por: <@{current.requested_by}>"
        
        if queue.loop_enabled:
            current_text += " 🔁"
        
        embed.add_field(name="🎵 Reproduciendo ahora", value=current_text, inline=False)
    
    # Próximas canciones
    queue_list = queue.get_queue_list()
    if queue_list:
        next_songs = []
        for i, song in enumerate(queue_list[:10], 1):  # Mostrar máximo 10
            next_songs.append(f"`{i}.` **{song.title}** ({bot.music_player.format_duration(song.duration)})")
        
        embed.add_field(
            name=f"⏭️ Próximas canciones ({len(queue_list)} total)",
            value="\n".join(next_songs),
            inline=False
        )
        
        if len(queue_list) > 10:
            embed.set_footer(text=f"Y {len(queue_list) - 10} canciones más...")
    
    await interaction.response.send_message(embed=embed)

# Evento cuando el bot se desconecta de un canal
@bot.event
async def on_voice_state_update(member, before, after):
    # Si el bot fue desconectado, limpiar datos
    if member == bot.user and before.channel is not None and after.channel is None:
        guild_id = before.channel.guild.id
        channel_id = before.channel.id
        
        # Limpiar cola
        if guild_id in bot.queue_manager.queues:
            del bot.queue_manager.queues[guild_id]
        
        # Limpiar permisos
        bot.permission_manager.clear_channel(guild_id, channel_id)

# Ejecutar el bot
if __name__ == "__main__":
    bot.run(config.DISCORD_TOKEN)
