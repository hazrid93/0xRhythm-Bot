enum SongProvider {
    YOUTUBE = 'youtube',
    SOUNDCLOUD = 'soundcloud'
}

interface TrackData {
    url: string;
    provider:  SongProvider,
    title: string;
}

export {TrackData, SongProvider};