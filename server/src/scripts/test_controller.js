
import mongoose from 'mongoose';
import CateringPackage from '../models/CateringPackage.js';

async function testController() {
    await mongoose.connect('mongodb://localhost:27017/vincent_db');
    // Mimic the controller logic
    const req = { user: null }; // Public view
    const filters = req.user && req.user.role === 'admin' ? {} : { isActive: true };
    const packages = await CateringPackage.find(filters);
    console.log('Result:', JSON.stringify(packages, null, 2));
    process.exit();
}
testController();
