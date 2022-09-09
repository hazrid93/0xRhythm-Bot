const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config({ path: `./../../.env.local` });

const clientToken = process.env.STAGING_TOKEN;
const clientId = process.env.CLIENT_ID;

const commands = [
	new SlashCommandBuilder().setName('leave').setDescription('Leaves the server'),
	new SlashCommandBuilder().setName('pause').setDescription('Pause the current audio'),
	new SlashCommandBuilder().setName('resume').setDescription('Resume the paused audio'),
	new SlashCommandBuilder().setName('queue').setDescription('Print the audio queue'),
	new SlashCommandBuilder().setName('skip').setDescription('Skip the current audio'),
	new SlashCommandBuilder().setName('ping').setDescription('Replies with pong!'),
	new SlashCommandBuilder().setName('server').setDescription('Replies with server info!'),
	new SlashCommandBuilder().setName('user').setDescription('Replies with user info!'),
	new SlashCommandBuilder().setName('play')
		.setDescription('Play audio in the voice channel')
		.addStringOption(option =>
			option.setName('url')
				.setDescription('The url to play from youtube')
				.setRequired(true)),
	new SlashCommandBuilder().setName('search')
	.setDescription('Search for audio in youtube/soundcloud')
	.addStringOption(option =>
		option.setName('name')
			.setDescription('song name to search for')
			.setRequired(true)),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(clientToken);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);