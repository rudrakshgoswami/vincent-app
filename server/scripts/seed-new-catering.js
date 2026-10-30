import mongoose from 'mongoose';
import CateringPackage from '../src/models/CateringPackage.js';
import FoodCategory from '../src/models/FoodCategory.js';
import FoodItem from '../src/models/FoodItem.js';
import LiveCounter from '../src/models/LiveCounter.js';
import CateringAddOn from '../src/models/CateringAddOn.js';

const MONGO_URI = 'mongodb://localhost:27017/vincent_db';

const seedCatering = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB...');

        // Clear existing data
        await CateringPackage.deleteMany();
        await FoodCategory.deleteMany();
        await FoodItem.deleteMany();
        await LiveCounter.deleteMany();
        await CateringAddOn.deleteMany();
        console.log('Cleared existing catering data');

        // Create Packages
        const packages = await CateringPackage.insertMany([
            { name: "Standard Veg Thali", description: "A simple and delicious veg spread.", pricePerPlate: 500, minGuests: 50, maxGuests: 500, isActive: true, thumbnail: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80" },
            { name: "Premium Veg Buffet", description: "An elaborate spread with more options and live counters.", pricePerPlate: 800, minGuests: 100, maxGuests: 1000, isActive: true, thumbnail: "https://images.unsplash.com/photo-1540224871915-bc8ffb782bdf?w=500&q=80" },
            { name: "Royal Veg Feast", description: "The ultimate luxury dining experience with exotic dishes.", pricePerPlate: 1200, minGuests: 150, maxGuests: 2000, isActive: true, thumbnail: "https://www.themealdb.com/images/media/meals/zub3s91764110535.jpg?w=500&q=80" }
        ]);

        const [pStd, pPrem, pRoy] = packages;
        const allPkgIds = [pStd._id, pPrem._id, pRoy._id];
        const premRoyIds = [pPrem._id, pRoy._id];

        // Create Categories
        const categories = await FoodCategory.insertMany([
            { name: "Welcome Drinks", selectionLimit: 2, packageIds: allPkgIds, isMandatory: true, sortOrder: 1 },
            { name: "Starters (Veg)", selectionLimit: 3, packageIds: allPkgIds, isMandatory: true, sortOrder: 2 },
            { name: "Main Course", selectionLimit: 4, packageIds: allPkgIds, isMandatory: true, sortOrder: 3 },
            { name: "Indian Breads", selectionLimit: 2, packageIds: allPkgIds, isMandatory: true, sortOrder: 4 },
            { name: "Rice & Biryani", selectionLimit: 1, packageIds: allPkgIds, isMandatory: true, sortOrder: 5 },
            { name: "Desserts", selectionLimit: 2, packageIds: allPkgIds, isMandatory: true, sortOrder: 6 }
        ]);

        const getCatId = (name) => categories.find(c => c.name === name)._id;

        // Create Items (Veg Only)
        await FoodItem.insertMany([
            // Welcome Drinks
            { name: "Fresh Lime Soda", description: "Refreshing sweet & salt lime soda", image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80", categoryId: getCatId("Welcome Drinks"), packageIds: allPkgIds, foodType: "Vegan", isAvailable: true },
            { name: "Mango Lassi", description: "Thick, sweet yogurt drink flavored with mango", image: "https://www.themealdb.com/images/media/meals/adxcbq1619787919.jpg?w=500&q=80", categoryId: getCatId("Welcome Drinks"), packageIds: allPkgIds, foodType: "Veg", isAvailable: true },
            { name: "Blue Lagoon Mocktail", description: "Blue curacao and lemonade", image: "https://www.themealdb.com/images/media/meals/a4kgf21763075288.jpg?w=500&q=80", categoryId: getCatId("Welcome Drinks"), packageIds: premRoyIds, foodType: "Vegan", isAvailable: true },
            { name: "Watermelon Mojito", description: "Fresh watermelon with mint", image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80", categoryId: getCatId("Welcome Drinks"), packageIds: premRoyIds, foodType: "Vegan", isAvailable: true },

            // Starters
            { name: "Paneer Tikka", description: "Cubes of paneer marinated in spices and grilled in a tandoor", image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80", categoryId: getCatId("Starters (Veg)"), packageIds: allPkgIds, foodType: "Veg", isAvailable: true },
            { name: "Hara Bhara Kabab", description: "Healthy kababs made from spinach, peas, and potatoes", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80", categoryId: getCatId("Starters (Veg)"), packageIds: allPkgIds, foodType: "Vegan", isAvailable: true },
            { name: "Chilli Gobi", description: "Cauliflower florets tossed in spicy soy sauce", image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&q=80", categoryId: getCatId("Starters (Veg)"), packageIds: allPkgIds, foodType: "Vegan", isAvailable: true },
            { name: "Mushroom Tikka", description: "Marinated mushrooms grilled to perfection", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&q=80", categoryId: getCatId("Starters (Veg)"), packageIds: premRoyIds, foodType: "Veg", isAvailable: true },
            { name: "Cheese Corn Balls", description: "Crispy fried balls stuffed with cheese and sweet corn", image: "https://www.themealdb.com/images/media/meals/5jdtie1763289302.jpg?w=500&q=80", categoryId: getCatId("Starters (Veg)"), packageIds: premRoyIds, foodType: "Veg", isAvailable: true },

            // Main Course
            { name: "Paneer Butter Masala", description: "Rich and creamy tomato-based paneer curry", image: "https://www.themealdb.com/images/media/meals/zub3s91764110535.jpg?w=500&q=80", categoryId: getCatId("Main Course"), packageIds: allPkgIds, foodType: "Veg", isAvailable: true },
            { name: "Dal Makhani", description: "Slow-cooked black lentils with cream and butter", image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80", categoryId: getCatId("Main Course"), packageIds: allPkgIds, foodType: "Veg", isAvailable: true },
            { name: "Mix Veg Curry", description: "Assorted vegetables cooked in a spicy gravy", image: "https://images.unsplash.com/photo-1540224871915-bc8ffb782bdf?w=500&q=80", categoryId: getCatId("Main Course"), packageIds: allPkgIds, foodType: "Vegan", isAvailable: true },
            { name: "Malai Kofta", description: "Potato and paneer balls deep-fried and served in a creamy sauce", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80", categoryId: getCatId("Main Course"), packageIds: premRoyIds, foodType: "Veg", isAvailable: true },
            { name: "Kadhai Paneer", description: "Paneer cooked with bell peppers and whole spices", image: "https://www.themealdb.com/images/media/meals/tbj1bs1764118062.jpg?w=500&q=80", categoryId: getCatId("Main Course"), packageIds: premRoyIds, foodType: "Veg", isAvailable: true },

            // Breads
            { name: "Butter Naan", description: "Soft Indian flatbread brushed with butter", image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80", categoryId: getCatId("Indian Breads"), packageIds: allPkgIds, foodType: "Veg", isAvailable: true },
            { name: "Tandoori Roti", description: "Whole wheat bread baked in a tandoor", image: "https://www.themealdb.com/images/media/meals/grhn401765687086.jpg?w=500&q=80", categoryId: getCatId("Indian Breads"), packageIds: allPkgIds, foodType: "Vegan", isAvailable: true },
            { name: "Garlic Naan", description: "Naan topped with minced garlic and cilantro", image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80", categoryId: getCatId("Indian Breads"), packageIds: premRoyIds, foodType: "Veg", isAvailable: true },

            // Rice
            { name: "Jeera Rice", description: "Basmati rice cooked with cumin seeds", image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=80", categoryId: getCatId("Rice & Biryani"), packageIds: allPkgIds, foodType: "Vegan", isAvailable: true },
            { name: "Veg Dum Biryani", description: "Aromatic layered rice cooked with vegetables and spices", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80", categoryId: getCatId("Rice & Biryani"), packageIds: allPkgIds, foodType: "Veg", isAvailable: true },
            { name: "Peas Pulao", description: "A simple and mildly spiced rice dish with green peas", image: "https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?w=500&q=80", categoryId: getCatId("Rice & Biryani"), packageIds: premRoyIds, foodType: "Vegan", isAvailable: true },

            // Desserts
            { name: "Gulab Jamun", description: "Deep-fried milk-solid balls soaked in sugar syrup", image: "https://www.themealdb.com/images/media/meals/wxywrq1468235067.jpg?w=500&q=80", categoryId: getCatId("Desserts"), packageIds: allPkgIds, foodType: "Veg", isAvailable: true },
            { name: "Rasgulla", description: "Spongy cottage cheese balls cooked in light sugar syrup", image: "https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg?w=500&q=80", categoryId: getCatId("Desserts"), packageIds: allPkgIds, foodType: "Veg", isAvailable: true },
            { name: "Gajar Ka Halwa", description: "Rich carrot pudding loaded with dry fruits", image: "https://www.themealdb.com/images/media/meals/c0gmo31766594751.jpg?w=500&q=80", categoryId: getCatId("Desserts"), packageIds: premRoyIds, foodType: "Veg", isAvailable: true },
            { name: "Vanilla Ice Cream", description: "Classic vanilla flavored ice cream", image: "https://www.themealdb.com/images/media/meals/q47rkb1762324620.jpg?w=500&q=80", categoryId: getCatId("Desserts"), packageIds: allPkgIds, foodType: "Veg", isAvailable: true }
        ]);

        console.log('Categories & Items seeded');

        // Create Live Counters
        await LiveCounter.insertMany([
            { name: "Pani Puri Station", description: "Unlimited fresh pani puri", image: "https://www.themealdb.com/images/media/meals/fg7d641784666908.jpg?w=500&q=80", packageIds: allPkgIds, isAddOn: false, addOnPricePerPlate: 0 },
            { name: "Pasta Counter", description: "Live pasta with choices of red, white, or mixed sauce", image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500&q=80", packageIds: [pRoy._id], isAddOn: false, addOnPricePerPlate: 0 },
            { name: "Pasta Counter (Add-on)", description: "Live pasta with choices of red, white, or mixed sauce", image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500&q=80", packageIds: [pStd._id, pPrem._id], isAddOn: true, addOnPricePerPlate: 80 },
            { name: "Waffle Station", description: "Freshly baked waffles with assorted toppings", image: "https://www.themealdb.com/images/media/meals/jvjnoh1780086318.jpg?w=500&q=80", packageIds: allPkgIds, isAddOn: true, addOnPricePerPlate: 60 },
            { name: "Live Chaat Counter", description: "Samosa chaat, Aloo tikki chaat and more", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80", packageIds: premRoyIds, isAddOn: false, addOnPricePerPlate: 0 }
        ]);

        console.log('Live counters seeded');

        // Create Add-ons
        await CateringAddOn.insertMany([
            { name: "Mineral Water Bottles (250ml)", description: "Served on each table", pricingType: "per_plate", price: 20, isActive: true },
            { name: "Premium Cutlery Set", description: "Gold-plated elegant cutlery on all tables", pricingType: "flat", price: 5000, isActive: true },
            { name: "Midnight Snack Boxes", description: "Small snack packs for late-night guests", pricingType: "per_plate", price: 150, isActive: true }
        ]);

        console.log('Add-ons seeded');

        console.log('Seeding Complete!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seedCatering();
