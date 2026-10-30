import CateringPackage from '../models/CateringPackage.js';
import FoodCategory from '../models/FoodCategory.js';
import FoodItem from '../models/FoodItem.js';
import LiveCounter from '../models/LiveCounter.js';
import CateringAddOn from '../models/CateringAddOn.js';
import BookingCatering from '../models/BookingCatering.js';

// PACKAGES
export const getPackages = async (req, res) => {
    try {
        const filters = req.user && req.user.role === 'admin' ? {} : { isActive: true };
        const packages = await CateringPackage.find(filters);
        res.json({ success: true, packages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPackageDetails = async (req, res) => {
    try {
        const pkg = await CateringPackage.findById(req.params.id);
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

        const categories = await FoodCategory.find({ packageIds: pkg._id }).sort('sortOrder');
        const foodItems = await FoodItem.find({ packageIds: pkg._id, isAvailable: true }).populate('categoryId');
        const liveCounters = await LiveCounter.find({ packageIds: pkg._id });

        res.json({ success: true, package: pkg, categories, foodItems, liveCounters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPackage = async (req, res) => {
    try {
        const pkg = new CateringPackage(req.body);
        await pkg.save();
        res.status(201).json({ success: true, package: pkg });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updatePackage = async (req, res) => {
    try {
        const pkg = await CateringPackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, package: pkg });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deletePackage = async (req, res) => {
    try {
        await CateringPackage.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Package deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// CATEGORIES
export const getCategories = async (req, res) => {
    try {
        const categories = await FoodCategory.find().sort('sortOrder').populate('packageIds');
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createCategory = async (req, res) => {
    try {
        const category = new FoodCategory(req.body);
        await category.save();
        res.status(201).json({ success: true, category });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const category = await FoodCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, category });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        await FoodCategory.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// FOOD ITEMS
export const getFoodItems = async (req, res) => {
    try {
        const items = await FoodItem.find().populate('categoryId packageIds');
        res.json({ success: true, items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createFoodItem = async (req, res) => {
    try {
        const item = new FoodItem(req.body);
        await item.save();
        res.status(201).json({ success: true, item });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateFoodItem = async (req, res) => {
    try {
        const item = await FoodItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, item });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteFoodItem = async (req, res) => {
    try {
        await FoodItem.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Item deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// LIVE COUNTERS
export const getLiveCounters = async (req, res) => {
    try {
        const counters = await LiveCounter.find().populate('packageIds');
        res.json({ success: true, counters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createLiveCounter = async (req, res) => {
    try {
        const counter = new LiveCounter(req.body);
        await counter.save();
        res.status(201).json({ success: true, counter });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateLiveCounter = async (req, res) => {
    try {
        const counter = await LiveCounter.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, counter });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteLiveCounter = async (req, res) => {
    try {
        await LiveCounter.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Counter deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ADD ONS
export const getExtras = async (req, res) => {
    try {
        const filters = req.user && req.user.role === 'admin' ? {} : { isActive: true };
        const extras = await CateringAddOn.find(filters);
        res.json({ success: true, extras });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createExtra = async (req, res) => {
    try {
        const extra = new CateringAddOn(req.body);
        await extra.save();
        res.status(201).json({ success: true, extra });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateExtra = async (req, res) => {
    try {
        const extra = await CateringAddOn.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, extra });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteExtra = async (req, res) => {
    try {
        await CateringAddOn.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Extra deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// BOOKINGS
export const getBookings = async (req, res) => {
    try {
        const bookings = await BookingCatering.find().populate('packageId');
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createBooking = async (req, res) => {
    try {
        const booking = new BookingCatering(req.body);
        await booking.save();
        res.status(201).json({ success: true, booking });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateBooking = async (req, res) => {
    try {
        const booking = await BookingCatering.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, booking });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
