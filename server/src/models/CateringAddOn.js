import mongoose from 'mongoose';

const cateringAddOnSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String },

    // What kind of add-on this is. The booking UI groups by it, and the
    // beverage picker exists only because 'beverage_package' is tellable
    // apart from a live counter or a staff role.
    category: {
        type: String,
        enum: ['extra_item', 'live_station', 'beverage_package', 'dietary',
               'service_style', 'staff', 'equipment', 'kids_menu'],
        default: 'extra_item',
        index: true
    },
    subcategory: { type: String },

    // What the guest actually gets: the drinks in a beverage package, the
    // dishes at a live counter.
    items: [{ type: String }],

    pricingType: { type: String, enum: ['per_plate', 'flat'], default: 'per_plate' },
    price: { type: Number, required: true },

    // 'flat' add-ons that are bought by the unit, like one more server or one
    // more table's linen, rather than once for the whole event.
    requiresQuantity: { type: Boolean, default: false },
    minOrder: { type: Number },

    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('CateringAddOn', cateringAddOnSchema);
