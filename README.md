# 🎵 LagMusic - Bot de Música para Discord

Bot de música completo para Discord con sistema de niveles, rankcards personalizadas y canales de voz temporales.

## ✨ Características

### 🎵 Sistema de Música
- Reproduce música de **YouTube**, **Spotify**, **YouTube Music** y más
- Cola de reproducción con múltiples canciones
- Soporte para playlists completas
- Modo bucle y aleatorio
- Autoplay basado en historial
- Modo karaoke (busca versiones instrumentales)
- Sistema de votación para saltar canciones

### 🔊 Sistema TempVoice
- Creación automática de canales de voz temporales
- Sistema de permisos completo (trust, block, kick)
- Renombrar y configurar límites de usuarios
- Los canales se eliminan automáticamente cuando están vacíos

### 📈 Sistema de Niveles
- Gana XP por tiempo en canales de voz
- XP bonus por escuchar música con el bot
- 3 estilos de Rankcard desbloqueables:
  - **Lo-fi Night** (Gratis) - Estilo oscuro con tonos morados
  - **Lo-fi Minimal** (Nivel 25) - Diseño minimalista elegante
  - **Lo-fi Anime Desk** (Nivel 50) - Colores pastel estilo anime
- Tabla de clasificaciones por servidor

## 📋 Comandos

### Música
| Comando | Descripción |
|---------|-------------|
| `/play <canción>` | Reproduce una canción |
| `/play <url> playlist:<plataforma>` | Carga una playlist |
| `/skip` | Salta la canción actual |
| `/pause` | Pausa la reproducción |
| `/resume` | Reanuda la música |
| `/stop` | Detiene y limpia la cola |
| `/queue` | Muestra la cola |
| `/nowplaying` | Muestra la canción actual |
| `/bucle` | Activa repetición |
| `/stopbucle` | Desactiva repetición |
| `/random` | Mezcla la cola |
| `/any` | Canción aleatoria de la cola |
| `/autoplay` | Reproducción automática |
| `/karaoke <canción>` | Busca versión karaoke |
| `/voteskip` | Vota para saltar |
| `/volume <0-100>` | Ajusta volumen |
| `/clear` | Limpia la cola |
| `/addpermiss <usuario>` | Da permisos de música |

### Niveles
| Comando | Descripción |
|---------|-------------|
| `/level` | Ver tu nivel |
| `/profile` | Ver perfil completo |
| `/leaderboard` | Top 10 usuarios |
| `/rankcard` | Cambiar estilo de tarjeta |

### TempVoice
| Comando | Descripción |
|---------|-------------|
| `/setuptempvoice` | Configurar sistema (Admin) |
| `/voice name <nombre>` | Renombrar canal |
| `/voice limit <número>` | Límite de usuarios |
| `/voice lock` | Bloquear canal |
| `/voice unlock` | Desbloquear canal |
| `/voice trust <usuario>` | Dar confianza |
| `/voice untrust <usuario>` | Quitar confianza |
| `/voice kick <usuario>` | Expulsar usuario |
| `/voice block <usuario>` | Bloquear usuario |
| `/voice unblock <usuario>` | Desbloquear usuario |
| `/voice claim` | Reclamar canal |
| `/voice transfer <usuario>` | Transferir propiedad |

### Otros
| Comando | Descripción |
|---------|-------------|
| `/help` | Lista de comandos |

## 🚀 Despliegue en Render

### Paso 1: Subir a GitHub

1. Crea un nuevo repositorio en GitHub
2. Clona este proyecto o descarga los archivos
3. Sube la carpeta `bot/` a tu repositorio:

```bash
git init
git add .
git commit -m "Initial commit - LagMusic Bot"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/lagmusic-bot.git
git push -u origin main
```

### Paso 2: Configurar Discord Developer Portal

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Crea una nueva aplicación llamada "LagMusic"
3. Ve a la sección **Bot** y crea un bot
4. Copia el **Token** del bot (lo necesitarás después)
5. Ve a **OAuth2 > URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: 
     - `Send Messages`
     - `Embed Links`
     - `Connect`
     - `Speak`
     - `Manage Channels`
     - `Move Members`
     - `Mute Members`
     - `Deafen Members`
6. Copia la URL generada e invita el bot a tu servidor

### Paso 3: Configurar Render

1. Ve a [Render](https://render.com) y crea una cuenta
2. Crea un nuevo **Background Worker**
3. Conecta tu repositorio de GitHub
4. Configura:
   - **Name**: lagmusic-bot
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npx tsx bot/index.ts`

5. Agrega las variables de entorno:
   - `DISCORD_TOKEN` = Tu token del bot
   - `CLIENT_ID` = El ID de tu aplicación (de Discord Developer Portal)

6. Haz clic en **Create Background Worker**

### Paso 4: Verificar

1. Espera a que Render termine de construir el proyecto
2. Revisa los logs para ver "LagMusic Bot está en línea!"
3. Ve a tu servidor de Discord y prueba `/help`

## 🔧 Desarrollo Local

### Requisitos
- Node.js 18 o superior
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/lagmusic-bot.git
cd lagmusic-bot

# Instalar dependencias
npm install

# Crear archivo .env
echo "DISCORD_TOKEN=tu_token_aqui" > .env
echo "CLIENT_ID=tu_client_id_aqui" >> .env

# Ejecutar el bot
npx tsx bot/index.ts
```

## 📁 Estructura del Proyecto

```
bot/
├── index.ts              # Punto de entrada del bot
├── config.ts             # Configuración y constantes
├── types.ts              # Tipos TypeScript
├── commands/             # Todos los comandos slash
│   ├── play.ts
│   ├── skip.ts
│   ├── pause.ts
│   ├── resume.ts
│   ├── bucle.ts
│   ├── stopBucle.ts
│   ├── any.ts
│   ├── random.ts
│   ├── voteskip.ts
│   ├── addPermiss.ts
│   ├── clear.ts
│   ├── karaoke.ts
│   ├── autoplay.ts
│   ├── queue.ts
│   ├── nowplaying.ts
│   ├── stop.ts
│   ├── volume.ts
│   ├── help.ts
│   ├── level.ts
│   ├── leaderboard.ts
│   ├── profile.ts
│   ├── rankcard.ts
│   ├── setupTempVoice.ts
│   └── voice.ts
├── events/               # Manejadores de eventos
│   ├── ready.ts
│   ├── interactionCreate.ts
│   └── voiceStateUpdate.ts
└── systems/              # Sistemas principales
    ├── musicPlayer.ts
    └── rankcardGenerator.ts
```

## 📝 Notas Importantes

- El bot usa **play-dl** para reproducir música, que soporta YouTube y Spotify
- Para Spotify, el bot busca las canciones en YouTube automáticamente
- Los datos de niveles se almacenan en memoria (se pierden al reiniciar)
- Para persistencia de datos, considera agregar una base de datos (MongoDB, PostgreSQL, etc.)

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Haz fork del repositorio
2. Crea una rama para tu feature
3. Envía un Pull Request

## 📄 Licencia

MIT License - Puedes usar este código libremente.

---

Hecho con ♥ por LagMusic Team
