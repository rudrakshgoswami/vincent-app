import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    addresses: [{
        street: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String }
    }],
    password: {
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    blockReason: String,
    otpHash: String,
    otpExpiresAt: Date,
    otpAttempts: {
        type: Number,
        default: 0
    },
    profilePicture: String,
    birthDate: Date,
    pendingUpdate: {
        type: {
            type: String
        },
        value: String
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('validate', function () {
    if (!this.email && !this.phone) {
        throw new Error('Either Email or Phone is required');
    }
});

const User = mongoose.model('User', userSchema);
export default User;
