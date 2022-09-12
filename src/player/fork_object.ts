import { SongProvider } from "./../track"
import { Snowflake } from 'discord.js';
type ForkObject = {
    title: string;
    url: string;
    provider: SongProvider;
    guildId: Snowflake;
    userId: string;
}

export { ForkObject };