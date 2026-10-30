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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
                const docs = JSON.parse(raw);

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
