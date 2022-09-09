import { TrackData, SongProvider } from "./track.model"
import { AudioResource, createAudioResource } from '@discordjs/voice';
import playdl, { YouTubeStream, YouTubeVideo } from 'play-dl'
import cp from "child_process";

class Track implements TrackData {
    public readonly url: string;
    public readonly provider: SongProvider;
    public title: string;

    constructor(url, provider) {
        this.url = url;
        this.provider = provider;
        // update track title
        this.getAudioInfo(this.url, this.provider);
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

    private async getAudioInfo(_url: string, _provider: SongProvider) {
        switch(_provider) {
            case SongProvider.YOUTUBE:
                const ytInfo = await this.fetchYoutubeUrlInfo(_url);
                this.title = ytInfo.title;
                break;
            case SongProvider.SOUNDCLOUD:
                break;
            default:
                break;
        }
    }

    private async fetchYoutubeUrlInfo(_url: string){
        let yt_info = await playdl.search(_url, {
            source : { youtube : "video" },
            limit: 1
        })

        return yt_info[0];
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