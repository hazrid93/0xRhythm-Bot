import { PlayStrategy } from '.';
import { randomUUID } from 'crypto'
import {SongProvider } from "../track";
import playdl, { SoundCloudPlaylist, SoundCloudTrack } from 'play-dl';
import { Maybe, TrackPriority } from '../utils';
import { Track } from '../track'
import { Playlist } from '../playlist';

class SouncloudHandler implements PlayStrategy {
    private url: string;
    private subscription: Playlist;
    private priority: TrackPriority; 

    private PROVIDER: SongProvider = SongProvider.SOUNDCLOUD;

    constructor(_url: string, _subscription: Playlist, _priority: TrackPriority){
        this.url = _url;
        this.subscription = _subscription;
        this.priority = _priority;
    }

   async execute() {
        let _uuid = randomUUID();
        
        try {
            // get soundcloud free client Id
            await playdl.getFreeClientID().then((clientID) => playdl.setToken({
                soundcloud : {
                    client_id : clientID
                }
            }))

            let urlOrName = this.url;
            let urlPrefix = "^(http|https)";
            let pattern = new RegExp(urlPrefix);
            let hasPrefix = pattern.test(urlOrName);

            if(hasPrefix == false){
                let searchTrackUrl = await playdl.search(urlOrName, { limit : 1, source : { soundcloud : "tracks" } }) 
                if(searchTrackUrl){
                    this.url = searchTrackUrl[0].url;
                } else {
                    return false;
                }
            }

            let scTrack = await playdl.soundcloud(this.url);
            // validate the track url
            if(scTrack.type === 'track'){
                // Attempt to create a Track from the user's video URL
                const track = new Track(this.url, scTrack.name ,this.PROVIDER, this.priority);
                // Enqueue the track and reply a success message to the user
                this.subscription.enqueue(track);
                console.log(`[${new Date().toISOString()}]-[${_uuid}]-[PID:${process.pid}] Track added, track info: ${JSON.stringify(track)}`);
                return true;
            } else if(scTrack.type === 'playlist'){
                // get soundcloud playlist
                const videos: SoundCloudTrack[] = await (scTrack as SoundCloudPlaylist).all_tracks();
                videos.forEach(async (_video,index) =>{
                    let date = new Date();
                    date.setMilliseconds(date.getMilliseconds() + index);
                    const track = new Track(_video.url, _video.name, SongProvider.SOUNDCLOUD, this.priority ,date);
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

}

export { SouncloudHandler };