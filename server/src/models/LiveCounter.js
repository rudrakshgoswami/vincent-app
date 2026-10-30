import mongoose from 'mongoose';

const counterVarietySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String }
});

const liveCounterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    packageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CateringPackage' }],
    isAddOn: { type: Boolean, default: false },
    addOnPricePerPlate: { type: Number, default: 0 },
    varieties: [counterVarietySchema]
}, { timestamps: true });

export default mongoose.model('LiveCounter', liveCounterSchema);
