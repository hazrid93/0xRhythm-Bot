import { PlayStrategy } from '.';
import { randomUUID } from 'crypto'
import {SongProvider } from "../track";
import playdl, { YouTubePlayList, YouTubeVideo } from 'play-dl';
import { Maybe } from '../utils';
import { Track } from './../track'
import { Playlist } from './../playlist';

class YoutubePlayerHandler implements PlayStrategy {
    private url: string;
    private subscription: Playlist;

    private PROVIDER: SongProvider = SongProvider.YOUTUBE;

    constructor(_url: string, _subscription: Playlist){
        this.url = _url;
        this.subscription = _subscription;
    }

   async execute() {
        let _uuid = randomUUID();
        try {
            let urlOrName = this.url;
            let urlPrefix = "^(http|https)";
            let pattern = new RegExp(urlPrefix);
            let hasPrefix = pattern.test(urlOrName);

            if(hasPrefix == false){
                let searchVidUrl = await playdl.search(urlOrName, { limit : 1, source : { youtube : "video" } }) 
                if(searchVidUrl){
                    this.url = searchVidUrl[0].url;
                } else {
                    return false;
                }
            }

            let trackType = playdl.yt_validate(this.url);
            // validate the track url
            if(trackType === 'video'){
                // Attempt to create a Track from the user's video URL
                const track = new Track(this.url, this.PROVIDER);
                // get audio info
                await track.getAudioInfo();
                console.log(`[${new Date().toISOString()}]-[${_uuid}]-[PID:${process.pid}] Track added, track info: ${JSON.stringify(track)}`);
                // Enqueue the track and reply a success message to the user
                this.subscription.enqueue(track);
                return true;
            } else if(trackType === 'playlist'){
                // get youtube playlist, skip hidden videos
                const playlist: YouTubePlayList = await playdl.playlist_info(this.url, { incomplete : true })
                const videos: YouTubeVideo[] = await playlist.all_videos();
                videos.forEach(async (_video) =>{
                    const track = new Track(_video.url, SongProvider.YOUTUBE);
                    // get audio info
                    await track.getAudioInfo();
                    this.subscription.strictEnqueue(track);
                });
                this.subscription.startProcessQueue()
                return true;
            } else {
                return false;
            }
        } catch(ex){
            console.log(`[${new Date().toISOString()}]-[${_uuid}]-[PID:${process.pid}] Fail to queue the item to playlist, reason: ${ex.message}`);
            return false;
        }
    }

}

export { YoutubePlayerHandler };