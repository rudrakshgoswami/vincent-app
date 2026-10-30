
import mongoose from 'mongoose';
async function listDBs() {
    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    const dbs = await admin.listDatabases();
    console.log(dbs.databases.map(db => db.name));
    process.exit();
}
mongoose.connect('mongodb://localhost:27017/admin').then(listDBs);
