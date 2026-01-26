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

export const addxpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('addxp')
    .setDescription('(Staff) Añadir XP a un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a modificar')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('Cantidad de XP a añadir')
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
    
    const oldLevel = userLevel.level;
    userLevel.xp += amount;
    userLevel.level = levelFromXp(userLevel.xp);
    if (userLevel.level > oldLevel) {
      userLevel.selectedRankcard = getHighestUnlockedRankcard(userLevel.level);
    }
    client.userLevels.set(userKey, userLevel);
    
    let response = `Se añadieron **${amount.toLocaleString()} XP** a **${targetUser.username}**. XP total: **${userLevel.xp.toLocaleString()}**`;
    
    if (userLevel.level > oldLevel) {
      response += `\nSubió de nivel **${oldLevel}** a **${userLevel.level}**!`;
    }
    
    await interaction.reply({ content: response, ephemeral: true });
  }
};
