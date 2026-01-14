import { SlashCommandBuilder } from 'discord.js';
import { getUserLevel } from '../../utils/levels.js';
import { generateRankcard } from '../../utils/rankcardGenerator.js';

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Muestra tu perfil y nivel')
    .addUserOption((option) =>
      option
        .setName('usuario')
        .setDescription('Usuario del que ver el perfil (opcional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const userData = await getUserLevel(targetUser.id);

    if (!userData) {
      return interaction.editReply({
        content: '❌ Este usuario aún no tiene nivel registrado.',
      });
    }

    const rankcard = await generateRankcard(userData, userData.rankcard_style);

    return interaction.editReply({
      files: [rankcard],
    });
  },
};
