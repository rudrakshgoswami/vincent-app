import express from 'express';
import { createRazorpayOrder, verifyPayment } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/payment/key', (req, res) => {
    res.json({ data: { key: process.env.RAZORPAY_KEY_ID } });
});

router.post('/payment/create-order', protect, createRazorpayOrder);
router.post('/payment/verify', protect, verifyPayment);

export default router;
