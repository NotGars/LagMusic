import { Interaction, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { ExtendedClient } from '../types';

export async function handleInteractionCreate(client: ExtendedClient, interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    try {
      await interaction.reply({
        content: 'Comando no encontrado.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (e: any) {
      if (e?.code !== 10062 && e?.code !== 40060) console.error('Error reply (comando no encontrado):', e);
    }
    return;
  }

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    console.error(`Error ejecutando comando ${interaction.commandName}:`, error);

    const payload = { content: '❌ Hubo un error ejecutando este comando.' };
    const ephemeralPayload = { ...payload, flags: MessageFlags.Ephemeral };

    try {
      if (interaction.deferred) {
        await interaction.editReply(payload).catch(() => interaction.followUp(ephemeralPayload));
      } else if (interaction.replied) {
        await interaction.followUp(ephemeralPayload);
      } else {
        await interaction.reply(ephemeralPayload);
      }
    } catch (e: any) {
      if (e?.code !== 10062 && e?.code !== 40060) {
        console.error('Error enviando mensaje de error al usuario:', e);
      }
    }
  }
}
