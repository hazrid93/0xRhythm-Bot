const pidusage = require('pidusage');
import {SongProvider } from "./track"
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
const fs = require('fs');
const path = require('path');
const cp = require("child_process");
require('dotenv').config({ path: `./../.env.local` });
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
    console.log('Client ready');
});

/**
 * Maps guild IDs (Snowflake is guildId in discord special UUID format) to playlist, which exist if the bot has an active VoiceConnection to the guild.
 */
 const subscriptions = new Map<Snowflake, Playlist>();

client.on('interactionCreate', async (interaction: Interaction)=> {
    if (!interaction.isCommand() || !interaction.guildId) return;
    let subscription = subscriptions.get(interaction.guildId);

    if (interaction.commandName === 'play') {
		await interaction.deferReply();
        // Extract the video URL from the command
		const url = interaction.options.get('url')!.value as string;
        // If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
		// and create a subscription.
        if (!subscription) {
			if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
				const channel = interaction.member.voice.channel;
				subscription = new Playlist(
					joinVoiceChannel({
						channelId: channel.id,
						guildId: channel.guild.id,
						adapterCreator: channel.guild.voiceAdapterCreator,
					}),
				);
				subscription.voiceConnection.on('error', console.warn);
				subscriptions.set(interaction.guildId, subscription);
			}
		}

		// If there is no subscription, tell the user they need to join a channel.
		if (!subscription) {
			await interaction.followUp('Join a voice channel and then try that again!');
			return;
		}

		// Make sure the connection is ready before processing the user's request
		try {
			await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
		} catch (error) {
			console.warn(error);
			await interaction.followUp('Failed to join voice channel within 20 seconds, please try again later!');
			return;
		}
        
        try {
			// Attempt to create a Track from the user's video URL
			const track = new Track(url, SongProvider.YOUTUBE);
			// Enqueue the track and reply a success message to the user
			subscription.enqueue(track);
			await interaction.followUp(`Enqueued **${track.title}**`);
		} catch (error) {
			console.warn(error);
			await interaction.reply('Failed to play track, please try again later!');
		}
    } else if (interaction.commandName === 'skip') {
		if (subscription) {
			// Calling .stop() on an AudioPlayer causes it to transition into the Idle state. Because of a state transition
			// listener defined in music/subscription.ts, transitions into the Idle state mean the next track from the queue
			// will be loaded and played.
			subscription.audioPlayer.stop();
			await interaction.reply('Skipped song!');
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else if (interaction.commandName === 'queue') {
		// Print out the current queue, including up to the next 5 tracks to be played.
		if (subscription) {
            const playerState = subscription.audioPlayer.state;
            if(playerState.status === AudioPlayerStatus.Idle){
                await interaction.reply('Nothing is currently playing');
                return;
            } else {
                const queue =  subscription.queue
                .slice(0,5)
                .map((data, index) => {
                    return `${index+1} - ${data.title}`;
                }).join('\n');
                await interaction.reply(queue);
            }
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else if (interaction.commandName === 'pause') {
		if (subscription) {
			subscription.audioPlayer.pause();
			await interaction.reply({ content: `Paused!`, ephemeral: true });
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else if (interaction.commandName === 'resume') {
		if (subscription) {
			subscription.audioPlayer.unpause();
			await interaction.reply({ content: `Unpaused!`, ephemeral: true });
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else if (interaction.commandName === 'leave') {
		if (subscription) {
			subscription.voiceConnection.destroy();
			subscriptions.delete(interaction.guildId);
			await interaction.reply({ content: `Left channel!`, ephemeral: true });
		} else {
			await interaction.reply('Not playing in this server!');
		}
	} else {
		await interaction.reply('Unknown command');
	}
});