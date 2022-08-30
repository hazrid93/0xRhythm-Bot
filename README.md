# Rhythm-Bot 2.1.5 Search / Rich Text / Buttons!

-   New search command anything after !search will be searched against youtube and return the top 3 results
-   Press the thumbs up reaction emoji to add the item to your queue
    -   Note that you will want to give the bot permission to remove emojis in the text channel, this is the MANAGE_MESSAGES permission
-   Node version has updated from 10.x.x to 12.x.x due to discord.js update
-   New npm packages to install
-   Replaced dependence on manually installing ffmpeg
    -   Now ffmpeg is installed via npm with ffmpeg-static when you do a simple npm install
-   In addition to the reaction button interaction on the search command you can now use buttons for the new playing control

## Staging information
- staging bot name: staging-umaru-rythm
- staging token: OTM3NjQwNDQwNDI4MTE4MDM3.YfertQ.jNEf3hkoA54S0GbSudxuY6JcFuQ
- inv url [link](https://discord.com/api/oauth2/authorize?client_id=937640440428118037&permissions=139623607104&scope=bot)

## Requirement
-Node: v12.7.x <br/>
-FFMPEG.exe must be available during docker-compose or running in dev locally.
(put the file in project root path)

## Pushing to gcp GCE
- install cloud sdk locally
```
> gcloud auth login
> gcloud components install docker-credential-gcr
> gcloud auth configure-docker
```
- build docker image:
```
> npm run build
> docker-compose -f docker-compose.dev.yaml build
```
- tag docker // note that 'umaru-rythm' part is project ID must follow it:
 ```
 docker tag rhythm-bot_rhythm-bot-server gcr.io/umaru-rythm/bot-v10
 docker tag rhythm-bot_rhythm-bot-server gcr.io/umaru-rythm/dev
 ```
- push to gcr:
```
docker push gcr.io/umaru-rythm/bot-v10
```
- allow ingress traffic:
```
gcloud compute firewall-rules create project-firewall --source-tags=http-server --allow tcp:80 --source-ranges=0.0.0.0/0
```
- deploy to GCE
```
gcloud beta compute instances create-with-container rythm-vm-2 --tags http-server --container-image gcr.io/umaru-rythm/bot:latest
```
- update GCE with new image version
```
gcloud beta compute instances update-container rythm-vm-2  --zone asia-southeast1-b --container-image=gcr.io/umaru-rythm/bot-v10:latest
```
- teardown steps:
```
# Delete the image from GCR
gcloud -q container images delete gcr.io/PROJECT_ID/proverb:latest
# Delete the created VM
gcloud -q compute instances delete proverb-vm
# Delete the firewall rule
gcloud -q compute firewall-rules delete allow-http
```
- [more at](https://medium.com/@enocom/deploy-a-container-on-gcp-the-easy-way-4e5fd64aca76)

## Description

Simple little music bot to queue up and play youtube audio over discord voice channels.

## Bot Commands

-   Show some helpful info
    > `!help`
-   Search for a video on YouTube
    > `!youtube https://www.youtube.com/watch?v=dQw4w9WgXcQ`
-   Join your voice channel
    > `!join`
-   Start the queue
    > `!play`
-   Search for a song
    > `!search don't stop believin`
-   List songs in the queue
    > `!list`
-   Shuffle the queue
    > `!shuffle`
-   Clear the queue
    > `!clear`
-   Move song in queue
    > `!move [targetIndex] [up/down/destIndex]`
-   Save queue as playlist
    > `!playlist save my_awesome_playlist`
-   Load playlist to queue
    > `!playlist load my_awesome_playlist`
-   Delete playlist
    > `!playlist delete my_less_awesome_playlist`
-   List playlists
    > `!playlist list`

## Bot Hosting

### Unlisted dependencies

-   `Python2.7` This version is required for node-gyp I think?
-   `node-gyp` command line tool
-   `node.js` version 12.X.X or higher is required
-   `typescript` types for javascript, enables easier group collaboration and simple right click to look up definitions

### Installation

-   Install node latest stable release, this was built with node v12.16.1
-   For windows run `npm install --global --production --add-python-to-path windows-build-tools`
    -   Use Chocolatey and to install python 2.7, then add 'PYTHON' into windows env variable `setx PYTHON C:\Python27\python.exe /m` and set PATH accordingly to 'C:\Python27'
    - Install visual studio 2015 community and related build tool `https://my.visualstudio.com/Downloads?q=Visual%20Studio%202015%20with%20Update%203`, then create a C++ project and let it install dependencies.
    -   Run `npm config set msvs_version 2015 --global`
    -   Run `npm install node-gyp -g`
    -   Run `node-gyp --python C:\Python27\`
    -   Run `npm config set python C:\Python27\python.exe --global`
    -   Run `npm install typescript -g`
    -   Run `npm install`

> Note: `npm install --global --production --add-python-to-path windows-build-tools` and other related setup like 'node-gyp', 'config set msvs_version' is not needed anymore. Download node.js installer on their site and tick installing additional tool. If Additional tool installation failed, go to Node folder in start menu and rerun it. Sometimes switching to node16 to do package install then switch back to node12 to run might do the trick

### Configuration
-   Get a token string for your bot from by registering your bot here: [https://discordapp.com/developers](https://discordapp.com/developers)
    -   Create an invite link like this
        `https://discordapp.com/api/oauth2/authorize?client_id={ APPLICATION ID }&permissions=2159044672&scope=bot`
-   Open `bot-config.json` and replace the content between the quotes `"<BOT-TOKEN-HERE>"` with your bot token.
    -   In config you can add other settings, to see an example of the settings open `./src/bot/config.ts` and look at `DefaultBotConfig` and `BotConfig` for examples
-   Open `bot.log` if you're looking to debug errors

### Running the Application

-   Run `npm start`
