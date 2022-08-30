const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const cli = require('cli-progress');
const {MessageAttachment, MessageEmbed, MessageReaction, Message} =  require('discord.js');

const client = new Discord.Client();
let connection: Discord.VoiceConnection = null;

client.login('OTM3NjQwNDQwNDI4MTE4MDM3.YfertQ.jNEf3hkoA54S0GbSudxuY6JcFuQ');

client.on('ready', () => {
    console.log('I am ready!');
});
client.on('message', async message => {
    // Voice only works in guilds, if the message does not come from a guild,
    // we ignore it
    if (!message.guild) 
        return;
    

    switch (message.content) {
        case '/join':
            if (message.member.voice.channel) {
                connection = await message.member.voice.channel.join();
            } else {
                message.reply('You need to join a voice channel first!');
            }
            break;
        case '/play':
            let dispatcher = connection.play(ytdl('https://www.youtube.com/watch?v=JJFTVK2tcRU', {filter: 'audioonly'}));
            dispatcher.on('finish', () => {
                console.log('Finished playing!');
            });
            break;
        case '!embed':
            // We can create embeds using the MessageEmbed constructor
            // Read more about all that you can do with the constructor
            // over at https://discord.js.org/#/docs/main/master/class/MessageEmbed
            const embed = new MessageEmbed()
            // Set the title of the field.setTitle('A slick little embed')
            // Set the color of the embed.setColor(0xff0000)
            // Set the main content of the embed.setDescription('Hello, this is a slick embed!');
            // Send the embed to the same channel as the message
            message.channel.send(embed);
            break;
        case '!debug':
            if (message.member.user.id == '236496648983805952') {
                let userDetail = {
                    username: message.member.user.username,
                    id: message.member.user.id,
                    isBot: message.member.user.bot,
                    createdAt: message.member.user.createdAt,
                    guildDetails: message.member.guild
                }
                message.channel.send(`${
                    JSON.stringify(userDetail)
                }`).then(function (message) {
                    message.react("👍")
                    message.react("👎")
                    //message.pin()
                    //message.delete()
                  }).catch(function() {
                    //Something
                   });
            } else {
                message.reply("You don't have admin access!");
            }
            break;
        case '!rip':
            // Create the attachment using MessageAttachment
            const attachment = new MessageAttachment('https://i.imgur.com/w3duR07.png');
            // Send the attachment in the message channel
            // Send the attachment in the message channel with a content
            message.channel.send(`${
                message.author
            },`, attachment);
            break;
        default:
    }
});

client.on('messageReactionAdd', (reaction, user) => {
    if (reaction.message.author.id !== user.id) { // Do whatever you like with it
        console.log(JSON.stringify(reaction))
        reaction.message.channel.send(JSON.stringify(reaction));
    } else {
        console.log(JSON.stringify(reaction))
        reaction.message.channel.send(JSON.stringify(reaction));
    }
});
