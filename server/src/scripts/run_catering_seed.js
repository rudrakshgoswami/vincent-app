
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import CateringPackage from '../models/CateringPackage.js';
import FoodCategory from '../models/FoodCategory.js';
import FoodItem from '../models/FoodItem.js';
import LiveCounter from '../models/LiveCounter.js';
import CateringAddOn from '../models/CateringAddOn.js';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

// Fix for Windows paths
const seedFilePath = path.join('D:', 'vincentapp', 'server', 'src', 'scripts', 'catering_seed_data.json');

async function seedCateringSystem() {
    try {
        const mongoUri = 'mongodb://localhost:27017/vincent_db';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB (vincent_db)...');

        const rawData = fs.readFileSync(seedFilePath, 'utf8');
        const data = JSON.parse(rawData);

        // CLEAR OLD DATA
        await CateringPackage.deleteMany({});
        await FoodCategory.deleteMany({});
        await FoodItem.deleteMany({});
        await LiveCounter.deleteMany({});
        await CateringAddOn.deleteMany({});

        console.log('Seeding Packages...');
        await CateringPackage.insertMany(data.CateringPackages);

        console.log('Seeding Categories...');
        await FoodCategory.insertMany(data.FoodCategories);

        console.log('Seeding Food Items...');
        await FoodItem.insertMany(data.FoodItems);

        console.log('Seeding Live Counters...');
        await LiveCounter.insertMany(data.LiveCounters);

        console.log('Seeding Add-ons...');
        await CateringAddOn.insertMany(data.CateringAddOns);

        console.log('Catering System Seeded Successfully! ✅');
        process.exit();
    } catch (error) {
        console.error('Seed Error:', error);
        process.exit(1);
    }
}

seedCateringSystem();
