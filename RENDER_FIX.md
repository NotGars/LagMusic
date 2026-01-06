# ⚠️ IMPORTANT: Render Deployment Fix

## The Problem
You're getting a "Port scan timeout" error because you created a **Web Service** on Render, but Discord bots don't need to expose HTTP ports. They connect to Discord's servers instead.

## The Solution
You need to create a **Background Worker** instead of a Web Service.

---

## ✅ Correct Deployment Steps for Render

### Step 1: Delete the Current Web Service
1. Go to your Render dashboard
2. Find your discord-music-bot service
3. Click on it → Settings → Delete Service

### Step 2: Create a Background Worker

1. Go to Render Dashboard: https://dashboard.render.com
2. Click **"New +"** → Select **"Background Worker"** (NOT Web Service!)
3. Connect your GitHub repository: `NotGars/LagMusic`

### Step 3: Configure the Background Worker

**For Docker Deployment (RECOMMENDED):**
- **Name:** `discord-music-bot`
- **Environment:** `Docker`
- **Docker Command:** Leave empty (it will use CMD from Dockerfile)
- **Plan:** Free

**For Native Python Deployment (Alternative):**
- **Name:** `discord-music-bot`
- **Environment:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python bot.py`
- **Plan:** Free

### Step 4: Add Environment Variables

Click on "Environment" tab and add:
```
DISCORD_TOKEN=your_discord_bot_token_here
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### Step 5: Deploy

Click **"Create Background Worker"** and wait for deployment to complete.

---

## 🔍 Key Differences

| Web Service | Background Worker |
|-------------|-------------------|
| ❌ Needs to expose a port | ✅ No port needed |
| ❌ For HTTP/API services | ✅ For bots and workers |
| ❌ Will timeout for Discord bots | ✅ Perfect for Discord bots |

---

## 📝 Summary

**What to use on Render:**
- **Service Type:** Background Worker (NOT Web Service)
- **Environment:** Docker (recommended) or Python 3
- **Docker Command:** (leave empty - uses Dockerfile CMD)
- **OR Build Command:** `pip install -r requirements.txt`
- **OR Start Command:** `python bot.py`

---

## ✅ After Deployment

Once deployed successfully, you should see:
- Status: "Live" (green)
- Logs showing: "Bot conectado como [YourBotName]"
- Your bot online in Discord

---

## 🆘 Still Having Issues?

Check the logs in Render dashboard for error messages. Common issues:
1. Invalid DISCORD_TOKEN
2. Missing environment variables
3. Bot not invited to Discord server with proper permissions

