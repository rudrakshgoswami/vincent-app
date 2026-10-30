import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './src/config/db.js';
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


import path from 'path';
import fs from 'fs';

import http from 'http';
import { initSocket } from './src/utils/socket.js';
import { startReservationLockCleanup } from './src/utils/lockCleanup.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
initSocket(server);

// Start Table Lock Cleanup Service
startReservationLockCleanup();

// Connect DB
connectDB();

// Middleware
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const isLocalNetwork = origin.startsWith('http://localhost') || 
                              origin.startsWith('http://127.0.0.1') || 
                              origin.startsWith('http://192.168.') ||
                              origin.startsWith('http://10.'); // Allow any 10.X.X.X IP
        
        if (isLocalNetwork || (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)) {
            return callback(null, true);
        } else {
            console.log('CORS Blocked Origin:', origin);
            return callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser()); // Parse cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
if (!fs.existsSync(path.join(__dirname, '/uploads'))) {
    fs.mkdirSync(path.join(__dirname, '/uploads'));
}
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

app.get('/', (req, res) => {
    res.send('API Running');
});

// Start server with error handling
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 MongoDB Connected`);
    console.log(`🔗 API available on network at http://0.0.0.0:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
        console.error(`\n💡 Solutions:`);
        console.error(`   1. Stop the process using port ${PORT}:`);
        console.error(`      Windows: taskkill /F /IM node.exe`);
        console.error(`      Linux/Mac: lsof -ti:${PORT} | xargs kill -9`);
        console.error(`   2. Or change the PORT in your .env file\n`);
        process.exit(1);
    } else {
        console.error(`\n❌ Server error:`, err);
        process.exit(1);
    }
});
