import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Table from '../models/Table.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure we load .env from server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedTables = async () => {
    try {
        console.log('Seeding Tables...');
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env');
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Check if tables exist, if so, only add if asked or just upsert.
        // User asked to "add tables". I'll drop and recreate to ensure clean layout for demo.
        await Table.deleteMany({});
        console.log('Cleared existing tables');

        const tables = [
            {
                tableNumber: 'T1',
                capacity: 2,
                shape: 'round',
                position: { x: 15, y: 20 },
                reservationPrice: 50,
                area: 'Indoor',
                floor: 'Ground',
                type: 'AC'
            },
            {
                tableNumber: 'T2',
                capacity: 4,
                shape: 'square',
                position: { x: 45, y: 20 },
                reservationPrice: 100,
                area: 'Indoor',
                floor: 'Ground',
                type: 'AC'
            },
            {
                tableNumber: 'T3',
                capacity: 6,
                shape: 'rectangle',
                position: { x: 75, y: 20 },
                reservationPrice: 150,
                area: 'Indoor',
                floor: 'Ground',
                type: 'AC'
            },
            {
                tableNumber: 'T4',
                capacity: 4,
                shape: 'square',
                position: { x: 30, y: 60 },
                reservationPrice: 100,
                area: 'Indoor',
                floor: 'Ground',
                type: 'AC'
            },
            {
                tableNumber: 'T5',
                capacity: 8,
                shape: 'rectangle',
                position: { x: 65, y: 60 },
                reservationPrice: 200,
                area: 'Indoor',
                floor: 'Ground',
                type: 'AC'
            }
        ];

        await Table.insertMany(tables);
        console.log('Added 5 tables successfully');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding tables:', error);
        process.exit(1);
    }
};

seedTables();
