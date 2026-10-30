import express from 'express';
import {
    submitContactForm,
    getContactInfo,
    getAllMessages,
    updateMessageStatus,
    deleteMessage,
    replyToMessage,
    getMyMessages
} from '../controllers/contactController.js';
import { protect, admin, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/info', getContactInfo);
router.post('/', optionalAuth, submitContactForm);

// User routes (logged-in user sees their own messages & replies)
router.get('/my-messages', protect, getMyMessages);

// Admin routes
router.get('/admin/messages', protect, admin, getAllMessages);
router.put('/admin/messages/:id', protect, admin, updateMessageStatus);
router.post('/admin/messages/:id/reply', protect, admin, replyToMessage);
router.delete('/admin/messages/:id', protect, admin, deleteMessage);

export default router;
