import mongoose = require('mongoose');

//db environment info
const DB_NAME = process.env.DB_NAME;
console.log("Database name: " + process.env.DB_NAME);
const DB_URL = process.env.DB_URL;
console.log("Database URL: " + process.env.DB_URL);

// options detail at https://mongoosejs.com/docs/connections.html
const options = {
    autoIndex: true, // build indexes
    maxPoolSize: 100, // Maintain up to 100 socket connections
    dbName: DB_NAME
  };

var _connection: typeof mongoose;

async function connectToServer(callback){
    await mongoose.connect(DB_URL, options).then(con => {
        _connection = con;
        callback();
    }).catch(err => {
        callback(err);
    });
}

async function getConnection(){
    if(_connection) {
        return _connection;
    } else {
        let con = await mongoose.connect(DB_URL, options);
        _connection = con;
        return _connection;
    }
}

export { connectToServer, getConnection };
