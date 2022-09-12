const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config({ path: `./../../.env.local` });

const clientToken = process.env.STAGING_TOKEN;
const clientId = process.env.CLIENT_ID;

const rest = new REST({ version: '10' }).setToken(clientToken);

// for global commands
rest.put(Routes.applicationCommands(clientId), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);