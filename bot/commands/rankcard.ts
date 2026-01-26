import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, RANKCARD_STYLES, ExtendedClient } from '../types';
import { config } from '../config';
import { getAvailableRankcards, getRankcardStyle } from '../systems/rankcardGenerator';

export const rankcardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('rankcard')
    .setDescription('Cambia el estilo de tu rankcard')
    .addIntegerOption(option =>
      option.setName('estilo')
        .setDescription('ID del estilo a usar')
        .setRequired(false)
        .addChoices(
          { name: '1 - Lo-fi Night (Gratis)', value: 1 },
          { name: '2 - Lo-fi Minimal (Nivel 25)', value: 2 },
          { name: '3 - Lo-fi Quiet Afternoon (Nivel 35)', value: 4 },
          { name: '4 - Lo-fi Anime Desk (Nivel 50)', value: 3 },
          { name: '5 - Lo-fi Study Night (Nivel 70)', value: 5 },
          { name: '6 - Lo-fi Nostalgic Memory (Nivel 100)', value: 6 }
        )
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const userKey = `${interaction.guildId}-${interaction.user.id}`;
    let userLevel = client.userLevels.get(userKey);
    
    if (!userLevel) {
      userLevel = {
        discordId: interaction.user.id,
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
    
    const selectedStyle = interaction.options.getInteger('estilo');
    
    if (selectedStyle === null) {
      const availableCards = getAvailableRankcards(userLevel.level);
      const currentStyle = getRankcardStyle(userLevel.selectedRankcard);
      
      const cardsDisplay = RANKCARD_STYLES.map(style => {
        const isUnlocked = userLevel!.level >= style.unlockLevel;
        const isCurrent = style.id === userLevel!.selectedRankcard;
        const status = isCurrent ? '✅ Activo' : (isUnlocked ? '🔓 Disponible' : `🔒 Nivel ${style.unlockLevel}`);
        
        return `**${style.id}. ${style.name}** - ${status}\n   *${style.description}*`;
      }).join('\n\n');
      
      const embed = new EmbedBuilder()
        .setColor(config.colors.level)
        .setTitle('🎨 Estilos de Rankcard')
        .setDescription(`Tu nivel actual: **${userLevel.level}**\n\n${cardsDisplay}`)
        .setFooter({ text: 'Usa /rankcard estilo:<número> para cambiar' });
      
      await interaction.reply({ embeds: [embed] });
      return;
    }
    
    const targetStyle = RANKCARD_STYLES.find(s => s.id === selectedStyle);
    
    if (!targetStyle) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription('❌ Estilo no válido. Usa un número del 1 al 6.')
        ],
        ephemeral: true
      });
      return;
    }
    
    if (userLevel.level < targetStyle.unlockLevel) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`🔒 Necesitas nivel **${targetStyle.unlockLevel}** para usar **${targetStyle.name}**.\nTu nivel actual: ${userLevel.level}`)
        ],
        ephemeral: true
      });
      return;
    }
    
    userLevel.selectedRankcard = selectedStyle;
    client.userLevels.set(userKey, userLevel);
    
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('🎨 Rankcard actualizada!')
          .setDescription(`Ahora estás usando: **${targetStyle.name}**\n\n*${targetStyle.description}*`)
          .addFields(
            { name: 'Color principal', value: targetStyle.primaryColor, inline: true },
            { name: 'Fondo', value: targetStyle.backgroundColor, inline: true }
          )
      ]
    });
  }
};
