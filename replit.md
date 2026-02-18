# LagMusic Discord Bot

## Overview
LagMusic is a comprehensive Discord music bot with the following features:
- Music playback from YouTube, Spotify, YouTube Music, SoundCloud
- Temporary voice channel system (TempVoice)
- User leveling system with unlockable rankcard styles
- 27 slash commands for complete control

## Project Structure
```
bot/
├── index.ts              # Main entry point
├── config.ts             # Configuration and constants
├── types.ts              # TypeScript interfaces
├── package.json          # Bot dependencies
├── .env.example          # Environment variables template
├── commands/             # 27 slash commands
│   ├── play.ts           # Play music
│   ├── skip.ts           # Skip track
│   ├── pause.ts          # Pause playback
│   ├── resume.ts         # Resume playback
│   ├── bucle.ts          # Enable loop
│   ├── stopBucle.ts      # Disable loop
│   ├── any.ts            # Random track from queue
│   ├── random.ts         # Shuffle queue
│   ├── voteskip.ts       # Vote to skip
│   ├── addPermiss.ts     # Grant music permissions
│   ├── clear.ts          # Clear queue
│   ├── karaoke.ts        # Search karaoke version
│   ├── autoplay.ts       # Toggle autoplay
│   ├── queue.ts          # Show queue
│   ├── nowplaying.ts     # Current track
│   ├── stop.ts           # Stop and disconnect
│   ├── volume.ts         # Adjust volume
│   ├── help.ts           # Help command
│   ├── level.ts          # User level
│   ├── leaderboard.ts    # Top 10 users
│   ├── profile.ts        # User profile
│   ├── rankcard.ts       # Change rankcard style
│   ├── setupTempVoice.ts # Setup TempVoice (Admin)
│   ├── voice.ts          # Voice channel management
│   ├── setlevel.ts       # (Staff) Set user level
│   ├── addxp.ts          # (Staff) Add XP to user
│   └── removexp.ts       # (Staff) Remove XP from user
├── events/               # Event handlers
│   ├── ready.ts          # Bot ready event
│   ├── interactionCreate.ts # Command handler
│   └── voiceStateUpdate.ts  # Voice events + XP tracking
└── systems/              # Core systems
    ├── audioClient.ts    # Audio streaming (Piped + Cobalt, FFmpeg)
    ├── musicPlayer.ts    # Music playback logic
    └── rankcardGenerator.ts # Rankcard generation
```

## Key Features

### Music System
- Multi-platform support (YouTube, Spotify, YouTube Music, SoundCloud)
- Queue management with loop, shuffle, autoplay
- Permission system for controlling music
- Vote skip functionality

### TempVoice System
- Users join a creator channel to get their own temporary voice channel
- Full permissions: rename, limit, lock, trust, kick, block
- Channels auto-delete when empty
- Channel claiming when owner leaves

### Level System
- 2 XP per minute in voice channels
- 3 XP per minute when listening to music with bot
- 6 unlockable rankcard styles:
  1. Lo-fi Night (Level 0)
  2. Lo-fi Minimal (Level 25)
  3. Lo-fi Quiet Afternoon (Level 35)
  4. Lo-fi Anime Desk (Level 50)
  5. Lo-fi Study Night (Level 70)
  6. Lo-fi Nostalgic Memory (Level 100)
- Staff commands (role ID: 1230949715127042098):
  - /setlevel - Set a user's level directly
  - /addxp - Add XP to a user
  - /removexp - Remove XP from a user

## Environment Variables Required
- `DISCORD_TOKEN` - Bot token from Discord Developer Portal
- `CLIENT_ID` - Application ID from Discord Developer Portal

## Deployment Target
This bot is designed to be deployed on Render (not Replit), using the bot/ directory as the root.

## Recent Changes
- Initial creation: Full bot structure with all features
- 24 slash commands implemented
- TempVoice and Level systems complete
- README with deployment instructions
- **January 2026**: Converted level, profile, and leaderboard displays from embeds to generated PNG images using canvas
  - /level command now displays a full rankcard image
  - /profile command shows the rankcard image with style info
  - /leaderboard generates a complete top 10 image with avatars
  - Three distinct lo-fi styles with unique visual themes
- **January 2026**: Added staff commands for level management
  - /setlevel, /addxp, /removexp commands for staff role
  - Switched from 'canvas' to '@napi-rs/canvas' for deployment compatibility
- **January 2026**: New audio system (Render-friendly, no play-dl/ytdl/cookies)
  - **audioClient**: Piped API (primary) + Cobalt API (fallback) for stream URLs
  - Piped uses proxied URLs (pipedproxy) so no 403 from YouTube on Render
  - FFmpeg (ffmpeg-static) for transcoding to Discord-ready PCM
  - No Spotify credentials, cookies, or ytdl-core required
  - Cleanup on track end, skip, stop, and bot shutdown (SIGINT/SIGTERM)
