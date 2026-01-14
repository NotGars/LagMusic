import { ActivityType } from 'discord.js';

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot conectado como ${client.user.tag}`);

    client.user.setPresence({
      activities: [
        {
          name: 'música lo-fi | /help',
          type: ActivityType.Listening,
        },
      ],
      status: 'online',
    });

    console.log(`📊 Servidores: ${client.guilds.cache.size}`);
    console.log(`👥 Usuarios: ${client.users.cache.size}`);
    console.log('🎵 Bot de música listo para usar');
  },
};
