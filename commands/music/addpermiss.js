import { SlashCommandBuilder } from 'discord.js';
import { getTempChannelOwner, addChannelPermission } from '../../utils/tempVoice.js';

export default {
  data: new SlashCommandBuilder()
    .setName('addpermiss')
    .setDescription('Otorga permisos a otro usuario')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario').setRequired(true)),
  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: '❌ Debes estar en un canal de voz.', ephemeral: true });

    const owner = await getTempChannelOwner(channel.id);
    if (owner !== interaction.user.id) return interaction.reply({ content: '❌ Solo el creador del canal.', ephemeral: true });

    const targetUser = interaction.options.getUser('usuario');
    if (targetUser.bot) return interaction.reply({ content: '❌ No puedes dar permisos a bots.', ephemeral: true });

    await addChannelPermission(channel.id, targetUser.id, interaction.user.id);
    return interaction.reply({ content: `✅ Permisos otorgados a <@${targetUser.id}>` });
  },
};
