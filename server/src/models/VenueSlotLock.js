import mongoose from 'mongoose';

const venueSlotLockSchema = new mongoose.Schema({
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    eventDate: { type: Date, required: true },
    timeSlot: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'fullDay'],
        required: true
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    socketId: String, // Store socket ID to release lock on disconnect if needed
    expiresAt: { type: Date, required: true }
}, {
    timestamps: true
});

// Unique index to prevent double locking of the same slot
// Concurrency safety: MongoDB will throw an error if multiple users try to lock the same slot
venueSlotLockSchema.index({ venue: 1, eventDate: 1, timeSlot: 1 }, { unique: true });

// TTL Index for automatic expiration
venueSlotLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const VenueSlotLock = mongoose.model('VenueSlotLock', venueSlotLockSchema);
export default VenueSlotLock;
