import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';
import { formatTime } from '../systems/rankcardGenerator';

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Muestra el top 10 de usuarios con más nivel'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const guildId = interaction.guildId!;
    
    const guildUsers = Array.from(client.userLevels.entries())
      .filter(([key]) => key.startsWith(guildId))
      .map(([key, data]) => ({
        ...data,
        key
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10);
    
    if (guildUsers.length === 0) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription('📊 No hay usuarios con XP todavía. Únete a un canal de voz para empezar!')
        ],
        ephemeral: true
      });
      return;
    }
    
    const medals = ['🥇', '🥈', '🥉'];
    
    const leaderboardText = await Promise.all(
      guildUsers.map(async (userData, index) => {
        try {
          const user = await client.users.fetch(userData.discordId);
          const medal = medals[index] || `**${index + 1}.**`;
          const totalTime = userData.totalVoiceTime + userData.totalMusicTime;
          
          return `${medal} **${user.username}**\n` +
                 `   Nivel ${userData.level} • ${userData.xp.toLocaleString()} XP • ${formatTime(totalTime)}`;
        } catch {
          return `**${index + 1}.** Usuario desconocido - Nivel ${userData.level}`;
        }
      })
    );
    
    const requestingUserKey = `${guildId}-${interaction.user.id}`;
    const userRank = guildUsers.findIndex(u => u.key === requestingUserKey) + 1;
    let userRankText = '';
    
    if (userRank > 0) {
      userRankText = `\n\n👤 Tu posición: **#${userRank}**`;
    } else {
      const allUsers = Array.from(client.userLevels.entries())
        .filter(([key]) => key.startsWith(guildId))
        .sort((a, b) => b[1].xp - a[1].xp);
      const fullRank = allUsers.findIndex(([key]) => key === requestingUserKey) + 1;
      if (fullRank > 0) {
        userRankText = `\n\n👤 Tu posición: **#${fullRank}**`;
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor(config.colors.level)
      .setTitle(`${config.emojis.trophy} Tabla de Clasificaciones`)
      .setDescription(leaderboardText.join('\n\n') + userRankText)
      .setThumbnail(interaction.guild?.iconURL() || '')
      .setFooter({ text: `${interaction.guild?.name} • Top 10 usuarios` })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
