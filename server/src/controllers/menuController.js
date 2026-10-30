import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';

// @desc    Get all categories and items
// @route   GET /api/menu
// @access  Public
export const getMenu = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });
        const menu = await Promise.all(categories.map(async (cat) => {
            const items = await MenuItem.find({ category: cat._id, isAvailable: true });
            return {
                id: cat._id,
                name: cat.name,
                description: cat.description,
                Items: items.map(item => ({
                    id: item._id,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    image: item.image,
                    isVeg: item.isVeg,
                    isAvailable: item.isAvailable
                }))
            };
        }));
        res.json(menu);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
