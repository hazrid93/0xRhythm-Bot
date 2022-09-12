
import mongoose, { Model} from 'mongoose';
import { getGuildModel, User, Guild } from '.';
import { randomUUID } from 'crypto';

function createGuild(_guild: Guild){
    let response = null;
    // replace Model<User> with Model<any> if theres issue
    getGuildModel(async(GuildModel: Model<any>) => {
        const payload = new GuildModel({
            name: _guild.name,
            guildId: _guild.guildId,
            users: _guild.users
        })
        try {
            const mongoRes =  await payload.save();
            response = mongoRes;
            console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Guild inserted into database successfully : ${mongoRes}`);
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to insert guild into database, reason: ${ex.message}`);
        }
    });

    return response;
}

function findGuildById(_id: string){
    let response = null;
    getGuildModel(async(GuildModel: Model<any>) => {
        try {
            const mongoRes =  await GuildModel.findOne({id: _id});
            if(!mongoRes){
                // throw error
                console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Guild does not exist!`);
            } else {
                response = mongoRes;
            }
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to find guild by Id, reason: ${ex.message}`);
        }
    });
    return response;
}

function findGuildByGuildId(_gid: string){
    let response = null;
    getGuildModel(async(GuildModel: Model<any>) => {
        try {
            const mongoRes =  await GuildModel.findOne({guildId: _gid});
            if(!mongoRes){
                // throw error
                console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Guild does not exist!`);
            } else {
                response = mongoRes;
            }
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to find guild by GuildId, reason: ${ex.message}`);
        }
    });
    return response;
}


function deleteGuildById(_id: string){
    let response = null;
    getGuildModel(async(GuildModel: Model<any>) => {
        try {
            const mongoRes =  await GuildModel.findByIdAndDelete();
            response = mongoRes;
            console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Guild deleted from database successfully : ${mongoRes}`);
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to delete guild by Id, reason: ${ex.message}`);
        }
    });

    return response;
}


export { createUser };