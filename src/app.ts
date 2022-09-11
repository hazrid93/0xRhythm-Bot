const pidusage = require('pidusage');
import {SongProvider } from "./track";
import { IPC_STATES_RESP, IPC_STATES_REQ } from './constants/ipcStates';
import {
    VoiceConnectionStatus, 
    AudioPlayerStatus, 
    AudioResource,
    generateDependencyReport,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior
} from '@discordjs/voice';
import Discord, { Interaction, GuildMember, Snowflake } from 'discord.js';
import { promisify } from 'util';
import playdl from 'play-dl';
import { Track } from './track'
import { Playlist } from './playlist';

const wait = promisify(setTimeout);

const { Client, GatewayIntentBits, PermissionFlagsBits, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder, SelectMenuBuilder, BaseInteraction } = Discord;
const clientToken = process.env.STAGING_TOKEN;
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessageReactions, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages] 
});
client.login(clientToken);
client.on('error', console.warn);
client.on('ready', () => {
    console.log('Main client ready, PID: ' +  process.pid);
});

/**
 * Maps guild IDs (Snowflake is guildId in discord special UUID format) to playlist, which exist if the bot has an active VoiceConnection to the guild.
 */
 const subscriptions = new Map<Snowflake, Playlist>();

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
    if (interaction.commandName === 'play') {
        if(interaction.options.getSubcommand() === 'url'){
            // Extract the video URL from the command
            const url = interaction.options.get('link')!.value as string;
            await interaction.deferReply();
            // If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
            // and create a subscription.
            if (!subscription) {
                if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
                    const channel = interaction.member.voice.channel;
                    subscription = new Playlist(guildId, userId);
                    subscriptions.set(interaction.guildId, subscription);
                }
            }

            // If there is no subscription, tell the user they need to join a channel.
            if (!subscription) {
                await interaction.followUp('Join a voice channel and then try that again!');
                return;
            }

            try {
                // validate the track url
                if(playdl.yt_validate(url) === 'video'){
                    // Attempt to create a Track from the user's video URL
                    const track = new Track(url, SongProvider.YOUTUBE);
                    // Enqueue the track and reply a success message to the user
                    subscription.enqueue(track);
                    await interaction.followUp(`Track added to queue`);
                } else {
                    await interaction.followUp(`Track format is not supported for either playlist or livestream`);
                }
            } catch (error) {
                console.warn(error);
                await interaction.reply('Failed to play track, please try again later!');
            }
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
	} else if (interaction.commandName === 'queue') {
		// Print out the current queue, including up to the next 5 tracks to be played.
		if (subscription) {
            if(subscription.playerState === AudioPlayerStatus.Idle && subscription.queue.length == 0){
                await interaction.reply('Nothing is currently playing');
                return;
            } else {
                console.log("queue: " + JSON.stringify(subscription.queue));
                const queue =  subscription.queue
                .slice(0,5)
                .map((data, index) => {
                    return `${index+1} - ${data.title}`;
                }).join('\n');
                await interaction.reply(queue? queue : "No item are queued");
            }
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

export { removeSubscription };