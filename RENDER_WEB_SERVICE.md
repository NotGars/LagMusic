# 🚀 Desplegar en Render como Web Service GRATUITO

## ¿Por qué Web Service?

Background Worker es de paga en Render. Este bot está configurado para funcionar como **Web Service gratuito** exponiendo un puerto HTTP mientras el bot de Discord funciona en segundo plano.

---

## 📋 Pasos para Desplegar

### 1. Crear Nuevo Web Service

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click en **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub: `https://github.com/NotGars/discord-music-bot`

### 2. Configuración del Servicio

**Configuración Básica:**
- **Name:** `discord-music-bot` (o el nombre que prefieras)
- **Region:** Elige la más cercana
- **Branch:** `main`
- **Root Directory:** (dejar vacío)

**Build & Deploy:**

#### Opción A: Docker (RECOMENDADO)
- **Environment:** `Docker`
- **Docker Command:** (dejar vacío, usa el Dockerfile)

#### Opción B: Python Nativo
- **Environment:** `Python 3`
- **Build Command:** 
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command:**
  ```bash
  python bot.py
  ```

**Plan:**
- Selecciona **"Free"** (gratis)

### 3. Variables de Entorno

Click en **"Advanced"** y agrega estas variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DISCORD_TOKEN` | `tu_token_aqui` | Token del bot de Discord |
| `SPOTIFY_CLIENT_ID` | `tu_client_id` | Client ID de Spotify API |
| `SPOTIFY_CLIENT_SECRET` | `tu_client_secret` | Client Secret de Spotify API |

**Opcional (si usas Python nativo):**
| Variable | Valor |
|----------|-------|
| `PORT` | `10000` |

### 4. Crear Web Service

Click en **"Create Web Service"** y espera a que se despliegue (5-10 minutos).

---

## ✅ Verificación

Una vez desplegado:

1. **Ver Logs:** En el dashboard de Render, ve a la pestaña "Logs"
2. **Buscar:** `Bot conectado como [nombre_del_bot]`
3. **Verificar Web:** Visita la URL que Render te asigna (ej: `https://discord-music-bot-xxxx.onrender.com`)
   - Deberías ver una página que dice "Bot is running" con un indicador verde

---

## 🎵 Usar el Bot

1. Invita el bot a tu servidor de Discord
2. Únete a un canal de voz
3. Usa los comandos:
   - `/play [canción]` - Reproduce una canción
   - `/pause` - Pausa la reproducción
   - `/resume` - Reanuda la reproducción
   - `/skip` - Salta a la siguiente canción
   - `/queue` - Ver la cola de reproducción
   - Y más...

---

## 🔧 Solución de Problemas

### El bot no se conecta
- Verifica que `DISCORD_TOKEN` sea correcto
- Revisa los logs en Render para ver errores

### "Application did not respond"
- Esto es normal. El bot funciona aunque Render muestre este mensaje
- El servidor web está corriendo y Render detecta el puerto abierto

### El bot se desconecta después de 15 minutos
- El plan gratuito de Render duerme los servicios después de 15 minutos de inactividad
- El bot se reactivará cuando alguien acceda a la URL del servicio
- Para mantenerlo activo 24/7, considera:
  - Usar un servicio de "ping" como UptimeRobot
  - Actualizar al plan de paga de Render

### Errores de FFmpeg
- Si usas Docker: FFmpeg ya está incluido
- Si usas Python nativo: Render no soporta FFmpeg en el plan gratuito, usa Docker

---

## 📊 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `/play [query]` | Reproduce una canción de YouTube, Spotify o Apple Music |
| `/pause` | Pausa la reproducción actual |
| `/resume` | Reanuda la reproducción |
| `/skip` | Salta a la siguiente canción |
| `/stop` | Detiene la reproducción y limpia la cola |
| `/queue` | Muestra la cola de reproducción |
| `/nowplaying` | Muestra la canción actual |
| `/shuffle` | Mezcla la cola aleatoriamente |
| `/loop` | Activa/desactiva el modo bucle |
| `/remove [posición]` | Elimina una canción de la cola |
| `/voteskip` | Inicia una votación para saltar la canción |

---

## 🌟 Características

- ✅ Reproduce desde YouTube, Spotify y Apple Music
- ✅ Sistema de cola de reproducción
- ✅ Modo bucle y aleatorio
- ✅ Sistema de votación para saltar canciones
- ✅ Gestión de permisos por canal de voz
- ✅ Interfaz web para verificar estado del bot

---

## 📝 Notas Importantes

1. **Plan Gratuito de Render:**
   - 750 horas/mes de uso
   - El servicio se duerme después de 15 minutos de inactividad
   - Límite de 512 MB de RAM

2. **Mantener el Bot Activo:**
   - Configura un servicio como [UptimeRobot](https://uptimerobot.com/) para hacer ping a tu URL cada 5 minutos
   - Esto evitará que el servicio se duerma

3. **Actualizaciones:**
   - Render detecta automáticamente cambios en GitHub
   - Cada push a `main` redesplegará el bot

---

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en Render
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que el token de Discord sea válido
4. Consulta la documentación en el repositorio

---

**¡Disfruta de tu bot de música en Discord! 🎵🤖**
