import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import menuRoutes from './src/routes/menuRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';
import tableRoutes from './src/routes/tableRoutes.js';
import reservationRoutes from './src/routes/reservationRoutes.js';
import contactRoutes from './src/routes/contactRoutes.js';
import venueRoutes from './src/routes/venueRoutes.js';
import venueBookingRoutes from './src/routes/venueBookingRoutes.js';
import cateringRoutes from './src/routes/cateringRoutes.js';
import reviewRoutes from './src/routes/reviewRoutes.js';

/*
 * Everything the API is, minus how it is hosted. server.js wraps this in a
 * long-running HTTP server with sockets and the lock cleanup job;
 * api/index.js hands it to a serverless function. Keeping the two apart is
 * what lets the same routes run either way.
 */
const app = express();

// Middleware
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// FRONTEND_URL takes a comma-separated list, so a Vercel production domain and
// its preview domains can both be allowed.
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(o => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const clean = origin.replace(/\/$/, '');
        if (ALLOWED_ORIGINS.includes(clean)) return callback(null, true);

        // Localhost and the LAN are for developing against a phone on the same
        // network. Left on in production, any page served from a private
        // address could call this API with credentials, so it is dev only.
        if (!IS_PRODUCTION) {
            const isLocalNetwork = clean.startsWith('http://localhost') ||
                                  clean.startsWith('http://127.0.0.1') ||
                                  clean.startsWith('http://192.168.') ||
                                  clean.startsWith('http://10.');
            if (isLocalNetwork) return callback(null, true);
        }

        console.log('CORS Blocked Origin:', origin);
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser()); // Parse cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// readyState 0 means the connection was never made or has failed, as
// opposed to 2, still connecting, where Mongoose buffers the query and the
// request completes normally a moment later.
app.use('/api', (req, res, next) => {
    if (mongoose.connection.readyState === 0) {
        return res.status(503).json({
            message: 'The database is not reachable from this deployment.'
        });
    }
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tables', tableRoutes);  // Table routes (Public: /, /layout)
app.use('/api/table-reservations', reservationRoutes);  // Reservation routes (Public-ish)
app.use('/api/contact', contactRoutes); // Contact routes
app.use('/api/venues', venueRoutes);    // Venue routes
app.use('/api/venue-bookings', venueBookingRoutes);  // Venue booking routes
app.use('/api/catering', cateringRoutes); // Catering Routes
app.use('/api/reviews', reviewRoutes);   // Review routes

app.use('/api', menuRoutes);
app.use('/api', paymentRoutes);
app.use('/api', adminRoutes);  // ⚠️ MUST be before userRoutes - admin routes like /orders/admin/all must not be caught by /orders/:id in userRoutes
app.use('/api', userRoutes);  // Protected (uses protect at top)

const __dirname = path.resolve();
const uploadsDir = path.join(__dirname, '/uploads');
try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
} catch (err) {
    // A serverless filesystem is read-only, so this always fails there. The
    // directory committed to the repo still serves; only new uploads cannot
    // be written, which is what uploadRoutes reports at the time.
    console.warn('uploads directory is not writable:', err.message);
}
app.use('/uploads', express.static(uploadsDir));

app.get('/', (req, res) => {
    res.send('API Running');
});

export default app;
