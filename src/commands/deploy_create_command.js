const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config({ path: `./../../.env.local` });

const clientToken = process.env.STAGING_TOKEN;
const clientId = process.env.CLIENT_ID;

const commands = [
	new SlashCommandBuilder().setName('leave').setDescription('Leaves the server'),
	new SlashCommandBuilder().setName('clear').setDescription('Clear existing queue'),
	new SlashCommandBuilder().setName('config').setDescription('Set the audio config e.x: bass, treble')
		.addNumberOption(option =>
			option.setName('bass')
				.setDescription('Bass gain level for tracks, 0-20 (defaults to 0)')
				.setRequired(true))
		.addNumberOption(option =>
			option.setName('treble')
				.setDescription('Treble gain level for tracks, 0-20 (defaults to 0)')
				.setRequired(true)),
	new SlashCommandBuilder().setName('treble').setDescription('Set the treble level 0-20'),
	new SlashCommandBuilder().setName('pause').setDescription('Pause the current audio'),
	new SlashCommandBuilder().setName('resume').setDescription('Resume the paused audio'),
	new SlashCommandBuilder().setName('queue').setDescription('Print the audio queue'),
	new SlashCommandBuilder().setName('skip').setDescription('Skip the current audio'),
	new SlashCommandBuilder().setName('ping').setDescription('Replies with pong!'),
	new SlashCommandBuilder().setName('server').setDescription('Replies with server info!'),
	new SlashCommandBuilder().setName('user').setDescription('Replies with user info!'),
	new SlashCommandBuilder().setName('play')
		.setDescription('Play youtube audio in the voice channel')
		.addSubcommand(subcommand =>
			subcommand.setName('youtube_url')
				.setDescription('Url to play from YouTube')
				.addStringOption(option =>
					option.setName('link')
						.setDescription('Link of the video or playlist')
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand.setName('soundcloud_url')
				.setDescription('Url to play from Soundcloud')
				.addStringOption(option =>
					option.setName('link')
						.setDescription('Link of the track')
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand.setName('youtube_search')
				.setDescription('Search and play track from YouTube')
				.addStringOption(option =>
					option.setName('name')
						.setDescription('Name of the track')
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand.setName('soundcloud_search')
				.setDescription('Search and play track from Soundcloud')
				.addStringOption(option =>
					option.setName('name')
						.setDescription('Name of the track')
						.setRequired(true)))
	].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(clientToken);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);