import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
    tableNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    capacity: {
        type: Number,
        required: true,
        min: 1
    },
    shape: {
        type: String,
        enum: ['round', 'square', 'rectangle'],
        default: 'square'
    },
    area: {
        type: String,
        enum: ['Indoor', 'Outdoor', 'Garden', 'Rooftop'],
        default: 'Indoor'
    },
    acType: {
        type: String,
        enum: ['AC', 'Non-AC'],
        default: 'AC'
    },
    floor: {
        type: String,
        enum: ['Ground', 'First', 'Second', 'Rooftop'],
        default: 'Ground'
    },
    position: {
        x: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        y: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },
    reservationPrice: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockReason: {
        type: String,
        default: null
    },
    preferences: [{
        type: String,
        enum: ['Window', 'Private', 'Garden View', 'Near Kitchen', 'Corner', 'Center']
    }],
    canMerge: {
        type: Boolean,
        default: false
    },
    mergedWith: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table'
    }],
    description: String,
    amenities: [{
        type: String,
        enum: ['TV', 'Charging Port', 'Baby Chair', 'Wheelchair Accessible', 'Romantic Setup']
    }]
}, {
    timestamps: true
});

// Index for quick lookups
tableSchema.index({ tableNumber: 1 });
tableSchema.index({ isActive: 1, isBlocked: 1 });
tableSchema.index({ area: 1, floor: 1 });

// Virtual for availability check
tableSchema.virtual('isAvailable').get(function () {
    return this.isActive && !this.isBlocked;
});

// Method to check if table can accommodate guests
tableSchema.methods.canAccommodate = function (guestCount) {
    return this.capacity >= guestCount;
};

const Table = mongoose.model('Table', tableSchema);
export default Table;
