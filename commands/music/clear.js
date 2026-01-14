import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { getTempChannelOwner } from '../../utils/tempVoice.js';

export default {
  data: new SlashCommandBuilder().setName('clear').setDescription('Limpia la cola'),
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) return interaction.reply({ content: '❌ No hay música en la cola.', ephemeral: true });

    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: '❌ Debes estar en un canal de voz.', ephemeral: true });

    const owner = await getTempChannelOwner(channel.id);
    if (owner !== interaction.user.id) return interaction.reply({ content: '❌ Solo el creador del canal.', ephemeral: true });

    queue.tracks.clear();
    return interaction.reply({ content: '🗑️ Cola limpiada.' });
  },
};
