import mongoose from 'mongoose';

const tableReservationSchema = new mongoose.Schema({
    reservationNumber: {
        type: String,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    table: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table'
    },
    tables: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table'
    }],
    totalCapacity: {
        type: Number,
        default: 0
    },
    isCombined: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        start: {
            type: String,
            required: true
        },
        end: {
            type: String,
            required: true
        }
    },
    guestCount: {
        type: Number,
        required: true,
        min: 1
    },
    occasion: {
        type: String,
        enum: ['Casual Dining', 'Birthday Celebration', 'Anniversary', 'Romantic Date', 'Business Meeting', 'Social Gathering', 'Other'],
        default: 'Casual Dining'
    },
    specialRequests: {
        type: String,
        default: ''
    },
    preferences: {
        area: String,
        acType: String,
        seating: String
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'failed'],
        default: 'pending'
    },
    advanceAmount: {
        type: Number,
        required: true,
        min: 0
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    arrivalTime: Date,
    graceTimeExpired: {
        type: Boolean,
        default: false
    },
    noShowMarkedAt: Date,
    cancellationReason: String,
    cancelledBy: {
        type: String,
        enum: ['user', 'admin', 'system']
    },
    cancelledAt: Date,
    refundAmount: {
        type: Number,
        default: 0
    },
    refundStatus: {
        type: String,
        enum: ['none', 'pending', 'processing', 'completed', 'failed'],
        default: 'none'
    },
    adminNotes: String,
    reminderSent: {
        type: Boolean,
        default: false
    },
    lockExpiresAt: Date
}, {
    timestamps: true
});

// Note: Unique index on 'table' (single) might not be enough for combined tables.
// We'll rely on server-side logic to prevent overlaps for all tables in the array.
tableReservationSchema.index({
    tables: 1,
    date: 1,
    'timeSlot.start': 1
}, {
    partialFilterExpression: {
        status: { $in: ['pending', 'confirmed'] }
    }
});

// Indexes for queries
tableReservationSchema.index({ user: 1, createdAt: -1 });
tableReservationSchema.index({ date: 1, 'timeSlot.start': 1 });
tableReservationSchema.index({ status: 1 });
tableReservationSchema.index({ reservationNumber: 1 });

// Generate unique reservation number
tableReservationSchema.pre('save', async function (next) {
    if (!this.reservationNumber) {
        const count = await mongoose.model('TableReservation').countDocuments();
        this.reservationNumber = `RES${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Check if grace period has expired
tableReservationSchema.methods.isGracePeriodExpired = function () {
    if (this.status !== 'confirmed') return false;

    const [hours, minutes] = this.timeSlot.start.split(':');
    const slotStart = new Date(this.date);
    slotStart.setHours(parseInt(hours), parseInt(minutes), 0);

    // Grace period: 15 minutes
    const graceTime = new Date(slotStart.getTime() + 15 * 60 * 1000);

    return new Date() > graceTime && !this.arrivalTime;
};

// Calculate refund amount based on cancellation time
tableReservationSchema.methods.calculateRefund = function () {
    if (this.status !== 'confirmed' || this.paymentStatus !== 'paid') {
        return 0;
    }

    const now = new Date();
    const reservationTime = new Date(this.date);
    const [hours, minutes] = this.timeSlot.start.split(':');
    reservationTime.setHours(parseInt(hours), parseInt(minutes), 0);

    const hoursUntilReservation = (reservationTime - now) / (1000 * 60 * 60);

    if (hoursUntilReservation > 24) {
        return this.advanceAmount; // 100% refund
    } else if (hoursUntilReservation > 12) {
        return this.advanceAmount * 0.5; // 50% refund
    } else {
        return 0; // No refund
    }
};

const TableReservation = mongoose.model('TableReservation', tableReservationSchema);
export default TableReservation;
