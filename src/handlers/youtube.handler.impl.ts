import { PlayStrategy } from '.';
import { randomUUID } from 'crypto'
import {SongProvider } from "../track";
import playdl, { YouTubePlayList, YouTubeVideo, InfoData } from 'play-dl';
import { Maybe, TrackPriority } from '../utils';
import { Track } from './../track'
import { Playlist } from './../playlist';

class YoutubePlayerHandler implements PlayStrategy {
    private url: string;
    private subscription: Playlist;
    private priority: TrackPriority; 

    private PROVIDER: SongProvider = SongProvider.YOUTUBE;

    constructor(_url: string, _subscription: Playlist, _priority: TrackPriority){
        this.url = _url;
        this.subscription = _subscription;
        this.priority = _priority;
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
                const title = await this.fetchYoutubeUrlInfo(this.url);
                // Attempt to create a Track from the user's video URL
                const track = new Track(this.url, title, this.PROVIDER, this.priority);
                
                // Enqueue the track and reply a success message to the user
                this.subscription.enqueue(track);
                console.log(`[${new Date().toISOString()}]-[${_uuid}]-[PID:${process.pid}] Track added, track info: ${JSON.stringify(track)}`);
                return true;
            } else if(trackType === 'playlist'){
                // get youtube playlist, skip hidden videos
                const playlist: YouTubePlayList = await playdl.playlist_info(this.url, { incomplete : true })
                const videos: YouTubeVideo[] = await playlist.all_videos();
                videos.forEach(async (_video, index) =>{
                    let date = new Date();
                    date.setMilliseconds(date.getMilliseconds() + index);
                    const track = new Track(_video.url, _video.title, SongProvider.YOUTUBE, this.priority, date);
                    this.subscription.strictEnqueue(track);
                    console.log(`[${new Date().toISOString()}]-[${_uuid}]-[PID:${process.pid}] Track added, track info: ${JSON.stringify(track)}`);
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

    async fetchYoutubeUrlInfo(_url: string){
        const uuid = randomUUID();
        let title;
        try {
            let yt_info: InfoData = await playdl.video_basic_info(_url, { htmldata : false });
            title = yt_info.video_details.title;
            return title
        } catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${uuid}]-[PID:${process.pid}] Fail to fetch youtube video information, reason: ${ex.message}`);
        }
        return 'NOT_AVAILABLE';
    }

}

export { YoutubePlayerHandler };