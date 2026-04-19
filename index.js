const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send("Bot is alive"));
app.listen(3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const queue = new Map();

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const guildId = interaction.guild.id;
  let serverQueue = queue.get(guildId);

  // ================= PLAY =================
  if (interaction.isChatInputCommand() && interaction.commandName === 'play') {
    const query = interaction.options.getString('query');
    const vc = interaction.member.voice.channel;

    if (!vc) return interaction.reply("Join VC first!");

    if (!serverQueue) {
      serverQueue = {
        songs: [],
        player: createAudioPlayer(),
        connection: null,
        loop: false
      };
      queue.set(guildId, serverQueue);
    }

    // Detect Spotify
    if (play.sp_validate(query) === 'spotify') {
      const info = await play.spotify(query);
      const tracks = await info.all_tracks();

      for (let t of tracks) {
        serverQueue.songs.push(`${t.name} ${t.artists[0].name}`);
      }

      await interaction.reply("Spotify playlist added 🎶");
    } else {
      serverQueue.songs.push(query);
      await interaction.reply("Added to queue 🎵");
    }

    if (!serverQueue.connection) {
      serverQueue.connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator
      });

      playSong(guildId);
    }
  }

  // ================= SKIP =================
  if (interaction.isChatInputCommand() && interaction.commandName === 'skip') {
    if (!serverQueue) return interaction.reply("Nothing playing!");
    serverQueue.player.stop();
    interaction.reply("Skipped ⏭️");
  }

  // ================= LOOP =================
  if (interaction.isChatInputCommand() && interaction.commandName === 'loop') {
    if (!serverQueue) return interaction.reply("Nothing playing!");
    serverQueue.loop = !serverQueue.loop;
    interaction.reply(`Loop ${serverQueue.loop ? "ON 🔁" : "OFF"}`);
  }

  // ================= BUTTONS =================
  if (interaction.isButton()) {
    if (!serverQueue) return;

    if (interaction.customId === 'pause') {
      serverQueue.player.pause();
      interaction.reply({ content: "Paused ⏸️", ephemeral: true });
    }

    if (interaction.customId === 'resume') {
      serverQueue.player.unpause();
      interaction.reply({ content: "Resumed ▶️", ephemeral: true });
    }

    if (interaction.customId === 'stop') {
      serverQueue.songs = [];
      serverQueue.player.stop();
      interaction.reply({ content: "Stopped ⛔", ephemeral: true });
    }
  }
});

// ================= PLAYER =================
async function playSong(guildId) {
  const serverQueue = queue.get(guildId);
  if (!serverQueue || !serverQueue.songs.length) return;

  let song = serverQueue.songs[0];

  try {
    const stream = await play.stream(song);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });

    serverQueue.player.play(resource);
    serverQueue.connection.subscribe(serverQueue.player);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pause').setLabel('Pause').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('resume').setLabel('Resume').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger)
    );

    serverQueue.player.once(AudioPlayerStatus.Idle, () => {
      if (!serverQueue.loop) serverQueue.songs.shift();
      playSong(guildId);
    });

  } catch (err) {
    console.log(err);
    serverQueue.songs.shift();
    playSong(guildId);
  }
}

client.login(process.env.TOKEN);
