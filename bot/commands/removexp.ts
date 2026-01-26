import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command, UserLevel, ExtendedClient, RANKCARD_STYLES } from '../types';
import { levelFromXp } from '../config';

function getHighestUnlockedRankcard(level: number): number {
  const unlocked = RANKCARD_STYLES.filter(style => level >= style.unlockLevel);
  if (unlocked.length === 0) return 1;
  return unlocked.reduce((highest, style) => 
    style.unlockLevel > highest.unlockLevel ? style : highest
  ).id;
}

const STAFF_ROLE_ID = '1230949715127042098';

export const removexpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('removexp')
    .setDescription('(Staff) Quitar XP a un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a modificar')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('Cantidad de XP a quitar')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000000)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as any;
    
    if (!member.roles.cache.has(STAFF_ROLE_ID) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'No tienes permisos para usar este comando.', ephemeral: true });
      return;
    }
    
    const client = interaction.client as ExtendedClient;
    const targetUser = interaction.options.getUser('usuario', true);
    const amount = interaction.options.getInteger('cantidad', true);
    
    const userKey = `${interaction.guildId}-${targetUser.id}`;
    let userLevel = client.userLevels.get(userKey);
    
    if (!userLevel) {
      await interaction.reply({ content: 'Este usuario no tiene datos de nivel.', ephemeral: true });
      return;
    }
    
    const oldLevel = userLevel.level;
    userLevel.xp = Math.max(0, userLevel.xp - amount);
    userLevel.level = levelFromXp(userLevel.xp);
    if (userLevel.level < oldLevel) {
      userLevel.selectedRankcard = getHighestUnlockedRankcard(userLevel.level);
    }
    client.userLevels.set(userKey, userLevel);
    
    let response = `Se quitaron **${amount.toLocaleString()} XP** a **${targetUser.username}**. XP total: **${userLevel.xp.toLocaleString()}**`;
    
    if (userLevel.level < oldLevel) {
      response += `\nBajó de nivel **${oldLevel}** a **${userLevel.level}**.`;
    }
    
    await interaction.reply({ content: response, ephemeral: true });
  }
};
