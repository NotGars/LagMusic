# 🚀 Guía Rápida de Despliegue en Render

## Respuesta Directa a tus Preguntas

### ¿Qué poner en Build Command y Start Command?

**OPCIÓN 1: Usando Docker (RECOMENDADO) ✅**
- **Environment:** Docker
- **Build Command:** (dejar vacío)
- **Start Command:** (dejar vacío)
- El Dockerfile se encarga de todo automáticamente

**OPCIÓN 2: Sin Docker (puede fallar FFmpeg) ⚠️**
- **Environment:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python bot.py`
- **Problema:** FFmpeg puede no estar disponible

---

## Pasos para Desplegar en Render

### 1. Ir a Render
- Ve a [render.com](https://render.com)
- Inicia sesión con GitHub

### 2. Crear Nuevo Servicio
1. Click en **"New +"** → **"Web Service"**
2. Conecta tu repositorio: `LagMusic` o `discord-music-bot`
3. Configuración:
   - **Name:** `discord-music-bot`
   - **Region:** Oregon (o el más cercano)
   - **Branch:** `main`
   - **Environment:** **Docker** ← IMPORTANTE
   - **Plan:** Free

### 3. Variables de Entorno (Environment Variables)

Añade estas variables en la sección "Environment":

```
DISCORD_TOKEN = tu_token_aqui
SPOTIFY_CLIENT_ID = tu_client_id (opcional)
SPOTIFY_CLIENT_SECRET = tu_client_secret (opcional)
HELP_CHANNELS = 123456789,987654321 (opcional)
```

**¿Dónde conseguir el DISCORD_TOKEN?**
1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecciona tu aplicación
3. Ve a "Bot" → "Reset Token" → Copia el token

### 4. Desplegar
1. Click en **"Create Web Service"**
2. Espera 5-10 minutos mientras Render:
   - Descarga el código
   - Construye la imagen Docker
   - Instala FFmpeg
   - Inicia el bot

### 5. Verificar
- Ve a **"Logs"** en el dashboard de Render
- Deberías ver: `Bot conectado como [nombre_del_bot]`
- El bot aparecerá en línea en Discord

---

## Solución de Problemas

### ❌ Error: "FFmpeg not found"
- **Solución:** Asegúrate de usar **Docker** como Environment, no Python

### ❌ Error: "Invalid token"
- **Solución:** Verifica que el `DISCORD_TOKEN` esté correcto en las variables de entorno

### ❌ Bot no responde a comandos
- **Solución:** 
  1. Verifica que el bot tenga permisos en tu servidor Discord
  2. Asegúrate de usar comandos slash (`/play`, `/skip`, etc.)
  3. El bot debe estar en un canal de voz para comandos de música

### ❌ "Application did not respond"
- **Solución:** El bot puede tardar unos segundos en iniciar. Espera 1-2 minutos después del despliegue

---

## Actualizaciones Automáticas

Cada vez que hagas `git push` a GitHub, Render automáticamente:
1. Detecta los cambios
2. Reconstruye la imagen Docker
3. Reinicia el bot con el nuevo código

---

## Resumen de Comandos del Bot

Una vez desplegado, usa estos comandos en Discord:

- `/play <canción>` - Reproducir una canción
- `/play playlist <app> <nombre>` - Reproducir playlist
- `/skip` - Saltar canción
- `/pause` - Pausar
- `/resume` - Reanudar
- `/bucle` - Activar loop
- `/stopbucle` - Desactivar loop
- `/voteskip` - Votar para saltar
- `/help` - Ver todos los comandos

---

## Notas Importantes

✅ **Plan Gratuito de Render:**
- 750 horas/mes gratis
- Suficiente para tener el bot 24/7
- Despliegues automáticos desde GitHub

⚠️ **Limitaciones:**
- El servicio puede reiniciarse ocasionalmente
- Puede haber latencia en regiones lejanas

🔒 **Seguridad:**
- Nunca compartas tu `DISCORD_TOKEN`
- Usa variables de entorno, no las pongas en el código
- El archivo `.env` está en `.gitignore` para protegerlo

---

## ¿Necesitas Ayuda?

Si tienes problemas:
1. Revisa los **Logs** en Render
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de usar **Docker** como Environment

¡Listo! Tu bot debería estar funcionando en Discord 🎵
