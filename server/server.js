import 'dotenv/config';
import http from 'http';

import app from './app.js';
import connectDB from './src/config/db.js';
import { initSocket } from './src/utils/socket.js';
import { startReservationLockCleanup } from './src/utils/lockCleanup.js';

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
initSocket(server);

// Start Table Lock Cleanup Service
startReservationLockCleanup();

// Connect DB
connectDB();

// Start server with error handling
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
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
