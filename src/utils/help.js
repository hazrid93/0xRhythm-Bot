export const HELP_TEXT = `
/play 
    - <soundcloud|youtube: Select the track provider.> 
    - <value|song name: Url of track or song name to search for.> 
    - <priority: 0, 1, 2 .Higher means it will override the queue position.>
/clear Clear the current playlist in the guild.
/skip Skip the current track in the guild playlist.
/leave Boot the player from the voice channel, this will clear the playlist.
/pause Pause the current track that is playing.
/resume Resume the current track that is playing.
/queue Prints the current playlist in the guild.
/status Get status of the server.
/config 
    - <bass: 0-20 .Set the bass value for the subsequent track in playlist.>
    - <treble: 0-20 .Set the treble value for the subsequent track in playlist.>
`;