# 🚀 Deploy Your Discord Bot to Render - Quick Start

## ⚠️ THE FIX: Use Background Worker, NOT Web Service!

The error you got was because you selected **Web Service**. Discord bots need **Background Worker** instead.

---

## 📋 Step-by-Step Instructions

### 1️⃣ Delete Your Current Service (if exists)
- Go to https://dashboard.render.com
- Find your `discord-music-bot` service
- Click Settings → Delete Service

### 2️⃣ Create a Background Worker
- Click **"New +"** button
- Select **"Background Worker"** ⬅️ THIS IS IMPORTANT!
- Connect to GitHub: `NotGars/LagMusic`

### 3️⃣ Configure Settings

**Basic Settings:**
```
Name: discord-music-bot
Region: Choose closest to you
Branch: main
```

**Environment Settings:**

**Option A - Docker (RECOMMENDED):**
```
Environment: Docker
Docker Command: (leave empty)
```

**Option B - Python:**
```
Environment: Python 3
Build Command: pip install -r requirements.txt
Start Command: python bot.py
```

### 4️⃣ Add Environment Variables

Click "Environment" tab and add these 3 variables:

```
DISCORD_TOKEN = your_bot_token_from_discord_developer_portal
SPOTIFY_CLIENT_ID = your_spotify_client_id
SPOTIFY_CLIENT_SECRET = your_spotify_client_secret
```

**Where to get these:**
- **DISCORD_TOKEN**: https://discord.com/developers/applications → Your App → Bot → Token
- **Spotify credentials**: https://developer.spotify.com/dashboard → Your App → Settings

### 5️⃣ Deploy!

- Click **"Create Background Worker"**
- Wait 2-3 minutes for deployment
- Check logs to see "Bot conectado como [YourBotName]"

---

## ✅ Success Indicators

You'll know it worked when you see:
- ✅ Status shows **"Live"** (green circle)
- ✅ Logs show: `Bot conectado como [YourBotName]`
- ✅ Your bot appears **online** in Discord

---

## 🎮 Commands Your Bot Supports

Once deployed, use these slash commands in Discord:

- `/play <song>` - Play a song from YouTube, Spotify, or Apple Music
- `/skip` - Skip current song
- `/pause` - Pause playback
- `/resume` - Resume playback
- `/stop` - Stop and clear queue
- `/queue` - Show current queue
- `/nowplaying` - Show current song
- `/shuffle` - Shuffle the queue
- `/loop` - Toggle loop mode
- `/voteskip` - Vote to skip (needs majority)
- `/remove <position>` - Remove song from queue
- `/clear` - Clear the queue
- `/volume <0-100>` - Adjust volume

---

## 🐛 Troubleshooting

**Bot not coming online?**
1. Check Render logs for errors
2. Verify DISCORD_TOKEN is correct
3. Make sure bot is invited to your Discord server
4. Check bot has proper permissions in Discord

**"Application did not respond" in Discord?**
- Wait 1-2 minutes after deployment
- Bot needs time to sync slash commands

**Music not playing?**
- Make sure you're in a voice channel
- Check bot has "Connect" and "Speak" permissions
- Verify FFmpeg is installed (Docker handles this automatically)

---

## 📞 Need Help?

Check the logs in Render dashboard:
- Click on your Background Worker
- Go to "Logs" tab
- Look for error messages

