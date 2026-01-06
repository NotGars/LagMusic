# 🎵 Discord Music Bot - Render Web Service Deployment (FREE TIER)

## ✅ FINAL SOLUTION - Web Service Configuration

Your bot is **READY** for Render deployment as a Web Service (Free Tier).

---

## 📋 Quick Answer - Copy These Exactly

### On Render Dashboard:

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
python bot.py
```

**Environment Variables to Add:**
- `DISCORD_TOKEN` = your_discord_bot_token
- `SPOTIFY_CLIENT_ID` = your_spotify_client_id (optional)
- `SPOTIFY_CLIENT_SECRET` = your_spotify_client_secret (optional)
- `PORT` = 10000 (Render will auto-set this, but you can specify)

---

## 🚀 Step-by-Step Deployment

### 1. Create New Web Service on Render

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `https://github.com/NotGars/LagMusic.git`
4. Configure the service:

   - **Name:** `discord-music-bot` (or any name you prefer)
   - **Region:** Oregon (US West) or closest to you
   - **Branch:** `main`
   - **Root Directory:** (leave blank)
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python bot.py`
   - **Plan:** Free

### 2. Add Environment Variables

Click **"Advanced"** and add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `DISCORD_TOKEN` | `your_bot_token_here` | Required - Get from Discord Developer Portal |
| `SPOTIFY_CLIENT_ID` | `your_spotify_id` | Optional - For Spotify support |
| `SPOTIFY_CLIENT_SECRET` | `your_spotify_secret` | Optional - For Spotify support |

### 3. Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Your bot will start automatically!

---

## 🔍 How It Works

### Web Service vs Worker Service

**Worker Service (Paid):**
- Runs background tasks
- No port binding required
- Costs money on Render

**Web Service (FREE):**
- Must bind to a port (for health checks)
- Your bot includes a Flask web server that does this automatically
- Completely free!

### Your Bot's Architecture

```
bot.py
├── Starts Discord Bot (main functionality)
└── Starts Flask Web Server (keeps Render happy)
    ├── Binds to PORT environment variable
    ├── Serves status page at https://your-app.onrender.com/
    └── Health check at https://your-app.onrender.com/health
```

---

## ✅ Verification

After deployment, verify your bot is working:

1. **Check Render Logs:**
   - Look for: `Servidor web iniciado en puerto 10000`
   - Look for: `Bot conectado como [YourBotName]`

2. **Check Web Interface:**
   - Visit: `https://your-app-name.onrender.com/`
   - You should see a nice status page

3. **Check Discord:**
   - Your bot should appear online
   - Try `/play` command in a voice channel

---

## 🐛 Troubleshooting

### "Port scan timeout" Error
**Solution:** Make sure you selected **"Web Service"** not "Background Worker"

### Bot Not Responding
**Solution:** Check environment variables, especially `DISCORD_TOKEN`

### "Application failed to respond" Error
**Solution:** Wait 2-3 minutes after deployment starts. The bot takes time to install dependencies.

### FFmpeg Errors
**Solution:** Render's free tier includes FFmpeg. If you see errors, check the logs for specific issues.

---

## 📊 What You Get

✅ **Free hosting** on Render  
✅ **Automatic deployments** when you push to GitHub  
✅ **Web interface** to check bot status  
✅ **Health monitoring** via `/health` endpoint  
✅ **All music commands** working (play, skip, pause, etc.)  
✅ **Multi-platform support** (YouTube, Spotify, Apple Music)  

---

## 🎯 Commands Reference

Once deployed, your bot supports:

- `/play [song]` - Play a song
- `/skip` - Skip current song
- `/pause` - Pause playback
- `/resume` - Resume playback
- `/stop` - Stop and clear queue
- `/queue` - Show current queue
- `/nowplaying` - Show current song
- `/loop` - Toggle loop mode
- `/shuffle` - Shuffle queue
- `/voteskip` - Vote to skip (requires 50% votes)
- `/remove [position]` - Remove song from queue
- `/clear` - Clear the queue
- `/volume [0-100]` - Set volume

---

## 📝 Important Notes

1. **Free Tier Limitations:**
   - Service spins down after 15 minutes of inactivity
   - Takes ~30 seconds to wake up when someone uses a command
   - 750 hours/month of runtime (plenty for a Discord bot)

2. **Keeping Bot Active:**
   - The web server helps prevent spin-down
   - Consider using a service like UptimeRobot to ping your bot's URL every 5 minutes

3. **Updates:**
   - Push to GitHub → Render auto-deploys
   - No manual intervention needed!

---

## 🎉 You're Done!

Your Discord Music Bot is now live and ready to play music 24/7 (with free tier limitations).

**Repository:** https://github.com/NotGars/LagMusic.git  
**Your Bot URL:** `https://your-app-name.onrender.com/`

Enjoy your music bot! 🎵
