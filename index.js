
const {
  Client,
  GatewayIntentBits
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  entersState,
  VoiceConnectionStatus
} = require("@discordjs/voice");

const { Readable } = require("stream");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const AUDIO_URL = process.env.QURAN_AUDIO_URL;

client.once("ready", async () => {
  console.log(`Bot online: ${client.user.tag}`);

  try {
    if (!TOKEN || !CHANNEL_ID || !AUDIO_URL) {
      throw new Error("Missing environment variables");
    }

    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel || !channel.isVoiceBased()) {
      throw new Error("Voice channel not found");
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    await entersState(
      connection,
      VoiceConnectionStatus.Ready,
      30000
    );

    console.log("Voice connection ready");

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
      }
    });

    connection.subscribe(player);

    const response = await fetch(AUDIO_URL);

    if (!response.ok || !response.body) {
      throw new Error(`Audio HTTP error: ${response.status}`);
    }

    const ffmpeg = spawn(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-i", "pipe:0",
      "-f", "s16le",
      "-ar", "48000",
      "-ac", "2",
      "pipe:1"
    ]);

    ffmpeg.stderr.on("data", data => {
      console.error("FFmpeg:", data.toString());
    });

    ffmpeg.on("error", error => {
      console.error("FFmpeg error:", error);
    });

    Readable.fromWeb(response.body).pipe(ffmpeg.stdin);

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw
    });

    player.on("stateChange", (oldState, newState) => {
      console.log("Player:", newState.status);
    });

    player.on("error", error => {
      console.error("Player error:", error.message);
    });

    player.play(resource);

    console.log("Quran playback started");

  } catch (error) {
    console.error("BOT ERROR:", error);
  }
});

client.login(TOKEN);
