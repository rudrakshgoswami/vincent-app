import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

import { getMyOrders, getOrderById } from '../controllers/orderController.js';
import { updateProfile, requestUpdateOTP, verifyUpdateOTP } from '../controllers/userController.js';
import { getUserProfile } from '../controllers/authController.js';

const router = express.Router();

router.use(protect);

// Profile Management
router.get('/profile', getUserProfile);
router.put('/profile', updateProfile);
router.post('/request-update-otp', requestUpdateOTP);
router.post('/verify-update-otp', verifyUpdateOTP);

// Password Change via OTP (Phone/SMS ONLY)
router.post('/request-password-otp', async (req, res) => {
    try {
        const bcrypt = await import('bcryptjs');
        const sendSMS = (await import('../utils/sendSMS.js')).default;
        const User = (await import('../models/User.js')).default;

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.phone)
            return res.status(400).json({ message: 'No phone number linked to your account. Please contact support.' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.default.genSalt(10);
        user.otpHash = await bcrypt.default.hash(otp, salt);
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        const maskedPhone = user.phone.replace(/\d(?=\d{4})/g, '*');
        const smsMessage = `Your Vincent Restaurant password change OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;
        await sendSMS(user.phone, smsMessage);

        return res.json({ success: true, message: `OTP sent to your phone: ${maskedPhone}` });
    } catch (err) {
        console.error('[User Pwd OTP]', err);
        res.status(500).json({ message: err.message || 'Failed to send OTP' });
    }
});

router.post('/verify-password-otp', async (req, res) => {
    try {
        const { otp, newPassword } = req.body;
        const bcrypt = await import('bcryptjs');
        const User = (await import('../models/User.js')).default;

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < Date.now())
            return res.status(400).json({ message: 'OTP expired or not requested' });

        const isMatch = await bcrypt.default.compare(otp, user.otpHash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid OTP' });

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword))
            return res.status(400).json({ message: 'Password must be 8+ chars with uppercase, lowercase, number and special character.' });

        user.password = newPassword;
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error('[User Pwd Verify]', err);
        res.status(500).json({ message: err.message || 'Failed to update password' });
    }
});

// Test endpoint to verify auth is working
router.get('/test-auth', (req, res) => {
    res.json({
        success: true,
        message: 'Authentication working!',
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone
        }
    });
});

// My Orders
router.get('/orders/my-orders', getMyOrders);
router.get('/orders/:id', getOrderById);

// My Table Reservations
router.get('/table-reservations/my', (req, res) => {
    res.json({ success: true, data: { reservations: [] } });
});



export default router;
