import { SlashCommandBuilder } from 'discord.js';
import { updateRankcardStyle, getUserLevel } from '../../utils/levels.js';
import { generateRankcard } from '../../utils/rankcardGenerator.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rankcard')
    .setDescription('Cambia el estilo de tu rankcard')
    .addStringOption((option) =>
      option
        .setName('estilo')
        .setDescription('Estilo de rankcard')
        .setRequired(true)
        .addChoices(
          { name: 'Lo-fi Night (Predeterminada)', value: 'lofi-night' },
          { name: 'Lo-fi Minimal (Nivel 25+)', value: 'lofi-minimal' },
          { name: 'Lo-fi Anime Desk (Nivel 50+)', value: 'lofi-anime-desk' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userData = await getUserLevel(interaction.user.id);

    if (!userData) {
      return interaction.editReply({
        content: '❌ Aún no tienes nivel registrado.',
      });
    }

    const style = interaction.options.getString('estilo');

    if (style === 'lofi-minimal' && userData.level < 25) {
      return interaction.editReply({
        content: '❌ Necesitas nivel 25 para desbloquear Lo-fi Minimal.',
      });
    }

    if (style === 'lofi-anime-desk' && userData.level < 50) {
      return interaction.editReply({
        content: '❌ Necesitas nivel 50 para desbloquear Lo-fi Anime Desk.',
      });
    }

    await updateRankcardStyle(interaction.user.id, style);

    const updatedUser = { ...userData, rankcard_style: style };
    const rankcard = await generateRankcard(updatedUser, style);

    return interaction.editReply({
      content: `✅ Estilo de rankcard cambiado a **${style}**`,
      files: [rankcard],
    });
  },
};
