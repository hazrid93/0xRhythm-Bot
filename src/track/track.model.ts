enum SongProvider {
    YOUTUBE = 'youtube',
    SOUNDCLOUD = 'soundcloud'
}

interface TrackData {
    url: string;
    provider:  SongProvider,
    title: string;
    onStart?: () => void;
    onError?: (error: Error) => void;
    onFinish?: () => void;
}

export {TrackData, SongProvider};