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
import Discord, { Guild, Interaction, GuildMember, Snowflake, Channel, TextChannel, GuildBasedChannel, VoiceBasedChannel } from 'discord.js';
import { promisify } from 'util';
import playdl from 'play-dl';
import { randomUUID } from 'crypto';
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough, Readable, Writable } from "stream";

const wait = promisify(setTimeout);
const { Client, GatewayIntentBits, PermissionFlagsBits, 
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, SelectMenuBuilder, BaseInteraction } = Discord;

const clientToken = process.env.STAGING_TOKEN;
// timeout for disconnection
let timeoutId;

// bot status lock
let readyLock = false;
let currentVoiceConnection: VoiceConnection = null;
let currentPlayer: AudioPlayer = null;
let guild: Guild = null; 

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
  guild = client.guilds.cache.get(guildId);
  sendMessageToGuild("Joining the voice channel...", guild);
  const userVoiceChannel = guild.members.cache.get(userId).voice.channel;
  await execute(url, userVoiceChannel, guild);
});

function sendMessageToGuild(_message: string, _guild: Guild){
  if(currentVoiceConnection == null){
    _guild.channels.cache.forEach(_channel => {
      if(_channel.isTextBased()){
        _channel.send(_message)
      }
    });
  }
}

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
    let streamOptions = {
      quality: 0
    }
    let passStream = new PassThrough();
    let playDlStream =  await playdl.stream(_url, streamOptions);
    let ffmpegStream = ffmpeg(playDlStream.stream)
        .format('mp3')
        .outputOptions(["-af bass=g=3", "-af treble=g=0" , "-af volume=1.0"])
        .on('codecData', function(data) {
            console.log('Input is ' + data.audio + ' audio');
        })
        .on('start', function(commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('error', function(err) {
            console.log('An error occurred: ' + err.message);
        })
        .on('end', function() {
           
        }).pipe(passStream, { end: true });
    

    // Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
    let resource = createAudioResource(passStream);
    player.play(resource);
    player.addListener("stateChange", (_, newOne) => {
      if (newOne.status == AudioPlayerStatus.Idle) {
        process.send(IPC_STATES_RESP.SONG_IDLE);
        // set timeout to disconnect in 60 second of idling
        timeoutId = setTimeout(()=> {
          if(currentVoiceConnection){
            sendMessageToGuild("Leaving the voice channel...", _guild);
            currentVoiceConnection.destroy();
            process.exit(0);
          }
        }, 60*1000);
      } else if(newOne.status == AudioPlayerStatus.Paused){
        process.send(IPC_STATES_RESP.SONG_PAUSED);
      } else if(newOne.status == AudioPlayerStatus.Playing){
        process.send(IPC_STATES_RESP.SONG_PLAYING);
        clearTimeout(timeoutId);
        timeoutId = null;
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

process.once('SIGTERM', (code) => {
  console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Child process received SIGTERM with code: ${code}`);
  if(currentVoiceConnection != null) { currentVoiceConnection.destroy() };
  process.exit(0);
});

process.once('SIGINT', (code) => {
  console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Child process received SIGINT with code: ${code}`);
  if(currentVoiceConnection != null) { currentVoiceConnection.destroy() };
  process.exit(0);
});