/*
 * Creates the two accounts the walkthrough asks you to sign in with:
 * one admin and one ordinary customer.
 *
 * Both are created already verified, so you can sign in without going
 * through the phone OTP step. Existing accounts are left alone except for
 * these two, which are reset to a known password each time this runs, so it
 * is safe to re-run when you have forgotten what you set.
 *
 * Run from the server directory:
 *     node scripts/create-demo-users.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const PASSWORD = 'Password123!';

const ACCOUNTS = [
    {
        name: 'Demo Admin',
        email: 'admin@example.com',
        phone: '9000000100',
        isAdmin: true,
    },
    {
        name: 'Demo Customer',
        email: 'customer@example.com',
        phone: '9000000101',
        isAdmin: false,
    },
];

const run = async () => {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set. Copy server/.env.example to server/.env first.');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        for (const spec of ACCOUNTS) {
            let user = await User.findOne({ email: spec.email });

            if (user) {
                user.name = spec.name;
                user.phone = spec.phone;
                user.isAdmin = spec.isAdmin;
                user.isVerified = true;
                user.isActive = true;
                user.password = PASSWORD;   // the pre-save hook hashes it
                await user.save();
                console.log(`  reset   ${spec.isAdmin ? 'admin' : 'user '}  ${spec.email}`);
            } else {
                await User.create({
                    ...spec,
                    password: PASSWORD,
                    isVerified: true,
                    isActive: true,
                });
                console.log(`  created ${spec.isAdmin ? 'admin' : 'user '}  ${spec.email}`);
            }
        }

        console.log(`\n  Password for both: ${PASSWORD}`);
        console.log('  Admin signs in at /admin/login, the customer at /login.');
        process.exit(0);
    } catch (err) {
        console.error('Failed:', err.message);
        process.exit(1);
    }
};

run();
