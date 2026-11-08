/*
 * Writes every collection in the database named by MONGO_URI to a folder of
 * JSON files, using MongoDB Extended JSON so that ObjectIds, dates and the
 * other BSON types survive the round trip.
 *
 * Why Extended JSON matters: a plain JSON.stringify turns ObjectId("abc…")
 * into the string "abc…", and re-importing that gives you a document whose
 * _id is a string. Mongoose then casts query values to ObjectId and never
 * matches them again. That is exactly how this database came to have string
 * _ids, so a backup taken the naive way would preserve the bug it is meant
 * to protect you from.
 *
 *     cd server && node scripts/backup-db.js [outputDir]
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EJSON } from 'bson';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const run = async () => {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set.');
        process.exit(1);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.resolve(process.argv[2] || `backups/${stamp}`);

    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    console.log(`database : ${db.databaseName}`);
    console.log(`output   : ${outDir}\n`);

    fs.mkdirSync(outDir, { recursive: true });

    const names = (await db.listCollections().toArray()).map(c => c.name).sort();
    let grand = 0;
    for (const name of names) {
        const docs = await db.collection(name).find({}).toArray();
        fs.writeFileSync(
            path.join(outDir, `${name}.json`),
            EJSON.stringify(docs, null, 2, { relaxed: false })
        );
        grand += docs.length;
        console.log(`  ${name.padEnd(22)} ${String(docs.length).padStart(5)} docs`);
    }

    console.log(`\n${grand} documents written.`);
    await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
