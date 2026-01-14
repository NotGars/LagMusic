import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra todos los comandos disponibles'),

  async execute(interaction) {
    const helpChannelIds = (process.env.HELP_CHANNEL_IDS || '').split(',');
    const isHelpChannel = helpChannelIds.includes(interaction.channelId);
    const isVoiceContext = interaction.member?.voice?.channel;

    if (!isHelpChannel && !isVoiceContext) {
      return interaction.reply({
        content: `❌ El comando /help solo funciona en canales de voz o en los canales permitidos.`,
        ephemeral: true,
      });
    }

    const embeds = [
      new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🎵 Comandos de Música')
        .addFields(
          { name: '/play <canción>', value: 'Reproduce una canción o playlist' },
          { name: '/skip', value: 'Salta la canción actual' },
          { name: '/pause', value: 'Pausa la reproducción' },
          { name: '/resume', value: 'Reanuda la reproducción' },
          { name: '/stop', value: 'Detiene la música y limpia la cola' },
          { name: '/bucle <modo>', value: 'Activa el bucle (track/queue/off)' },
          { name: '/any', value: 'Reproduce una canción aleatoria' },
          { name: '/random', value: 'Activa el modo shuffle' },
          { name: '/karaoke <canción>', value: 'Reproduce la versión karaoke' },
          { name: '/autoplay', value: 'Reproduce música basada en tu historial' }
        ),

      new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('👥 Comandos de Votación y Permisos')
        .addFields(
          { name: '/voteskip', value: 'Inicia votación para saltar (necesita >50% votos)' },
          { name: '/addpermiss <usuario>', value: 'Otorga permisos a otro usuario (solo creador)' },
          { name: '/clear', value: 'Limpia la cola (solo creador del canal)' }
        ),

      new EmbedBuilder()
        .setColor('#1abc9c')
        .setTitle('📊 Comandos de Perfil')
        .addFields(
          { name: '/profile [usuario]', value: 'Muestra tu perfil y nivel' },
          { name: '/rankcard <estilo>', value: 'Cambia el estilo de tu rankcard' },
          { name: '/leaderboard', value: 'Muestra el top 10 de usuarios' }
        ),

      new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('ℹ️ Sistema de Niveles')
        .setDescription(
          '**¿Cómo ganar XP?**\n' +
          '• Escuchar música en canales de voz: 10 XP/minuto\n' +
          '• Estar en canales de voz: 5 XP/minuto\n\n' +
          '**Estilos de Rankcard:**\n' +
          '🎨 **Lo-fi Night** - Predeterminada (Oscura y cómoda)\n' +
          '🎨 **Lo-fi Minimal** - Desbloquea en nivel 25\n' +
          '🎨 **Lo-fi Anime Desk** - Desbloquea en nivel 50\n\n' +
          '**Permisos en Canales Temporales:**\n' +
          '• El creador del canal puede otorgar permisos con /addpermiss\n' +
          '• Los usuarios con permisos pueden usar: /skip, /pause, /resume, /stop'
        ),
    ];

    return interaction.reply({ embeds });
  },
};
