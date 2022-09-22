const pidusage = require('pidusage');
import { IPC_STATES_RESP, IPC_STATES_REQ } from './constants/ipcStates';
import {
    AudioPlayerStatus, 
} from '@discordjs/voice';
import Discord, { Interaction, GuildMember, Snowflake } from 'discord.js';
import { connectToServer, getConnection } from './utils/mongodbutils';
import { promisify } from 'util';
import { Track } from './track'
import { Playlist } from './playlist';
import { Guild, createGuild, findGuildById, findGuildByGuildId } from './models';
import { randomUUID } from "crypto";
import { HELP_TEXT } from './utils';
import { YoutubePlayerHandler, SouncloudHandler } from "./handlers";
const wait = promisify(setTimeout);

const { Client, GatewayIntentBits } = Discord;
const clientToken = process.env.STAGING_TOKEN;

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessageReactions, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages] 
});

/**
 * Maps guild IDs (Snowflake is guildId in discord special UUID format) to playlist, which exist if the bot has an active VoiceConnection to the guild.
 */
 const subscriptions = new Map<Snowflake, Playlist>();

function removeSubscription(_subscription: Snowflake, _uuid: string){
    subscriptions.delete(_subscription);
    console.log(`[${new Date().toISOString()}]-[${_uuid}]-[PID:${process.pid}] Removed guild subscription with id: ${_subscription}`);
}

connectToServer(function(err) {
    if(err != null && err.length == 0) {
        console.log(`[${new Date().toISOString()}]-[PID:${process.pid}] Fail to connect to mongodb instance`);
        process.exit(1);
    } else {
        execute();
    }
});

function execute(){

client.login(clientToken);
client.on('error', console.warn);
client.on('ready', () => {
    console.log('Main client ready, PID: ' +  process.pid);
});

 // to be called by playlist when child process detect its disconnected
function removeSubscription(_subscription: Snowflake, _uuid: string){
    subscriptions.delete(_subscription);
    console.log(`[${new Date().toISOString()}]-[${_uuid}]-[PID:${process.pid}] Removed guild subscription with id: ${_subscription}`);
}

client.on('interactionCreate', async (interaction: Interaction)=> {
    if (!interaction.isChatInputCommand()){
        return;
    }
    if(!interaction.guildId){
        return;
    }
    
    let guildId = interaction.guildId;
    let subscription = subscriptions.get(guildId);
    let userId = interaction.member.user.id;
    let userName = interaction.member.user.username;
    
    // save guild information if haven't
    let guildData = await findGuildByGuildId(guildId);
    let guildDbId = null;
    if(guildData == null){
        let guildObj: Guild = {
            name: interaction.guild.name,
            guildId: interaction.guildId
        }
        let guildPersisted = await createGuild(guildObj);
        guildDbId = guildPersisted._id;
    } else {
        guildDbId = guildData._id;
    }

    if (interaction.commandName === 'play') {
        let _uuid = randomUUID();
        // Extract the video URL from the command
        const url = interaction.options.get('value').value as string;
        const priority = interaction.options.get('priority').value as number;
        await interaction.deferReply();
        // If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
        // and create a subscription.
        if (!subscription) {
            if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
                const channel = interaction.member.voice.channel;
                subscription = new Playlist(guildDbId, guildId, userId, userName);
                subscriptions.set(interaction.guildId, subscription);
            }
        }
        // If there is no subscription, tell the user they need to join a channel.
        if (!subscription) {
            await interaction.followUp('Join a voice channel and then try that again!');
            return;
        }
        try {
            let subCommand = interaction.options.getSubcommand();
            if(subCommand === 'youtube'){
                let handler = new YoutubePlayerHandler(url, subscription, priority);
                let status = await handler.execute();
                if(status){
                    await interaction.followUp(`Youtube track added to queue`);
                } else {
                    await interaction.followUp(`Track format is not supported!`);
                }
            } else if(subCommand === 'soundcloud'){
                let handler = new SouncloudHandler(url, subscription, priority);
                let status = await handler.execute();
                if(status){
                    await interaction.followUp(`Soundcloud track added to queue`);
                } else {
                    await interaction.followUp(`Track format is not supported!`);
                }
            }
           
        } catch (error) {
            console.warn(error);
            await interaction.reply('Failed to play track, please try again later!');
        }
    } else if (interaction.commandName === 'skip') {
		if (subscription) {
			// Calling .stop() on an AudioPlayer causes it to transition into the Idle state. Because of a state transition
			// listener defined in music/subscription.ts, transitions into the Idle state mean the next track from the queue
			// will be loaded and played.
			subscription.sendCommand(IPC_STATES_REQ.SKIP_VOICE_CONNECTION);
			await interaction.reply('Skipped song!');
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else if (interaction.commandName === 'help') {
        await interaction.reply(HELP_TEXT);
		
	} else if (interaction.commandName === 'queue') {
		// Print out the current queue, including up to the next 5 tracks to be played.
		if (subscription) {
            if(subscription.playerState === AudioPlayerStatus.Idle && subscription.queue.length() == 0){
                await interaction.reply('Nothing is currently playing');
                return;
            } else {
                let queue =  await subscription.getPlaylist();
                let playlistQueue = queue.slice(0,10)
                    .map((data, index) => {
                        if(data){
                            return `${index+1} - [${data.title? data.title : '...'}] - ${data.url}`;
                        }
                    }).join('\n');
                await interaction.reply(playlistQueue ? playlistQueue : "No item are queued");
                
            }
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else if (interaction.commandName === 'config') {
        const trebleVal = interaction.options.get('treble').value as number;
        const bassVal = interaction.options.get('bass').value as number;
		if (subscription) {
            subscription.setBass(bassVal);
            subscription.setTreble(trebleVal);
            await interaction.reply(`Audio config applied to next subsequent tracks!, bass: ${bassVal} , treble: ${trebleVal}`);
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else if (interaction.commandName === 'status') {
        let status = null;
		status = await pidusage(process.pid);
        if(status){
            await interaction.reply("Process status: " + JSON.stringify(status));
        } else {
            await interaction.reply("Fail to get process status");
        }
	} else if (interaction.commandName === 'clear') {
		if (subscription) {
            subscription.clearQueue();
			await interaction.reply('Queue cleared');
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else if (interaction.commandName === 'pause') {
		if (subscription) {
			subscription.sendCommand(IPC_STATES_REQ.PAUSE_VOICE_CONNECTION);
			await interaction.reply({ content: `Paused!`, ephemeral: false });
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else if (interaction.commandName === 'resume') {
		if (subscription) {
			subscription.sendCommand(IPC_STATES_REQ.RESUME_VOICE_CONNECTION);
			await interaction.reply({ content: `Unpaused!`, ephemeral: false });
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else if (interaction.commandName === 'leave') {
		if (subscription) {
            subscription.sendCommand(IPC_STATES_REQ.LEAVE_VOICE_CONNECTION);
			subscriptions.delete(interaction.guildId);
			await interaction.reply({ content: `Left channel!`, ephemeral: false });
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else {
		await interaction.reply('Unknown command');
	}
});
};

export { removeSubscription };

