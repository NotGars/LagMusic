import { ChatInputCommandInteraction, Client } from 'discord.js';
import { ExtendedClient } from '../types';

export function getClient(interaction: ChatInputCommandInteraction): ExtendedClient {
  return interaction.client as ExtendedClient;
}
