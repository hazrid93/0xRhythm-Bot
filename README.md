# 0xRhythm-Bot

## Staging information
- staging bot name: staging-umaru-rythm
- inv url [link](https://discord.com/api/oauth2/authorize?client_id=935569503729897562&permissions=1084516956992&scope=bot%20applications.commands)

## Requirement
-Node: v16.17.x <br/>

## Description
Simple little music bot to queue up and play youtube audio over discord voice channels.

## Bot Commands

-   Show some helpful info
    > <To be updated>

### Running the Application
    Note: 
    1) Setup .env.local for development server and .env.prod for production server on project
    root directory.
    Example .env.local :
        VERSION=1.0.0
        DB_URL=mongodb://localhost:27017/?maxPoolSize=100&w=majority
        DB_NAME=local-test
        STAGING_TOKEN=<token from discord dev portal>
        CLIENT_ID=<bot client id>
    
    2) Run the commands below (or refer package.json)
    #### [DEVELOPMENT SERVER]
-   Run `npm run start:pm2:dev` - start the server under pm2 process manager
-   Run `npm run logs:pm2` - tail the log for the process in realtime
-   Run `npm run delete:pm2:dev` - Kill the server process
-   Run `npm run monitor:pm2` - Kill the server process

    #### [PRODUCTION SERVER]
-   Run `npm run start:pm2:prod` - start the server under pm2 process manager
-   Run `npm run logs:pm2` - tail the log for the process in realtime
-   Run `npm run delete:pm2:prod` - Kill the server process
-   Run `npm run monitor:pm2` - Kill the server process
