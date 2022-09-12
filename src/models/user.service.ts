
import mongoose, { Model} from 'mongoose';
import { getUserModel, User, Track } from './';
import { randomUUID } from 'crypto';

function createUser(_user: User){
    let response = null;
    // replace Model<User> with Model<any> if theres issue
    getUserModel(async(UserModel: Model<any>) => {
        const payload = new UserModel({
            name: _user.name,
            userId: _user.userId,
            guild: _user.guild,
            tracks: _user.tracks
        })
        try {
            const mongoRes =  await payload.save();
            response = mongoRes;
            console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] User inserted into database successfully : ${mongoRes}`);
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to insert user into database, reason: ${ex.message}`);
        }
    });

    return response;
}

function findUserById(_id: string){
    let response = null;
    getUserModel(async(UserModel: Model<any>) => {
        try {
            const mongoRes =  await UserModel.findOne({id: _id});
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

function findUserByUserId(_uid: string){
    let response = null;
    getUserModel(async(UserModel: Model<any>) => {
        try {
            const mongoRes =  await UserModel.findOne({userId: _uid});
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

function deleteUserById(_id: string){
    let response = null;
    getUserModel(async(UserModel: Model<any>) => {
        try {
            const mongoRes =  await UserModel.findByIdAndDelete();
            response = mongoRes;
            console.log(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] User deleted from database successfully : ${mongoRes}`);
        }
        catch (ex) {
            console.error(`[${new Date().toISOString()}]-[${randomUUID()}]-[PID:${process.pid}] Fail to delete user, reason: ${ex.message}`);
        }
    });

    return response;
}


export { createUser };