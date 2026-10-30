import express from 'express';
import {
    getAllTables,
    getTableById,
    checkAvailability,
    getTableLayout,
    createTable,
    updateTable,
    deleteTable,
    toggleTableBlock,
    getTableStats
} from '../controllers/tableController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (specific paths first)
router.get('/', getAllTables);
router.get('/layout', getTableLayout);
router.post('/check-availability', checkAvailability);

// Admin routes (MUST be before /:id wildcard)
router.post('/admin/create', protect, admin, createTable);
router.get('/admin/stats', protect, admin, getTableStats);
router.put('/admin/:id', protect, admin, updateTable);
router.delete('/admin/:id', protect, admin, deleteTable);
router.put('/admin/:id/block', protect, admin, toggleTableBlock);

// Wildcard routes (last)
router.get('/:id', getTableById);

export default router;
