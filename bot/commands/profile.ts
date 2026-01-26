import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { Command, UserLevel, RANKCARD_STYLES, ExtendedClient } from '../types';
import { config } from '../config';
import { generateAnimatedRankcard, calculateProgress, formatTime, getRankcardStyle } from '../systems/rankcardGenerator';

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
    
    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
    
    try {
      const imageBuffer = await generateAnimatedRankcard(
        userLevel,
        targetUser.username,
        avatarUrl,
        rank
      );
      
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'profile.gif' });
      
      const style = getRankcardStyle(userLevel.selectedRankcard);
      const lockedCards = RANKCARD_STYLES.filter(s => userLevel!.level < s.unlockLevel);
      
      let description = `*${style.description}*`;
      
      if (lockedCards.length > 0) {
        const lockedText = lockedCards
          .map(s => `**${s.name}** (Nivel ${s.unlockLevel})`)
          .join(' | ');
        description += `\n\nProximas tarjetas: ${lockedText}`;
      }
      
      const embed = new EmbedBuilder()
        .setColor(config.colors.level)
        .setDescription(description)
        .setImage('attachment://profile.gif')
        .setFooter({ text: 'Usa /rankcard para cambiar tu estilo de tarjeta' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error('Error generating profile image:', error);
      await interaction.editReply({ content: 'Hubo un error generando tu perfil. Intenta de nuevo.' });
    }
  }
};
