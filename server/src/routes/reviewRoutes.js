import express from 'express';
import { 
    addReview, 
    getVenueReviews, 
    getAllReviewsAdmin, 
    deleteReview,
    updateReviewAdmin
} from '../controllers/reviewController.js';

import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, addReview);

router.route('/admin')
    .get(protect, admin, getAllReviewsAdmin);

router.route('/venue/:venueId')
    .get(getVenueReviews);

router.route('/:id')
    .put(protect, admin, updateReviewAdmin)
    .delete(protect, deleteReview);


export default router;
