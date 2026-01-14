import { SlashCommandBuilder } from 'discord.js';
import { useQueue, QueueRepeatMode } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('bucle')
    .setDescription('Activa la repetición')
    .addStringOption((option) =>
      option.setName('modo').setDescription('Modo').setRequired(false)
        .addChoices({ name: 'Canción', value: 'track' }, { name: 'Cola', value: 'queue' }, { name: 'Desactivar', value: 'off' })
    ),
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue?.isPlaying()) return interaction.reply({ content: '❌ No hay música.', ephemeral: true });

    const mode = interaction.options.getString('modo') || 'track';
    const modes = { track: (QueueRepeatMode.TRACK, '🔂 Bucle de canción'), queue: (QueueRepeatMode.QUEUE, '🔁 Bucle de cola'), off: (QueueRepeatMode.OFF, '➡️ Bucle desactivado') };
    const [queueMode, message] = mode === 'track' ? [QueueRepeatMode.TRACK, '🔂 Bucle de canción'] : mode === 'queue' ? [QueueRepeatMode.QUEUE, '🔁 Bucle de cola'] : [QueueRepeatMode.OFF, '➡️ Bucle desactivado'];

    queue.setRepeatMode(queueMode);
    return interaction.reply({ content: message });
  },
};
