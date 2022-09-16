import { TrackData, SongProvider } from "./track.model"
import { AudioResource, createAudioResource } from '@discordjs/voice';
import playdl, { YouTubeStream, YouTubeVideo, InfoData } from 'play-dl'
import cp from "child_process";
import { randomUUID } from 'crypto'
import { TrackPriority } from './../utils'

class Track implements TrackData {
    public priority: TrackPriority;
    public readonly url: string;
    public readonly provider: SongProvider;
    public title: string;
    constructor(url, provider, priority = TrackPriority.LOW) {
        this.url = url;
        this.provider = provider;
        this.priority = priority;
    }

    /**
	 * Creates an AudioResource from this Track.
	 */
     public createAudioResource(): Promise<AudioResource<Track>> {
		return new Promise(async (resolve, reject) => {
            try { 
                // create audio stream from resource
                let audioStream = await playdl.stream(this.url);
                let resource = createAudioResource(audioStream.stream, {
                    inputType: audioStream.type
                })
                resolve(resource);
            } catch(ex) {
                reject(new Error(ex.messsage));
            }
		});
	}

    public async getAudioInfo() {
        switch(this.provider) {
            case SongProvider.YOUTUBE:
                const trackTitle = await this.fetchYoutubeUrlInfo(this.url);
                this.title = trackTitle;
                return trackTitle;
                break;
            case SongProvider.SOUNDCLOUD:
                break;
            default:
                break;
        }
    }

    private async fetchYoutubeUrlInfo(_url: string){
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

    public getTrackInfo(){
        return { 
            url: this.url,
            provider: this.provider,
            title: this.title
        }
    }

}

export { Track };