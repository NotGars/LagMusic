import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types';
import { config } from '../config';
import { client } from '../index';

export const queueCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Muestra la cola de reproducción')
    .addIntegerOption(option =>
      option.setName('pagina')
        .setDescription('Número de página')
        .setRequired(false)
        .setMinValue(1)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = client.musicQueues.get(interaction.guildId!);
    
    if (!queue || (queue.tracks.length === 0 && !queue.currentTrack)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ La cola está vacía.')
        ],
        ephemeral: true
      });
      return;
    }
    
    const page = interaction.options.getInteger('pagina') || 1;
    const tracksPerPage = 10;
    const totalPages = Math.ceil(queue.tracks.length / tracksPerPage) || 1;
    const startIndex = (page - 1) * tracksPerPage;
    const endIndex = startIndex + tracksPerPage;
    
    if (page > totalPages) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`❌ Página no válida. Total de páginas: ${totalPages}`)
        ],
        ephemeral: true
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setColor(config.colors.music)
      .setTitle(`${config.emojis.queue} Cola de reproducción`)
      .setFooter({ text: `Página ${page}/${totalPages} • ${queue.tracks.length} canciones en cola` });
    
    if (queue.currentTrack) {
      embed.addFields({
        name: `${config.emojis.play} Reproduciendo ahora`,
        value: `**[${queue.currentTrack.title}](${queue.currentTrack.url})** [${queue.currentTrack.duration}]\nPedido por: ${queue.currentTrack.requestedBy}`,
        inline: false
      });
    }
    
    if (queue.tracks.length > 0) {
      const queueSlice = queue.tracks.slice(startIndex, endIndex);
      const queueList = queueSlice
        .map((track, index) => `**${startIndex + index + 1}.** [${track.title}](${track.url}) [${track.duration}]`)
        .join('\n');
      
      embed.addFields({
        name: '📜 En cola',
        value: queueList || 'No hay más canciones',
        inline: false
      });
    }
    
    const statusParts = [];
    if (queue.loop) statusParts.push(`${config.emojis.loopOne} Bucle`);
    if (queue.shuffle) statusParts.push(`${config.emojis.shuffle} Aleatorio`);
    if (queue.autoplay) statusParts.push('🔄 Autoplay');
    
    if (statusParts.length > 0) {
      embed.addFields({
        name: '⚙️ Modos activos',
        value: statusParts.join(' • '),
        inline: false
      });
    }
    
    await interaction.reply({ embeds: [embed] });
  }
};
