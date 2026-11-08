/**
 * ============================================================
 *  IMPORT SCRIPT — Your FRIEND runs this on their machine
 *  Restores all MongoDB collections from the db_export/ folder
 *
 *  Usage (from the server/ directory):
 *    node src/scripts/import_db.js
 *
 *  Requirements:
 *    • MongoDB must be running  (mongod)
 *    • The  db_export/  folder must be in the project root
 * ============================================================
 */

import mongoose from 'mongoose';
import { EJSON } from 'bson';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HEX24 = /^[0-9a-fA-F]{24}$/;

/*
 * Turns the ids in an older plain-JSON export back into ObjectIds.
 *
 * The dumps in db_export/ were written with JSON.stringify, which has no
 * way to represent an ObjectId and so wrote every id as a bare string.
 * Importing them as-is gives documents whose _id is a string; Mongoose
 * casts query values to ObjectId, the two never match, and the records
 * become invisible to findById, $in and populate. That is what broke
 * table booking outright and left venue bookings showing "Unknown Venue".
 *
 * Only paths the schema actually declares as an ObjectId are converted,
 * so a genuine 24-character string stored in a text field is left alone.
 * Files written by the current export_db.js arrive already typed and
 * pass through untouched.
 */
const toObjectId = (v) => (typeof v === 'string' && HEX24.test(v)
    ? new mongoose.Types.ObjectId(v)
    : v);

const restoreIds = (value, schema, prefix = '') => {
    if (Array.isArray(value)) return value.map(v => restoreIds(v, schema, prefix));
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    if (value._bsontype) return value;

    const out = {};
    for (const [key, v] of Object.entries(value)) {
        // schema.path() takes the full dotted path, so the prefix has to be
        // carried down through nested objects or nothing below the top
        // level would ever be recognised as a ref.
        const full = prefix ? `${prefix}.${key}` : key;
        const type = schema && schema.path(full);
        const isObjectIdPath = type && (
            type.instance === 'ObjectId'
            || (type.caster && type.caster.instance === 'ObjectId')
        );

        if (key === '_id' || isObjectIdPath) {
            out[key] = Array.isArray(v) ? v.map(toObjectId) : toObjectId(v);
        } else if (type && type.schema) {
            // A subdocument or array of subdocuments: its own schema takes
            // over, so the path starts again from nothing.
            out[key] = restoreIds(v, type.schema, '');
        } else {
            out[key] = restoreIds(v, schema, full);
        }
    }
    return out;
};

// --- Models ---
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import VenueBooking from '../models/VenueBooking.js';
import MenuItem from '../models/MenuItem.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import TableReservation from '../models/TableReservation.js';
import Review from '../models/Review.js';
import ServicePackage from '../models/ServicePackage.js';
import CateringPackage from '../models/CateringPackage.js';
import FoodCategory from '../models/FoodCategory.js';
import FoodItem from '../models/FoodItem.js';
import LiveCounter from '../models/LiveCounter.js';
import CateringAddOn from '../models/CateringAddOn.js';
import BookingCatering from '../models/BookingCatering.js';
import ContactMessage from '../models/ContactMessage.js';
import Settings from '../models/Settings.js';

// -------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = 'mongodb://localhost:27017/vincent_db';
const EXPORT_DIR = path.join(__dirname, '..', '..', '..', 'db_export');

// Map file name → Mongoose model
const COLLECTIONS = {
    users: User,
    venues: Venue,
    venueBookings: VenueBooking,
    menuItems: MenuItem,
    categories: Category,
    orders: Order,
    tables: Table,
    tableReservations: TableReservation,
    reviews: Review,
    servicePackages: ServicePackage,
    cateringPackages: CateringPackage,
    foodCategories: FoodCategory,
    foodItems: FoodItem,
    liveCounters: LiveCounter,
    cateringAddOns: CateringAddOn,
    bookingCaterings: BookingCatering,
    contactMessages: ContactMessage,
    settings: Settings,
};

async function importDB() {
    try {
        // Safety check
        if (!fs.existsSync(EXPORT_DIR)) {
            console.error(`❌ Export folder not found at: ${EXPORT_DIR}`);
            console.error('   Make sure the  db_export/  folder is in the project root (next to /server and /client).');
            process.exit(1);
        }

        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to: ${MONGO_URI}\n`);

        let totalInserted = 0;

        for (const [name, Model] of Object.entries(COLLECTIONS)) {
            const filePath = path.join(EXPORT_DIR, `${name}.json`);

            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️  Skipped   ${name.padEnd(20)} → file not found (${name}.json)`);
                continue;
            }

            try {
                const raw = fs.readFileSync(filePath, 'utf8');
                /*
                 * EJSON.parse understands both shapes: the Extended JSON
                 * that export_db.js writes now ({"$oid": "..."}), and the
                 * plain JSON it used to write, which it leaves as strings.
                 */
                const parsed = EJSON.parse(raw, { relaxed: false });
                const docs = Array.isArray(parsed) ? parsed.map(d => restoreIds(d, Model.schema)) : parsed;

                if (!Array.isArray(docs) || docs.length === 0) {
                    console.log(`⏩ Empty     ${name.padEnd(20)} → 0 documents, skipped`);
                    continue;
                }

                // Clear existing data, then insert fresh
                await Model.deleteMany({});
                await Model.insertMany(docs, { ordered: false });

                console.log(`✅ Imported  ${name.padEnd(20)} → ${docs.length} documents`);
                totalInserted += docs.length;
            } catch (err) {
                console.warn(`⚠️  Error     ${name.padEnd(20)} → ${err.message}`);
            }
        }

        console.log('\n─────────────────────────────────────────');
        console.log(`✅ Import complete!  Total: ${totalInserted} documents restored`);
        console.log('─────────────────────────────────────────');
        console.log('\n🚀 You can now start the server and all data will be available.\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Import failed:', err);
        process.exit(1);
    }
}

importDB();
