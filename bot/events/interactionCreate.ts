import { Interaction, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../types';
import { config } from '../config';

export async function handleInteractionCreate(client: ExtendedClient, interaction: Interaction) {
  console.log(`📥 Interacción recibida: ${interaction.type}`);
  
  if (!interaction.isChatInputCommand()) {
    console.log('⏭️ No es un comando slash, ignorando');
    return;
  }
  
  console.log(`🔧 Comando: /${interaction.commandName}`);
  console.log(`📋 Comandos registrados: ${Array.from(client.commands.keys()).join(', ')}`);
  
  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    console.log(`❌ Comando "${interaction.commandName}" no encontrado en la colección`);
    await interaction.reply({
      content: '❌ Comando no encontrado.',
      ephemeral: true
    });
    return;
  }
  
  try {
    console.log(`▶️ Ejecutando comando: ${interaction.commandName}`);
    await command.execute(interaction as ChatInputCommandInteraction);
    console.log(`✅ Comando ${interaction.commandName} ejecutado correctamente`);
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
