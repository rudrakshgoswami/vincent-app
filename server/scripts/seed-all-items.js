import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../src/models/Category.js';
import MenuItem from '../src/models/MenuItem.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const data = {
  "menu": [
    {
      "category": "Mocktails",
      "items": [
        "Designated Appletini",
        "Orange Lime Relaxer",
        "Watermelon Breeze",
        "French Kiss",
        "Green Ice Cooler",
        "Kiwi Lemon Mojito",
        "Fruit Punch",
        "Virgin Colada",
        "Mint Mojito"
      ]
    },
    {
      "category": "Milkshakes",
      "items": [
        "Kesar Pista",
        "Rajbhog",
        "Strawberry",
        "Chocolate",
        "Vanilla",
        "Cold Coffee with Ice Cream",
        "KitKat Shake",
        "Oreo Shake"
      ]
    },
    {
      "category": "Soups",
      "items": [
        "Broccoli Almond Soup",
        "French Onion Soup",
        "Thai Coconut Soup",
        "Jalapeno Cheese Soup",
        "Burnt Garlic Soup",
        "Hot & Sour Soup",
        "Burmese Khow Suey Soup",
        "Beijing Manchow Soup",
        "Lemon Coriander Soup",
        "Di Fung Soup",
        "Tom Yum Soup",
        "Mexican Chilly Beans Soup",
        "Mexican Tortilla Soup",
        "Minestrone Soup",
        "Clear Soup",
        "Sweet Corn Soup",
        "Classic Tomato Soup",
        "Tomato Basil Soup",
        "Cream of Veg Soup"
      ]
    },
    {
      "category": "Salads",
      "items": [
        "Mexican Salad",
        "Waldorf Salad",
        "Garden Fresh Veg Salad",
        "Russian Salad",
        "Kachumber Salad",
        "Butter Corn Salad",
        "Macaroni Pineapple Salad"
      ]
    },
    {
      "category": "Indian Starters",
      "items": [
        "Paneer Peri Peri Tikka",
        "Sizzling Tandoori Tikka",
        "Tandoori Khazana",
        "Pesto Paneer Tikka",
        "Fresh Pudina Paneer Tikka",
        "Afghani Paneer Tikka",
        "Ajwaini Kalimirch Paneer Tikka",
        "Banjara Paneer Tikka",
        "Kasundi Paneer Tikka",
        "Cheesy Paneer Tikka",
        "Malai Paneer Tikka",
        "Hara Bhara Kabab",
        "Hara Bhara Cheese Kabab",
        "Peri Peri Cheese Seekh Kabab"
      ]
    },
    {
      "category": "Chinese Starters",
      "items": [
        "Pesto Paneer Chilly",
        "Crispy Spinach Cottage Cheese",
        "Paneer Chilly Dry",
        "Paneer Manchurian Dry",
        "Honey Chilli Potato",
        "Golden Fry Baby Corn",
        "Veg Manchurian Dry",
        "Crispy Veg",
        "Paneer Hot Pot",
        "Smokey Coating Paneer",
        "Mushroom Chilly Dry",
        "Chinese Bhel",
        "Veg 65",
        "Paneer 65",
        "Veg Lollipop",
        "Green Land Manchurian",
        "Veg Spring Roll"
      ]
    },
    {
      "category": "Chinese Main Course",
      "items": [
        "Paneer Manchurian Gravy",
        "Veg Manchurian Gravy",
        "Veg Hot Garlic Sauce",
        "Mushroom Manchurian Gravy",
        "Sweet & Sour Veg",
        "Chef Special Gravy"
      ]
    },
    {
      "category": "Rice & Noodles",
      "items": [
        "American Chopsuey",
        "Veg Hakka Noodles",
        "Schezwan Noodles",
        "Oriental Fried Rice",
        "Mushroom Fried Rice",
        "Baby Corn Mushroom Rice",
        "Veg Fried Rice",
        "Spinach Burnt Garlic Rice",
        "Mexican Rice"
      ]
    },
    {
      "category": "Pasta",
      "items": [
        "Arrabiata",
        "Alfredo",
        "Pink Sauce Pasta",
        "Pesto Pasta",
        "Pasta Pinalo",
        "Aglio Olio Pasta",
        "Dil Bruno Pasta"
      ]
    },
    {
      "category": "Sizzlers",
      "items": [
        "Oriental Sizzler",
        "Paneer Shashlik Sizzler",
        "Italian Sizzler",
        "Paneer Stick Sizzler",
        "Mexican Sizzler",
        "Exotic Veg Sizzler"
      ]
    },
    {
      "category": "Indian Main Course",
      "items": [
        "Paneer Angara",
        "Paneer Tikka Methi Masala",
        "Maska Paneer",
        "Paneer Achari",
        "Paneer Lababdar",
        "Paneer Laziz",
        "Paneer Mirchi Kurchan",
        "Paneer Mushroom Masala",
        "Paneer Bhurji",
        "Paneer Kadai",
        "Paneer Handi",
        "Paneer Palak",
        "Cheese Butter Masala",
        "Veg Angara",
        "Darbari Kofta",
        "Veg Hyderabadi",
        "Veg Navratan Korma",
        "Corn Butter Masala",
        "Chana Masala"
      ]
    },
    {
      "category": "Breads",
      "items": [
        "Tandoori Roti",
        "Butter Roti",
        "Plain Naan",
        "Butter Naan",
        "Butter Kulcha",
        "Pudina Paratha",
        "Methi Paratha",
        "Cheese Naan",
        "Kashmiri Naan",
        "Garlic Naan",
        "Hariyali Naan",
        "Cheese Garlic Naan",
        "Cheese Chilli Naan"
      ]
    },
    {
      "category": "Rice",
      "items": [
        "Paneer Awadhi Biryani",
        "Hyderabadi Biryani",
        "Matka Biryani",
        "Kashmiri Pulao",
        "Navratna Pulao",
        "Veg Pulao",
        "Jeera Rice",
        "Steam Rice"
      ]
    },
    {
      "category": "Pizza",
      "items": [
        "Veg Magic Pizza",
        "Taste of India Pizza",
        "Spicy American Pizza",
        "Veg Supremo Pizza",
        "Margherita Pizza",
        "Desi Dhamaka Pizza",
        "Cheese Pizza"
      ]
    },
    {
      "category": "Snacks",
      "items": [
        "Grilled Sandwich",
        "Club Sandwich",
        "Cheese Chilly Toast",
        "Garlic Chilly Toast",
        "Veg Sandwich",
        "French Fries",
        "Peri Peri Fries",
        "Cheese Fries",
        "Garlic Bread",
        "Cheese Garlic Bread",
        "Bruschetta"
      ]
    },
    {
      "category": "Desserts",
      "items": [
        "Ice Cream",
        "Premium Ice Cream",
        "Vanilla with Hot Gulab Jamun",
        "Hot Gulab Jamun",
        "Signature Sundae",
        "Sizzling Brownie"
      ]
    }
  ]
};

