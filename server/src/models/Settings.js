import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    // Restaurant Info (Dynamic Contact Us)
    name: { type: String, default: "Vincent's Kitchen" },
    address: { type: String, default: '123 Gourmet Street, Foodie City' },
    landmark: { type: String, default: '' },
    phone: { type: String, default: '+91 98765 43210' },
    email: { type: String, default: 'hello@vincentskitchen.com' },
    weekdayHours: { type: String, default: '11:00 AM - 11:00 PM' },
    weekendHours: { type: String, default: '10:00 AM - 12:00 AM' },
    googleMapLink: { type: String, default: '' },
    socialLinks: {
        instagram: { type: String, default: '' },
        facebook: { type: String, default: '' },
        whatsapp: { type: String, default: '' }
    },

    // Operational Settings
    isOrderingEnabled: {
        type: Boolean,
        default: true
    },
    isDeliveryEnabled: {
        type: Boolean,
        default: true
    },
    isDineInEnabled: {
        type: Boolean,
        default: true
    },
    defaultPrepTime: {
        type: Number,
        default: 30 // in minutes
    },
    taxPercentage: {
        type: Number,
        default: 5
    },
    deliveryCharge: {
        type: Number,
        default: 40
    },
    allowTableMerging: {
        type: Boolean,
        default: true
    },
    maxTablesPerMerge: {
        type: Number,
        default: 3
    }
}, {
    timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
