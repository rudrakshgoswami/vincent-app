import express from 'express';
import {
    createReservationOrder,
    verifyReservationPayment,
    getMyReservations,
    getReservationById,
    cancelReservation,
    releaseReservationLock,
    markArrival,
    getAllReservations,
    updateReservationStatus,
    getReservationStats
} from '../controllers/reservationController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin routes (MUST be before /:id wildcard routes)
router.get('/admin/all', protect, admin, getAllReservations);
router.get('/admin/stats', protect, admin, getReservationStats);
router.put('/admin/:id/status', protect, admin, updateReservationStatus);

// User routes (protected)
router.post('/create-order', protect, createReservationOrder);
router.post('/verify-payment', protect, verifyReservationPayment);
router.get('/my', protect, getMyReservations);
router.get('/:id', protect, getReservationById);
router.put('/:id/cancel', protect, cancelReservation);
router.put('/:id/release', protect, releaseReservationLock);
router.put('/:id/arrive', protect, markArrival);

export default router;
