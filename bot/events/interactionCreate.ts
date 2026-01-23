import { Interaction, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../types';
import { config } from '../config';

export async function handleInteractionCreate(client: ExtendedClient, interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    await interaction.reply({
      content: '❌ Comando no encontrado.',
      ephemeral: true
    });
    return;
  }
  
  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    console.error(`Error ejecutando comando ${interaction.commandName}:`, error);
    
    const errorMessage = {
      content: '❌ Hubo un error ejecutando este comando.',
      ephemeral: true
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
