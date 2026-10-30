import mongoose from 'mongoose';

const cateringPackageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String },
    pricePerPlate: { type: Number, required: true },
    minGuests: { type: Number, default: 50 },
    maxGuests: { type: Number, default: 1000 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('CateringPackage', cateringPackageSchema);
