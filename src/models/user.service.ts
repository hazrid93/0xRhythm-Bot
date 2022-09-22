
import mongoose, { Model} from 'mongoose';
import { getUserModel, User } from './';
import { randomUUID } from 'crypto';

async function createUser(_user: User){
    let response = null;
    // replace Model<User> with Model<any> if theres issue
    await getUserModel(async(UserModel: Model<any>) => {
        const payload = new UserModel({
            name: _user.name,
            userId: _user.userId,
            guild: _user.guild,
            tracks: _user.tracks
        })
        try {
            const mongoRes = payload.save();
            response = mongoRes;
            console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] User inserted into database successfully : ${mongoRes}`);
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to insert user into database, reason: ${ex.message}`);
        }
    });

    return response;
}

async function updateUserById(_id: string,_user: User){
    let response = null;
    await getUserModel(async(UserModel: Model<any>) => {
        const options = { new: true, lean: true };// return model after updated;
        try {
            const mongoRes = UserModel.findByIdAndUpdate(_id, _user, options);
            response = mongoRes;
            console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] User updated successfully`);
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to update user into database, reason: ${ex.message}`);
        }
    });

    return response;
}

async function findUserById(_id: string){
    let response = null;
    await getUserModel(async(UserModel: Model<any>) => {
        try {
            const mongoRes = UserModel
                .findOne({id: _id})
                .populate('guild', 'name guildId -_id')
                .select('name userId guild tracks');
            if(!mongoRes){
                // throw error
                console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] User does not exist!`);
            } else {
                response = mongoRes;
            }
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to find user by Id, reason: ${ex.message}`);
        }
    });
    return response;
}

async function findUserByUserId(_uid: string){
    let response = null;
    await getUserModel(async(UserModel: Model<any>) => {
        try {
            const mongoRes = UserModel.findOne({userId: _uid})
                .populate('guild', 'name guildId -_id')
                .select('name userId guild tracks');
            if(!mongoRes){
                // throw error
                console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] User does not exist!`);
            } else {
                response = mongoRes;
            }
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to find user by UserId, reason: ${ex.message}`);
        }
    });
    return response;
}

async function deleteUserById(_id: string){
    let response = null;
    await getUserModel(async(UserModel: Model<any>) => {
        try {
            const mongoRes = UserModel.findByIdAndDelete();
            response = mongoRes;
            console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] User deleted from database successfully : ${mongoRes}`);
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to delete user, reason: ${ex.message}`);
        }
    });

    return response;
}


export { createUser, updateUserById, deleteUserById, findUserByUserId, findUserById};