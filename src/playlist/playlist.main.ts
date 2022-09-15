import {
	AudioPlayerStatus,
} from '@discordjs/voice';
import { removeSubscription } from "./../app";
import { randomUUID } from 'crypto'
import { Worker, workerData } from 'worker_threads';
import { promisify } from 'util';
import { Track } from '../track' ;
import { IPC_STATES_REQ, IPC_STATES_RESP } from './../constants/ipcStates';
import { ForkObject } from './../player';
import { 
	Guild, updateGuildById, createGuild, findGuildById, findGuildByGuildId,
	User, ITrack, updateUserById, createUser, findUserByUserId, findUserById} from './../models';
import USER_CONFIGS from './../constants/userConfig';

const wait = promisify(setTimeout);

class Playlist {
	public readonly guildId: string;
	public readonly guildDbId: string;
	public readonly userId: string;
	public readonly userName: string;
    public childProcess: Worker;
	public playerState: AudioPlayerStatus;
	public queue: Track[];
	public queueLock = false;

    public constructor(
		guildDbId: string,
		guildId: string,
		userId: string,
		userName: string) {
		this.queue = [];
		this.guildDbId = guildDbId;
		this.guildId = guildId;
		this.userId = userId;
		this.userName = userName;
		this.childProcess = null;
		this.playerState = null;

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


    /**
	 * Adds a new Track to the queue.
	 *
	 * @param track The track to add to the queue
	 */
	public enqueue(_track: Track) {
		this.queue.push(_track);
		this.updateUser(_track); // no need to await because we dont need the response.
		this.processQueue();
	}

	public async updateUser(_track: Track){
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
			let userPersisted = await updateUserById(userData._id, userObj);
			let guildData = await findGuildByGuildId(this.guildId);
			let guildUsers = guildData.users;
			guildUsers.push(userPersisted)
			let guildObj: Guild = {
				name: guildData.name,
				guildId: guildData.guildId,
				users: guildUsers
			}
			await updateGuildById(this.guildDbId, guildObj);
		}
	}

	// queue only without processing
	public strictEnqueue(_track: Track) {
		this.queue.push(_track);
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
		this.queue = [];
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

    /**
	 * Attempts to play a Track from the queue, under unique guild
	 */
	private async processQueue(): Promise<void> {
		const uuid = randomUUID();
		const date = new Date().toISOString();
		// If the queue is locked (already being processed), is empty, or the audio player is already playing something, return
		if (this.queueLock 
			|| (this.playerState !== AudioPlayerStatus.Idle && this.playerState != null)
			|| this.queue.length === 0) {
			return;
		}
		// Lock the queue to guarantee safe access
		this.queueLock = true;

		// Take the first item from the queue. This is guaranteed to exist due to the non-empty check above.
		const nextTrack: Track = this.queue.shift();

		// create base64 encode of data buffer for data we want to pass to child process
		const forkObj: ForkObject = {
			title: nextTrack.title,
			url: nextTrack.url,
			provider: nextTrack.provider,
			guildId: this.guildId,
			userId: this.userId
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