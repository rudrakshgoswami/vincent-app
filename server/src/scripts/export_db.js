/**
 * ============================================================
 *  EXPORT SCRIPT — Run this on YOUR machine
 *  Exports ALL MongoDB collections to JSON files in /db_export/
 *
 *  Usage:
 *    node src/scripts/export_db.js
 *
 *  Output folder:
 *    server/db_export/   ← include this folder in your ZIP
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

// Map collection name → Mongoose model
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

async function exportDB() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to: ${MONGO_URI}\n`);

        // Create export directory
        if (!fs.existsSync(EXPORT_DIR)) {
            fs.mkdirSync(EXPORT_DIR, { recursive: true });
        }

        let totalDocs = 0;

        for (const [name, Model] of Object.entries(COLLECTIONS)) {
            try {
                const docs = await Model.find({}).lean();
                const filePath = path.join(EXPORT_DIR, `${name}.json`);
                fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
                console.log(`📦 Exported  ${name.padEnd(20)} → ${docs.length} documents`);
                totalDocs += docs.length;
            } catch (err) {
                console.warn(`⚠️  Skipped   ${name.padEnd(20)} → ${err.message}`);
            }
        }

        console.log('\n─────────────────────────────────────────');
        console.log(`✅ Export complete!  Total: ${totalDocs} documents`);
        console.log(`📁 Files saved in:   ${EXPORT_DIR}`);
        console.log('─────────────────────────────────────────');
        console.log('\n📌 Add the  db_export/  folder to your ZIP file');
        console.log('   Your friend should run  import_db.js  to restore the data.\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Export failed:', err);
        process.exit(1);
    }
}

exportDB();
