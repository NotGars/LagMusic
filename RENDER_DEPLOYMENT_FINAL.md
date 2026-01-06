# 🚀 RENDER DEPLOYMENT - FINAL GUIDE

## ✅ Your Bot is Ready for Render Web Service Deployment

All code has been pushed to GitHub: https://github.com/NotGars/LagMusic.git

---

## 📋 EXACT COMMANDS FOR RENDER

### **Build Command:**
```
pip install -r requirements.txt
```

### **Start Command:**
```
python bot.py
```

---

## 🔧 DEPLOYMENT STEPS ON RENDER

### 1. Create New Web Service
1. Go to [render.com](https://render.com) and log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: **NotGars/LagMusic**

### 2. Configure Service Settings

| Setting | Value |
|---------|-------|
| **Name** | `discord-music-bot` (or any name you prefer) |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | (leave empty) |
| **Environment** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python bot.py` |
| **Plan** | `Free` |

### 3. Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add:

| Key | Value | Required |
|-----|-------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | ✅ YES |
| `SPOTIFY_CLIENT_ID` | Your Spotify Client ID | ⚠️ Optional |
| `SPOTIFY_CLIENT_SECRET` | Your Spotify Client Secret | ⚠️ Optional |
| `HELP_CHANNELS` | Discord channel IDs (comma-separated) | ⚠️ Optional |
| `PORT` | `10000` | ✅ YES (auto-set by Render) |

**Note:** Render automatically sets the `PORT` environment variable. The bot's Flask server will use this port.

### 4. Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (usually 2-5 minutes)
3. Check the **"Logs"** tab to verify the bot is running

---

## ✅ EXPECTED LOG OUTPUT

You should see:
```
 * Serving Flask app 'web_server'
 * Running on http://0.0.0.0:10000
Bot conectado como YourBotName
ID: 123456789
------
Comandos sincronizados
```

---

## 🎵 HOW IT WORKS

1. **Flask Web Server**: Runs on port 10000 to keep Render happy (Web Service requirement)
2. **Discord Bot**: Runs simultaneously in the same process
3. **Health Check**: Flask responds to HTTP requests at `/` and `/health`
4. **Music Playback**: Fully functional with YouTube, Spotify, and Apple Music support

---

## 🔍 TROUBLESHOOTING

### Issue: "Port scan timeout"
**Solution:** Already fixed! The bot now includes a Flask web server.

### Issue: Bot doesn't respond to commands
**Solution:** 
- Wait up to 1 hour for Discord to sync slash commands
- Verify the bot has `applications.commands` permission
- Check the bot is online in your Discord server

### Issue: No audio playback
**Solution:**
- Render's free tier may have limitations with FFmpeg
- Consider using Docker deployment (see Dockerfile in repo)
- For Docker on Render:
  - Environment: `Docker`
  - Build Command: (leave empty)
  - Start Command: (leave empty, uses Dockerfile CMD)

### Issue: Bot goes offline
**Solution:**
- Check Render logs for errors
- Verify `DISCORD_TOKEN` is correct
- Ensure you're on the Free plan (750 hours/month)

---

## 🐳 ALTERNATIVE: DOCKER DEPLOYMENT (Recommended for FFmpeg)

If you experience audio issues, use Docker:

1. In Render, select **Environment: Docker**
2. **Build Command:** (leave empty)
3. **Start Command:** (leave empty)
4. Render will use the Dockerfile which includes FFmpeg

---

## 📊 RENDER FREE TIER LIMITS

- ✅ 750 hours/month (enough for 24/7)
- ✅ Automatic deploys from GitHub
- ✅ Custom domains
- ⚠️ Services may sleep after 15 min of inactivity (Web Services only)
- ⚠️ 512 MB RAM
- ⚠️ 0.1 CPU

**Note:** The Flask server prevents the service from sleeping by responding to health checks.

---

## 🎉 SUCCESS CHECKLIST

- [ ] Repository pushed to GitHub
- [ ] Render Web Service created
- [ ] Environment variables configured
- [ ] Build Command: `pip install -r requirements.txt`
- [ ] Start Command: `python bot.py`
- [ ] Deployment successful (check logs)
- [ ] Bot appears online in Discord
- [ ] Slash commands work (may take up to 1 hour)
- [ ] Music playback works

---

## 📞 NEED HELP?

- Check Render logs: Dashboard → Your Service → Logs
- Verify Discord bot permissions
- Ensure FFmpeg is available (use Docker if needed)
- Review RENDER_WEB_SERVICE.md for detailed explanations

---

**Last Updated:** $(date)
**Repository:** https://github.com/NotGars/LagMusic.git
