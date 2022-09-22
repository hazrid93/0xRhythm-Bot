import {
	AudioPlayerStatus,
} from '@discordjs/voice';
import { removeSubscription } from "./../app";
import { randomUUID } from 'crypto'
import { Worker, workerData } from 'worker_threads';
import { promisify } from 'util';
import { Track } from '../track' ;
import { IPC_STATES_REQ, IPC_STATES_RESP } from './../constants/ipcStates';
import { TrackPriority, PriorityQueue } from './../utils'
import { ForkObject } from './../player';
import { 
	Guild, updateGuildById, createGuild, findGuildById, findGuildByGuildId,
	User, ITrack, updateUserById, createUser, findUserByUserId, findUserById} from './../models';
import USER_CONFIGS from './../constants/userConfig';
import { AudioConfig } from './';
const wait = promisify(setTimeout);

class Playlist {
	public audioConfig: AudioConfig;
	public readonly guildId: string;
	public readonly guildDbId: string;
	public readonly userId: string;
	public readonly userName: string;
    public childProcess: Worker;
	public playerState: AudioPlayerStatus;
	public queue: PriorityQueue<Track>;
	public queueLock = false;

    public constructor(
		guildDbId: string,
		guildId: string,
		userId: string,
		userName: string) {
		this.queue = new PriorityQueue();
		this.guildDbId = guildDbId;
		this.guildId = guildId;
		this.userId = userId;
		this.userName = userName;
		this.childProcess = null;
		this.playerState = null;
		// default audio config
		this.audioConfig = {
			volume: 1,
			bass: 0,
			treble: 0
		};

		this.startProcessEventListener();
    }

	public startProcessEventListener() {
		process.once("exit", () => {
			console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Process exit signal detected.`);
			this.stop();
		});

		process.once("SIGTERM", async () => {
			console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Process SIGTERM signal detected.`);
			try {
				if(this.childProcess != null) {
					await this.childProcess.terminate();
				}
			} catch (ex) {
			} finally {
				process.exit(0);
			}
		});

