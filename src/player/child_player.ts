const pidusage = require('pidusage');
import { SongProvider } from "./../track"
import { IPC_STATES_RESP, IPC_STATES_REQ } from './../constants/ipcStates';
import { Worker, workerData, parentPort } from 'worker_threads';
import {
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
  AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from '@discordjs/voice';
import Discord, { Guild, Interaction, GuildMember, Snowflake, Channel, TextChannel, GuildBasedChannel, VoiceBasedChannel } from 'discord.js';
import { promisify } from 'util';
import playdl from 'play-dl';
import { randomUUID } from 'crypto';
//import ffmpeg from 'fluent-ffmpeg';
//import { PassThrough, Readable, Writable } from "stream";
const wait = promisify(setTimeout);
const { Client, GatewayIntentBits } = Discord;

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
client.on('ready', async () => {
  console.log('Child player client ready, PID: ' + process.pid);
  const data = workerData.data;
  console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Worker thread creation requested by main thread, message content: ${data}`);
  const decoded = JSON.parse(
    Buffer.from(data, 'base64').toString('utf-8')
  );
  const url: string = decoded.url;
  const title: string = decoded.title;
  const provider: SongProvider = decoded.provider;
  const guildId: string = decoded.guildId;
  const userId: string = decoded.userId;
  const audioConfig: string[] = decoded.audioConfig;
  guild = client.guilds.cache.get(guildId);
  const userVoiceChannel: VoiceBasedChannel = guild.members.cache.get(userId).voice.channel;
  await sendMessageToGuild("Joining the voice channel...", guild);
  await execute(url, title, userVoiceChannel, guild, audioConfig);
});


async function sendMessageToGuild(_message: string, _guild: Guild){
  console.log(`Sending message: ${_message}`);
  _guild.channels.cache.forEach(_channel => {
    if(_channel.isTextBased()){
      _channel.send(_message)
    }
  });
}

function exit(){
  currentPlayer.removeAllListeners();
  currentVoiceConnection.removeAllListeners()
  currentVoiceConnection.destroy();
  process.exit(0);
}

async function execute(_url: string, _title: string, _voiceChannel: VoiceBasedChannel, _guild: Guild, _audioConfig: string[]){
    //voice related
    if( currentVoiceConnection == null ){
      const voiceConnection: VoiceConnection = joinVoiceChannel({
        channelId: _voiceChannel.id,
        guildId: _guild.id,
        adapterCreator: _voiceChannel.guild.voiceAdapterCreator
      });
      currentVoiceConnection = voiceConnection;
      currentVoiceConnection.setMaxListeners(1);
    }
    if( currentPlayer == null ){
      const player: AudioPlayer = createAudioPlayer();
      currentPlayer = player;
      currentPlayer.setMaxListeners(1);
    }
    let streamOptions = {
      quality: 2,
      discordPlayerCompatibility: true
    }

    // get soundcloud free client Id
    await playdl.getFreeClientID().then((clientID) => playdl.setToken({
      soundcloud : {
          client_id : clientID
      }
    }))

    let playDlStream =  await playdl.stream(_url, streamOptions);
    /*
    let passStream = new PassThrough();
    let ffmpegStream = ffmpeg(playDlStream.stream)
        .format("mp3")
        .audioChannels(2)
        .outputOptions(_audioConfig)
        .on('start', function(commandLine) {
          sendMessageToGuild('Now playing: ' + _title, _guild);
          console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('error', function(err) {
          if(err.message !== 'Output stream error: Premature close'){
            sendMessageToGuild('An error occurred, please retry. Reason: ' + err.message, _guild);
            console.log('An error occurred: ' + err.message);
          }
        })
        .on('end', function() {
           
        }).pipe(passStream, { end: true });
    */
    // Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
    let resource = createAudioResource(playDlStream.stream, {
      inputType: playDlStream.type
    });
    currentPlayer.play(resource);
    if( currentPlayer != null && currentPlayer.listenerCount("stateChange") == 0 ){
      currentPlayer.addListener("stateChange", (_, newOne) => {
        if (newOne.status == AudioPlayerStatus.Idle) {
          parentPort.postMessage(IPC_STATES_RESP.SONG_IDLE);
          // set timeout to disconnect in 60 second of idling
          timeoutId = setTimeout(()=> {
            if(currentVoiceConnection){
              exit();
            }
          }, 30*60*1000); // leave channel in 30 minute of idle
        } else if(newOne.status == AudioPlayerStatus.Paused){
          parentPort.postMessage(IPC_STATES_RESP.SONG_PAUSED);
        } else if(newOne.status == AudioPlayerStatus.Playing){
          sendMessageToGuild('Now playing: ' + _title, _guild);
          parentPort.postMessage(IPC_STATES_RESP.SONG_PLAYING);
          
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      });
    }
    
    if(currentVoiceConnection != null && currentVoiceConnection.listenerCount("stateChange") == 0){
      currentVoiceConnection.on('stateChange', async (_, newState) => {
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
            await entersState(currentVoiceConnection, VoiceConnectionStatus.Connecting, 5_000);
            // Probably moved voice channel
          } catch {
            parentPort.postMessage(IPC_STATES_RESP.REMOVE_GUILD_SUBSCRIPTION);
            exit();
            // Probably removed from voice channel
          }
        } else if (currentVoiceConnection.rejoinAttempts < 5) {
          /*
            The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
          */
          await wait((currentVoiceConnection.rejoinAttempts + 1) * 5_000);
          currentVoiceConnection.rejoin();
        } else {
          /*
            The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
          */
          parentPort.postMessage(IPC_STATES_RESP.REMOVE_GUILD_SUBSCRIPTION);
          exit();
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
          await entersState(currentVoiceConnection, VoiceConnectionStatus.Ready, 20_000);
        } catch {
          if (currentVoiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
            parentPort.postMessage(IPC_STATES_RESP.REMOVE_GUILD_SUBSCRIPTION);
            exit();
          }
        } finally {
          readyLock = false;
        }
      }
    });
  }
  currentVoiceConnection.subscribe(currentPlayer);
}

// for existing voice connection
parentPort.on('message', async (_message: string) => {
  console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Receive message from main thread, content: ${_message}`);
  const uuid = randomUUID();
  const date = new Date().toISOString();
  try{
    if(_message != null && _message.length > 0) {
      switch(_message){
        case IPC_STATES_REQ.SKIP_VOICE_CONNECTION:
          currentPlayer.stop();
          parentPort.postMessage(IPC_STATES_RESP.SONG_SKIPPED);
          break;
        case IPC_STATES_REQ.PAUSE_VOICE_CONNECTION:
          currentPlayer.pause();
          parentPort.postMessage(IPC_STATES_RESP.SONG_PAUSED);
          break;    
        case IPC_STATES_REQ.RESUME_VOICE_CONNECTION:
          currentPlayer.unpause();
          parentPort.postMessage(IPC_STATES_RESP.SONG_RESUMED);
          break;  
        case IPC_STATES_REQ.LEAVE_VOICE_CONNECTION:
          parentPort.postMessage(IPC_STATES_RESP.VOICE_CONNECTION_LEAVED);
          exit();
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
          const audioConfig: string[] = decoded.audioConfig;
          const guild = client.guilds.cache.get(guildId);
          const userVoiceChannel = guild.members.cache.get(userId).voice.channel;
          await execute(url, title, userVoiceChannel, guild, audioConfig);
          break;
      }
    }
  } catch(ex) {
    console.error(`[${date}]-[${uuid}]-[PID:${process.pid}] Fail to process parent message: ${_message.toString()}, reason: ${ex.message}`);
  }
});
