import express from 'express';
import {
    registerUser, verifyOTP, resendOTP,
    loginUser, logoutUser,
    refreshAccessToken,
    getCurrentUser, getUserProfile,
    forgotPassword, resetPassword
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Silent refresh — uses HttpOnly refreshToken cookie (auto-sent by browser)
// No Authorization header needed here — this IS how we get one
router.post('/refresh', refreshAccessToken);

router.get('/me', protect, getCurrentUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getUserProfile);

export default router;
