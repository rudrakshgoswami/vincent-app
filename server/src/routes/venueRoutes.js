import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
    getVenues,
    getVenueById,
    checkAvailability,
    getMonthlyAvailability,
    getCateringPackages,
    getCateringPackageById,
    getCateringExtras,

    getAllVenuesAdmin,
    createVenue,
    updateVenue,
    deleteVenue,
    addVenueMedia,
    deleteVenueMedia,
    blockVenueDates,
    getAllCateringPackagesAdmin,
    createCateringPackageAdmin,
    updateCateringPackageAdmin,
    deleteCateringPackageAdmin,
    getAllCateringExtrasAdmin,
    createCateringExtraAdmin,
    updateCateringExtraAdmin,
    deleteCateringExtraAdmin,

} from '../controllers/venueController.js';

const router = express.Router();

// =====================
// PUBLIC ROUTES
// =====================

// Venues (listing & details)
router.get('/', getVenues);
router.get('/:id/availability', checkAvailability); // GET /api/venues/:id/availability?date=...
router.post('/check-availability', checkAvailability); // Existing POST version
router.get('/catering/packages', getCateringPackages);
router.get('/catering/packages/:id', getCateringPackageById);
router.get('/catering/extras', getCateringExtras);

router.get('/:id', getVenueById);
router.get('/:id/monthly-availability', getMonthlyAvailability);

// =====================
// ADMIN ROUTES
// =====================

// Venue CRUD
router.get('/admin/all', protect, admin, getAllVenuesAdmin);
router.post('/admin/create', protect, admin, createVenue);
router.put('/admin/:id', protect, admin, updateVenue);
router.delete('/admin/:id', protect, admin, deleteVenue);
router.post('/admin/:id/media', protect, admin, addVenueMedia);
router.delete('/admin/:id/media/:mediaId', protect, admin, deleteVenueMedia);
router.put('/admin/:id/block-dates', protect, admin, blockVenueDates);

// Catering Admin
router.get('/admin/catering/packages', protect, admin, getAllCateringPackagesAdmin);
router.post('/admin/catering/packages', protect, admin, createCateringPackageAdmin);
router.put('/admin/catering/packages/:id', protect, admin, updateCateringPackageAdmin);
router.delete('/admin/catering/packages/:id', protect, admin, deleteCateringPackageAdmin);

router.get('/admin/catering/extras', protect, admin, getAllCateringExtrasAdmin);
router.post('/admin/catering/extras', protect, admin, createCateringExtraAdmin);
router.put('/admin/catering/extras/:id', protect, admin, updateCateringExtraAdmin);
router.delete('/admin/catering/extras/:id', protect, admin, deleteCateringExtraAdmin);



export default router;
