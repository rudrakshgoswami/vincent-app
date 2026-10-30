
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url) });
import connectDB from '../src/config/db.js';
import CateringPackage from '../src/models/CateringPackage.js';
import FoodCategory from '../src/models/FoodCategory.js';
import mongoose from 'mongoose';

const seedCategories = async () => {
    try {
        await connectDB();
        
        const packages = await CateringPackage.find();
        if (packages.length === 0) {
            console.log("No packages found. Please create packages first.");
            process.exit();
        }

        console.log("Found packages:", packages.map(p => ({ name: p.name, id: p._id })));

        const categories = [
            { name: 'Welcome Drinks', mandatory: true, limits: { default: 2, 'Royal': 3, 'Premium': 2, 'Standard': 1 } },
            { name: 'Street Food (Chaat)', mandatory: false, limits: { default: 3, 'Royal': 5, 'Premium': 4, 'Standard': 2 } },
            { name: 'Starters (Veg)', mandatory: true, limits: { default: 4, 'Royal': 6, 'Premium': 4, 'Standard': 3 } },
            { name: 'Starters (Non-Veg)', mandatory: false, limits: { default: 2, 'Royal': 4, 'Premium': 3, 'Standard': 0 } },
            { name: 'Main Course (Veg)', mandatory: true, limits: { default: 3, 'Royal': 5, 'Premium': 4, 'Standard': 2 } },
            { name: 'Main Course (Non-Veg)', mandatory: false, limits: { default: 2, 'Royal': 3, 'Premium': 2, 'Standard': 0 } },
            { name: 'Dal / Kadhi', mandatory: true, limits: { default: 1, 'Royal': 2, 'Premium': 1, 'Standard': 1 } },
            { name: 'Rice / Pulao', mandatory: true, limits: { default: 1, 'Royal': 2, 'Premium': 1, 'Standard': 1 } },
            { name: 'Assorted Breads', mandatory: true, limits: { default: 3, 'Royal': 5, 'Premium': 4, 'Standard': 3 } },
            { name: 'Salads & Raita', mandatory: true, limits: { default: 2, 'Royal': 4, 'Premium': 3, 'Standard': 2 } },
            { name: 'Desserts / Sweets', mandatory: true, limits: { default: 2, 'Royal': 4, 'Premium': 3, 'Standard': 1 } },
            { name: 'Ice Cream / Kulfi', mandatory: false, limits: { default: 1, 'Royal': 2, 'Premium': 1, 'Standard': 0 } },
            { name: 'Mukhwas & Paan', mandatory: true, limits: { default: 1, 'Royal': 1, 'Premium': 1, 'Standard': 1 } }
        ];

        for (const catData of categories) {
            const packageLimits = packages.map(pkg => {
                let limit = catData.limits.default;
                if (pkg.name.includes('Royal')) limit = catData.limits['Royal'];
                else if (pkg.name.includes('Premium')) limit = catData.limits['Premium'];
                else if (pkg.name.includes('Standard')) limit = catData.limits['Standard'];
                
                return {
                    packageId: pkg._id,
                    limit: limit
                };
            }).filter(l => l.limit > 0);

            const packageIds = packageLimits.map(l => l.packageId);

            if (packageIds.length === 0) continue;

            const existing = await FoodCategory.findOne({ name: catData.name });
            if (existing) {
                existing.packageLimits = packageLimits;
                existing.packageIds = packageIds;
                existing.selectionLimit = catData.limits.default;
                existing.isMandatory = catData.mandatory;
                await existing.save();
                console.log(`Updated category: ${catData.name}`);
            } else {
                const newCat = new FoodCategory({
                    name: catData.name,
                    selectionLimit: catData.limits.default,
                    packageLimits: packageLimits,
                    packageIds: packageIds,
                    isMandatory: catData.mandatory,
                    sortOrder: categories.indexOf(catData)
                });
                await newCat.save();
                console.log(`Created category: ${catData.name}`);
            }
        }

        console.log("Seeding completed successfully.");
        process.exit();
    } catch (error) {
        console.error("Error seeding categories:", error);
        process.exit(1);
    }
};

seedCategories();
