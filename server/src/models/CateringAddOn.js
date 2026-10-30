import mongoose from 'mongoose';

const cateringAddOnSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    pricingType: { type: String, enum: ['per_plate', 'flat'], default: 'per_plate' },
    price: { type: Number, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('CateringAddOn', cateringAddOnSchema);
