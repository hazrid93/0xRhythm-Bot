import mongoose from 'mongoose';

type ITrack = {
    title: string;
    url: string;
    provider: string;
}

// collection: `Tracks`
// document: `Track`
const TrackSchema = new mongoose.Schema({
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
},{ collection: 'Tracks', timestamps: false}); // custom collection naming)


// special 'type' only export if there is issue when running by other class than import it
// usually when there are issue to use the item imported using ES6 import due to it async nature
// this usually solvable by using synchronous import which is commonJS const x = require(x).
// Beside using commonJS import, the export ordering in 'index.ts' is also worth checking, 
// put the farthest child at highest and lowest child at bottom. farthest means its the one without
// much import
export type { ITrack };
export { TrackSchema };


