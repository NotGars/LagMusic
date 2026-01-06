# Troubleshooting Guide

## Common Issues and Solutions

### 1. CommandNotFound Errors in Logs

**Error:** `Ignoring exception in command None, CommandNotFound: Command 'lb' is not found`

**Explanation:** These errors are **NORMAL** and **HARMLESS**. They occur when:
- Users type invalid text commands (e.g., `!lb` instead of `/bucle`)
- Other bots' commands are detected
- Discord users experiment with random commands

**Solution:** These errors are already being caught and ignored by the error handlers. No action needed.

---

### 2. YouTube Authentication/Playback Issues

**Error:** `Sign in to confirm you're not a bot`

**Root Cause:** YouTube's aggressive bot detection blocking yt-dlp requests.

**Solutions Applied:**
1. ✅ Multiple player clients (android_music, android, mweb, web)
2. ✅ Android user agent spoofing
3. ✅ Enhanced HTTP headers
4. ✅ Geo-bypass enabled

**Additional Solutions (if still failing):**

#### Option A: Use YouTube Cookies (Recommended)
1. Install a browser extension to export cookies (e.g., "Get cookies.txt")
2. Export YouTube cookies to `cookies.txt`
3. Upload to your Render service or add to project
4. Update `config.py`:
```python
'cookiefile': '/path/to/cookies.txt',
```

#### Option B: Use Invidious/Piped Instances
Update `config.py` to use alternative YouTube frontends:
```python
'proxy': 'https://invidious.example.com',
```

#### Option C: Update yt-dlp Regularly
YouTube changes their API frequently. Update yt-dlp:
```bash
pip install --upgrade yt-dlp
```

---

### 3. Slash Commands Not Appearing in Discord

**Symptoms:** Commands don't show up when typing `/`

**Solutions:**
1. **Wait for sync:** Global command sync can take up to 1 hour
2. **Check bot permissions:** Ensure bot has `applications.commands` scope
3. **Reinvite bot:** Use this invite URL format:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=36700160&scope=bot%20applications.commands
   ```
4. **Check logs:** Look for "✅ X comandos slash sincronizados" in Render logs

---

### 4. Render "Port Scan Timeout" Error

**Error:** `Port scan timeout reached, no open ports detected`

**Solution:** Already implemented - Flask web server on port 10000

**Verification:**
- Check if `web_server.py` is running
- Verify `start.sh` launches both Flask and bot
- Ensure `PORT` environment variable is set to 10000

---

### 5. Bot Disconnects/Crashes

**Common Causes:**
1. **FFmpeg missing:** Ensure FFmpeg is installed (already in Dockerfile)
2. **Voice connection timeout:** Normal after inactivity
3. **Memory limits:** Render free tier has 512MB RAM limit

**Solutions:**
- Monitor Render logs for specific errors
- Use UptimeRobot to keep service active (already configured)
- Consider upgrading Render plan if memory issues persist

---

### 6. Spotify/Apple Music Not Working

**Spotify Setup:**
1. Create app at https://developer.spotify.com/dashboard
2. Add credentials to `.env`:
   ```
   SPOTIFY_CLIENT_ID=your_id
   SPOTIFY_CLIENT_SECRET=your_secret
   ```

**Apple Music:**
- Currently uses YouTube search for Apple Music links
- Direct Apple Music API requires paid developer account

---

## Deployment Checklist

- [ ] Discord bot token in Render environment variables
- [ ] Spotify credentials (if using Spotify features)
- [ ] FFmpeg installed (via Dockerfile)
- [ ] Flask web server running on port 10000
- [ ] UptimeRobot monitoring configured
- [ ] Bot invited with correct permissions and scopes

---

## Useful Commands for Debugging

### Check if bot is online:
```bash
curl https://your-app.onrender.com/health
```

### View recent logs:
Check Render dashboard > Logs tab

### Test yt-dlp locally:
```bash
yt-dlp --print "%(title)s" "ytsearch:test song"
```

---

## Support

If issues persist:
1. Check Render logs for specific error messages
2. Verify all environment variables are set
3. Ensure bot has proper Discord permissions
4. Try re-deploying the service
