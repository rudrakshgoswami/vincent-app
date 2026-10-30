import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        menuItem: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MenuItem',
            required: true
        },
        name: String,
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        subtotal: {
            type: Number
        },
        notes: String
    }],
    subtotal: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    deliveryCharge: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    orderType: {
        type: String,
        enum: ['delivery', 'dine-in'],
        required: true
    },
    deliveryAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        landmark: String
    },
    tableNumber: String,
    notes: String,
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    orderNumber: {
        type: String,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'],
        default: 'pending'
    },
    cancellationReason: {
        type: String,
        default: null
    },
    refundStatus: {
        type: String,
        enum: ['none', 'pending', 'processing', 'completed', 'failed'],
        default: 'none'
    },
    refundAmount: {
        type: Number,
        default: 0
    },
    refundTransactionId: String,
    cancelledBy: {
        type: String,
        enum: ['admin', 'user', 'system'],
        default: null
    },
    cancelledAt: Date,
    razorpayOrderId: {
        type: String,
        required: true
    },
    razorpayPaymentId: String,
    estimatedPrepTime: Number, // in minutes
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
