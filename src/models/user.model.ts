import mongoose from 'mongoose';
import { connectToServer, getConnection } from './../utils';
import { TrackSchema, Track} from './';  
// more about middleware for softdelete https://masteringjs.io/tutorials/mongoose/soft-delete
// more about timestamp https://mongoosejs.com/docs/timestamps.html
// more about mongo model with mongoose https://www.freecodecamp.org/news/introduction-to-mongoose-for-mongodb-d2a7aa593c57/


type User = {
    name: string;
    userId: string;
    guild: string;
    tracks: Track[];
}

// collection: `Users`
// document: `User`
const userSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String
    },
    userId: {
        required: true,
        unique: true,
        type: String
    },
    guild: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Guild'
    },
    tracks: [ TrackSchema ],
    isDeleted: { 
        type: Boolean, 
        default: false 
    }
},{ collection: 'Users', timestamps: true}); // custom collection naming)

userSchema.pre('find', function(){
   this.where({isDeleted: false})
})

userSchema.pre('findOne', function(){
    this.where({isDeleted: false})
 })

async function getUserModel(callback: Function){
    let connection = await getConnection();
    let UserModel = connection.model('User', userSchema);
    callback(UserModel) 
};

export { getUserModel, User };

