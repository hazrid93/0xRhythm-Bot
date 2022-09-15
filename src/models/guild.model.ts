import mongoose from 'mongoose';
import { connectToServer, getConnection } from '../utils';
import { User } from './';
type Guild = {
    name: string;
    guildId: string;
    users?: User[];
}

// collection: `Guilds`
// document: `Guild`
const guildSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String
    },
    guildId: {
        required: true,
        unique: true,
        type: String
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isDeleted: { 
        type: Boolean, 
        default: false 
    }
},{ collection: 'Guilds', timestamps: true}); // custom collection naming)

guildSchema.pre('find', function(){
   this.where({isDeleted: false})
})

guildSchema.pre('findOne', function(){
    this.where({isDeleted: false})
 })

async function getGuildModel(callback: Function){
    let connection = await getConnection();
    let GuildModel = await connection.model('Guild', guildSchema);
    callback(GuildModel) 
};

export { getGuildModel, Guild };