		process.once("SIGINT", async () => {
			console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Process SIGINT signal detected.`);
			try {
				if(this.childProcess != null) {
					await this.childProcess.terminate();
				}
			} catch (ex) {
			} finally {
				process.exit(0);
			}
		});
	}

	public async getPlaylist(){
		try { 
			let playlist = this.queue.printQueue();
			return playlist;
		} catch (ex) {
			console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to fetch playlist queue, reason: ${ex.message}`);
		}
	}

	public startChildEventListener() {
		this.childProcess.on('error', (error) => {
			console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Child has an error: ${error.message}`);
		});

		this.childProcess.once('exit', (code) => {
			console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Child process exited with code: ${code}`);
			this.childProcess = null;
			this.stop();
		})

		this.childProcess.on('message', (_message: string) => {
			this.commandHandler(_message);
		})
	}

	public setBass(_bassGain: number): void{
		let bassVal = Math.round(_bassGain);
		if(bassVal>=20){
			this.audioConfig.bass = 20;
		} else if(bassVal <=0){
			this.audioConfig.bass = 0;
		} else {
			this.audioConfig.bass = bassVal;
		}
	}

	public setTreble(_trebleGain: number): void{
		let trebleVal = Math.round(_trebleGain);
		if(trebleVal>=20){
			this.audioConfig.treble = 20;
		} else if(trebleVal <=0){
			this.audioConfig.treble = 0;
		} else {
			this.audioConfig.treble = trebleVal;
		}
	}

	/**
	 * Get audio config in ffmpeg output format which is string array
	 */
	private getAudioConfigFfmpeg(): string[] {
		try{
			let configArr = [];
			// volume set to default;
			let volumePrefix = "-af volume="
			let volumeVal = 1;
			let volume = volumePrefix + volumeVal.toFixed(1);

			let bassPrefix = "-af bass=g="
			let bassVal = this.audioConfig.bass;
			let bass = bassPrefix + bassVal;

			let treblePrefix = "-af treble=g="
			let trebleVal = this.audioConfig.treble;
			let treble = treblePrefix + trebleVal;

			// example filter using fireequalizer (Hz,gain(dB)[-20->+20])
			//configArr.push("-af firequalizer=gain_entry='entry(0,11);entry(250,11);entry(1000,0);entry(4000,0);entry(16000,0)'")

			// example chorus filter
			//configArr.push("-af chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3")
			configArr.push(volume);
			configArr.push(bass);
			configArr.push(treble);
			return configArr;
		} catch (ex) {
			console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to fetch playlist queue, reason: ${ex.message}`);
		}
	}


    /**
	 * Adds a new Track to the queue.
	 *
	 * @param track The track to add to the queue
	 */
	public enqueue(_track: Track) {
		this.queue.enqueue(_track);
		this.updateUser(_track); // no need to await because we dont need the response.
		this.processQueue();
	}

	public async updateUser(_track: Track){
		try{
			let userData = await findUserByUserId(this.userId);
			// <TODO> remove code duplication
			if(userData == null){
				let trackObj: ITrack = {
					url: _track.url,
					title: (_track.title != null) ? _track.title : "NOT_AVAILABLE",
					provider: _track.provider
				}
				let userObj: User = {
					name: this.userName,
					userId: this.userId,
					guild: this.guildDbId,
					tracks: Array.of(trackObj)
				}
				let userPersisted = await createUser(userObj);
				let guildData = await findGuildByGuildId(this.guildId);
				let guildUsers = guildData.users;
				guildUsers.push(userPersisted)
				let guildObj: Guild = {
					name: guildData.name,
					guildId: guildData.guildId,
					users: guildUsers
				}
				await updateGuildById(this.guildDbId, guildObj);
			} else {
				let trackObj: ITrack = {
					url: _track.url,
					title: (_track.title != null) ? _track.title : "NOT_AVAILABLE",
					provider: _track.provider
				}
				let newTrack = userData.tracks;
				// Remove old item from track array and add new one to the last.
				// keep track array at specific length
				if(newTrack.length >= USER_CONFIGS.TRACK_LIMIT){
					newTrack.shift();
				}
				newTrack.push(trackObj);
				let userObj: User = {
					name: this.userName,
					userId: this.userId,
					guild: this.guildDbId,
					tracks: newTrack
				}
				await updateUserById(userData._id, userObj);
			}
		} catch (ex) {
			console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to fetch playlist queue, reason: ${ex.message}`);
		}
	}

	// queue only without processing
	public strictEnqueue(_track: Track) {
		this.queue.enqueue(_track);
		this.updateUser(_track);
	}

	// manually start the queue processs, mainly use for playlist
	public startProcessQueue() {
		this.processQueue();
	}

    /**
	 * Stops audio playback and empties the queue
	 */
	public async stop() {
		this.queueLock = false;
		this.queue.clear();
		if(this.childProcess != null) {
			try {
				await this.childProcess.terminate();
			} catch(ex){
				console.log(`Fail to kill childprocess , reason: ${ex.message}`);
			} finally {
				this.childProcess = null;
			}
		}
	}

	public clearQueue() {
		this.queue.clear();
	}

    /**
	 * Attempts to play a Track from the queue, under unique guild
	 */
	private async processQueue(): Promise<void> {
		const uuid = randomUUID();
		const date = new Date().toISOString();
		// If the queue is locked (already being processed), is empty, or the audio player is already playing something, return
		if (this.queueLock 
			|| (this.playerState !== AudioPlayerStatus.Idle && this.playerState != null)
			|| this.queue.length() === 0) {
			return;
		}
		// Lock the queue to guarantee safe access
		this.queueLock = true;

		const nextTrack: Track = this.queue.dequeue();

		// create base64 encode of data buffer for data we want to pass to child process
		const forkObj: ForkObject = {
			title: nextTrack.title,
			url: nextTrack.url,
			provider: nextTrack.provider,
			guildId: this.guildId,
			userId: this.userId,
			audioConfig: this.getAudioConfigFfmpeg()
		};

		try {
			const encoded = Buffer.from(JSON.stringify(forkObj),'utf-8').toString('base64');
			if(this.childProcess == null){
			//	const trackProcess = cp.fork(__dirname + './../player/child_player.ts', [encoded]);
				const trackProcess = new Worker(__dirname + './../player/child_player.ts',{ workerData: {data: encoded }});
				this.childProcess = trackProcess;
				this.startChildEventListener();
			} else {
				this.childProcess.postMessage(encoded);
			}
			this.queueLock = false;
		} catch (error) {
			this.queueLock = false;
			return this.processQueue();
		}
	}

	public commandHandler(_message: string){
		const uuid = randomUUID();
		const date = new Date().toISOString();
		try{
			if(_message != null && _message.length > 0) {
				console.log(`[${date}]-[${uuid}]-[PID:${process.pid}] Child message: ${_message}`);
				switch(_message){
					case IPC_STATES_RESP.SONG_IDLE:
						this.playerState = AudioPlayerStatus.Idle;
						this.processQueue()
						break;
					case IPC_STATES_RESP.SONG_PAUSED:
						this.playerState = AudioPlayerStatus.Paused
						break;
					case IPC_STATES_RESP.SONG_PLAYING:
						this.playerState = AudioPlayerStatus.Playing
						break;
					case IPC_STATES_RESP.REMOVE_GUILD_SUBSCRIPTION:
						removeSubscription(this.guildId, uuid);
						break;
					default:
						break;
				}
			}
		} catch(ex) {
			console.error(`[${date}]-[${uuid}]-[PID:${process.pid}] Fail to process child message: ${_message.toString()}, reason: ${ex.message}`);
		}
	}

	public sendCommand(_command: string){
		try{
			if(this.childProcess != null){
				this.childProcess.postMessage(_command);
			} else {
				console.warn("Fail to skip the current track");
			}
		} catch(ex){
			console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to send command to child process , reason: ${ex.message}`);
			this.stop();
		}
	}
}

export { Playlist };