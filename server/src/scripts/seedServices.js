import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ServicePackage from '../models/ServicePackage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const services = [
    {
        category: 'decoration',
        name: 'Classic Floral Decor',
        tier: 'basic',
        description: 'Fresh seasonal flower arrangements for the stage and entrance.',
        price: 25000,
        priceType: 'fixed',
        includes: ['Entrance Arch', 'Stage Backdrop', 'Table Centerpieces'],
        status: 'active'
    },
    {
        category: 'photography',
        name: 'Candid & Traditional Duo',
        tier: 'premium',
        description: 'Professional coverage including candid shots and traditional video.',
        price: 45000,
        priceType: 'fixed',
        includes: ['2 Photographers', '1 Videographer', 'Processed Photos', 'Cinematic Teaser'],
        status: 'active'
    },
    {
        category: 'entertainment',
        name: 'Professional DJ & Sound',
        tier: 'basic',
        description: 'High-energy DJ with professional lighting and sound system.',
        price: 15000,
        priceType: 'fixed',
        includes: ['Pioneer DJ Console', '2 Top Speakers', 'Basic LED Lights'],
        status: 'active'
    },
    {
        category: 'special',
        name: 'Sparkling Entrance',
        tier: 'basic',
        description: 'Cold fire pyro effects for the couple/guest entrance.',
        price: 5000,
        priceType: 'fixed',
        includes: ['4 Cold Fire Pyros', 'Professional Operator'],
        status: 'active'
    },
    {
        category: 'transportation',
        name: 'Luxury Guest Pickup',
        tier: 'premium',
        description: 'Premium sedan for VIP guest transportation.',
        price: 3500,
        priceType: 'fixed',
        includes: ['Professional Chauffeur', 'Complimentary Water & Mints'],
        status: 'active'
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        await ServicePackage.deleteMany({});
        console.log('Cleared existing services');

        await ServicePackage.insertMany(services);
        console.log('Seeded 5 service packages');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
