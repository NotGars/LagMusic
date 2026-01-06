# 🚀 Guía Completa de Despliegue en Render

## ✅ Prerequisitos Completados

Tu repositorio ya incluye todos los archivos necesarios:
- ✅ `render.yaml` - Configuración automática de Render
- ✅ `requirements.txt` - Dependencias de Python
- ✅ `runtime.txt` - Versión de Python (3.11.0)
- ✅ `Procfile` - Comando de inicio alternativo
- ✅ `start.sh` - Script de inicio con FFmpeg

## 📋 Pasos para Desplegar

### Paso 1: Crear Cuenta en Render

1. Ve a **https://render.com**
2. Haz clic en **"Get Started"**
3. Regístrate usando tu cuenta de GitHub (recomendado)
4. Autoriza a Render para acceder a tus repositorios

### Paso 2: Crear Nuevo Background Worker

1. En el Dashboard de Render, haz clic en **"New +"** (botón azul arriba a la derecha)
2. Selecciona **"Background Worker"**
3. Conecta tu repositorio:
   - Si no aparece, haz clic en **"Configure account"** y autoriza el repositorio
   - Busca y selecciona: **`discord-music-bot`** (o **`LagMusic`** si fue renombrado)

### Paso 3: Configurar el Servicio

Render debería detectar automáticamente la configuración desde `render.yaml`, pero verifica:

**Configuración Básica:**
- **Name:** `discord-music-bot` (o el nombre que prefieras)
- **Environment:** `Python 3`
- **Region:** `Oregon (US West)` (o el más cercano a ti)
- **Branch:** `main`

**Comandos de Build y Start:**
- **Build Command:** 
  ```bash
  apt-get update && apt-get install -y ffmpeg && pip install -r requirements.txt
  ```
- **Start Command:** 
  ```bash
  python bot.py
  ```

### Paso 4: Configurar Variables de Entorno

⚠️ **IMPORTANTE:** Debes añadir estas variables antes de desplegar.

En la sección **"Environment Variables"**, haz clic en **"Add Environment Variable"** y añade:

#### Variables Obligatorias:

| Variable | Valor | Dónde Obtenerlo |
|----------|-------|-----------------|
| `DISCORD_TOKEN` | Tu token del bot | [Discord Developer Portal](https://discord.com/developers/applications) |

#### Variables Opcionales:

| Variable | Valor | Dónde Obtenerlo |
|----------|-------|-----------------|
| `SPOTIFY_CLIENT_ID` | Tu Spotify Client ID | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET` | Tu Spotify Client Secret | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |
| `HELP_CHANNELS` | IDs de canales (ej: `123456,789012`) | Discord (clic derecho en canal → Copiar ID) |

#### Cómo Obtener el Discord Token:

1. Ve a https://discord.com/developers/applications
2. Selecciona tu aplicación (o crea una nueva)
3. Ve a la sección **"Bot"**
4. Haz clic en **"Reset Token"** y copia el token
5. ⚠️ **Nunca compartas este token públicamente**

#### Cómo Obtener Credenciales de Spotify (Opcional):

1. Ve a https://developer.spotify.com/dashboard
2. Inicia sesión con tu cuenta de Spotify
3. Haz clic en **"Create App"**
4. Completa el formulario:
   - **App name:** Discord Music Bot
   - **App description:** Bot de música para Discord
   - **Redirect URI:** `http://localhost` (no se usa pero es requerido)
5. Acepta los términos y haz clic en **"Create"**
6. Copia el **Client ID** y **Client Secret**

### Paso 5: Configurar Plan

- Selecciona **"Free"** plan
- El plan gratuito incluye:
  - ✅ 750 horas/mes (suficiente para 24/7)
  - ✅ 512 MB RAM
  - ✅ Despliegues automáticos desde GitHub

### Paso 6: Desplegar

1. Revisa toda la configuración
2. Haz clic en **"Create Background Worker"**
3. Render comenzará a:
   - ✅ Clonar tu repositorio
   - ✅ Instalar FFmpeg
   - ✅ Instalar dependencias de Python
   - ✅ Iniciar el bot

### Paso 7: Verificar el Despliegue

1. Ve a la pestaña **"Logs"** en tu servicio de Render
2. Espera a ver estos mensajes:
   ```
   ==> Installing dependencies...
   ==> Starting service...
   Bot conectado como [NombreDelBot]#1234
   ```
3. Ve a Discord y verifica que el bot esté **en línea** (círculo verde)

## 🔧 Solución de Problemas

### El bot no se conecta

**Problema:** Error de autenticación
- ✅ Verifica que el `DISCORD_TOKEN` sea correcto
- ✅ Asegúrate de no tener espacios extra en el token
- ✅ Regenera el token en Discord Developer Portal si es necesario

### Error al instalar FFmpeg

**Problema:** `apt-get: command not found`
- ✅ Asegúrate de que el Build Command incluya la instalación de FFmpeg
- ✅ Usa el comando completo proporcionado en el Paso 3

### El bot se desconecta constantemente

**Problema:** Errores en el código o falta de recursos
- ✅ Revisa los logs en Render para ver el error específico
- ✅ Verifica que todas las dependencias estén en `requirements.txt`

### No reproduce audio

**Problema:** FFmpeg no instalado o configurado incorrectamente
- ✅ Verifica en los logs que FFmpeg se instaló correctamente
- ✅ Asegúrate de que el bot tenga permisos de voz en Discord

## 🔄 Actualizar el Bot

Cuando hagas cambios en el código:

1. **Commit y Push a GitHub:**
   ```bash
   git add .
   git commit -m "Descripción de los cambios"
   git push origin main
   ```

2. **Render detectará automáticamente los cambios** y redesplegar el bot

3. **Despliegue manual (si es necesario):**
   - Ve a tu servicio en Render
   - Haz clic en **"Manual Deploy"** → **"Deploy latest commit"**

## 📊 Monitoreo

### Ver Logs en Tiempo Real

1. Ve a tu servicio en Render
2. Haz clic en la pestaña **"Logs"**
3. Los logs se actualizan automáticamente

### Métricas

- **CPU Usage:** Uso del procesador
- **Memory Usage:** Uso de memoria RAM
- **Uptime:** Tiempo que el bot ha estado en línea

## 💡 Consejos

1. **Mantén tu token seguro:** Nunca lo subas a GitHub
2. **Usa variables de entorno:** Para toda información sensible
3. **Revisa los logs regularmente:** Para detectar problemas temprano
4. **Actualiza dependencias:** Mantén `requirements.txt` actualizado
5. **Plan gratuito:** Es suficiente para la mayoría de servidores pequeños/medianos

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en Render
2. Verifica la configuración de variables de entorno
3. Consulta la documentación de Render: https://render.com/docs
4. Abre un issue en GitHub

## ✅ Checklist Final

Antes de considerar el despliegue completo, verifica:

- [ ] Bot aparece en línea en Discord
- [ ] Comandos slash están disponibles (puede tardar hasta 1 hora)
- [ ] El bot puede unirse a canales de voz
- [ ] Puede reproducir música desde YouTube
- [ ] (Opcional) Puede reproducir playlists de Spotify
- [ ] Los logs no muestran errores críticos
- [ ] El bot responde a `/help`

## 🎉 ¡Listo!

Tu bot de música Discord está ahora desplegado en Render y funcionando 24/7. ¡Disfruta de tu música!
