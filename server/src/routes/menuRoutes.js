import express from 'express';
import { getMenu } from '../controllers/menuController.js';
import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';

const router = express.Router();

// @desc    Get all categories and items (unified for backward compatibility)
router.get('/menu', getMenu);

// @desc    Get just categories
router.get('/menu/categories', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });
        res.json({ data: { categories } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get just items
router.get('/menu/items', async (req, res) => {
    try {
        const filters = { isAvailable: true };
        if (req.query.category) filters.category = req.query.category;

        const items = await MenuItem.find(filters).populate('category');
        res.json({ data: { items } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
