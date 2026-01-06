# YouTube Bot Detection Fix

## Problem
YouTube was blocking the bot with the error:
```
ERROR: Sign in to confirm you're not a bot
```

## Solution Applied
Updated `config.py` with enhanced yt-dlp options that bypass YouTube's bot detection:

### Key Changes:
1. **Android Client**: Uses Android player client which is less restricted
2. **Enhanced Headers**: Mimics a real browser with proper User-Agent
3. **Geo Bypass**: Enables geographic restriction bypass
4. **Player Options**: Optimizes extraction by skipping unnecessary data

### What Was Added:
```python
'extractor_args': {
    'youtube': {
        'player_client': ['android', 'web'],  # Use Android client first
        'skip': ['hls', 'dash', 'translated_subs'],
        'player_skip': ['js', 'configs', 'webpage']
    }
},
'http_headers': {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-us,en;q=0.5',
    'Sec-Fetch-Mode': 'navigate'
}
```

## Deployment
After pushing these changes to GitHub:

1. **Render will auto-deploy** if you have auto-deploy enabled
2. **Or manually trigger** a new deployment in Render dashboard
3. The bot should now play YouTube videos without authentication errors

## Testing
Try these commands in Discord:
- `/play never gonna give you up`
- `/play https://www.youtube.com/watch?v=dQw4w9WgXcQ`

## If Issues Persist
If YouTube still blocks the bot, you may need to:
1. Update yt-dlp to the latest version: `pip install --upgrade yt-dlp`
2. Consider using alternative sources (Spotify, SoundCloud)
3. Use a VPN or proxy if geographic restrictions apply

## Notes
- This fix uses the Android client which is more reliable
- No cookies or authentication required
- Works with most YouTube videos (except age-restricted content)
