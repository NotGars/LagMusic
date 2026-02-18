import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';
import { Command, UserLevel, ExtendedClient } from '../types';
import { generateAnimatedRankcard } from '../systems/rankcardGenerator';

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
      
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'rankcard.gif' });
      
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error('Error generating rankcard image:', error);
      await interaction.editReply({ content: 'Hubo un error generando tu tarjeta de nivel. Intenta de nuevo.' });
    }
  }
};
