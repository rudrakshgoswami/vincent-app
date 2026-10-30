import mongoose from 'mongoose';

const foodCategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    selectionLimit: { type: Number, required: true },
    packageLimits: [{
        packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'CateringPackage' },
        limit: { type: Number, default: 1 }
    }],
    packageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CateringPackage' }],
    isMandatory: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    image: { type: String }
}, { timestamps: true });

export default mongoose.model('FoodCategory', foodCategorySchema);
