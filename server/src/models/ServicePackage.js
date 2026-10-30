import mongoose from 'mongoose';

const servicePackageSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['decoration', 'photography', 'entertainment', 'transportation', 'special'],
        required: true
    },
    name: { type: String, required: true, trim: true },
    tier: { type: String, enum: ['basic', 'premium', 'luxury', 'custom'], default: 'basic' },
    description: String,

    // Pricing
    price: { type: Number, required: true },
    priceType: { type: String, enum: ['fixed', 'per_unit', 'quote'], default: 'fixed' },
    priceUnit: String, // 'per box', 'per person'
    minQuantity: { type: Number, default: 1 },
    maxQuantity: { type: Number, default: 999 },

    // Details
    includes: [String],
    highlights: [String],
    gallery: [String], // Image URLs

    // Team info
    teamSize: Number,
    setupTime: String,
    duration: String,
    equipment: [String],

    // Vendor
    vendor: {
        name: String,
        contact: String,
        commission: Number
    },

    gstRate: { type: Number, default: 18 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    displayOrder: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 }
}, {
    timestamps: true
});

const ServicePackage = mongoose.model('ServicePackage', servicePackageSchema);
export default ServicePackage;
