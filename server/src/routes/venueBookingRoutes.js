import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
    createBookingOrder,
    verifyBookingPayment,
    getMyBookings,
    getBookingById,
    cancelBooking,
    extendLock,
    submitReview,
    getAllBookingsAdmin,
    updateBookingStatusAdmin,
    getBookingStatsAdmin,
    addAdminNoteToBooking,
    recordBalancePayment,
    getInvoice,
    lockVenueSlot,
    releaseVenueSlot
} from '../controllers/venueBookingController.js';

const router = express.Router();

// =====================
// USER ROUTES (Protected)
// =====================
router.post('/create-order', protect, createBookingOrder);
router.post('/verify-payment', protect, verifyBookingPayment);
router.post('/lock-slot', protect, lockVenueSlot);
router.post('/release-slot', protect, releaseVenueSlot);
router.get('/my', protect, getMyBookings);
router.get('/:id', protect, getBookingById);
router.get('/:id/invoice', protect, getInvoice);
router.put('/:id/cancel', protect, cancelBooking);
router.put('/:id/extend-lock', protect, extendLock);
router.put('/:id/review', protect, submitReview);

// =====================
// ADMIN ROUTES
// =====================
router.get('/admin/all', protect, admin, getAllBookingsAdmin);
router.get('/admin/stats', protect, admin, getBookingStatsAdmin);
router.put('/admin/:id/status', protect, admin, updateBookingStatusAdmin);
router.post('/admin/:id/note', protect, admin, addAdminNoteToBooking);
router.post('/admin/:id/record-payment', protect, admin, recordBalancePayment);

export default router;
