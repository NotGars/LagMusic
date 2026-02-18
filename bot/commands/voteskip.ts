import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember, VoiceChannel } from 'discord.js';
import { Command, ExtendedClient } from '../types';
import { config } from '../config';
import { playTrack, isChannelOwner } from '../systems/musicPlayer';

export const voteskipCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('voteskip')
    .setDescription('Vota para saltar la canción actual'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel as VoiceChannel;
    
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
    
    if (!queue || !queue.isPlaying) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ No hay música reproduciéndose.')
        ],
        ephemeral: true
      });
      return;
    }
    
    if (isChannelOwner(client, voiceChannel.id, member.id)) {
      queue.player?.stop();
      client.voteskips.delete(interaction.guildId!);
      
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setDescription(`${config.emojis.skip} El creador del canal saltó la canción: **${queue.currentTrack?.title}**`)
        ]
      });
      return;
    }
    
    let votes = client.voteskips.get(interaction.guildId!);
    if (!votes) {
      votes = new Set();
      client.voteskips.set(interaction.guildId!, votes);
    }
    
    if (votes.has(member.id)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription('⚠️ Ya votaste para saltar esta canción.')
        ],
        ephemeral: true
      });
      return;
    }
    
    votes.add(member.id);
    
    const membersInChannel = voiceChannel.members.filter(m => !m.user.bot).size;
    const requiredVotes = Math.ceil(membersInChannel / 2);
    const currentVotes = votes.size;
    
    if (currentVotes >= requiredVotes) {
      queue.player?.stop();
      client.voteskips.delete(interaction.guildId!);
      
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setDescription(`${config.emojis.skip} Votación exitosa! Canción saltada: **${queue.currentTrack?.title}**`)
            .setFooter({ text: `${currentVotes}/${requiredVotes} votos necesarios` })
        ]
      });
    } else {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.info)
            .setDescription(`🗳️ **${member.displayName}** votó para saltar la canción.`)
            .addFields(
              { name: 'Votos actuales', value: `${currentVotes}/${requiredVotes}`, inline: true },
              { name: 'Canción', value: queue.currentTrack?.title || 'Desconocida', inline: true }
            )
        ]
      });
    }
  }
};
