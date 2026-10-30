import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import { getIO, SOCKET_EVENTS } from '../utils/socket.js';
import bcrypt from 'bcryptjs';
import sendEmail from '../utils/sendEmail.js';

// ==========================================
// ADMIN PROFILE OTP
// ==========================================

export const requestAdminPasswordOTP = async (req, res) => {
    try {
        const admin = await User.findById(req.user._id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        if (!admin.email) {
            return res.status(400).json({ message: 'No email associated with this admin account' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        admin.otpHash = await bcrypt.hash(otp, salt);
        admin.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await admin.save();

        const subject = 'Admin Password Change OTP';
        const html = `
            <h2>Admin Panel: Password Change</h2>
            <p>Your verification code for changing the admin password is:</p>
            <h1 style="color: #FF5200; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you did not request this, please secure your account immediately.</p>
        `;

        await sendEmail({
            email: admin.email,
            subject,
            html
        });

        res.json({ success: true, message: 'OTP sent to your registered email' });
    } catch (error) {
        console.error('[Admin Pass OTP Error]:', error);
        res.status(500).json({ message: 'Error sending OTP' });
    }
};

export const verifyAdminPasswordOTP = async (req, res) => {
    try {
        const { otp, newPassword } = req.body;
        const admin = await User.findById(req.user._id);

        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        if (!admin.otpHash || !admin.otpExpiresAt || admin.otpExpiresAt < Date.now()) {
            return res.status(400).json({ message: 'OTP expired or invalid' });
        }

        const isMatch = await bcrypt.compare(otp, admin.otpHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Password validation (same as auth controller)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.'
            });
        }

        admin.password = newPassword;
        admin.otpHash = undefined;
        admin.otpExpiresAt = undefined;
        await admin.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('[Admin Pass Verify Error]:', error);
        res.status(500).json({ message: 'Error updating password' });
    }
};

// ==========================================
// MENU MANAGEMENT
// ==========================================

// Categories
export const getCategoriesAdmin = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.json({ data: { categories } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await Category.create({ name, description });
        res.status(201).json({ data: { category } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ data: { category } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        // Check if category has items
        const itemsCount = await MenuItem.countDocuments({ category: req.params.id });
        if (itemsCount > 0) {
            return res.status(400).json({ message: 'Category has items. Delete items first.' });
        }
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Menu Items
export const getMenuItemsAdmin = async (req, res) => {
    try {
        const items = await MenuItem.find().populate('category').sort({ createdAt: -1 });
        res.json({ data: { items } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createMenuItem = async (req, res) => {
    try {
        const { name, description, price, category, isVeg, image } = req.body;
        const item = await MenuItem.create({ name, description, price, category, isVeg, image });
        res.status(201).json({ data: { item } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateMenuItem = async (req, res) => {
    try {
        const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ data: { item } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteMenuItem = async (req, res) => {
    try {
        await MenuItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Menu item deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// ORDER MANAGEMENT
// ==========================================

export const getAllOrdersAdmin = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email phone')
            .populate('items.menuItem')
            .sort({ createdAt: -1 });
        res.json({ data: { orders } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { status, cancellationReason } = req.body;
        const order = await Order.findById(req.params.id).populate('user');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const previousStatus = order.status;
        order.status = status;

        // Handle Order Cancellation
        if (status === 'cancelled') {
            order.cancellationReason = cancellationReason || 'No reason provided';
            order.cancelledBy = 'admin';
            order.cancelledAt = new Date();

            // Process Refund if payment was made
            if (order.paymentStatus === 'paid') {
                order.refundStatus = 'processing';
                order.refundAmount = order.totalAmount;

                console.log(`[REFUND] Processing refund for order ${order.orderNumber}`);
                console.log(`[REFUND] Amount: ₹${order.refundAmount}`);
                console.log(`[REFUND] User: ${order.user.name} (${order.user.email || order.user.phone})`);

                // TODO: Integrate with Razorpay Refund API
                // For now, we mark it as completed
                // In production, call Razorpay API and update based on response

                try {
                    // Simulated refund processing
                    // const refund = await razorpayInstance.payments.refund(order.razorpayPaymentId, {
                    //     amount: order.refundAmount * 100
                    // });

                    order.refundStatus = 'completed';
                    order.refundTransactionId = `REF${Date.now()}`; // Simulated transaction ID

                    console.log(`[REFUND] Refund completed for order ${order.orderNumber}`);
                } catch (refundError) {
                    console.error(`[REFUND ERROR]`, refundError);
                    order.refundStatus = 'failed';
                }
            }

            console.log(`[ORDER CANCELLED] Order ${order.orderNumber} cancelled by admin`);
            console.log(`[ORDER CANCELLED] Reason: ${order.cancellationReason}`);
        }

        await order.save();

        // Emit Socket Event
        const io = getIO();
        io.to('admin').emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, order);

        // Send special event for cancellation to show popup
        if (status === 'cancelled') {
            io.to(`user:${order.user._id.toString()}`).emit(SOCKET_EVENTS.ORDER_CANCELLED, {
                order,
                message: 'Your order has been cancelled',
                reason: order.cancellationReason,
                refundStatus: order.refundStatus,
                refundAmount: order.refundAmount
            });
            console.log(`[SOCKET] Sent cancellation event to user:${order.user._id.toString()}`);
        } else {
            io.to(`user:${order.user._id.toString()}`).emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, order);
        }

        res.json({
            success: true,
            data: { order },
            message: status === 'cancelled'
                ? `Order cancelled and refund of ₹${order.refundAmount} ${order.refundStatus}`
                : 'Order status updated successfully'
        });
    } catch (error) {
        console.error('[ORDER STATUS UPDATE ERROR]', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const getOrderStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Total Orders
        const totalOrders = await Order.countDocuments();

        // 2. Active Orders (Anything not delivered or cancelled)
        const activeOrders = await Order.countDocuments({
            status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
        });

        // 3. Today's Orders
        const todayOrders = await Order.countDocuments({
            createdAt: { $gte: today }
        });

        // 4. Today's Revenue
        const todayRevenueResult = await Order.aggregate([
            { $match: { createdAt: { $gte: today }, paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const todayRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].total : 0;

        // 5. Total Revenue (All time)
        const totalRevenueResult = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

        res.json({
            success: true,
            data: {
                stats: {
                    totalOrders,
                    activeOrders,
                    todayOrders,
                    todayRevenue,
                    totalRevenue
                }
            }
        });
    } catch (error) {
        console.error('[GET ORDER STATS ERROR]', error);
        res.status(500).json({ success: true, message: error.message });
    }
};

// ==========================================
// SETTINGS
// ==========================================

export const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json({ data: { settings } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create(req.body);
        } else {
            settings = await Settings.findOneAndUpdate({}, req.body, { new: true });
        }
        res.json({ data: { settings } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
// ==========================================
// USER MANAGEMENT
// ==========================================

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ data: { users } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserStats = async (req, res) => {
    try {
        const total = await User.countDocuments({ isAdmin: false });
        const verified = await User.countDocuments({ isAdmin: false, isVerified: true });
        const active = await User.countDocuments({ isAdmin: false, isActive: true });
        const blocked = await User.countDocuments({ isAdmin: false, isActive: false });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newToday = await User.countDocuments({ isAdmin: false, createdAt: { $gte: today } });

        res.json({ data: { stats: { total, verified, active, blocked, newToday } } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const toggleUserActive = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.isActive = !user.isActive;
        if (user.isActive) {
            user.blockReason = null;
        } else if (req.body.reason) {
            user.blockReason = req.body.reason;
        }
        await user.save();
        res.json({ data: { user } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserActivity = async (req, res) => {
    try {
        const userId = req.params.id;
        const recentOrders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(10);

        const totalSpent = recentOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        res.json({
            data: {
                stats: {
                    totalOrders: await Order.countDocuments({ user: userId }),
                    totalReservations: 0,
                    totalSpent
                },
                recentOrders,
                recentReservations: []
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// MOCK STATS FOR DASHBOARD
// ==========================================

export const getReservationStats = async (req, res) => {
    // This endpoint in adminController is a fallback or for a different overview.
    // The main one is in reservationController.
    res.json({ data: { stats: { total: 0, pendingCount: 0, completed: 0 } } });
};

export const getVenueBookingStats = async (req, res) => {
    // Mock for now as Venue model is not implemented in this version
    res.json({ data: { stats: { total: 0, pendingCount: 0, completed: 0 } } });
};

// ==========================================
// PROFILE
// ==========================================

export const getAdminProfile = async (req, res) => {
    try {
        const admin = await User.findById(req.user._id).select('-password');
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({
                name: "Vincent's Kitchen",
                contact: { email: "admin@vincent.com" }
            });
        }
        res.json({ success: true, data: { admin, settings } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAdminProfile = async (req, res) => {
    try {
        const { name, email, password, profilePicture } = req.body;
        const user = await User.findById(req.user._id);

        if (name) user.name = name;
        if (email) user.email = email;
        if (profilePicture) user.profilePicture = profilePicture;
        if (password) user.password = password;

        await user.save();
        res.json({ success: true, data: { user } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
