import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { Command, UserLevel, RANKCARD_STYLES, ExtendedClient } from '../types';
import { config } from '../config';
import { generateRankcardSVG, calculateProgress, formatTime, getRankcardStyle } from '../systems/rankcardGenerator';

export const profileCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Muestra tu perfil con rankcard personalizada')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a consultar')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    const client = interaction.client as ExtendedClient;
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    
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
    
    const allUsers = Array.from(client.userLevels.entries())
      .filter(([key]) => key.startsWith(interaction.guildId!))
      .sort((a, b) => b[1].xp - a[1].xp);
    
    const rank = allUsers.findIndex(([key]) => key === userKey) + 1 || allUsers.length + 1;
    
    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 128 });
    
    const svg = generateRankcardSVG(
      userLevel,
      targetUser.username,
      avatarUrl,
      rank
    );
    
    const style = getRankcardStyle(userLevel.selectedRankcard);
    const progress = calculateProgress(userLevel.xp, userLevel.level);
    
    const embed = new EmbedBuilder()
      .setColor(config.colors.level)
      .setTitle(`🎵 Perfil de ${targetUser.username}`)
      .setThumbnail(avatarUrl)
      .addFields(
        { name: '🏆 Rango', value: `#${rank}`, inline: true },
        { name: '📊 Nivel', value: `${userLevel.level}`, inline: true },
        { name: '✨ XP Total', value: `${userLevel.xp.toLocaleString()}`, inline: true },
        { name: '📈 Progreso', value: `${progress.percentage}% al nivel ${userLevel.level + 1}`, inline: true },
        { name: '🎧 Tiempo en Voz', value: formatTime(userLevel.totalVoiceTime), inline: true },
        { name: '🎵 Tiempo Música', value: formatTime(userLevel.totalMusicTime), inline: true },
        { name: '🎨 Rankcard', value: `${style.name}`, inline: true }
      )
      .setDescription(`*${style.description}*`)
      .setFooter({ text: `Usa /rankcard para cambiar tu estilo de tarjeta` })
      .setTimestamp();
    
    const unlockedCards = RANKCARD_STYLES.filter(s => userLevel!.level >= s.unlockLevel);
    const lockedCards = RANKCARD_STYLES.filter(s => userLevel!.level < s.unlockLevel);
    
    if (lockedCards.length > 0) {
      const lockedText = lockedCards
        .map(s => `${s.name} (Nivel ${s.unlockLevel})`)
        .join(', ');
      embed.addFields({
        name: '🔒 Próximas tarjetas',
        value: lockedText,
        inline: false
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
  }
};
