# Render Deployment Commands

## Quick Reference for Render Setup

### Option 1: Docker Deployment (RECOMMENDED)

**On Render Dashboard:**
1. **Environment:** Docker
2. **Build Command:** `docker build -t discord-music-bot .`
3. **Start Command:** `docker run discord-music-bot`

### Option 2: Native Python Deployment

**On Render Dashboard:**
1. **Environment:** Python 3
2. **Build Command:** `pip install -r requirements.txt`
3. **Start Command:** `python bot.py`

---

## Why Docker is Recommended

- ✅ FFmpeg is automatically installed
- ✅ Consistent environment across deployments
- ✅ No system dependency issues
- ✅ Easier debugging

---

## Environment Variables to Set on Render

Make sure to add these in the Render dashboard under "Environment Variables":

```
DISCORD_TOKEN=your_discord_bot_token_here
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

---

## Deployment Steps

1. Go to https://render.com and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `NotGars/discord-music-bot`
4. Configure:
   - **Name:** discord-music-bot
   - **Environment:** Docker (or Python 3)
   - **Build Command:** (see above)
   - **Start Command:** (see above)
5. Add environment variables
6. Click "Create Web Service"

---

## Troubleshooting

If the bot doesn't start:
- Check logs in Render dashboard
- Verify all environment variables are set correctly
- Ensure DISCORD_TOKEN is valid
- Check that the bot has proper permissions in Discord Developer Portal

