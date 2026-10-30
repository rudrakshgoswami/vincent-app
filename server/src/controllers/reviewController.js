import Review from '../models/Review.js';
import Venue from '../models/Venue.js';

// @desc    Add a review for a venue
// @route   POST /api/reviews
// @access  Private
export const addReview = async (req, res) => {
    try {
        const { venueId, rating, comment } = req.body;
        const userId = req.user._id;
        const userName = req.user.name;

        // Check if venue exists
        const venue = await Venue.findById(venueId);
        if (!venue) {
            return res.status(404).json({ message: 'Venue not found' });
        }

        // Check if user already reviewed this venue
        const existingReview = await Review.findOne({ venue: venueId, user: userId });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this venue' });
        }

        const review = await Review.create({
            venue: venueId,
            user: userId,
            userName,
            rating,
            comment
        });

        // Update venue average rating and review count
        const reviews = await Review.find({ venue: venueId, status: 'approved' });
        const reviewCount = reviews.length;
        const averageRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviewCount;

        await Venue.findByIdAndUpdate(venueId, {
            rating: averageRating.toFixed(1),
            reviewCount: reviewCount
        });

        res.status(201).json(review);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get reviews for a venue
// @route   GET /api/reviews/venue/:venueId
// @access  Public
export const getVenueReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ venue: req.params.venueId, status: 'approved' })
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all reviews (Admin)
// @route   GET /api/reviews/admin
// @access  Private/Admin
export const getAllReviewsAdmin = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('venue', 'name')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete a review (Admin or Owner)
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Only admin or the user who wrote it can delete
        if (req.user.role !== 'admin' && review.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const venueId = review.venue;
        await review.deleteOne();

        // Update venue average rating and review count
        const reviews = await Review.find({ venue: venueId, status: 'approved' });
        const reviewCount = reviews.length;
        const averageRating = reviewCount > 0 
            ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviewCount 
            : 0;

        await Venue.findByIdAndUpdate(venueId, {
            rating: averageRating.toFixed(1),
            reviewCount: reviewCount
        });

        res.json({ message: 'Review removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update a review (Admin - reply or change status)
// @route   PUT /api/reviews/:id
// @access  Private/Admin
export const updateReviewAdmin = async (req, res) => {
    try {
        const { status, adminReply } = req.body;
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (status) review.status = status;
        if (adminReply !== undefined) review.adminReply = adminReply;

        await review.save();
        res.json(review);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

