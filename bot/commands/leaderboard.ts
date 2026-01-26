import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';
import { generateLeaderboardImage } from '../systems/rankcardGenerator';

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Muestra el top 10 de usuarios con mas nivel'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
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
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription('No hay usuarios con XP todavia. Unite a un canal de voz para empezar!')
        ]
      });
      return;
    }
    
    try {
      const usersData = await Promise.all(
        guildUsers.map(async (userData, index) => {
          try {
            const user = await client.users.fetch(userData.discordId);
            return {
              username: user.username,
              avatarUrl: user.displayAvatarURL({ extension: 'png', size: 128 }),
              level: userData.level,
              xp: userData.xp,
              rank: index + 1
            };
          } catch {
            return {
              username: 'Usuario Desconocido',
              avatarUrl: '',
              level: userData.level,
              xp: userData.xp,
              rank: index + 1
            };
          }
        })
      );
      
      const guildName = interaction.guild?.name || 'Servidor';
      const guildIconUrl = interaction.guild?.iconURL({ extension: 'png', size: 128 }) || null;
      
      const imageBuffer = await generateLeaderboardImage(usersData, guildName, guildIconUrl);
      
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'leaderboard.png' });
      
      const requestingUserKey = `${guildId}-${interaction.user.id}`;
      const allUsersForRank = Array.from(client.userLevels.entries())
        .filter(([key]) => key.startsWith(guildId))
        .sort((a, b) => b[1].xp - a[1].xp);
      const fullRank = allUsersForRank.findIndex(([key]) => key === requestingUserKey) + 1;
      
      let description = '';
      if (fullRank > 0) {
        description = `Tu posicion: **#${fullRank}**`;
      }
      
      const embed = new EmbedBuilder()
        .setColor(config.colors.level)
        .setDescription(description)
        .setImage('attachment://leaderboard.png')
        .setFooter({ text: `${interaction.guild?.name} - Top 10 usuarios` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error('Error generating leaderboard image:', error);
      await interaction.editReply({ content: 'Hubo un error generando la tabla de clasificaciones. Intenta de nuevo.' });
    }
  }
};
