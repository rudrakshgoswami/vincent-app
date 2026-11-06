import mongoose from 'mongoose';

const itemSelectionSchema = new mongoose.Schema({
    foodItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
    variants: [{ type: String }]
}, { _id: false });

const categorySelectionSchema = new mongoose.Schema({
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodCategory', required: true },
    selectedItems: [itemSelectionSchema]
}, { _id: false });

const bookingCateringSchema = new mongoose.Schema({
    // Set when the catering hangs off a venue booking. The standalone
    // /catering planner has no venue booking, so it stays empty there.
    bookingId: { type: mongoose.Schema.Types.ObjectId },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'CateringPackage', required: true },
    guestCount: { type: Number, required: true },
    selectedItems: [categorySelectionSchema],
    selectedLiveCounters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LiveCounter' }],
    selectedAddOns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CateringAddOn' }],
    specialRequest: { type: String },
    totalCateringCost: { type: Number, required: true },
    isLocked: { type: Boolean, default: false },
    editDeadline: { type: Date },
    status: { type: String, enum: ['pending', 'confirmed', 'frozen'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model('BookingCatering', bookingCateringSchema);
