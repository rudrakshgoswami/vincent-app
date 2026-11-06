import mongoose from 'mongoose';

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set; the API cannot reach a database.');
        return;
    }
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // Nothing is gained by waiting the default 30 seconds for a
            // cluster that is not answering; the guard in app.js turns a
            // failed connection into a readable 503 straight away.
            serverSelectionTimeoutMS: 8000
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB connection failed: ${error.message}`);
        // Exiting is right for a local process that should fail loudly, and
        // wrong for a deployed function, where it takes down the whole
        // deployment instead of answering the request that arrived.
        if (process.env.NODE_ENV !== 'production') process.exit(1);
    }
};

export default connectDB;
