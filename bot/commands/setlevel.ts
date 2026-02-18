import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command, UserLevel, ExtendedClient, RANKCARD_STYLES } from '../types';
import { xpForLevel } from '../config';

function getHighestUnlockedRankcard(level: number): number {
  const unlocked = RANKCARD_STYLES.filter(style => level >= style.unlockLevel);
  if (unlocked.length === 0) return 1;
  return unlocked.reduce((highest, style) => 
    style.unlockLevel > highest.unlockLevel ? style : highest
  ).id;
}

const STAFF_ROLE_ID = '1230949715127042098';

export const setlevelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription('(Staff) Establecer el nivel de un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a modificar')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('nivel')
        .setDescription('Nuevo nivel (0-100)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as any;
    
    if (!member.roles.cache.has(STAFF_ROLE_ID) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'No tienes permisos para usar este comando.', ephemeral: true });
      return;
    }
    
    const client = interaction.client as ExtendedClient;
    const targetUser = interaction.options.getUser('usuario', true);
    const newLevel = interaction.options.getInteger('nivel', true);
    
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
    }
    
    let totalXp = 0;
    for (let i = 1; i <= newLevel; i++) {
      totalXp += xpForLevel(i);
    }
    
    userLevel.level = newLevel;
    userLevel.xp = totalXp;
    userLevel.selectedRankcard = getHighestUnlockedRankcard(newLevel);
    client.userLevels.set(userKey, userLevel);
    
    await interaction.reply({
      content: `El nivel de **${targetUser.username}** ha sido establecido a **${newLevel}** (${totalXp.toLocaleString()} XP total).`,
      ephemeral: true
    });
  }
};