// Pricing rule utility to get a random price in a suitable range
function getPriceRange(categoryName) {
    switch(categoryName) {
        case "Mocktails": return { min: 150, max: 200 };
        case "Milkshakes": return { min: 150, max: 250 };
        case "Soups": return { min: 130, max: 200 };
        case "Salads": return { min: 130, max: 250 };
        case "Indian Starters": return { min: 300, max: 400 };
        case "Chinese Starters": return { min: 250, max: 320 };
        case "Chinese Main Course": return { min: 250, max: 320 };
        case "Rice & Noodles": return { min: 250, max: 320 };
        case "Pasta": return { min: 300, max: 350 };
        case "Sizzlers": return { min: 500, max: 600 };
        case "Indian Main Course": return { min: 280, max: 350 };
        case "Breads": return { min: 30, max: 120 };
        case "Rice": return { min: 140, max: 300 };
        case "Pizza": return { min: 250, max: 300 };
        case "Snacks": return { min: 120, max: 250 };
        case "Desserts": return { min: 70, max: 220 };
        default: return { min: 100, max: 300 };
    }
}

function getRandomPrice(min, max) {
    // Return a rounded price (e.g., ends in 0 or 5)
    const raw = Math.floor(Math.random() * (max - min + 1)) + min;
    return Math.round(raw / 10) * 10;
}

const seedAllItems = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        let totalAdded = 0;

        for (const catData of data.menu) {
            const catObj = await Category.findOne({ name: catData.category });
            
            if (!catObj) {
                console.warn(`Category not found: ${catData.category}. Skipping its items.`);
                continue;
            }

            const priceRange = getPriceRange(catData.category);

            for (const itemName of catData.items) {
                const existing = await MenuItem.findOne({ name: itemName, category: catObj._id });
                if (!existing) {
                    await MenuItem.create({
                        name: itemName,
                        description: `A delicious serving of ${itemName}.`,
                        price: getRandomPrice(priceRange.min, priceRange.max),
                        category: catObj._id,
                        isVeg: true,
                        isAvailable: true,
                        image: '' // Leaving empty initially
                    });
                    totalAdded++;
                    console.log(`+ Added: ${itemName} (${catData.category})`);
                } else {
                    // console.log(`- Exists: ${itemName}`);
                }
            }
        }

        console.log(`\nSuccess! Seeded ${totalAdded} new items into the database.`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedAllItems();
