import os
from dotenv import load_dotenv

load_dotenv()

# Discord Configuration
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')

# Spotify Configuration (opcional)
SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')

# Canales permitidos para /help
HELP_CHANNELS = [
    1422809286417059850,
    1222966360263626865
]

# yt-dlp options - Enhanced for YouTube bot detection bypass
YTDL_OPTIONS = {
    'format': 'bestaudio/best',
    'extractaudio': True,
    'audioformat': 'mp3',
    'outtmpl': '%(extractor)s-%(id)s-%(title)s.%(ext)s',
    'restrictfilenames': True,
    'noplaylist': True,
    'nocheckcertificate': True,
    'ignoreerrors': False,
    'logtostderr': False,
    'quiet': True,
    'no_warnings': True,
    'default_search': 'ytsearch',
    'source_address': '0.0.0.0',
    'extract_flat': 'in_playlist',
    'age_limit': None,
    'geo_bypass': True,
    'prefer_insecure': True,
    'extractor_args': {
        'youtube': {
            'player_client': ['android_music', 'android', 'mweb', 'web'],
            'skip': ['hls', 'dash', 'translated_subs'],
            'player_skip': ['configs', 'webpage'],
        }
    },
    'http_headers': {
        'User-Agent': 'com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-us,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Sec-Fetch-Mode': 'navigate'
    }
}

# FFmpeg options
FFMPEG_OPTIONS = {
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
    'options': '-vn'
}

# Vote skip threshold (porcentaje de votos necesarios)
VOTE_SKIP_THRESHOLD = 0.5
