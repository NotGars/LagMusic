# Discord Music Bot 🎵

Un bot de música completo para Discord con soporte para YouTube, Spotify y Apple Music.

## Características

- 🎵 Reproducción de música desde YouTube, Spotify y Apple Music
- 📋 Sistema de cola de reproducción
- 🔁 Modo bucle para canciones
- 🎤 Modo karaoke
- 🗳️ Sistema de votación para saltar canciones
- 👥 Gestión de permisos por canal de voz
- 🎲 Reproducción aleatoria
- ⏯️ Controles de reproducción (pausa, reanudar, saltar)

## Requisitos

- Python 3.8 o superior
- FFmpeg instalado en el sistema
- Token de bot de Discord
- (Opcional) Credenciales de Spotify API para playlists de Spotify

## Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd discord-music-bot
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Instalar FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Descarga desde [ffmpeg.org](https://ffmpeg.org/download.html) y añade al PATH.

**macOS:**
```bash
brew install ffmpeg
```

### 4. Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita el archivo `.env` y añade tus credenciales:

```env
DISCORD_TOKEN=tu_token_de_discord_aqui
SPOTIFY_CLIENT_ID=tu_spotify_client_id (opcional)
SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret (opcional)
HELP_CHANNELS=123456789,987654321 (opcional)
```

### 5. Crear aplicación de Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Crea una nueva aplicación
3. Ve a la sección "Bot" y crea un bot
4. Copia el token y añádelo a tu archivo `.env`
5. Activa los siguientes "Privileged Gateway Intents":
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT
   - PRESENCE INTENT

### 6. Invitar el bot a tu servidor

Genera un enlace de invitación con los siguientes permisos:
- `applications.commands` (Slash Commands)
- `bot` con permisos:
  - Connect
  - Speak
  - Use Voice Activity
  - Send Messages
  - Embed Links

URL de ejemplo:
```
https://discord.com/api/oauth2/authorize?client_id=TU_CLIENT_ID&permissions=36700160&scope=bot%20applications.commands
```

## Uso

### Iniciar el bot

```bash
python bot.py
```

### Comandos disponibles

#### 🎶 Reproducción
- `/play <canción>` - Reproduce una canción o la añade a la cola
- `/play playlist <plataforma> <nombre>` - Reproduce una playlist (youtube/spotify/applemusic)
- `/karaoke <canción>` - Reproduce versión karaoke

#### ⏯️ Control
- `/pause` - Pausa la canción actual
- `/resume` - Reanuda la reproducción
- `/skip` - Salta la canción actual (requiere permisos)
- `/stop` - Detiene la reproducción y desconecta el bot

#### 📋 Cola
- `/queue` - Muestra las canciones en cola
- `/clear` - Limpia la cola (solo creador del canal)
- `/any` - Reproduce una canción aleatoria de la cola
- `/random` - Mezcla aleatoriamente la cola

#### 🔁 Bucle
- `/bucle` - Activa el bucle de la canción actual
- `/stopbucle` - Desactiva el bucle

#### 🗳️ Votación y Permisos
- `/voteskip` - Vota para saltar la canción (requiere mayoría)
- `/addpermiss <usuario>` - Otorga permisos de admin (solo creador)

#### ℹ️ Ayuda
- `/help` - Muestra todos los comandos disponibles

## Permisos

- **Creador del canal de voz**: Tiene control total sobre la reproducción
- **Admins añadidos**: Pueden usar comandos de control (skip, pause, resume, stop)
- **Miembros regulares**: Pueden añadir canciones y votar para saltar

## Sistema de votación

Para saltar una canción sin permisos, se requiere que el 50% de los miembros del canal voten usando `/voteskip`.

## Configuración de Spotify (Opcional)

Para usar playlists de Spotify:

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una aplicación
3. Copia el Client ID y Client Secret
4. Añádelos a tu archivo `.env`


## Despliegue en Render 🚀

Render ofrece hosting gratuito para bots de Discord. Sigue estos pasos:

### 1. Preparar el repositorio

Asegúrate de que todos los archivos estén en GitHub (ya incluidos):
- `render.yaml` - Configuración de Render
- `requirements.txt` - Dependencias de Python
- `runtime.txt` - Versión de Python
- `Procfile` - Comando de inicio

### 2. Crear cuenta en Render

1. Ve a [render.com](https://render.com)
2. Regístrate con tu cuenta de GitHub

### 3. Crear nuevo servicio

1. En el dashboard de Render, haz clic en **"New +"**
2. Selecciona **"Background Worker"**
3. Conecta tu repositorio de GitHub: `discord-music-bot`
4. Configura el servicio:
   - **Name:** discord-music-bot
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python bot.py`

### 4. Configurar variables de entorno

En la sección "Environment Variables", añade:

| Key | Value |
|-----|-------|
| `DISCORD_TOKEN` | Tu token de Discord |
| `SPOTIFY_CLIENT_ID` | Tu Spotify Client ID (opcional) |
| `SPOTIFY_CLIENT_SECRET` | Tu Spotify Client Secret (opcional) |
| `HELP_CHANNELS` | IDs de canales separados por comas (opcional) |

### 5. Instalar FFmpeg

Render necesita FFmpeg para reproducir audio. Añade esto en la configuración:

En **Build Command**, usa:
```bash
apt-get update && apt-get install -y ffmpeg && pip install -r requirements.txt
```

### 6. Desplegar

1. Haz clic en **"Create Background Worker"**
2. Render automáticamente:
   - Clonará tu repositorio
   - Instalará dependencias
   - Iniciará el bot

### 7. Verificar el despliegue

- Ve a la pestaña **"Logs"** para ver el estado del bot
- Deberías ver el mensaje: "Bot conectado como [nombre del bot]"
- El bot estará en línea 24/7 en tu servidor de Discord

### Actualizar el bot

Cuando hagas cambios en el código:
1. Haz push a GitHub: `git push origin main`
2. Render automáticamente detectará los cambios y redesplegar

### Plan gratuito de Render

- ✅ 750 horas/mes gratis (suficiente para 24/7)
- ✅ Despliegues automáticos desde GitHub
- ✅ Logs en tiempo real
- ⚠️ El servicio puede dormir después de 15 minutos de inactividad (no aplica a workers)

## Solución de problemas

### El bot no reproduce audio
- Verifica que FFmpeg esté instalado: `ffmpeg -version`
- Asegúrate de que el bot tenga permisos para conectarse y hablar en el canal

### Error "yt-dlp"
- Actualiza yt-dlp: `pip install --upgrade yt-dlp`

### El bot no responde a comandos
- Verifica que los slash commands estén sincronizados (puede tardar hasta 1 hora)
- Asegúrate de que el bot tenga el permiso `applications.commands`

## Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.

## Soporte

Si tienes problemas o preguntas, abre un issue en GitHub.
