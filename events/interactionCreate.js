export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No se encontró el comando ${interaction.commandName}`
      );
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error ejecutando ${interaction.commandName}:`, error);

      const errorMessage = {
        content: '❌ Hubo un error al ejecutar este comando.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};
