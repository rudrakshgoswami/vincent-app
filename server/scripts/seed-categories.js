import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../src/models/Category.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const categories = [
    "Mocktails",
    "Milkshakes",
    "Soups",
    "Salads",
    "Indian Starters",
    "Chinese Starters",
    "Chinese Main Course",
    "Rice & Noodles",
    "Pasta",
    "Sizzlers",
    "Indian Main Course",
    "Breads",
    "Rice",
    "Pizza",
    "Snacks",
    "Desserts"
];

const seedCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        for (const catName of categories) {
            // Check if it already exists to avoid duplication errors
            const existing = await Category.findOne({ name: catName });
            if (!existing) {
                await Category.create({ name: catName, description: `${catName} menu items` });
                console.log(`Created category: ${catName}`);
            } else {
                console.log(`Category already exists: ${catName}`);
            }
        }

        console.log('Finished seeding categories!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedCategories();
