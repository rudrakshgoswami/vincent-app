import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../src/models/Category.js';
import MenuItem from '../src/models/MenuItem.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Category.deleteMany({});
        await MenuItem.deleteMany({});

        // Create Categories
        const starters = await Category.create({
            name: 'Starters',
            description: 'Delicious appetizers to kickstart your meal'
        });

        const mainCourse = await Category.create({
            name: 'Main Course',
            description: 'Hearty and satisfying traditional dishes'
        });

        const desserts = await Category.create({
            name: 'Desserts & Drinks',
            description: 'Sweet endings and refreshing beverages'
        });

        // Create Menu Items
        const items = [
            {
                name: 'Paneer Tikka',
                description: 'Succulent cubes of paneer marinated in spiced yogurt and grilled to perfection in a tandoor.',
                price: 249,
                category: starters._id,
                isVeg: true,
                image: 'https://www.themealdb.com/images/media/meals/3m8yae1763257951.jpg?auto=format&fit=crop&q=80&w=800',
                isAvailable: true
            },
            {
                name: 'Butter Chicken',
                description: 'Tender chicken pieces cooked in a rich, creamy tomato-based gravy with a touch of butter.',
                price: 399,
                category: mainCourse._id,
                isVeg: false,
                image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&q=80&w=800',
                isAvailable: true
            },
            {
                name: 'Dal Makhani',
                description: 'Slow-cooked black lentils and kidney beans in a creamy, buttery sauce. A classic North Indian delicacy.',
                price: 299,
                category: mainCourse._id,
                isVeg: true,
                image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=800',
                isAvailable: true
            },
            {
                name: 'Gulab Jamun',
                description: 'Soft, golden-brown dumplings made from khoya, soaked in aromatic sugar syrup. Served warm.',
                price: 149,
                category: desserts._id,
                isVeg: true,
                image: 'https://www.themealdb.com/images/media/meals/wkhg581762773124.jpg?auto=format&fit=crop&q=80&w=800',
                isAvailable: true
            },
            {
                name: 'Mango Lassi',
                description: 'A refreshing, creamy yogurt-based drink blended with sweet Alphonso mangoes.',
                price: 129,
                category: desserts._id,
                isVeg: true,
                image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&q=80&w=800',
                isAvailable: true
            }
        ];

        await MenuItem.insertMany(items);

        console.log('Successfully seeded 3 categories and 5 menu items!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
