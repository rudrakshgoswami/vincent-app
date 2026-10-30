import mongoose from 'mongoose';

const venueBookingSchema = new mongoose.Schema({
    bookingRef: { type: String, unique: true }, // VEN2024120001
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Venue details
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    venueName: String,
    eventDate: { type: Date, required: true },
    timeSlot: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'fullDay'],
        required: true
    },
    slotLabel: String, // "6PM - 12AM"

    // Event details
    eventType: {
        type: String,
        enum: ['wedding_reception', 'birthday_party', 'anniversary', 'corporate_event', 'conference', 'engagement', 'baby_shower', 'other'],
        default: 'other'
    },
    eventTypeOther: String,
    guestCount: { type: Number, required: true },
    specialRequirements: String,

    // Contact
    contactInfo: {
        fullName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        alternatePhone: String,
        address: String
    },
    specialInstructions: String,

    // Catering
    hasCatering: { type: Boolean, default: false },
    catering: {
        package: { type: mongoose.Schema.Types.ObjectId, ref: 'CateringPackage' },
        packageName: String,
        pricePerPlate: { type: Number, default: 0 },
        guestCount: { type: Number, default: 0 },
        baseTotal: { type: Number, default: 0 },

        // Extra items
        extraItems: [{
            itemId: mongoose.Schema.Types.ObjectId,
            name: String,
            pricePerPlate: Number,
            quantity: Number,
            total: Number
        }],
        extraItemsTotal: { type: Number, default: 0 },

        // Live stations
        liveStations: [{
            stationId: mongoose.Schema.Types.ObjectId,
            name: String,
            pricePerPlate: Number,
            total: Number
        }],
        liveStationsTotal: { type: Number, default: 0 },

        // Beverages
        beveragePackage: {
            name: String,
            pricePerPerson: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },

        // Dietary
        dietaryOptions: [{
            name: String,
            pricePerPlate: Number,
            quantity: Number,
            total: Number
        }],
        dietaryTotal: { type: Number, default: 0 },

        // Service style
        serviceStyle: { type: String, default: 'buffet' },
        serviceStyleExtra: { type: Number, default: 0 },
        foodServiceTime: String,

        // Kids menu
        kidsMenu: {
            enabled: { type: Boolean, default: false },
            count: { type: Number, default: 0 },
            pricePerChild: { type: Number, default: 250 },
            total: { type: Number, default: 0 }
        },

        // Additional staff
        additionalStaff: [{
            role: String,
            quantity: Number,
            pricePerPerson: Number,
            total: Number
        }],
        staffTotal: { type: Number, default: 0 },

        // Equipment
        equipment: [{
            name: String,
            quantity: Number,
            pricePerUnit: Number,
            total: Number
        }],
        equipmentTotal: { type: Number, default: 0 },

        // Food tasting
        foodTasting: {
            requested: { type: Boolean, default: false },
            date: Date,
            fee: { type: Number, default: 2000 },
            status: { type: String, enum: ['pending', 'scheduled', 'completed', 'cancelled'], default: 'pending' }
        },

        // Midnight snacks
        midnightSnacks: {
            enabled: { type: Boolean, default: false },
            pricePerPerson: { type: Number, default: 150 },
            total: { type: Number, default: 0 }
        },

        subtotal: { type: Number, default: 0 },
        gstRate: { type: Number, default: 5 },
        gstAmount: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },

    // Additional services
    additionalServices: [{
        category: { type: String, enum: ['decoration', 'photography', 'entertainment', 'transportation', 'special'] },
        name: String,
        packageTier: String,
        price: Number,
        quantity: { type: Number, default: 1 },
        total: Number,
        details: String
    }],
    servicesSubtotal: { type: Number, default: 0 },
    servicesGstRate: { type: Number, default: 18 },
    servicesGstAmount: { type: Number, default: 0 },
    servicesTotal: { type: Number, default: 0 },

    // Pricing breakdown
    venueBasePrice: { type: Number, required: true },
    venueGstRate: { type: Number, default: 18 },
    venueGstAmount: { type: Number, default: 0 },
    venueTotal: { type: Number, default: 0 },

    securityDeposit: { type: Number, default: 10000 },
    grandTotal: { type: Number, default: 0 },

    // Payment
    advancePercent: { type: Number, default: 40 },
    advanceAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    balanceDueDate: Date,

    paymentStatus: {
        type: String,
        enum: ['ADVANCE_PENDING', 'ADVANCE_PAID', 'BALANCE_PENDING', 'PARTIALLY_PAID', 'FULLY_PAID', 'FAILED', 'REFUNDED', 'BALANCE_OVERDUE'],
        default: 'ADVANCE_PENDING'
    },

    // Detailed Payment History
    paymentHistory: [{
        transactionId: String, // RP payment_id or manual ref
        orderId: String,       // RP order_id
        amount: Number,
        currency: { type: String, default: 'INR' },
        status: { type: String, enum: ['captured', 'failed', 'pending', 'refunded'], default: 'captured' },
        method: String,        // upi, card, netbanking, cash, bank_transfer
        purpose: { type: String, enum: ['advance', 'balance', 'security_deposit', 'additional_charges'], default: 'advance' },
        timestamp: { type: Date, default: Date.now },
        recordedBy: String,    // 'system' or admin name
        notes: String,
        signature: String      // RP signature if online
    }],


    // Razorpay
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paymentMethod: String,

    // Balance payment
    balancePayments: [{
        amount: Number,
        method: String,
        reference: String,
        date: Date,
        recordedBy: String,
        notes: String
    }],

    // Booking status
    status: {
        type: String,
        enum: ['PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'DRAFT', 'COMPLETED', 'AWAITING_ADMIN_APPROVAL'],
        default: 'PAYMENT_PENDING'
    },

    statusHistory: [{
        status: String,
        changedBy: String,
        reason: String,
        timestamp: { type: Date, default: Date.now }
    }],

    // Cancellation
    cancellationReason: String,
    cancelledBy: { type: String, enum: ['admin', 'user', 'system'] },
    cancelledAt: Date,
    refundAmount: { type: Number, default: 0 },
    refundStatus: { type: String, enum: ['none', 'pending', 'processing', 'completed', 'failed'], default: 'none' },

    // Temporary lock
    lockExpiresAt: Date,
    lockExtended: { type: Boolean, default: false },

    // Admin
    adminNotes: [{
        note: String,
        addedBy: String,
        timestamp: { type: Date, default: Date.now }
    }],
    assignedVendors: [{
        service: String,
        vendorName: String,
        contactInfo: String
    }],

    // Review
    review: {
        rating: Number,
        comment: String,
        createdAt: Date
    },

    // Source
    bookingSource: { type: String, enum: ['online', 'phone', 'walkin', 'email', 'partner'], default: 'online' }

}, {
    timestamps: true
});

// Indices for high-performance availability checks and double-booking prevention
venueBookingSchema.index({ venue: 1, eventDate: 1, timeSlot: 1 });
venueBookingSchema.index({ status: 1 });
// Removed TTL index to prevent entire document deletion; status-based cleanup handles expiration instead.


// Auto-generate booking reference
venueBookingSchema.pre('save', async function (next) {
    if (!this.bookingRef) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const count = await mongoose.model('VenueBooking').countDocuments() + 1;
        this.bookingRef = `VEN${year}${month}${String(count).padStart(4, '0')}`;
    }
    next();
});

const VenueBooking = mongoose.model('VenueBooking', venueBookingSchema);
export default VenueBooking;
