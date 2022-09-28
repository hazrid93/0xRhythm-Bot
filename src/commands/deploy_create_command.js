const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config({ path: `./../../.env.local` });

const clientToken = process.env.STAGING_TOKEN;
const clientId = process.env.CLIENT_ID;

const commands = [
	new SlashCommandBuilder().setName('leave').setDescription('Leaves the server'),
	new SlashCommandBuilder().setName('help').setDescription('Print the commands manual'),
	new SlashCommandBuilder().setName('clear').setDescription('Clear existing queue'),
	new SlashCommandBuilder().setName('status').setDescription('Get process status'),
	new SlashCommandBuilder().setName('tts').setDescription('Run text to speech stream')
	.addStringOption(option =>
		option.setName('text')
			.setDescription('The text to be voiced')
			.setRequired(true)),
	new SlashCommandBuilder().setName('config').setDescription('Set the audio config e.x: bass, treble')
		.addNumberOption(option =>
			option.setName('bass')
				.setDescription('Bass gain level for tracks, 0-20 (defaults to 0)')
				.setRequired(true))
		.addNumberOption(option =>
			option.setName('treble')
				.setDescription('Treble gain level for tracks, 0-20 (defaults to 0)')
				.setRequired(true)),
	new SlashCommandBuilder().setName('pause').setDescription('Pause the current audio'),
	new SlashCommandBuilder().setName('resume').setDescription('Resume the paused audio'),
	new SlashCommandBuilder().setName('queue').setDescription('Print the audio queue'),
	new SlashCommandBuilder().setName('skip').setDescription('Skip the current audio'),
	new SlashCommandBuilder().setName('play')
		.setDescription('Play audio track in the voice channel')
		.addSubcommand(subcommand =>
			subcommand.setName('youtube')
				.setDescription('Url/name to play/search from YouTube')
				.addStringOption(option =>
					option.setName('value')
						.setDescription('Link of the video or playlist')
						.setRequired(true))
				.addNumberOption(option =>
					option.setName('priority')
						.setDescription('Track priority, 0:low, 1:medium, 2:high. Higher priority will be higher in queue')
						.setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand.setName('soundcloud')
				.setDescription('Url/name to play/search from Soundcloud')
				.addStringOption(option =>
					option.setName('value')
						.setDescription('Link of the track')
						.setRequired(true))
				.addNumberOption(option =>
					option.setName('priority')
						.setDescription('Track priority, 0:low, 1:medium, 2:high. Higher priority will be higher in queue')
						.setRequired(true))
		)
	].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(clientToken);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);