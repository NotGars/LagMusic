import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types';
import { config } from '../config';

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra todos los comandos disponibles'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎵 LagMusic - Comandos')
      .setDescription('Bot de música para Discord con sistema de niveles y canales temporales.')
      .setThumbnail(interaction.client.user?.displayAvatarURL() || '')
      .addFields(
        {
          name: '🎵 Comandos de Música',
          value: [
            '`/play <canción>` - Reproduce una canción',
            '`/play <url> playlist:<plataforma>` - Carga una playlist',
            '`/skip` - Salta la canción actual',
            '`/pause` - Pausa la reproducción',
            '`/resume` - Reanuda la música',
            '`/stop` - Detiene la música y limpia la cola',
            '`/nowplaying` - Muestra la canción actual',
            '`/queue` - Muestra la cola de reproducción',
          ].join('\n'),
          inline: false
        },
        {
          name: '🔄 Modos de Reproducción',
          value: [
            '`/bucle` - Activa repetición de canción',
            '`/stopbucle` - Desactiva el bucle',
            '`/random` - Mezcla la cola aleatoriamente',
            '`/any` - Reproduce canción aleatoria de la cola',
            '`/autoplay` - Reproducción automática relacionada',
          ].join('\n'),
          inline: false
        },
        {
          name: '🎤 Especiales',
          value: [
            '`/karaoke <canción>` - Busca versión karaoke',
            '`/voteskip` - Vota para saltar canción',
            '`/volume <0-100>` - Ajusta el volumen',
            '`/clear` - Limpia la cola (solo owner)',
            '`/addpermiss <usuario>` - Da permisos de música',
          ].join('\n'),
          inline: false
        },
        {
          name: '📈 Sistema de Niveles',
          value: [
            '`/level` - Ver tu nivel actual',
            '`/profile` - Ver tu perfil completo',
            '`/leaderboard` - Top 10 usuarios',
            '`/rankcard` - Cambiar estilo de tarjeta',
          ].join('\n'),
          inline: false
        },
        {
          name: '🔊 TempVoice',
          value: [
            '`/voice name <nombre>` - Renombrar canal',
            '`/voice limit <número>` - Límite de usuarios',
            '`/voice lock/unlock` - Bloquear/desbloquear',
            '`/voice trust <usuario>` - Dar confianza',
            '`/voice kick <usuario>` - Expulsar usuario',
            '`/setuptempvoice` - Configurar sistema (Admin)',
          ].join('\n'),
          inline: false
        },
        {
          name: '🎧 Plataformas Soportadas',
          value: '`YouTube` • `Spotify` • `YouTube Music` • `SoundCloud`',
          inline: false
        }
      )
      .setFooter({ text: 'LagMusic Bot • Hecho con ♥' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
