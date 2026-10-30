
import mongoose from 'mongoose';
import CateringPackage from '../models/CateringPackage.js';
import FoodCategory from '../models/FoodCategory.js';
import FoodItem from '../models/FoodItem.js';

async function check() {
    await mongoose.connect('mongodb://localhost:27017/vincent_db');
    console.log('Packages:', await CateringPackage.countDocuments());
    console.log('Categories:', await FoodCategory.countDocuments());
    console.log('FoodItems:', await FoodItem.countDocuments());
    process.exit();
}
check();
