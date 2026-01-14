import { SlashCommandBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { getTempChannelOwner, hasChannelPermission } from '../../utils/tempVoice.js';

export default {
  data: new SlashCommandBuilder().setName('skip').setDescription('Salta la canción actual'),
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue?.isPlaying()) return interaction.reply({ content: '❌ No hay música reproduciéndose.', ephemeral: true });

    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: '❌ Debes estar en un canal de voz.', ephemeral: true });

    const owner = await getTempChannelOwner(channel.id);
    const hasPermission = await hasChannelPermission(channel.id, interaction.user.id);

    if (owner !== interaction.user.id && !hasPermission) {
      return interaction.reply({ content: '❌ No tienes permisos. Usa /voteskip para votar.', ephemeral: true });
    }

    const currentTrack = queue.currentTrack;
    queue.node.skip();
    return interaction.reply({ content: `⏭️ Saltada: **${currentTrack.title}**` });
  },
};
