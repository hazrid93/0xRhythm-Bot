import { SongProvider } from "./../track"
import { Snowflake } from 'discord.js';
import { AudioConfig } from './../playlist';
type ForkObject = {
    title: string;
    url: string;
    provider: SongProvider;
    guildId: Snowflake;
    userId: string;
    audioConfig: string[];
}

export { ForkObject };