/*
 * Seeds the restaurant menu: 8 categories and 110 dishes.
 *
 * The data lives in menu-data.json, built from TheMealDB, which returns a
 * dish name and the photograph of that dish together. Every image URL in
 * that file was verified to return a real image before it was written, which
 * matters here: 14 of the 31 stock photo URLs the older seed scripts use are
 * dead, so those items render as broken images.
 *
 * Run from the server directory:
 *     node scripts/seed-menu-demo.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import Category from '../src/models/Category.js';
import MenuItem from '../src/models/MenuItem.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const DATA = JSON.parse(
    readFileSync(new URL('./menu-data.json', import.meta.url), 'utf-8')
);

const seedMenu = async () => {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set. Copy server/.env.example to server/.env first.');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        await MenuItem.deleteMany({});
        await Category.deleteMany({});
        console.log('Cleared existing menu');

        let dishes = 0;

        for (const cat of DATA.categories) {
            const category = await Category.create({
                name: cat.name,
                description: cat.description,
                isActive: true,
            });

            const items = cat.items.map((item) => ({
                name: item.name,
                description: item.description,
                price: item.price,
                image: item.image,
                category: category._id,
                isAvailable: item.isAvailable,
                isVeg: item.isVeg,
            }));

            await MenuItem.insertMany(items);
            dishes += items.length;
            console.log(`  ${cat.name.padEnd(24)} ${String(items.length).padStart(3)} dishes`);
        }

        console.log(`\nSeeded ${DATA.categories.length} categories and ${dishes} dishes.`);
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err.message);
        process.exit(1);
    }
};

seedMenu();
