import razorpay from '../utils/razorpay.js';
import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import Settings from '../models/Settings.js';
import crypto from 'crypto';
import { getIO, SOCKET_EVENTS } from '../utils/socket.js';

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
// @access  Private
// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
// @access  Private
export const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR' } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const amountInPaise = Math.round(amount * 100);

        const options = {
            amount: amountInPaise,
            currency,
            receipt: `rcpt_food_${Date.now()}`,
            notes: {
                userId: req.user._id.toString(),
                type: 'food_order'
            }
        };

        const rzpOrder = await razorpay.orders.create(options);

        res.json({
            data: {
                orderId: rzpOrder.id,
                amount: rzpOrder.amount,
                currency: rzpOrder.currency,
                key: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error('Razorpay Food Order Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Payment and Create Order
// @route   POST /api/payment/verify
// @access  Private
export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            items,
            orderType,
            deliveryAddress,
            tableNumber,
            notes
        } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ message: 'Missing payment signature details' });
        }

        // 1. Verify Signature
        const body = razorpayOrderId + "|" + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        // 2. Double check with Razorpay API (Production Level)
        try {
            const rzpPayment = await razorpay.payments.fetch(razorpayPaymentId);
            if (rzpPayment.status !== 'captured' && rzpPayment.status !== 'authorized') {
                return res.status(400).json({ message: `Payment is ${rzpPayment.status}. Expected captured.` });
            }
        } catch (fetchErr) {
            console.warn('Razorpay API fetch failed, proceeding with signature');
        }

        // 3. Validate items and calculate total (Server-side validation)
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const menuItem = await MenuItem.findById(item.menuItemId);
            if (!menuItem) return res.status(404).json({ message: `Item ${item.menuItemId} not found` });
            if (!menuItem.isAvailable) return res.status(400).json({ message: `${menuItem.name} is unavailable` });

            const itemTotal = menuItem.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                menuItem: menuItem._id,
                name: menuItem.name,
                quantity: item.quantity,
                price: menuItem.price,
                subtotal: itemTotal,
                notes: item.specialInstructions || ''
            });
        }

        const settings = await Settings.findOne() || { taxPercentage: 5, deliveryCharge: 40 };
        const tax = (totalAmount * settings.taxPercentage) / 100;
        const deliveryCharge = orderType === 'delivery' ? settings.deliveryCharge : 0;
        const finalTotal = totalAmount + tax + deliveryCharge;

        // 4. Create Order
        const count = await Order.countDocuments();
        const orderNumber = `ORD${(count + 1).toString().padStart(5, '0')}`;

        const newOrder = new Order({
            user: req.user._id,
            items: orderItems,
            subtotal: totalAmount,
            tax,
            deliveryCharge,
            totalAmount: finalTotal,
            orderType,
            deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
            tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
            paymentStatus: 'paid',
            status: 'pending',
            orderNumber,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            estimatedPrepTime: settings.defaultPrepTime || 30
        });

        await newOrder.save();

        // 5. Notifications
        try {
            const io = getIO();
            io.to('admin').emit(SOCKET_EVENTS.ORDER_CREATED, newOrder);
            io.to(`user:${req.user._id.toString()}`).emit(SOCKET_EVENTS.ORDER_CREATED, newOrder);
        } catch (_) {}

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: { order: newOrder }
        });
    } catch (error) {
        console.error('ORDER VERIFICATION ERROR:', error);
        res.status(500).json({ success: false, message: error.message || 'Verification failed' });
    }
};

// @desc    Get User Orders
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = async (req, res) => {
    try {
        console.log('='.repeat(60));
        console.log('[MY ORDERS DEBUG] Request received');

        // Validate user is authenticated
        if (!req.user || !req.user._id) {
            console.error('[MY ORDERS ERROR] No user or user ID in request');
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        console.log('[MY ORDERS DEBUG] User object:', JSON.stringify(req.user, null, 2));
        console.log('[MY ORDERS DEBUG] User ID:', req.user._id);
        console.log('[MY ORDERS DEBUG] User ID type:', typeof req.user._id);

        const userId = req.user._id;

        // Count total orders in database
        const totalOrders = await Order.countDocuments();
        console.log(`[MY ORDERS DEBUG] Total orders in database: ${totalOrders}`);

        // Attempt to find orders
        const orders = await Order.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'items.menuItem',
                select: 'name price image category'
            })
            .lean(); // Use lean() for better performance

        console.log(`[MY ORDERS DEBUG] Orders found for user ${userId}: ${orders.length}`);

        // If no orders found, let's see what's in the DB
        if (orders.length === 0 && totalOrders > 0) {
            const sampleOrders = await Order.find().limit(5).select('user orderNumber createdAt');
            console.log('[MY ORDERS DEBUG] Sample orders from DB:');
            sampleOrders.forEach(o => {
                const match = o.user.toString() === userId.toString();
                console.log(`  - Order ${o.orderNumber}: user=${o.user}, userType=${typeof o.user}, match=${match}`);
            });

            console.log('[MY ORDERS DEBUG] User has no orders yet - returning empty array');
        } else if (orders.length > 0) {
            console.log('[MY ORDERS DEBUG] Order numbers found:', orders.map(o => o.orderNumber).join(', '));
        }

        console.log('[MY ORDERS DEBUG] Sending response with', orders.length, 'orders');
        console.log('='.repeat(60));

        res.json({
            success: true,
            count: orders.length,
            data: { orders }
        });
    } catch (error) {
        console.error('[MY ORDERS ERROR]:', error);
        console.error('[MY ORDERS ERROR] Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// @desc    Get Order By ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone')
            .populate('items.menuItem');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if owner or admin
        if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json({ data: { order } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
