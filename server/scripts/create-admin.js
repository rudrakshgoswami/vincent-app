import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Read from the environment. No insecure fallback: this script is in a
        // public repository, and a default like 'admin123' becomes the password
        // on every deployment where nobody changed it.
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env before running this.');
            process.exit(1);
        }

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin already exists');
            process.exit(0);
        }

        const admin = await User.create({
            name: 'Vincent Admin',
            email: adminEmail,
            phone: '1234567890',
            password: adminPassword,
            addresses: [{
                street: 'Admin Street',
                city: 'Tech City',
                state: 'State',
                pincode: '400001'
            }],
            isAdmin: true,
            isVerified: true
        });

        console.log('Admin created successfully!');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
