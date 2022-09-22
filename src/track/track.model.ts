enum SongProvider {
    YOUTUBE = 'youtube',
    SOUNDCLOUD = 'soundcloud'
}

interface ITrack {
    url: string;
    provider:  SongProvider,
    title: string;
}

export {ITrack, SongProvider};