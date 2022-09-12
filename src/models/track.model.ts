import mongoose from 'mongoose';

type Track = {
    title: string;
    url: string;
    provider: string;
}

// collection: `Tracks`
// document: `Track`
const trackSchema = new mongoose.Schema({
    title: {
        required: true,
        type: String
    },
    url: {
        required: true,
        type: String
    },
    provider: {
        required: true,
        type: String
    },
},{ collection: 'Tracks', timestamps: true}); // custom collection naming)

export { trackSchema as TrackSchema, Track }

