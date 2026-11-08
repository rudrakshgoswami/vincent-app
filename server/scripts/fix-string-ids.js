/*
 * Repairs documents whose _id - or whose references to other documents -
 * were stored as plain strings instead of ObjectIds.
 *
 * How the database got this way: the collections were exported to JSON and
 * read back in. Plain JSON has no ObjectId, so every id was written as a
 * string and re-imported as one. The documents still look right in Compass,
 * which is what makes this hard to spot.
 *
 * Why it breaks things: a Mongoose schema declares _id and every ref as an
 * ObjectId, so Mongoose casts the value in a query to an ObjectId before it
 * is sent. ObjectId("697f...") does not equal the string "697f...", so the
 * query matches nothing. Table.find({_id: {$in: [...]}}) comes back empty
 * and the reservation route answers "One or more tables not found" for
 * tables that are sitting right there. populate() fails the same way, which
 * is why venue bookings show "Unknown Venue" and reservations show no guest.
 *
 * What it converts:
 *   1. _id, where it is a string of 24 hex characters.
 *   2. every path a schema declares as an ObjectId, including the ones
 *      inside nested objects and arrays of subdocuments.
 *   3. any remaining string that is the id of a document being migrated,
 *      which catches references the schemas do not describe.
 *
 * Changing an _id means inserting a new document and removing the old one;
 * MongoDB will not update an _id in place. Each collection is done inside a
 * transaction where the server supports them, so a collection either
 * converts completely or not at all.
 *
 *     cd server && node scripts/fix-string-ids.js          # dry run
 *     cd server && node scripts/fix-string-ids.js --apply  # make the changes
 *
 * Take a backup first: node scripts/backup-db.js
 * Running it twice is harmless; the second run finds nothing to do.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const APPLY = process.argv.includes('--apply');
const HEX24 = /^[0-9a-fA-F]{24}$/;
const isConvertible = (v) => typeof v === 'string' && HEX24.test(v);

/*
 * Every path a schema calls an ObjectId, as a list of path segments so that
 * arrays and nested objects can be walked without string surgery. '[]'
 * stands for "step into each element of this array".
 */
const objectIdPaths = (schema, prefix = []) => {
    const found = [];
    schema.eachPath((name, type) => {
        if (name === '__v') return;
        const segs = [...prefix, ...name.split('.')];
        if (type.instance === 'ObjectId') {
            found.push(segs);
        } else if (type.$isMongooseArray && type.caster && type.caster.instance === 'ObjectId') {
            found.push([...segs, '[]']);
        } else if (type.$isMongooseDocumentArray) {
            found.push(...objectIdPaths(type.schema, [...segs, '[]']));
        } else if (type.schema) {
            found.push(...objectIdPaths(type.schema, segs));
        }
    });
    return found;
};

/*
 * Walks one declared path and converts the string it finds. Returns how many
 * values changed, so the dry run can report an honest count.
 */
const convertAt = (node, segs) => {
    if (node === null || node === undefined) return 0;
    const [head, ...rest] = segs;

    if (head === '[]') {
        if (!Array.isArray(node)) return 0;
        if (rest.length === 0) {
            let n = 0;
            node.forEach((v, i) => {
                if (isConvertible(v)) {
                    node[i] = new mongoose.Types.ObjectId(v);
                    n += 1;
                }
            });
            return n;
        }
        return node.reduce((n, item) => n + convertAt(item, rest), 0);
    }

    if (rest.length === 0) {
        if (isConvertible(node[head])) {
            node[head] = new mongoose.Types.ObjectId(node[head]);
            return 1;
        }
        return 0;
    }

    return convertAt(node[head], rest);
};

/*
 * Catches references the schemas do not declare: any string anywhere in the
 * document that is the id of a document this run is migrating.
 */
const convertKnownIds = (node, known, seen = new Set()) => {
    if (node === null || typeof node !== 'object' || seen.has(node)) return 0;
    seen.add(node);
    let n = 0;
    for (const key of Object.keys(node)) {
        const v = node[key];
        if (isConvertible(v) && known.has(v)) {
            node[key] = new mongoose.Types.ObjectId(v);
            n += 1;
        } else if (v && typeof v === 'object') {
            n += convertKnownIds(v, known, seen);
        }
    }
    return n;
};

const loadModels = async () => {
    const dir = path.resolve('src/models');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
    for (const f of files) {
        await import(pathToFileURL(path.join(dir, f)).href);
    }
    return mongoose.models;
};

