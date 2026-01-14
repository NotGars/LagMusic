import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Player } from 'discord-player';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const player = new Player(client, {
  ytdlOptions: {
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
  },
});

client.commands = new Collection();
client.player = player;

async function loadCommands() {
  const commandsPath = join(__dirname, 'commands');
  const commandFolders = readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const commandFiles = readdirSync(join(commandsPath, folder)).filter(
      (file) => file.endsWith('.js')
    );

    for (const file of commandFiles) {
      const command = await import(`./commands/${folder}/${file}`);
      if (command.default?.data && command.default?.execute) {
        client.commands.set(command.default.data.name, command.default);
        console.log(`✅ Comando cargado: ${command.default.data.name}`);
      }
    }
  }
}

async function loadEvents() {
  const eventsPath = join(__dirname, 'events');
  const eventFiles = readdirSync(eventsPath).filter((file) =>
    file.endsWith('.js')
  );

  for (const file of eventFiles) {
    const event = await import(`./events/${file}`);
    if (event.default?.name && event.default?.execute) {
      if (event.default.once) {
        client.once(event.default.name, (...args) =>
          event.default.execute(...args, client)
        );
      } else {
        client.on(event.default.name, (...args) =>
          event.default.execute(...args, client)
        );
      }
      console.log(`✅ Evento cargado: ${event.default.name}`);
    }
  }
}

async function loadPlayerEvents() {
  const playerEventsPath = join(__dirname, 'events', 'player');
  const eventFiles = readdirSync(playerEventsPath).filter((file) =>
    file.endsWith('.js')
  );

  for (const file of eventFiles) {
    const event = await import(`./events/player/${file}`);
    if (event.default?.name && event.default?.execute) {
      player.events.on(event.default.name, (...args) =>
        event.default.execute(...args, client)
      );
      console.log(`✅ Evento del player cargado: ${event.default.name}`);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando bot de música...');

    await loadCommands();
    await loadEvents();
    await loadPlayerEvents();

    await player.extractors.loadDefault();
    console.log('✅ Extractores de audio cargados');

    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Error al iniciar el bot:', error);
    process.exit(1);
  }
}

main();

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});
