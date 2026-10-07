import { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  REST, 
  Events,
  ActivityType
} from 'discord.js';
import { createServer } from 'http';
import { config } from './config';
import { Command, ExtendedClient, MusicQueue, TempChannelData, UserLevel } from './types';

import { playCommand } from './commands/play';
import { skipCommand } from './commands/skip';
import { pauseCommand } from './commands/pause';
import { resumeCommand } from './commands/resume';
import { bucleCommand } from './commands/bucle';
import { stopBucleCommand } from './commands/stopBucle';
import { anyCommand } from './commands/any';
import { randomCommand } from './commands/random';
import { voteskipCommand } from './commands/voteskip';
import { addPermissCommand } from './commands/addPermiss';
import { clearCommand } from './commands/clear';
import { karaokeCommand } from './commands/karaoke';
import { autoplayCommand } from './commands/autoplay';
import { queueCommand } from './commands/queue';
import { nowplayingCommand } from './commands/nowplaying';
import { stopCommand } from './commands/stop';
import { volumeCommand } from './commands/volume';
import { helpCommand } from './commands/help';
import { levelCommand } from './commands/level';
import { leaderboardCommand } from './commands/leaderboard';
import { profileCommand } from './commands/profile';
import { rankcardCommand } from './commands/rankcard';
import { setupTempVoiceCommand } from './commands/setupTempVoice';
import { voiceCommand } from './commands/voice';
import { setlevelCommand } from './commands/setlevel';
import { addxpCommand } from './commands/addxp';
import { removexpCommand } from './commands/removexp';

import { handleVoiceStateUpdate } from './events/voiceStateUpdate';
import { handleInteractionCreate } from './events/interactionCreate';
import { handleReady } from './events/ready';
import { cleanupAllProcesses } from './systems/audioClient';
import { registerSlashCommands } from './systems/commandRegistrar';

process.on('SIGINT', () => {
  console.log('[Bot] Recibida señal SIGINT, limpiando...');
  cleanupAllProcesses();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Bot] Recibida señal SIGTERM, limpiando...');
  cleanupAllProcesses();
  process.exit(0);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
}) as ExtendedClient;

client.commands = new Collection<string, Command>();
client.musicQueues = new Map<string, MusicQueue>();
client.tempChannels = new Map<string, TempChannelData>();
client.userLevels = new Map<string, UserLevel>();
client.voiceTimers = new Map<string, NodeJS.Timeout>();
client.voteskips = new Map<string, Set<string>>();
client.permissions = new Map<string, Set<string>>();

const commands: Command[] = [
  playCommand,
  skipCommand,
  pauseCommand,
  resumeCommand,
  bucleCommand,
  stopBucleCommand,
  anyCommand,
  randomCommand,
  voteskipCommand,
  addPermissCommand,
  clearCommand,
  karaokeCommand,
  autoplayCommand,
  queueCommand,
  nowplayingCommand,
  stopCommand,
  volumeCommand,
  helpCommand,
  levelCommand,
  leaderboardCommand,
  profileCommand,
  rankcardCommand,
  setupTempVoiceCommand,
  voiceCommand,
  setlevelCommand,
  addxpCommand,
  removexpCommand,
];

for (const command of commands) {
  client.commands.set(command.data.name, command);
}

client.on(Events.ClientReady, () => handleReady(client));
client.on(Events.InteractionCreate, (interaction) => handleInteractionCreate(client, interaction));
client.on(Events.VoiceStateUpdate, (oldState, newState) => handleVoiceStateUpdate(client, oldState, newState));

let retryTimer: NodeJS.Timeout | null = null;

async function registerCommands() {
  // Si Discord pide esperar mucho (límite diario de comandos), NO nos quedamos colgados: se rechaza y se reintenta después.
  const rest = new REST({
    version: '10',
    timeout: 30_000,
    rejectOnRateLimit: (info) => info.timeToReset > 15_000,
  }).setToken(config.token);

  console.log(`🔄 Registrando ${commands.length} comandos slash...`);
  const body = commands.map((cmd) => cmd.data.toJSON());
  const result = await registerSlashCommands(rest, body, config.clientId, process.env.GUILD_ID);

  // Si fue por límite de Discord, se reintenta solo cuando pase el tiempo (sin reiniciar el bot, que es lo que gasta el cupo).
  if (!result.ok && result.retryAfterMs && !retryTimer) {
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void registerCommands();
    }, Math.min(result.retryAfterMs + 10_000, 2_000_000_000));
  }
}

async function main() {
  console.log('🎵 Iniciando LagMusic Bot...');
  
  if (!config.token) {
    console.error('❌ DISCORD_TOKEN no está configurado!');
    console.log('Por favor, configura la variable de entorno DISCORD_TOKEN');
    process.exit(1);
  }
  
  if (!config.clientId) {
    console.error('❌ CLIENT_ID no está configurado!');
    console.log('Por favor, configura la variable de entorno CLIENT_ID');
    process.exit(1);
  }
  
  // Health check server for Railway
  const port = process.env.PORT || 3000;
  const server = createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'online', 
        bot: client.user?.tag || 'starting',
        uptime: process.uptime()
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  
  server.listen(port, () => {
    console.log(`🌐 Health server running on port ${port}`);
  });
  
  // Primero conecta el bot; el registro de comandos va aparte para que NUNCA lo deje esperando.
  await client.login(config.token);
  void registerCommands();
}

main().catch(console.error);
