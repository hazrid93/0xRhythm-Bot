import { PlayStrategy } from '.';
import { randomUUID } from 'crypto'
import {SongProvider } from "../track";
import { Maybe, TrackPriority } from '../utils';
import { Track } from '../track'
import { Playlist } from '../playlist';

class TextToSpeechHandler implements PlayStrategy {
    private textTTS: string;
    private subscription: Playlist;

    constructor(_textTTS: string, _subscription: Playlist){
        this.textTTS = _textTTS;
        this.subscription = _subscription;
    }

   async execute() {
        let _uuid = randomUUID();
        try {
            const track = new Track(null, null, null, TrackPriority.HIGH, null, this.textTTS);
            // Enqueue the track and reply a success message to the user
            this.subscription.enqueue(track);
            console.log(`[${new Date().toISOString()}]-[${_uuid}]-[PID:${process.pid}] Track added, track info: ${JSON.stringify(track)}`);
            return true;
        } catch(ex){
            console.log(`[${new Date().toISOString()}]-[${_uuid}]-[PID:${process.pid}] Fail to queue the item to playlist, reason: ${ex.message}`);
            return false;
        }
    }

}

export { TextToSpeechHandler };