import { IRhythmBotConfig, RhythmBot } from '../bot';
import { MediaItem } from '../media';
import { secondsToTimestamp } from '../helpers';
import {
    IBotPlugin,
    IBot,
    SuccessfulParsedMessage,
    Message,
    CommandMap,
    Client,
    IBotConfig,
} from 'discord-bot-quickstart';
import { Readable } from 'stream';
import ytdl from 'ytdl-core';
import { getInfo } from 'ytdl-core';
import ytpl from 'ytpl';
import { ORM } from '../app';

const youtubeType: string = 'youtube';

export default class YoutubePlugin extends IBotPlugin {
    bot: RhythmBot;

    preInitialize(bot: IBot<IRhythmBotConfig>): void {
        this.bot = bot as RhythmBot;
        this.bot.helptext += '\n`youtube [url/idfragment]` - Add youtube audio to the queue\n';
    }

    registerDiscordCommands(map: CommandMap<(cmd: SuccessfulParsedMessage<Message>, msg: Message) => void>) {
        map.on(youtubeType, async (cmd: SuccessfulParsedMessage<Message>, msg: Message) => {
            if (cmd.arguments.length > 0) {
                for (const arg of cmd.arguments) {
                    await this.bot.player.addMedia({
                        type: youtubeType,
                        url: arg,
                        requestor: msg.author.username,
                    });
                }

                if (!this.bot.player.playing) {
                    this.bot.joinChannelAndPlay(msg);
                }
            }
        });

        this.bot.player.typeRegistry.set(youtubeType, {
            getPlaylist: (item: MediaItem) =>
                new Promise<MediaItem[]>((done, error) => {
                    ytpl(item.url)
                        .then((playlist) => {
                            const items = playlist.items.map(
                                (item) =>
                                    <MediaItem>{
                                        type: youtubeType,
                                        url: item.url,
                                        name: item.title,
                                    }
                            );
                            done(items);
                        })
                        .catch((err) => error(err));
                }),
            getDetails: (item: MediaItem) =>
                new Promise<MediaItem>((done, error) => {
                    item.url = item.url.includes('://') ? item.url : `https://www.youtube.com/watch?v=${item.url}`;
                    getInfo(item.url)
                        .then((info) => {
                            item.name = info.videoDetails.title ? info.videoDetails.title : 'Unknown';
                            item.duration = secondsToTimestamp(parseInt(info.videoDetails.lengthSeconds) || 0);
                            done(item);
                        })
                        .catch((err) => error(err));
                }),
            getStream: (item: MediaItem) =>
                new Promise<Readable>((done, error) => {
                    let stream = ytdl(item.url, {
                        filter: 'audioonly',
                        quality: 'lowestaudio',
                    });
                    if (stream) {
                        done(stream);
                    } else {
                        error('Unable to get media stream');
                    }
                }),
        });
    }

    registerConsoleCommands() {}

    clientBound() {}

    postInitialize() {}

    onReady() {}
}
