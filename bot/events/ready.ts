import { ActivityType } from 'discord.js';
import { ExtendedClient } from '../types';
import { config } from '../config';
import { loadCatalog } from '../systems/songStore';

export function handleReady(client: ExtendedClient) {
  console.log(`\n🎵 ═══════════════════════════════════════ 🎵`);
  console.log(`   LagMusic Bot está en línea!`);
  console.log(`   Usuario: ${client.user?.tag}`);
  console.log(`   Servidores: ${client.guilds.cache.size}`);
  console.log(`   Usuarios: ${client.users.cache.size}`);
  console.log(`🎵 ═══════════════════════════════════════ 🎵\n`);
  
  client.user?.setActivity('🎵 /play | /help', { type: ActivityType.Listening });

  // Lee el canal de canciones para saber cuáles ya están guardadas.
  void loadCatalog(client);
  
  setInterval(() => {
    const activities = [
      { name: '🎵 /play | /help', type: ActivityType.Listening },
      { name: `🎧 ${client.guilds.cache.size} servidores`, type: ActivityType.Watching },
      { name: '📈 Sistema de niveles', type: ActivityType.Playing },
      { name: '🎤 Modo Karaoke', type: ActivityType.Listening },
    ];
    const activity = activities[Math.floor(Math.random() * activities.length)];
    client.user?.setActivity(activity.name, { type: activity.type });
  }, 30000);
}
