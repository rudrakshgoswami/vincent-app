import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodCategory', required: true },
    packageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CateringPackage' }],
    foodType: { type: String, enum: ['Veg', 'Non-Veg', 'Vegan'], default: 'Veg' },
    isAvailable: { type: Boolean, default: true },
    isJain: { type: Boolean, default: false },
    hasVariants: { type: Boolean, default: false },
    variants: [{
        name: { type: String, required: true },
        image: { type: String }
    }],
    variantPackageLimits: [{
        packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'CateringPackage' },
        limit: { type: Number, default: 1 }
    }]
}, { timestamps: true });

export default mongoose.model('FoodItem', foodItemSchema);
