import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	entersState,
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
    NoSubscriberBehavior
} from '@discordjs/voice';
import { randomUUID } from 'crypto'
import cp from "child_process";
import { promisify } from 'util';
import { Track } from '../track' ;

const wait = promisify(setTimeout);

class Playlist {
	public readonly audioPlayer: AudioPlayer;
	public readonly guildId: string;
	public readonly userId: string;

    public childProcess: cp.ChildProcess;
	public queue: Track[];
	public queueLock = false;

    public constructor(
		guildId: string,
		userId: string) {
		this.audioPlayer = createAudioPlayer();
		this.queue = [];
		this.guildId = guildId;
		this.userId = userId;
		this.childProcess = null;
    }

    /**
	 * Adds a new Track to the queue.
	 *
	 * @param track The track to add to the queue
	 */
	public enqueue(track: Track) {
		this.queue.push(track);
		this.processQueue();
	}

    /**
	 * Stops audio playback and empties the queue
	 */
	public stop() {
		this.queueLock = true;
		this.queue = [];
		this.audioPlayer.stop(true);
	}

    /**
	 * Attempts to play a Track from the queue, under unique guild
	 */
	private async processQueue(): Promise<void> {
		const uuid = randomUUID();
		const date = new Date().toISOString();
		// If the queue is locked (already being processed), is empty, or the audio player is already playing something, return
		if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) {
			return;
		}
		// Lock the queue to guarantee safe access
		this.queueLock = true;

		// Take the first item from the queue. This is guaranteed to exist due to the non-empty check above.
		const nextTrack: Track = this.queue.shift();

		// create base64 encode of data buffer for data we want to pass to child process
		const forkObj = {
			title: nextTrack.title,
			url: nextTrack.url,
			provider: nextTrack.provider,
			guildId: this.guildId,
			userId: this.userId
		};

		try {
			const encoded = Buffer.from(JSON.stringify(forkObj),'utf-8').toString('base64');
			if(this.childProcess == null){
				const trackProcess = cp.fork(__dirname + './../player/child_player.ts', [encoded]);
				this.childProcess = trackProcess;
				trackProcess.once('error', (error) => {
					console.error(`[${date}]-[${uuid}]-[PID:${this.childProcess.pid}] Child has an error: ${error.message}`);
				});
				
				trackProcess.once('close', (code) => {
					console.log(`[${date}]-[${uuid}]-[PID:${this.childProcess.pid}] Child process closed with code: ${code}`);
				})

				trackProcess.on('message', (message) => {
					console.log(`[${date}]-[${uuid}]-[PID:${this.childProcess.pid}] Child message: ${message}`);
				})
			} else {
				this.childProcess.send(encoded);
			}
      		
			this.queueLock = false;
		} catch (error) {
			this.queueLock = false;
			return this.processQueue();
		}
	}

	public sendCommand(_command: string){
		if(this.childProcess != null){
			this.childProcess.send(_command);
		} else {
			console.warn("Fail to skip the current track");
		}
	}
}

export { Playlist };