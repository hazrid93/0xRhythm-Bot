
import mongoose, { Model} from 'mongoose';
import { getGuildModel, User, Guild } from '.';
import { randomUUID } from 'crypto';

async function createGuild(_guild: Guild){
    let response = null;
    // replace Model<User> with Model<any> if theres issue
    await getGuildModel(async(GuildModel: Model<any>) => {
        const payload = new GuildModel({
            name: _guild.name,
            guildId: _guild.guildId,
            users: _guild.users
        })
        try {
            const mongoRes = payload.save();
            response = mongoRes;
            console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Guild inserted into database successfully : ${mongoRes}`);
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to insert guild into database, reason: ${ex.message}`);
        }
    });

    return response;
}


async function updateGuildById(_id: string,_guild: Guild){
    let response = null;
    await getGuildModel(async(GuildModel: Model<any>) => {
        const options = { new: true };// return model after updated;
        try {
            const mongoRes = GuildModel.findByIdAndUpdate(_id, _guild, options);
            response = mongoRes;
            console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Guild updated successfully`);
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to update guild into database, reason: ${ex.message}`);
        }
    });

    return response;
}

async function findGuildById(_id: string){
    let response = null;
    await getGuildModel(async(GuildModel: Model<any>) => {
        try {
            const mongoRes = GuildModel.findOne({id: _id})
            .populate('users', 'name userId -_id');
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

async function findGuildByGuildId(_gid: string){
    let response = null;
    await getGuildModel(async(GuildModel: Model<any>) => {
        try {
            console.log("gid: " + _gid);
            const mongoRes = GuildModel.findOne({guildId: _gid});
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


async function deleteGuildById(_id: string){
    let response = null;
    await getGuildModel(async(GuildModel: Model<any>) => {
        try {
            const mongoRes = GuildModel.findByIdAndDelete();
            response = mongoRes;
            console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Guild deleted from database successfully : ${mongoRes}`);
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to delete guild by Id, reason: ${ex.message}`);
        }
    });

    return response;
}


export { createGuild, updateGuildById, findGuildById, findGuildByGuildId, deleteGuildById };