import express from 'express';
import { createRazorpayOrder, verifyPayment } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { publicKey, isLive, mintDemoPayment } from '../utils/paymentGateway.js';

const router = express.Router();

/*
 * Tells the browser which key to open checkout with, and whether the gateway
 * is in demo mode. In demo mode the client skips Razorpay entirely and calls
 * /payment/demo-pay instead.
 */
router.get('/payment/key', (req, res) => {
    res.json({ data: { key: publicKey(), demo: !isLive() } });
});

/*
 * Stands in for the Razorpay checkout callback while no credentials are set.
 * Returns the payment id and signature that checkout would normally hand
 * back, so the existing verify endpoints are used unchanged. Refuses once
 * real credentials are configured.
 */
router.post('/payment/demo-pay', protect, (req, res) => {
    if (isLive()) {
        return res.status(400).json({
            message: 'Razorpay is configured, so demo payments are disabled.',
        });
    }
    try {
        const { orderId } = req.body;
        res.json({ data: mintDemoPayment(orderId) });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/payment/create-order', protect, createRazorpayOrder);
router.post('/payment/verify', protect, verifyPayment);

export default router;
