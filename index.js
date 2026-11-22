
const {
  Client,
  GatewayIntentBits
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior
} = require("@discordjs/voice");

const { Readable } = require("stream");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

// ضع رابط ملف تلاوة صوتي مباشر وموثوق هنا لاحقاً
const QURAN_AUDIO_URL = process.env.QURAN_AUDIO_URL;

let connection;
let player;

client.once("ready", async () => {
  console.log(`Bot is online: ${client.user.tag}`);

  if (!CHANNEL_ID || !QURAN_AUDIO_URL) {
    console.log("Set VOICE_CHANNEL_ID and QURAN_AUDIO_URL");
    return;
  }

  const channel = await client.channels.fetch(CHANNEL_ID);

  if (!channel || !channel.isVoiceBased()) {
    console.log("Voice channel not found");
    return;
  }

  connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true
  });

  player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play
    }
  });

  connection.subscribe(player);

  const response = await fetch(QURAN_AUDIO_URL);

  if (!response.ok || !response.body) {
    throw new Error("Audio source unavailable");
  }

  const audioStream = Readable.fromWeb(response.body);

  const resource = createAudioResource(audioStream, {
    inputType: require("@discordjs/voice").StreamType.Arbitrary
  });

  player.play(resource);
});

client.login(TOKEN);
