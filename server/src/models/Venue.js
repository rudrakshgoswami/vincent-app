import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    type: {
        type: String,
        enum: ['banquet_hall', 'lawn_garden', 'rooftop', 'conference_hall', 'poolside', 'farmhouse', 'hotel_ballroom'],
        required: true
    },
    setting: { type: String, enum: ['indoor', 'outdoor', 'both'], default: 'both' },
    description: { type: String, required: true },
    shortDescription: { type: String, maxlength: 200 },

    // Capacity
    capacity: {
        min: { type: Number, required: true },
        max: { type: Number, required: true }
    },
    area: { type: Number }, // sq ft
    dimensions: {
        length: Number,
        width: Number,
        height: Number
    },

    // Location
    location: {
        address: { type: String, required: true },
        area: { type: String, required: true },
        city: { type: String, required: true, default: 'Mumbai' },
        state: { type: String, default: 'Maharashtra' },
        pincode: { type: String },
        coordinates: {
            lat: Number,
            lng: Number
        },
        landmarks: [{ name: String, distance: String, icon: String }],
        distanceFromKeyLocations: {
            airport: String,
            railwayStation: String,
            metroStation: String
        },
        googleMapsUrl: String
    },

    // Contact
    contact: {
        phone: String,
        alternatePhone: String,
        email: String,
        website: String,
        officeHours: { type: String, default: '09:00 AM - 08:00 PM' }
    },

    // Pricing
    pricing: {
        weekday: {
            morning: { type: Number, default: 0 },
            afternoon: { type: Number, default: 0 },
            evening: { type: Number, default: 0 },
            fullDay: { type: Number, default: 0 }
        },
        weekend: {
            morning: { type: Number, default: 0 },
            afternoon: { type: Number, default: 0 },
            evening: { type: Number, default: 0 },
            fullDay: { type: Number, default: 0 }
        },
        holiday: {
            morning: { type: Number, default: 0 },
            afternoon: { type: Number, default: 0 },
            evening: { type: Number, default: 0 },
            fullDay: { type: Number, default: 0 }
        },
        securityDeposit: { type: Number, default: 10000 },
        cleaningFee: { type: Number, default: 2000 },
        extraHourCharge: { type: Number, default: 5000 },
        gstRate: { type: Number, default: 18 },
        gstIncluded: { type: Boolean, default: false }
    },

    // Amenities
    amenities: [{
        name: String,
        category: { type: String, enum: ['parking', 'climate', 'av', 'stage', 'lighting', 'catering', 'restrooms', 'furniture', 'connectivity', 'security', 'outdoor', 'other'] },
        icon: String,
        details: String,
        quantity: Number,
        available: { type: Boolean, default: true }
    }],

    // Gallery
    media: [{
        type: { type: String, enum: ['image', 'video', '360'], default: 'image' },
        url: { type: String, required: true },
        thumbnailUrl: String,
        category: { type: String, enum: ['exterior', 'interior', 'events', 'amenities', 'food', 'decoration', 'night', 'other'], default: 'interior' },
        caption: String,
        isCover: { type: Boolean, default: false },
        order: { type: Number, default: 0 }
    }],

    // Seating configurations
    seatingCapacity: {
        theater: Number,
        banquet: Number,
        cocktail: Number,
        classroom: Number,
        ushape: Number
    },

    // Reviews
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    reviews: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        rating: Number,
        categories: {
            cleanliness: Number,
            staffService: Number,
            amenities: Number,
            valueForMoney: Number,
            location: Number
        },
        comment: String,
        eventType: String,
        photos: [String],
        helpfulCount: { type: Number, default: 0 },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        adminReply: String,
        createdAt: { type: Date, default: Date.now }
    }],

    // Policies
    policies: {
        minAdvanceBooking: { type: Number, default: 7 }, // days
        maxAdvanceBooking: { type: Number, default: 365 },
        advancePaymentPercent: { type: Number, default: 40 },
        cancellation: [{
            daysBeforeEvent: Number,
            refundPercent: Number
        }],
        rules: [String],
        noSmoking: { type: Boolean, default: true },
        noOutsideAlcohol: { type: Boolean, default: true },
        noiseRestrictionAfter: { type: String, default: '11:00 PM' }
    },

    // Status
    status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
    featured: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    tags: [String],
    priorityScore: { type: Number, default: 5, min: 1, max: 10 },

    // Blocked dates
    blockedDates: [{
        date: Date,
        slots: [String], // 'morning', 'afternoon', 'evening', 'fullDay'
        reason: String,
        visibility: { type: String, enum: ['not_available', 'hidden'], default: 'not_available' }
    }],

    // SEO
    seo: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String]
    },

    // Seasonal pricing
    seasonalPricing: [{
        name: String,
        startDate: Date,
        endDate: Date,
        multiplier: { type: Number, default: 1.2 }
    }],

    // Booking count
    bookingCount: { type: Number, default: 0 },
    
    // Reviews
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
}, {

    timestamps: true
});

// Auto-generate slug from name
venueSchema.pre('save', function (next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    next();
});

// Virtual for starting price
venueSchema.virtual('startingPrice').get(function () {
    const weekday = this.pricing?.weekday;
    if (!weekday) return 0;
    const prices = [weekday.morning, weekday.afternoon, weekday.evening, weekday.fullDay].filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
});

venueSchema.set('toJSON', { virtuals: true });
venueSchema.set('toObject', { virtuals: true });

const Venue = mongoose.model('Venue', venueSchema);
export default Venue;
