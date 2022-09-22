import { ITrack, SongProvider } from "./track.model"
import { AudioResource, createAudioResource } from '@discordjs/voice';
import playdl, { YouTubeStream, YouTubeVideo, InfoData } from 'play-dl'
import cp from "child_process";
import { randomUUID } from 'crypto';
import { TrackPriority } from './../utils'

class Track implements ITrack {
    public priority: TrackPriority;
    public readonly url: string;
    public readonly title: string = "NOT_AVAILABLE";
    public provider: SongProvider;
    public creationDate: Date;

    constructor(url, title, provider, _priority?: TrackPriority, _creationDate?: Date) {
        this.url = url;
        this.title = title;
        this.creationDate = _creationDate? _creationDate : new Date();
        this.provider = provider;
        this.priority = _priority? _priority : TrackPriority.LOW;
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

    public getTrackInfo(){
        return { 
            url: this.url,
            provider: this.provider,
            title: this.title
        }
    }

}

export { Track };