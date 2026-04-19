const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send("Bot is alive"));
app.listen(3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

let queue = [];

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'play') {
    const url = interaction.options.getString('url');
    const vc = interaction.member.voice.channel;

    if (!vc) return interaction.reply("Join VC first!");

    queue.push(url);

    const connection = joinVoiceChannel({
      channelId: vc.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator
    });

    const player = createAudioPlayer();
    const stream = await play.stream(url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });

    player.play(resource);
    connection.subscribe(player);

    interaction.reply("Playing 🎶");
  }
});

client.login(process.env.TOKEN);
