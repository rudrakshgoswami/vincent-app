import 'dotenv/config';
import mongoose from 'mongoose';

import app from '../app.js';

/*
 * Serverless entry point. A function can be frozen and thawed between
 * requests, so the connection is cached on the module and the in-flight
 * promise is cached too -- without that, a burst of cold requests opens a
 * connection each and exhausts the cluster's limit.
 *
 * What this host cannot do, and server.js can: hold Socket.io connections
 * for the live floor plan, run the 30-second lock cleanup, and write
 * uploads to disk. Expired locks still never block a booking, because every
 * availability query filters on lockExpiresAt and VenueSlotLock carries a
 * TTL index that MongoDB enforces itself.
 */
let connection = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return;
    if (!connection) {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not set on this deployment.');
        }
        connection = mongoose.connect(process.env.MONGO_URI, {
            // A frozen function keeps its sockets; failing fast beats a
            // request hanging for the default 30 seconds behind a cluster
            // that is not reachable.
            serverSelectionTimeoutMS: 8000
        }).catch((err) => {
            connection = null;
            throw err;
        });
    }
    await connection;
};

export default async function handler(req, res) {
    try {
        await connectDB();
    } catch (err) {
        console.error('Database connection failed:', err.message);
        return res.status(503).json({
            message: 'The database is not reachable from this deployment.'
        });
    }
    return app(req, res);
}
