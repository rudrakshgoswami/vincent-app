import express from 'express';
import {
    getCategories, createCategory, updateCategory, deleteCategory,
    getPackages, getPackageDetails, createPackage, updatePackage, deletePackage,
    getFoodItems, createFoodItem, updateFoodItem, deleteFoodItem,
    getLiveCounters, createLiveCounter, updateLiveCounter, deleteLiveCounter,
    getExtras, createExtra, updateExtra, deleteExtra,
    getBookings, createBooking, updateBooking
} from '../controllers/cateringController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Categories
router.route('/categories')
    .get(getCategories)
    .post(protect, admin, createCategory);
router.route('/categories/:id')
    .put(protect, admin, updateCategory)
    .delete(protect, admin, deleteCategory);

// Packages
router.route('/packages')
    .get(getPackages)
    .post(protect, admin, createPackage);
router.route('/packages/:id')
    .get(getPackageDetails)
    .put(protect, admin, updatePackage)
    .delete(protect, admin, deletePackage);

// Food Items
router.route('/items')
    .get(getFoodItems)
    .post(protect, admin, createFoodItem);
router.route('/items/:id')
    .put(protect, admin, updateFoodItem)
    .delete(protect, admin, deleteFoodItem);

// Live Counters
router.route('/live-counters')
    .get(getLiveCounters)
    .post(protect, admin, createLiveCounter);
router.route('/live-counters/:id')
    .put(protect, admin, updateLiveCounter)
    .delete(protect, admin, deleteLiveCounter);

// Extras (Addons)
router.route('/extras')
    .get(getExtras)
    .post(protect, admin, createExtra);
router.route('/extras/:id')
    .put(protect, admin, updateExtra)
    .delete(protect, admin, deleteExtra);

// Bookings Catering
router.route('/bookings')
    .get(protect, admin, getBookings)
    .post(protect, createBooking);
router.route('/bookings/:id')
    .put(protect, admin, updateBooking);

export default router;
