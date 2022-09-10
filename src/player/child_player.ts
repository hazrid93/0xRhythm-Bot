const pidusage = require('pidusage');
import { SongProvider } from "./../track"
import { IPC_STATES_RESP, IPC_STATES_REQ } from './../constants/ipcStates';
import {
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
  AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
  generateDependencyReport,
  createAudioResource,
  entersState,
  joinVoiceChannel
} from '@discordjs/voice';
const cp = require("child_process");
import Discord, { Interaction, GuildMember, Snowflake } from 'discord.js';
import { promisify } from 'util';
import playdl from 'play-dl';
import { defaultMaxListeners } from "events";
import { randomUUID } from 'crypto'

const wait = promisify(setTimeout);
const { Client, GatewayIntentBits, PermissionFlagsBits, 
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, SelectMenuBuilder, BaseInteraction } = Discord;

const clientToken = process.env.STAGING_TOKEN;
// bot status lock
let readyLock = false;
let currentVoiceConnection: VoiceConnection = null;
let currentPlayer: AudioPlayer = null;

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessageReactions, 
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages] 
});

client.login(clientToken);
client.on('error', console.warn);
client.on('ready', async () => {
  console.log('Child player client ready, PID: ' + process.pid);
  const data = process.argv[2];
  const decoded = JSON.parse(
    Buffer.from(data, 'base64').toString('utf-8')
  );
  const url: string = decoded.url;
  const title: string = decoded.title;
  const provider: SongProvider = decoded.provider;
  const guildId: string = decoded.guildId;
  const userId: string = decoded.userId;
  const guild = client.guilds.cache.get(guildId);
  const userVoiceChannel = guild.members.cache.get(userId).voice.channel;
  await execute(url, userVoiceChannel, guild);
});

async function execute(_url, _voiceChannel, _guild){
    //voice related
    const voiceConnection: VoiceConnection = joinVoiceChannel({
      channelId: _voiceChannel.id,
      guildId: _guild.id,
      adapterCreator: _voiceChannel.guild.voiceAdapterCreator
    });
    currentVoiceConnection = voiceConnection;;
  
    const player: AudioPlayer = createAudioPlayer();
    currentPlayer = player;
    let stream = await playdl.stream(_url);
    // Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
    let resource = createAudioResource(stream.stream, {
      inputType: stream.type
    })
    player.play(resource);
    player.addListener("stateChange", (_, newOne) => {
      if (newOne.status == AudioPlayerStatus.Idle) {
        process.send(IPC_STATES_RESP.SONG_IDLE);
      } else if(newOne.status == AudioPlayerStatus.Paused){
        process.send(IPC_STATES_RESP.SONG_PAUSED);
      } else if(newOne.status == AudioPlayerStatus.Playing){
        process.send(IPC_STATES_RESP.SONG_PLAYING);
      }
    });
    
    voiceConnection.on('stateChange', async (_, newState) => {
    if (newState.status === VoiceConnectionStatus.Disconnected) {
      if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
        /*
          If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
          but there is a chance the connection will recover itself if the reason of the disconnect was due to
          switching voice channels. This is also the same code for the bot being kicked from the voice channel,
          so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
          the voice connection.
        */
        try {
          await entersState(voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
          // Probably moved voice channel
        } catch {
          voiceConnection.destroy();
          process.send(IPC_STATES_RESP.REMOVE_GUILD_SUBSCRIPTION);
          // Probably removed from voice channel
        }
      } else if (voiceConnection.rejoinAttempts < 5) {
        /*
          The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
        */
        await wait((voiceConnection.rejoinAttempts + 1) * 5_000);
        voiceConnection.rejoin();
      } else {
        /*
          The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
        */
        voiceConnection.destroy();
        process.send(IPC_STATES_RESP.REMOVE_GUILD_SUBSCRIPTION);
      }
    } else if (
      !readyLock &&
      (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
    ) {
      /*
        In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
        before destroying the voice connection. This stops the voice connection permanently existing in one of these
        states.
      */
      readyLock = true;
      try {
        await entersState(voiceConnection, VoiceConnectionStatus.Ready, 20_000);
      } catch {
        if (voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
          voiceConnection.destroy();
          process.send(IPC_STATES_RESP.REMOVE_GUILD_SUBSCRIPTION);
        }
      } finally {
        readyLock = false;
      }
    }
  });
  voiceConnection.subscribe(player);
}


// for existing voice connection
process.on('message', async (_message: string) => {
  const uuid = randomUUID();
  const date = new Date().toISOString();
  try{
    if(_message != null && _message.length > 0) {
      switch(_message){
        case IPC_STATES_REQ.SKIP_VOICE_CONNECTION:
          currentPlayer.stop();
          process.send(IPC_STATES_RESP.SONG_SKIPPED);
          break;
        case IPC_STATES_REQ.PAUSE_VOICE_CONNECTION:
          currentPlayer.pause();
          process.send(IPC_STATES_RESP.SONG_PAUSED);
          break;    
        case IPC_STATES_REQ.RESUME_VOICE_CONNECTION:
          currentPlayer.unpause();
          process.send(IPC_STATES_RESP.SONG_RESUMED);
          break;  
        case IPC_STATES_REQ.LEAVE_VOICE_CONNECTION:
          currentVoiceConnection.destroy();
          process.send(IPC_STATES_RESP.VOICE_CONNECTION_LEAVED);
          break;  
        default:
          const decoded = JSON.parse(
            Buffer.from(_message, 'base64').toString('utf-8')
          );
          const url: string = decoded.url;
          const title: string = decoded.title;
          const provider: SongProvider = decoded.provider;
          const guildId: string = decoded.guildId;
          const userId: string = decoded.userId;
          const guild = client.guilds.cache.get(guildId);
          const userVoiceChannel = guild.members.cache.get(userId).voice.channel;
          await execute(url, userVoiceChannel, guild);
          break;
      }
    }
  } catch(ex) {
    console.error(`[${date}]-[${uuid}]-[PID:${process.pid}] Fail to process parent message: ${_message.toString()}, reason: ${ex.message}`);
  }
});

  


