import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { Command, UserLevel } from '../types';
import { config, xpForLevel } from '../config';
import { calculateProgress, formatTime } from '../systems/rankcardGenerator';
import { client } from '../index';

export const levelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Ver tu nivel actual o el de otro usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a consultar')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);
    
    const userKey = `${interaction.guildId}-${targetUser.id}`;
    let userLevel = client.userLevels.get(userKey);
    
    if (!userLevel) {
      userLevel = {
        discordId: targetUser.id,
        guildId: interaction.guildId!,
        xp: 0,
        level: 0,
        totalVoiceTime: 0,
        totalMusicTime: 0,
        messagesCount: 0,
        selectedRankcard: 1,
        lastXpGain: Date.now(),
      };
      client.userLevels.set(userKey, userLevel);
    }
    
    const progress = calculateProgress(userLevel.xp, userLevel.level);
    const progressBar = createProgressBar(progress.percentage);
    
    const allUsers = Array.from(client.userLevels.entries())
      .filter(([key]) => key.startsWith(interaction.guildId!))
      .sort((a, b) => b[1].xp - a[1].xp);
    
    const rank = allUsers.findIndex(([key]) => key === userKey) + 1;
    
    const embed = new EmbedBuilder()
      .setColor(config.colors.level)
      .setTitle(`${config.emojis.level} Nivel de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: '🏆 Rango', value: `#${rank || 'N/A'}`, inline: true },
        { name: '📊 Nivel', value: `${userLevel.level}`, inline: true },
        { name: '✨ XP Total', value: `${userLevel.xp.toLocaleString()}`, inline: true },
        { 
          name: '📈 Progreso al siguiente nivel',
          value: `${progressBar}\n${progress.current.toLocaleString()} / ${progress.needed.toLocaleString()} XP (${progress.percentage}%)`,
          inline: false
        },
        {
          name: '📊 Estadísticas',
          value: [
            `🎧 Tiempo en voz: **${formatTime(userLevel.totalVoiceTime)}**`,
            `🎵 Tiempo escuchando: **${formatTime(userLevel.totalMusicTime)}**`,
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: 'Gana XP estando en canales de voz y escuchando música!' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};

function createProgressBar(percentage: number): string {
  const filled = Math.floor(percentage / 5);
  const empty = 20 - filled;
  return `[${'▰'.repeat(filled)}${'▱'.repeat(empty)}]`;
}