const run = async () => {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set. Copy server/.env.example to server/.env first.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const models = await loadModels();

    console.log(`database : ${db.databaseName}`);
    console.log(`mode     : ${APPLY ? 'APPLY - the database will be changed' : 'dry run - nothing will be written'}`);
    console.log('');

    /*
     * Pass one: which ids are strings today? Collected before anything is
     * written, so references can be matched against the whole set.
     */
    const known = new Set();
    const present = (await db.listCollections().toArray()).map((c) => c.name);
    for (const name of present) {
        const ids = await db.collection(name)
            .find({ _id: { $type: 'string' } }, { projection: { _id: 1 } })
            .toArray();
        ids.forEach((d) => { if (isConvertible(d._id)) known.add(d._id); });
    }
    console.log(`${known.size} documents have a string _id`);
    console.log('');

    const failures = [];
    let totalIds = 0;
    let totalRefs = 0;
    let totalDocs = 0;

    for (const model of Object.values(models)) {
        const coll = model.collection.name;
        if (!present.includes(coll)) continue;

        const paths = objectIdPaths(model.schema);
        const docs = await db.collection(coll).find({}).toArray();

        const rewrites = [];   // _id changes: insert the new, remove the old
        const updates = [];    // _id unchanged, reference fields changed
        let refCount = 0;

        for (const doc of docs) {
            const before = JSON.stringify(doc);
            const oldId = doc._id;
            const idChanged = isConvertible(oldId);
            if (idChanged) doc._id = new mongoose.Types.ObjectId(oldId);

            let refs = 0;
            for (const segs of paths) {
                if (segs.length === 1 && segs[0] === '_id') continue;
                refs += convertAt(doc, segs);
            }
            refs += convertKnownIds(doc, known);
            refCount += refs;

            if (idChanged) rewrites.push({ oldId, doc });
            else if (refs > 0 && JSON.stringify(doc) !== before) updates.push(doc);
        }

        if (rewrites.length === 0 && updates.length === 0) continue;

        console.log(coll);
        console.log(`   _id rewritten : ${rewrites.length}`);
        console.log(`   refs fixed    : ${refCount}`);
        totalIds += rewrites.length;
        totalRefs += refCount;
        totalDocs += rewrites.length + updates.length;

        if (!APPLY) continue;

        /*
         * The old document is removed before the new one is inserted. The
         * obvious safer order - insert first, delete after - cannot be used:
         * these collections carry unique indexes (orders.orderNumber, for
         * one), and for the moment both copies exist the new document
         * duplicates the old one's key and the insert is rejected. Every
         * document is already held in memory here, and backup-db.js has a
         * copy on disk, so removing first costs nothing.
         */
        const applyAll = async (session) => {
            const c = db.collection(coll);
            const opts = session ? { session } : {};
            for (const { oldId, doc } of rewrites) {
                await c.deleteOne({ _id: oldId }, opts);
                await c.insertOne(doc, opts);
            }
            for (const doc of updates) {
                await c.replaceOne({ _id: doc._id }, doc, opts);
            }
        };

        const session = await mongoose.connection.getClient().startSession();
        try {
            await session.withTransaction(() => applyAll(session));
            console.log('   written in a transaction');
        } catch (err) {
            if (/Transaction numbers|replica set|not supported|Illegal state/i.test(err.message)) {
                /*
                 * A standalone mongod has no transactions, which is the
                 * normal case in development. Do the same writes without
                 * one, and keep any failure to this collection so the rest
                 * of the run still happens.
                 */
                try {
                    await applyAll(null);
                    console.log('   written one by one (this server has no transactions)');
                } catch (plainErr) {
                    failures.push(`${coll}: ${plainErr.message}`);
                    console.log(`   FAILED part way through: ${plainErr.message}`);
                }
            } else {
                failures.push(`${coll}: ${err.message}`);
                console.log(`   FAILED, collection left untouched: ${err.message}`);
            }
        } finally {
            await session.endSession();
        }
    }

    console.log('');
    console.log(`${totalIds} ids and ${totalRefs} references across ${totalDocs} documents`
        + (APPLY ? ' converted.' : ' would be converted.'));
    if (!APPLY && totalDocs > 0) console.log('Re-run with --apply to make the changes.');
    if (failures.length > 0) {
        console.log('');
        console.log('Left alone:');
        failures.forEach((f) => console.log('  ' + f));
    }

    await mongoose.disconnect();
};

run().catch((err) => { console.error(err); process.exit(1); });
