import express from 'express';
import {
    getAllUsers,
    getUserStats,
    toggleUserActive,
    deleteUser,
    getUserActivity,
    getOrderStats,
    getReservationStats,
    getCategoriesAdmin,
    createCategory,
    updateCategory,
    deleteCategory,
    getMenuItemsAdmin,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getAllOrdersAdmin,
    updateOrderStatus,
    getSettings,
    updateSettings,
    getAdminProfile,
    updateAdminProfile
} from '../controllers/adminController.js';

import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// NOTE: Do NOT use router.use(protect) / router.use(admin) here globally —
// it would intercept ALL /api/* requests (including user routes) and reject
// non-admin users before they reach userRoutes. Apply middleware inline instead.

// User Management
router.get('/admin/users', protect, admin, getAllUsers);
router.get('/admin/users/stats', protect, admin, getUserStats);
router.put('/admin/users/:id/toggle-active', protect, admin, toggleUserActive);
router.delete('/admin/users/:id', protect, admin, deleteUser);
router.get('/admin/users/:id/activity', protect, admin, getUserActivity);

// Menu Management (Admin)
router.get('/menu/admin/categories', protect, admin, getCategoriesAdmin);
router.post('/menu/admin/categories', protect, admin, createCategory);
router.put('/menu/admin/categories/:id', protect, admin, updateCategory);
router.delete('/menu/admin/categories/:id', protect, admin, deleteCategory);

router.get('/menu/admin/items', protect, admin, getMenuItemsAdmin);
router.post('/menu/admin/items', protect, admin, createMenuItem);
router.put('/menu/admin/items/:id', protect, admin, updateMenuItem);
router.delete('/menu/admin/items/:id', protect, admin, deleteMenuItem);

// Order Management (Admin)
router.get('/orders/admin/all', protect, admin, getAllOrdersAdmin);
router.get('/orders/admin/stats/overview', protect, admin, getOrderStats);  // Must be before /:id/status
router.put('/orders/admin/:id/status', protect, admin, updateOrderStatus);

// Settings
router.get('/admin/settings', protect, admin, getSettings);
router.put('/admin/settings', protect, admin, updateSettings);

// Dashboard Overview Stats
router.get('/reservations/admin/stats/overview', protect, admin, getReservationStats);

// Profile
router.get('/admin/profile', protect, admin, getAdminProfile);
router.put('/admin/profile', protect, admin, updateAdminProfile);
router.post('/admin/request-password-otp', protect, admin, (req, res, next) => {
    // Explicitly import and call the controller method
    import('../controllers/adminController.js').then(m => m.requestAdminPasswordOTP(req, res)).catch(next);
});
router.post('/admin/verify-password-otp', protect, admin, (req, res, next) => {
    import('../controllers/adminController.js').then(m => m.verifyAdminPasswordOTP(req, res)).catch(next);
});


export default router;
