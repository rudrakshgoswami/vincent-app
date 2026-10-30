import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const TableSchema = new mongoose.Schema({
    tableNumber: String,
    capacity: { type: Number, default: 4 },
    shape: { type: String, default: 'square' },
    area: { type: String, default: 'Indoor' },
    isActive: { type: Boolean, default: true },
    position: {
        x: { type: Number, default: 50 },
        y: { type: Number, default: 50 }
    },
    reservationPrice: { type: Number, default: 0 }
});

const Table = mongoose.models.Table || mongoose.model('Table', TableSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Delete all
        await Table.deleteMany({});
        console.log('Deleted all tables');

        // Insert 10 tables carefully
        const tables = [
            { tableNumber: 'T1', area: 'Indoor', position: { x: 15, y: 20 }, capacity: 2, shape: 'round', reservationPrice: 50 },
            { tableNumber: 'T2', area: 'Indoor', position: { x: 45, y: 20 }, capacity: 4, shape: 'square', reservationPrice: 100 },
            { tableNumber: 'T3', area: 'Indoor', position: { x: 75, y: 20 }, capacity: 6, shape: 'rectangle', reservationPrice: 150 },
            { tableNumber: 'T4', area: 'Indoor', position: { x: 15, y: 50 }, capacity: 4, shape: 'square', reservationPrice: 100 },
            { tableNumber: 'T5', area: 'Indoor', position: { x: 45, y: 50 }, capacity: 2, shape: 'round', reservationPrice: 50 },
            { tableNumber: 'T6', area: 'Indoor', position: { x: 75, y: 50 }, capacity: 8, shape: 'rectangle', reservationPrice: 200 },
            { tableNumber: 'T7', area: 'Indoor', position: { x: 30, y: 80 }, capacity: 4, shape: 'square', reservationPrice: 100 },
            { tableNumber: 'T8', area: 'Indoor', position: { x: 60, y: 80 }, capacity: 4, shape: 'square', reservationPrice: 100 },
            { tableNumber: 'T9', area: 'Outdoor', position: { x: 20, y: 30 }, capacity: 4, shape: 'round', reservationPrice: 120 },
            { tableNumber: 'T10', area: 'Rooftop', position: { x: 50, y: 50 }, capacity: 6, shape: 'rectangle', reservationPrice: 180 }
        ];

        await Table.insertMany(tables);
        console.log('Inserted 10 tables');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
