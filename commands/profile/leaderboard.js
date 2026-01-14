import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getLeaderboard } from '../../utils/levels.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Muestra el leaderboard de niveles del servidor'),

  async execute(interaction) {
    await interaction.deferReply();

    const leaderboard = await getLeaderboard(10);

    if (leaderboard.length === 0) {
      return interaction.editReply({
        content: '❌ No hay datos de niveles aún.',
      });
    }

    let description = '';
    leaderboard.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}️⃣`;
      description += `${medal} **${user.username}** - Nivel ${user.level} (${user.total_xp} XP)\n`;
    });

    const embed = new EmbedBuilder()
      .setColor('#9b59b6')
      .setTitle('🏆 Leaderboard de Niveles')
      .setDescription(description)
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
