import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { hasChannelPermission } from '../../utils/tempVoice.js';

export default {
  data: new SlashCommandBuilder().setName('resume').setDescription('Reanuda la reproducción'),
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) return interaction.reply({ content: '❌ No hay música en la cola.', ephemeral: true });

    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: '❌ Debes estar en un canal de voz.', ephemeral: true });

    const hasPermission = await hasChannelPermission(channel.id, interaction.user.id);
    if (!hasPermission) return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });

    queue.node.setPaused(false);
    return interaction.reply({ content: '▶️ Música reanudada.' });
  },
};
