import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';

export default {
  data: new SlashCommandBuilder().setName('any').setDescription('Canción aleatoria de la cola'),
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || queue.tracks.size === 0) return interaction.reply({ content: '❌ No hay canciones en la cola.', ephemeral: true });

    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: '❌ Debes estar en un canal de voz.', ephemeral: true });

    const tracks = queue.tracks.toArray();
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
    queue.node.skipTo(randomTrack);

    return interaction.reply({ content: `🎲 Reproduciendo: **${randomTrack.title}**` });
  },
};
