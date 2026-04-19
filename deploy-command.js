const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song name or URL')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip current song'),

  new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggle loop')
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('Commands registered successfully!');
  } catch (error) {
    console.error(error);
  }
})();
