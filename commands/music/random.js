import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
  data: new SlashCommandBuilder().setName('random').setDescription('Mezcla la cola'),
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) return interaction.reply({ content: '❌ No hay música en la cola.', ephemeral: true });

    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: '❌ Debes estar en un canal de voz.', ephemeral: true });

    queue.tracks.shuffle();
    return interaction.reply({ content: '🔀 Cola mezclada.' });
  },
};
