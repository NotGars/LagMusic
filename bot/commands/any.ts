import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';
import { playTrack } from '../systems/musicPlayer';

export const anyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('any')
    .setDescription('Reproduce una canción aleatoria de la cola'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;
    
    if (!voiceChannel) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Debes estar en un canal de voz.')
        ],
        ephemeral: true
      });
      return;
    }
    
    const client = interaction.client as ExtendedClient;
    const queue = client.musicQueues.get(interaction.guildId!);
    
    if (!queue || queue.tracks.length === 0) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ No hay canciones en la cola.')
        ],
        ephemeral: true
      });
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * queue.tracks.length);
    const selectedTrack = queue.tracks[randomIndex];
    
    queue.tracks.splice(randomIndex, 1);
    queue.tracks.unshift(selectedTrack);
    
    if (queue.isPlaying) {
      queue.player?.stop();
    } else {
      await playTrack(client, queue);
    }
    
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`${config.emojis.shuffle} Canción aleatoria seleccionada`)
          .setDescription(`**[${selectedTrack.title}](${selectedTrack.url})**`)
          .addFields(
            { name: '⏱️ Duración', value: selectedTrack.duration, inline: true }
          )
          .setThumbnail(selectedTrack.thumbnail)
      ]
    });
  }
};
