import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url) });
import mongoose from 'mongoose';
import Venue from '../src/models/Venue.js';
import CateringPackage from '../src/models/CateringPackage.js';
import CateringExtra from '../src/models/CateringAddOn.js'; // Aliased, same as venueController.js
import ServicePackage from '../src/models/ServicePackage.js';

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing
        await Venue.deleteMany({});
        await CateringPackage.deleteMany({});
        await CateringExtra.deleteMany({});
        await ServicePackage.deleteMany({});
        console.log('Cleared existing venue data');

        // ===================== VENUES =====================
        const venues = await Venue.insertMany([
            {
                name: 'Royal Banquet Hall',
                slug: 'royal-banquet-hall',
                type: 'banquet_hall',
                setting: 'indoor',
                description: 'Experience grandeur at its finest in our Royal Banquet Hall. Featuring crystal chandeliers, marble flooring, and state-of-the-art climate control, this venue is perfect for weddings, receptions, and corporate galas. With dedicated changing rooms, a commercial kitchen, and ample parking, every detail is taken care of.',
                shortDescription: 'Elegant indoor banquet hall with crystal chandeliers and premium amenities for up to 500 guests.',
                capacity: { min: 100, max: 500 },
                area: 8000,
                dimensions: { length: 100, width: 80, height: 25 },
                location: {
                    address: '42, Marine Drive Cross Road',
                    area: 'South Mumbai',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400002',
                    coordinates: { lat: 18.9442, lng: 72.8234 },
                    landmarks: [
                        { name: 'Gateway of India', distance: '2 km', icon: '🏛️' },
                        { name: 'Marine Drive', distance: '500 m', icon: '🌊' }
                    ],
                    distanceFromKeyLocations: { airport: '28 km', railwayStation: '4 km', metroStation: '1.5 km' }
                },
                contact: {
                    phone: '+91 98765 43210',
                    email: 'info@royalbanquet.com',
                    website: 'www.royalbanquet.com',
                    officeHours: '09:00 AM - 09:00 PM'
                },
                pricing: {
                    weekday: { morning: 30000, afternoon: 35000, evening: 50000, fullDay: 90000 },
                    weekend: { morning: 40000, afternoon: 45000, evening: 65000, fullDay: 120000 },
                    holiday: { morning: 50000, afternoon: 55000, evening: 80000, fullDay: 150000 },
                    securityDeposit: 10000,
                    cleaningFee: 2000,
                    extraHourCharge: 5000,
                    gstRate: 18,
                    gstIncluded: false
                },
                amenities: [
                    { name: 'Car Parking', category: 'parking', icon: '🅿️', details: '150 spaces + valet', quantity: 150, available: true },
                    { name: 'Air Conditioning', category: 'climate', icon: '❄️', details: 'Central AC', available: true },
                    { name: 'Sound System', category: 'av', icon: '🔊', details: 'Professional Bose system with 4 wireless mics', quantity: 4, available: true },
                    { name: 'Projector & Screen', category: 'av', icon: '📽️', available: true },
                    { name: 'Elevated Stage', category: 'stage', icon: '🎭', details: '20×15 ft with backstage', available: true },
                    { name: 'Stage Lighting', category: 'lighting', icon: '💡', details: 'Professional lighting rig', available: true },
                    { name: 'Commercial Kitchen', category: 'catering', icon: '🍳', available: true },
                    { name: 'Green Rooms', category: 'stage', icon: '🚪', details: '2 rooms with vanity mirrors', quantity: 2, available: true },
                    { name: 'Premium Washrooms', category: 'restrooms', icon: '🚿', details: 'Men: 6, Women: 6', available: true },
                    { name: 'High-Speed WiFi', category: 'connectivity', icon: '📶', details: '500 users capacity', available: true },
                    { name: 'Power Backup', category: 'connectivity', icon: '🔋', details: '100% backup generator', available: true },
                    { name: '24/7 Security', category: 'security', icon: '🛡️', details: 'Guards + CCTV', available: true },
                    { name: 'Wheelchair Accessible', category: 'other', icon: '♿', available: true }
                ],
                media: [
                    { type: 'image', url: '/images/venues/royal-1.jpg', category: 'interior', caption: 'Grand Ballroom', isCover: true, order: 0 },
                    { type: 'image', url: '/images/venues/royal-2.jpg', category: 'interior', caption: 'Crystal Chandeliers', order: 1 },
                    { type: 'image', url: '/images/venues/royal-3.jpg', category: 'exterior', caption: 'Entrance', order: 2 },
                    { type: 'image', url: '/images/venues/royal-4.jpg', category: 'events', caption: 'Wedding Setup', order: 3 }
                ],
                seatingCapacity: { theater: 500, banquet: 350, cocktail: 600, classroom: 250 },
                rating: 4.8,
                reviewCount: 124,
                reviews: [
                    { userName: 'Priya Sharma', rating: 5, comment: 'Absolutely stunning venue! Perfect for our 300-guest wedding.', eventType: 'wedding_reception', status: 'approved', createdAt: new Date('2024-11-15') },
                    { userName: 'Amit Kumar', rating: 4.5, comment: 'Great venue, excellent staff service. Slightly pricey but worth it.', eventType: 'corporate_event', status: 'approved', createdAt: new Date('2024-10-22') }
                ],
                policies: {
                    minAdvanceBooking: 7,
                    maxAdvanceBooking: 365,
                    advancePaymentPercent: 40,
                    cancellation: [
                        { daysBeforeEvent: 30, refundPercent: 100 },
                        { daysBeforeEvent: 15, refundPercent: 50 },
                        { daysBeforeEvent: 7, refundPercent: 25 },
                        { daysBeforeEvent: 0, refundPercent: 0 }
                    ],
                    rules: ['No smoking indoors', 'No outside alcohol', 'Noise restrictions after 11 PM', 'Decorations allowed with approval'],
                    noSmoking: true, noOutsideAlcohol: true
                },
                status: 'active',
                featured: true,
                trending: true,
                tags: ['luxury', 'wedding', 'corporate', 'spacious', 'premium'],
                priorityScore: 9
            },
            {
                name: 'Garden Paradise',
                slug: 'garden-paradise',
                type: 'lawn_garden',
                setting: 'outdoor',
                description: 'A lush green paradise perfect for outdoor celebrations. Our beautifully landscaped garden spans over 12,000 sq ft with manicured lawns, decorative fountains, and ambient lighting. Ideal for weddings, receptions, and social gatherings under the stars.',
                shortDescription: 'Beautiful outdoor garden venue with lush lawns and fountains for up to 800 guests.',
                capacity: { min: 150, max: 800 },
                area: 12000,
                location: {
                    address: '78, Juhu Beach Road',
                    area: 'Juhu',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400049',
                    coordinates: { lat: 19.0988, lng: 72.8267 },
                    landmarks: [
                        { name: 'Juhu Beach', distance: '200 m', icon: '🏖️' },
                        { name: 'ISKCON Temple', distance: '1 km', icon: '🛕' }
                    ]
                },
                contact: { phone: '+91 98765 12345', email: 'info@gardenparadise.com' },
                pricing: {
                    weekday: { morning: 40000, afternoon: 45000, evening: 60000, fullDay: 100000 },
                    weekend: { morning: 55000, afternoon: 60000, evening: 80000, fullDay: 140000 },
                    holiday: { morning: 65000, afternoon: 70000, evening: 95000, fullDay: 170000 },
                    securityDeposit: 15000, cleaningFee: 3000, extraHourCharge: 6000, gstRate: 18
                },
                amenities: [
                    { name: 'Car Parking', category: 'parking', icon: '🅿️', details: '200 spaces', quantity: 200, available: true },
                    { name: 'Outdoor Cooling', category: 'climate', icon: '💨', details: 'Misting fans & coolers', available: true },
                    { name: 'Sound System', category: 'av', icon: '🔊', available: true },
                    { name: 'Stage Platform', category: 'stage', icon: '🎭', details: '30×20 ft', available: true },
                    { name: 'Decorative Lighting', category: 'lighting', icon: '✨', details: 'Fairy lights throughout', available: true },
                    { name: 'Garden Area', category: 'outdoor', icon: '🌳', available: true },
                    { name: 'Gazebo', category: 'outdoor', icon: '⛺', details: 'Decorative pavilion', available: true },
                    { name: 'Power Backup', category: 'connectivity', icon: '🔋', available: true },
                    { name: 'Fountain', category: 'outdoor', icon: '⛲', details: 'Decorative water fountain', available: true }
                ],
                media: [
                    { type: 'image', url: '/images/venues/garden-1.jpg', category: 'exterior', caption: 'Lush Garden View', isCover: true, order: 0 },
                    { type: 'image', url: '/images/venues/garden-2.jpg', category: 'events', caption: 'Evening Event', order: 1 }
                ],
                seatingCapacity: { theater: 800, banquet: 500, cocktail: 1000 },
                rating: 4.9,
                reviewCount: 98,
                reviews: [
                    { userName: 'Neha Patel', rating: 5, comment: 'Dreamy outdoor setting! The fairy lights made our reception magical.', eventType: 'wedding_reception', status: 'approved', createdAt: new Date('2024-12-01') }
                ],
                policies: {
                    minAdvanceBooking: 10,
                    maxAdvanceBooking: 365,
                    advancePaymentPercent: 40,
                    cancellation: [
                        { daysBeforeEvent: 30, refundPercent: 100 },
                        { daysBeforeEvent: 15, refundPercent: 50 },
                        { daysBeforeEvent: 7, refundPercent: 25 }
                    ],
                    rules: ['Weather-dependent events', 'No fireworks', 'Noise restrictions after 10:30 PM']
                },
                status: 'active', featured: true, tags: ['outdoor', 'wedding', 'garden', 'romantic'], priorityScore: 8
            },
            {
                name: 'Skyline Rooftop',
                slug: 'skyline-rooftop',
                type: 'rooftop',
                setting: 'outdoor',
                description: 'Elevate your event at Skyline Rooftop with breathtaking panoramic city views. This modern rooftop venue features contemporary design, ambient lighting, and a stunning infinity pool backdrop. Perfect for cocktail parties, birthdays, and intimate celebrations.',
                shortDescription: 'Modern rooftop venue with panoramic city views for up to 200 guests.',
                capacity: { min: 50, max: 200 },
                area: 4000,
                location: {
                    address: '15th Floor, Tower B, BKC Complex',
                    area: 'BKC',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400051',
                    coordinates: { lat: 19.0665, lng: 72.8691 }
                },
                contact: { phone: '+91 98765 67890', email: 'events@skylinerooftop.com' },
                pricing: {
                    weekday: { morning: 25000, afternoon: 28000, evening: 45000, fullDay: 75000 },
                    weekend: { morning: 35000, afternoon: 38000, evening: 58000, fullDay: 95000 },
                    holiday: { morning: 40000, afternoon: 45000, evening: 70000, fullDay: 120000 },
                    securityDeposit: 8000, cleaningFee: 2500, extraHourCharge: 4000, gstRate: 18
                },
                amenities: [
                    { name: 'Elevator Access', category: 'parking', icon: '🛗', available: true },
                    { name: 'Sound System', category: 'av', icon: '🔊', available: true },
                    { name: 'LED Screens', category: 'av', icon: '📺', available: true },
                    { name: 'Ambient Lighting', category: 'lighting', icon: '💡', available: true },
                    { name: 'Bar Counter', category: 'catering', icon: '🍸', available: true },
                    { name: 'WiFi', category: 'connectivity', icon: '📶', available: true },
                    { name: 'Poolside Area', category: 'outdoor', icon: '🏊', available: true }
                ],
                media: [
                    { type: 'image', url: '/images/venues/skyline-1.jpg', category: 'exterior', caption: 'Rooftop View', isCover: true, order: 0 }
                ],
                rating: 4.6, reviewCount: 67,
                policies: {
                    minAdvanceBooking: 5, maxAdvanceBooking: 180,
                    advancePaymentPercent: 50,
                    cancellation: [{ daysBeforeEvent: 15, refundPercent: 75 }, { daysBeforeEvent: 7, refundPercent: 30 }],
                    rules: ['No loud music after 10 PM', 'Max 200 guests', 'Weather conditions apply']
                },
                status: 'active', tags: ['rooftop', 'cocktail', 'birthday', 'city-views', 'modern'], priorityScore: 7
            },
            {
                name: 'Elite Conference Center',
                slug: 'elite-conference-center',
                type: 'conference_hall',
                setting: 'indoor',
                description: 'State-of-the-art conference facility equipped with the latest technology for corporate events, seminars, and product launches. Features modular spaces that can be configured for theater, classroom, or boardroom setups.',
                shortDescription: 'Modern conference center with cutting-edge AV tech for up to 300 professionals.',
                capacity: { min: 30, max: 300 },
                area: 5000,
                location: {
                    address: '5th Floor, Nirlon Knowledge Park', area: 'Goregaon East', city: 'Mumbai', state: 'Maharashtra', pincode: '400063',
                    coordinates: { lat: 19.1623, lng: 72.8603 }
                },
                contact: { phone: '+91 98765 09876', email: 'corporate@eliteconference.com' },
                pricing: {
                    weekday: { morning: 20000, afternoon: 22000, evening: 35000, fullDay: 55000 },
                    weekend: { morning: 28000, afternoon: 30000, evening: 42000, fullDay: 70000 },
                    holiday: { morning: 32000, afternoon: 35000, evening: 48000, fullDay: 80000 },
                    securityDeposit: 5000, cleaningFee: 1500, extraHourCharge: 3500, gstRate: 18
                },
                amenities: [
                    { name: 'Projectors', category: 'av', icon: '📽️', details: '4K Laser Projectors', quantity: 3, available: true },
                    { name: 'Video Conferencing', category: 'av', icon: '📹', details: 'Zoom/Teams ready', available: true },
                    { name: 'Air Conditioning', category: 'climate', icon: '❄️', available: true },
                    { name: 'WiFi', category: 'connectivity', icon: '📶', details: 'Enterprise-grade', available: true },
                    { name: 'Parking', category: 'parking', icon: '🅿️', details: '100 spaces', quantity: 100, available: true },
                    { name: 'Breakout Rooms', category: 'other', icon: '🚪', details: '4 rooms', quantity: 4, available: true },
                    { name: 'Whiteboard Walls', category: 'other', icon: '📝', available: true }
                ],
                media: [
                    { type: 'image', url: '/images/venues/elite-1.jpg', category: 'interior', caption: 'Main Hall', isCover: true, order: 0 }
                ],
                seatingCapacity: { theater: 300, banquet: 200, classroom: 150, ushape: 80 },
                rating: 4.5, reviewCount: 45,
                status: 'active', tags: ['corporate', 'conference', 'seminar', 'tech-ready'], priorityScore: 6
            },
            {
                name: 'Heritage Haveli',
                slug: 'heritage-haveli',
                type: 'banquet_hall',
                setting: 'both',
                description: 'A stunning restored heritage property combining old-world charm with modern amenities. Features magnificent Rajasthani architecture, intricate jali work, hand-painted murals, and expansive courtyards. Both indoor halls and outdoor courtyards available.',
                shortDescription: 'Heritage-style venue with Rajasthani architecture, indoor halls and courtyards for up to 600 guests.',
                capacity: { min: 100, max: 600 },
                area: 10000,
                location: {
                    address: '88, Colaba Causeway', area: 'Colaba', city: 'Mumbai', state: 'Maharashtra', pincode: '400005',
                    coordinates: { lat: 18.9220, lng: 72.8347 }
                },
                contact: { phone: '+91 98765 11111', email: 'events@heritagehaveli.com' },
                pricing: {
                    weekday: { morning: 45000, afternoon: 50000, evening: 70000, fullDay: 130000 },
                    weekend: { morning: 60000, afternoon: 65000, evening: 90000, fullDay: 160000 },
                    holiday: { morning: 75000, afternoon: 80000, evening: 110000, fullDay: 200000 },
                    securityDeposit: 20000, cleaningFee: 5000, extraHourCharge: 8000, gstRate: 18
                },
                amenities: [
                    { name: 'Valet Parking', category: 'parking', icon: '🅿️', details: '100 spaces', available: true },
                    { name: 'Heritage Architecture', category: 'other', icon: '🏰', available: true },
                    { name: 'Courtyard', category: 'outdoor', icon: '🌺', available: true },
                    { name: 'Indoor Hall', category: 'other', icon: '🏛️', available: true },
                    { name: 'Air Conditioning', category: 'climate', icon: '❄️', available: true },
                    { name: 'Sound System', category: 'av', icon: '🔊', available: true },
                    { name: 'Photo Booth Area', category: 'other', icon: '📸', available: true }
                ],
                media: [
                    { type: 'image', url: '/images/venues/heritage-1.jpg', category: 'exterior', caption: 'Haveli Entrance', isCover: true, order: 0 }
                ],
                rating: 4.7, reviewCount: 89,
                status: 'active', featured: true, tags: ['heritage', 'wedding', 'traditional', 'premium', 'photography'], priorityScore: 8
            },
            {
                name: 'Lakeview Farmhouse',
                slug: 'lakeview-farmhouse',
                type: 'farmhouse',
                setting: 'both',
                description: 'Escape the city and celebrate at our serene lakeside farmhouse. Spread across 2 acres with a private lake, lush landscapes, and rustic-chic interiors. Perfect for intimate destination-style events within the city.',
                shortDescription: 'Rustic-chic farmhouse with private lake and 2 acres of gardens for up to 400 guests.',
                capacity: { min: 50, max: 400 },
                area: 15000,
                location: {
                    address: 'Off Mulund-Goregaon Link Road', area: 'Powai', city: 'Mumbai', state: 'Maharashtra', pincode: '400076',
                    coordinates: { lat: 19.1255, lng: 72.9086 }
                },
                contact: { phone: '+91 98765 22222', email: 'book@lakeviewfarm.com' },
                pricing: {
                    weekday: { morning: 35000, afternoon: 38000, evening: 55000, fullDay: 85000 },
                    weekend: { morning: 50000, afternoon: 55000, evening: 75000, fullDay: 120000 },
                    holiday: { morning: 60000, afternoon: 65000, evening: 90000, fullDay: 150000 },
                    securityDeposit: 12000, cleaningFee: 3000, extraHourCharge: 5000, gstRate: 18
                },
                amenities: [
                    { name: 'Ample Parking', category: 'parking', icon: '🅿️', details: '250+ spaces', available: true },
                    { name: 'Private Lake', category: 'outdoor', icon: '🏞️', available: true },
                    { name: 'Swimming Pool', category: 'outdoor', icon: '🏊', available: true },
                    { name: 'Indoor AC Hall', category: 'climate', icon: '❄️', available: true },
                    { name: 'Garden Lawns', category: 'outdoor', icon: '🌳', available: true },
                    { name: 'Kids Play Area', category: 'other', icon: '🎠', available: true },
                    { name: 'BBQ Area', category: 'catering', icon: '🍖', available: true },
                    { name: 'Power Backup', category: 'connectivity', icon: '🔋', available: true }
                ],
                media: [
                    { type: 'image', url: '/images/venues/lakeview-1.jpg', category: 'exterior', caption: 'Lake View', isCover: true, order: 0 }
                ],
                rating: 4.6, reviewCount: 56,
                status: 'active', tags: ['farmhouse', 'lake', 'rustic', 'destination', 'nature'], priorityScore: 7
            }
        ]);
        console.log(`✅ Created ${venues.length} venues`);

        // ===================== CATERING PACKAGES =====================
        const packages = await CateringPackage.insertMany([
            {
                name: 'Basic Package',
                tier: 'basic',
                description: 'A simple yet satisfying menu perfect for budget-conscious events. Features essential dishes that please every palate.',
                shortDescription: 'Essential menu for budget-friendly events',
                pricePerPlate: 350,
                minGuests: 50,
                menuItems: {
                    welcomeDrinks: [{ name: 'Masala Chai', icon: '☕' }],
                    starters: [{ name: 'Paneer Tikka', icon: '🧀' }, { name: 'Hara Bhara Kabab', icon: '🥗' }],
                    mainCourse: [
                        { name: 'Dal Makhani', icon: '🍲' }, { name: 'Kadhai Paneer', icon: '🧀' },
                        { name: 'Veg Biryani', icon: '🍚' }, { name: 'Jeera Rice', icon: '🍚' }
                    ],
                    breads: [{ name: 'Butter Naan', icon: '🫓' }, { name: 'Tandoori Roti', icon: '🫓' }],
                    accompaniments: [
                        { name: 'Raita', icon: '🥛' }, { name: 'Papad', icon: '🫓' },
                        { name: 'Pickle', icon: '🫙' }, { name: 'Salad', icon: '🥗' }, { name: 'Green Chutney', icon: '🟢' }
                    ],
                    desserts: [{ name: 'Gulab Jamun', icon: '🍩' }]
                },
                itemCounts: { welcomeDrinks: 1, starters: 2, mainCourse: 4, breads: 2, accompaniments: 5, desserts: 1 },
                serviceStyle: 'Buffet',
                highlights: ['Welcome Drinks (1)', 'Starters (2 items)', 'Main Course (4 items)', 'Breads (2 types)', 'Dessert (1 item)', 'Buffet Service'],
                dietary: '100% Vegetarian',
                badge: 'none',
                gstRate: 5,
                displayOrder: 1
            },
            {
                name: 'Standard Package',
                tier: 'standard',
                description: 'Our most popular package with a perfect balance of variety and value. Features an extensive menu with live counter and multiple dessert options.',
                shortDescription: 'Most popular balanced menu with live counters',
                pricePerPlate: 550,
                minGuests: 50,
                menuItems: {
                    welcomeDrinks: [{ name: 'Masala Chai', icon: '☕' }, { name: 'Virgin Mojito', icon: '🍹' }],
                    starters: [{ name: 'Paneer Tikka', icon: '🧀' }, { name: 'Hara Bhara Kabab', icon: '🥗' }, { name: 'Corn Cheese Balls', icon: '🧀' }, { name: 'Crispy Veg Fingers', icon: '🥕' }],
                    soup: [{ name: 'Tomato Shorba', icon: '🍅' }],
                    mainCourse: [
                        { name: 'Dal Makhani', icon: '🍲' }, { name: 'Kadhai Paneer', icon: '🧀' },
                        { name: 'Veg Kolhapuri', icon: '🌶️' }, { name: 'Veg Biryani', icon: '🍚' },
                        { name: 'Jeera Rice', icon: '🍚' }, { name: 'Curd Rice', icon: '🍚' }
                    ],
                    breads: [{ name: 'Butter Naan', icon: '🫓' }, { name: 'Tandoori Roti', icon: '🫓' }, { name: 'Garlic Naan', icon: '🫓' }],
                    accompaniments: [{ name: 'Raita', icon: '🥛' }, { name: 'Papad', icon: '🫓' }, { name: 'Pickle', icon: '🫙' }, { name: 'Salad Bar', icon: '🥗' }, { name: 'Green Chutney', icon: '🟢' }],
                    desserts: [{ name: 'Gulab Jamun', icon: '🍩' }, { name: 'Ice Cream', icon: '🍨' }],
                    liveCounters: [{ name: 'Chaat Counter', icon: '🍽️', description: 'Pani Puri, Dahi Puri, Sev Puri' }]
                },
                itemCounts: { welcomeDrinks: 2, starters: 4, soup: 1, mainCourse: 6, breads: 3, accompaniments: 5, desserts: 2, liveCounters: 1 },
                serviceStyle: 'Buffet + Live Counters',
                highlights: ['Welcome Drinks (2)', 'Starters (4 items)', 'Soup (1)', 'Main Course (6 items)', 'Live Chaat Counter', 'Ice Cream Station', 'Buffet + Live Service'],
                dietary: '100% Vegetarian',
                badge: 'popular',
                isPopular: true,
                comboDiscount: 15000,
                comboDiscountLabel: 'Save ₹15,000 with venue booking!',
                gstRate: 5,
                displayOrder: 2
            },
            {
                name: 'Premium Package',
                tier: 'premium',
                description: 'An elevated dining experience with extensive menu, multiple live counters, mocktail stations, and premium desserts. Perfect for special celebrations.',
                shortDescription: 'Premium dining with live counters and mocktails',
                pricePerPlate: 800,
                minGuests: 50,
                menuItems: {
                    welcomeDrinks: [{ name: 'Fresh Watermelon Juice', icon: '🍉' }, { name: 'Virgin Mojito', icon: '🍹' }, { name: 'Masala Lemonade', icon: '🍋' }],
                    starters: [
                        { name: 'Paneer Malai Tikka', icon: '🧀' }, { name: 'Hara Bhara Kabab', icon: '🥗' },
                        { name: 'Corn Cheese Balls', icon: '🧀' }, { name: 'Stuffed Mushrooms', icon: '🍄' },
                        { name: 'Honey Chilli Potato', icon: '🍯' }, { name: 'Veg Spring Rolls', icon: '🥟' }
                    ],
                    soup: [{ name: 'Tomato Basil', icon: '🍅' }, { name: 'Sweet Corn', icon: '🌽' }],
                    mainCourse: [
                        { name: 'Dal Makhani', icon: '🍲' }, { name: 'Shahi Paneer', icon: '🧀' },
                        { name: 'Malai Kofta', icon: '🍛' }, { name: 'Veg Biryani', icon: '🍚' },
                        { name: 'Mushroom Masala', icon: '🍄' }, { name: 'Pasta Alfredo', icon: '🍝' },
                        { name: 'Jeera Rice', icon: '🍚' }, { name: 'Steamed Rice', icon: '🍚' }
                    ],
                    breads: [{ name: 'Butter Naan', icon: '🫓' }, { name: 'Garlic Naan', icon: '🫓' }, { name: 'Laccha Paratha', icon: '🫓' }, { name: 'Missi Roti', icon: '🫓' }],
                    accompaniments: [{ name: 'Raita', icon: '🥛' }, { name: 'Papad', icon: '🫓' }, { name: 'Premium Pickle Selection', icon: '🫙' }, { name: 'Gourmet Salad Bar', icon: '🥗' }],
                    desserts: [{ name: 'Gulab Jamun', icon: '🍩' }, { name: 'Rasmalai', icon: '🍮' }, { name: 'Phirni', icon: '🍨' }, { name: 'Ice Cream Bar', icon: '🍦' }],
                    liveCounters: [{ name: 'Chaat Counter' }, { name: 'Live Pasta Station' }, { name: 'Mocktail Station' }, { name: 'Pan Counter' }]
                },
                itemCounts: { welcomeDrinks: 3, starters: 6, soup: 2, mainCourse: 8, breads: 4, accompaniments: 4, desserts: 4, liveCounters: 4 },
                serviceStyle: 'Buffet + Multiple Live Counters',
                highlights: ['Welcome Drinks (3)', 'Starters (6 items)', 'Main Course (8 items)', '4 Live Counters', 'Mocktail Station', 'Pan Counter', 'Premium Desserts (4)'],
                dietary: '100% Vegetarian',
                badge: 'premium',
                tastingAvailable: true,
                tastingFee: 2000,
                comboDiscount: 25000,
                comboDiscountLabel: 'Save ₹25,000 with venue booking!',
                gstRate: 5,
                displayOrder: 3
            },
            {
                name: 'Deluxe Package',
                tier: 'deluxe',
                description: 'The ultimate luxury dining experience with our most comprehensive menu, premium ingredients, dedicated chef stations, and white-glove service. An unforgettable culinary journey.',
                shortDescription: 'Ultimate luxury dining with dedicated chef stations',
                pricePerPlate: 1200,
                minGuests: 50,
                menuItems: {
                    welcomeDrinks: [{ name: 'Fresh Fruit Smoothie', icon: '🥤' }, { name: 'Signature Mocktail', icon: '🍸' }, { name: 'Rose Sharbat', icon: '🌹' }, { name: 'Masala Chai', icon: '☕' }],
                    starters: [
                        { name: 'Paneer Malai Tikka', icon: '🧀' }, { name: 'Truffle Mushroom Bruschetta', icon: '🍞' },
                        { name: 'Stuffed Jalapenos', icon: '🌶️' }, { name: 'Mini Tacos', icon: '🌮' },
                        { name: 'Dim Sum Platter', icon: '🥟' }, { name: 'Crispy Corn', icon: '🌽' },
                        { name: 'Cheese Fondue Bites', icon: '🧀' }, { name: 'Avocado Rolls', icon: '🥑' }
                    ],
                    soup: [{ name: 'Wild Mushroom Truffle', icon: '🍄' }, { name: 'Thai Tom Yum Veg', icon: '🍲' }],
                    mainCourse: [
                        { name: 'Dal Makhani', icon: '🍲' }, { name: 'Shahi Paneer', icon: '🧀' },
                        { name: 'Malai Kofta', icon: '🍛' }, { name: 'Mushroom Stroganoff', icon: '🍄' },
                        { name: 'Thai Green Curry', icon: '🥘' }, { name: 'Hyderabadi Biryani', icon: '🍚' },
                        { name: 'Pasta Arrabiata', icon: '🍝' }, { name: 'Risotto', icon: '🍚' },
                        { name: 'Mexican Rice Bowl', icon: '🌯' }, { name: 'Truffle Mac & Cheese', icon: '🧀' }
                    ],
                    breads: [{ name: 'Assorted Naan Basket', icon: '🫓' }, { name: 'Artisan Bread Selection', icon: '🍞' }],
                    accompaniments: [{ name: 'Premium Raita Bar', icon: '🥛' }, { name: 'Artisan Pickle Selection', icon: '🫙' }, { name: 'Live Salad Station', icon: '🥗' }],
                    desserts: [
                        { name: 'Live Jalebi Counter', icon: '🍩' }, { name: 'Rasmalai', icon: '🍮' },
                        { name: 'Chocolate Fountain', icon: '🍫' }, { name: 'Crème Brûlée', icon: '🍮' },
                        { name: 'Ice Cream & Waffle Station', icon: '🧇' }, { name: 'Fruit Tart Selection', icon: '🥧' }
                    ],
                    liveCounters: [
                        { name: 'Chaat Counter' }, { name: 'Live Pasta Station' }, { name: 'Live Dosa Station' },
                        { name: 'Fresh Juice Bar' }, { name: 'Mocktail Bar' }, { name: 'Pizza Station' }
                    ]
                },
                itemCounts: { welcomeDrinks: 4, starters: 8, soup: 2, mainCourse: 10, breads: 2, accompaniments: 3, desserts: 6, liveCounters: 6 },
                serviceStyle: 'Premium Buffet + 6 Live Stations',
                highlights: ['Welcome Drinks (4)', '8 Premium Starters', '10 Main Courses', '6 Live Stations', 'Chocolate Fountain', 'Fresh Juice Bar', 'Premium White-Glove Service'],
                dietary: '100% Vegetarian',
                badge: 'luxury',
                tastingAvailable: true,
                tastingFee: 0,
                chefOnSite: true,
                staffRatio: '1:10',
                comboDiscount: 40000,
                comboDiscountLabel: 'Save ₹40,000 with venue booking!',
                gstRate: 5,
                displayOrder: 4
            }
        ]);
        console.log(`✅ Created ${packages.length} catering packages`);

        // ===================== CATERING EXTRAS =====================
        const extras = await CateringExtra.insertMany([
            // Extra menu items
            { name: 'Paneer Malai Tikka', category: 'extra_item', subcategory: 'starters', pricePerPlate: 80, priceType: 'per_plate', icon: '🧀', status: 'active', displayOrder: 1 },
            { name: 'Stuffed Mushrooms', category: 'extra_item', subcategory: 'starters', pricePerPlate: 90, priceType: 'per_plate', icon: '🍄', status: 'active', displayOrder: 2 },
            { name: 'Crispy Corn', category: 'extra_item', subcategory: 'starters', pricePerPlate: 70, priceType: 'per_plate', icon: '🌽', status: 'active', displayOrder: 3 },
            { name: 'Shahi Paneer', category: 'extra_item', subcategory: 'main_course', pricePerPlate: 120, priceType: 'per_plate', icon: '🧀', status: 'active', displayOrder: 4 },
            { name: 'Malai Kofta', category: 'extra_item', subcategory: 'main_course', pricePerPlate: 110, priceType: 'per_plate', icon: '🍛', status: 'active', displayOrder: 5 },
            { name: 'Pasta Alfredo', category: 'extra_item', subcategory: 'main_course', pricePerPlate: 100, priceType: 'per_plate', icon: '🍝', status: 'active', displayOrder: 6 },
            { name: 'Rasmalai', category: 'extra_item', subcategory: 'dessert', pricePerPlate: 60, priceType: 'per_plate', icon: '🍮', status: 'active', displayOrder: 7 },
            { name: 'Ice Cream Bar', category: 'extra_item', subcategory: 'dessert', pricePerPlate: 80, priceType: 'per_plate', icon: '🍦', status: 'active', displayOrder: 8 },

            // Live stations
            { name: 'Live Dosa Counter', category: 'live_station', description: 'Fresh dosas made to order', pricePerPlate: 80, priceType: 'per_plate', icon: '🥞', chefRequired: true, setupSpace: '10×6 ft', setupTime: '30 minutes', stationMenuItems: ['Plain Dosa', 'Masala Dosa', 'Paneer Dosa', 'Cheese Dosa'], minOrder: 50, status: 'active', displayOrder: 1, includedInPackages: ['premium', 'deluxe'] },
            { name: 'Live Pasta Station', category: 'live_station', description: 'Fresh pasta with choice of sauces', pricePerPlate: 120, priceType: 'per_plate', icon: '🍝', chefRequired: true, setupSpace: '8×5 ft', stationMenuItems: ['Penne Alfredo', 'Spaghetti Arabiata', 'Mac & Cheese'], minOrder: 50, status: 'active', displayOrder: 2 },
            { name: 'Chaat Counter', category: 'live_station', description: 'Pani Puri, Dahi Puri, Sev Puri', pricePerPlate: 100, priceType: 'per_plate', icon: '🍽️', chefRequired: true, stationMenuItems: ['Pani Puri', 'Dahi Puri', 'Sev Puri', 'Bhel Puri'], minOrder: 50, status: 'active', displayOrder: 3, includedInPackages: ['standard', 'premium', 'deluxe'] },
            { name: 'Pizza Counter', category: 'live_station', pricePerPlate: 150, priceType: 'per_plate', icon: '🍕', chefRequired: true, minOrder: 50, status: 'active', displayOrder: 4 },
            { name: 'Pav Bhaji Counter', category: 'live_station', pricePerPlate: 70, priceType: 'per_plate', icon: '🍛', chefRequired: true, minOrder: 50, status: 'active', displayOrder: 5 },
            { name: 'Live Jalebi Counter', category: 'live_station', pricePerPlate: 60, priceType: 'per_plate', icon: '🍩', chefRequired: true, minOrder: 50, status: 'active', displayOrder: 6 },
            { name: 'Fresh Juice Bar', category: 'live_station', pricePerPerson: 50, priceType: 'per_person', icon: '🥤', chefRequired: false, stationMenuItems: ['Orange', 'Watermelon', 'Pineapple', 'Mixed Fruit'], minOrder: 30, status: 'active', displayOrder: 7 },

            // Beverage packages
            { name: 'Basic Beverages', category: 'beverage_package', description: 'Soft drinks, water, juice', pricePerPerson: 50, priceType: 'per_person', beverageItems: ['Soft Drinks (Coke, Sprite, Fanta)', 'Bottled Water', 'Packaged Juice'], status: 'active', displayOrder: 1 },
            { name: 'Premium Beverages', category: 'beverage_package', description: 'Fresh juices, mocktails, lassi', pricePerPerson: 100, priceType: 'per_person', beverageItems: ['All Basic items', 'Fresh Juices (Orange, Watermelon)', 'Mocktails (Virgin Mojito, Blue Lagoon)', 'Lassi (Sweet/Salted)'], status: 'active', displayOrder: 2 },
            { name: 'Deluxe Beverages', category: 'beverage_package', description: 'All premium + specialty drinks', pricePerPerson: 150, priceType: 'per_person', beverageItems: ['All Premium items', 'Specialty Shakes', 'Artisan Lemonades', 'Energy Drinks', 'Premium Coffee Station'], status: 'active', displayOrder: 3 },

            // Dietary options
            { name: 'Jain Food Options', category: 'dietary', pricePerPlate: 50, priceType: 'per_plate', requiresQuantity: true, description: 'No onion, no garlic preparations', status: 'active', displayOrder: 1 },
            { name: 'Gluten-Free Options', category: 'dietary', pricePerPlate: 80, priceType: 'per_plate', requiresQuantity: true, status: 'active', displayOrder: 2 },
            { name: 'Sugar-Free Desserts', category: 'dietary', pricePerPlate: 40, priceType: 'per_plate', requiresQuantity: true, status: 'active', displayOrder: 3 },

            // Service styles
            { name: 'Semi-Buffet Service', category: 'service_style', pricePerPlate: 50, priceType: 'per_plate', description: 'Partial table service with buffet', status: 'active', displayOrder: 1 },
            { name: 'Plated Service', category: 'service_style', pricePerPlate: 100, priceType: 'per_plate', description: 'Full table service with plated courses', status: 'active', displayOrder: 2 },
            { name: 'Family Style Service', category: 'service_style', pricePerPlate: 80, priceType: 'per_plate', description: 'Shared platters at each table', status: 'active', displayOrder: 3 },

            // Staff
            { name: 'Extra Service Staff', category: 'staff', fixedPrice: 1500, priceType: 'fixed', requiresQuantity: true, description: 'Additional trained server', status: 'active', displayOrder: 1 },
            { name: 'Mocktail Bartender', category: 'staff', fixedPrice: 2000, priceType: 'fixed', requiresQuantity: true, description: 'Professional mocktail barman', status: 'active', displayOrder: 2 },
            { name: 'Supervisor/Captain', category: 'staff', fixedPrice: 2500, priceType: 'fixed', description: 'Dedicated event supervisor', status: 'active', displayOrder: 3 },

            // Equipment
            { name: 'Premium Crockery', category: 'equipment', pricePerPerson: 50, priceType: 'per_person', description: 'Fine bone china service', status: 'active', displayOrder: 1 },
            { name: 'Table Linen Package', category: 'equipment', fixedPrice: 200, priceType: 'fixed', requiresQuantity: true, description: 'Per table – includes tablecloth and napkins', status: 'active', displayOrder: 2 },
            { name: 'Sanitization Stations', category: 'equipment', fixedPrice: 2000, priceType: 'fixed', description: 'Touchless sanitizer dispensers', status: 'active', displayOrder: 3 },

            // Kids menu
            { name: 'Kids Menu', category: 'kids_menu', pricePerPerson: 250, priceType: 'per_person', requiresQuantity: true, description: 'Pizzas, Pasta, Fries, Ice Cream', beverageItems: ['Juice', 'Soft Drinks'], status: 'active', displayOrder: 1 }
        ]);
        console.log(`✅ Created ${extras.length} catering extras`);

        // ===================== SERVICE PACKAGES =====================
        const services = await ServicePackage.insertMany([
            // Decoration
            {
                category: 'decoration', name: 'Basic Decoration', tier: 'basic', price: 15000,
                description: 'Simple yet elegant decoration with essential elements',
                includes: ['Stage backdrop', 'Entrance arch with flowers', 'Table centerpieces (basic)', 'Balloon arrangements'],
                highlights: ['Basic floral arrangements', 'LED uplighting', 'Entrance setup'],
                teamSize: 4, setupTime: '3 hours',
                status: 'active', displayOrder: 1
            },
            {
                category: 'decoration', name: 'Premium Decoration', tier: 'premium', price: 40000,
                description: 'Stunning themed decoration with premium florals and lighting',
                includes: ['Everything in Basic', 'LED backdrop', 'Themed setup', 'Premium floral arrangements', 'Ceiling draping', 'Photo booth area'],
                highlights: ['Themed design', 'Premium flowers', 'Ceiling drapes', 'LED backdrop'],
                teamSize: 6, setupTime: '4 hours',
                status: 'active', displayOrder: 2
            },
            {
                category: 'decoration', name: 'Luxury Decoration', tier: 'luxury', price: 80000,
                description: 'A breathtaking custom installation designed by our top decorators',
                includes: ['Everything in Premium', '3D stage design', 'Multiple photo areas', 'Custom installations', 'Designer lighting', 'Hanging florals', 'Pathway decor'],
                highlights: ['Custom design', '3D installations', 'Designer lighting', 'Multiple photo zones'],
                teamSize: 10, setupTime: '6 hours',
                status: 'active', displayOrder: 3
            },

            // Photography
            {
                category: 'photography', name: 'Photography Package', tier: 'basic', price: 25000,
                description: 'Professional photography coverage',
                includes: ['1 Photographer', '6 hours coverage', '300+ edited photos', 'Online gallery'],
                highlights: ['Professional photos', 'Online sharing gallery'],
                teamSize: 1, duration: '6 hours', status: 'active', displayOrder: 1
            },
            {
                category: 'photography', name: 'Photo + Video Package', tier: 'premium', price: 50000,
                description: 'Complete photo and video documentation',
                includes: ['1 Photographer + 1 Videographer', '500+ edited photos', 'Highlight video (5-7 min)', 'Drone coverage', 'Online gallery'],
                highlights: ['Photo + Video', 'Drone shots', 'Cinematic highlight'],
                teamSize: 2, duration: '8 hours', status: 'active', displayOrder: 2
            },
            {
                category: 'photography', name: 'Premium Media Package', tier: 'luxury', price: 100000,
                description: 'Ultimate media package for complete event documentation',
                includes: ['2 Photographers + 2 Videographers', 'Full event coverage', 'Cinematic video (15-20 min)', 'Same-day edit highlight', 'Photo booth with props', '1000+ edited photos'],
                highlights: ['4-person team', 'Same-day edit', 'Photo booth', 'Cinematic film'],
                teamSize: 4, duration: '12 hours', status: 'active', displayOrder: 3
            },

            // Entertainment
            {
                category: 'entertainment', name: 'DJ Services', tier: 'basic', price: 15000,
                description: 'Professional DJ with complete sound and light setup',
                includes: ['Professional DJ', 'Sound system setup', 'LED dance lights', 'Music selection (Bollywood, English, EDM)'],
                duration: '4 hours', teamSize: 2, status: 'active', displayOrder: 1
            },
            {
                category: 'entertainment', name: 'Live Band', tier: 'premium', price: 50000,
                description: 'Live musical performance by professional band',
                includes: ['5-piece live band', 'Sound system', 'Stage setup', 'Mix of genres'],
                duration: '3 hours', teamSize: 5, status: 'active', displayOrder: 2
            },
            {
                category: 'entertainment', name: 'Dance Performance', tier: 'premium', price: 30000,
                includes: ['Professional dance troupe', '2-3 performances', 'Bollywood/Folk/Contemporary'],
                duration: '1 hour', teamSize: 6, status: 'active', displayOrder: 3
            },
            {
                category: 'entertainment', name: 'Anchor / MC', tier: 'basic', price: 10000,
                includes: ['Professional event host', 'Coordination with all performers', 'Audience engagement'],
                duration: 'Full event', teamSize: 1, status: 'active', displayOrder: 4
            },

            // Transportation
            {
                category: 'transportation', name: 'Valet Parking', tier: 'basic', price: 8000,
                includes: ['Professional valets', 'Organized parking', 'Key management'],
                teamSize: 4, status: 'active', displayOrder: 1
            },

            // Special
            {
                category: 'special', name: 'Welcome Gift Boxes', tier: 'basic', price: 300,
                priceType: 'per_unit', priceUnit: 'per box', minQuantity: 50, maxQuantity: 1000,
                includes: ['Customized gift box', 'Dry fruits', 'Sweets', 'Personalized note'],
                status: 'active', displayOrder: 1
            },
            {
                category: 'special', name: 'Return Gift Hampers', tier: 'premium', price: 500,
                priceType: 'per_unit', priceUnit: 'per hamper', minQuantity: 50,
                includes: ['Premium hamper box', 'Assorted chocolates', 'Scented candle', 'Thank you card'],
                status: 'active', displayOrder: 2
            },
            {
                category: 'special', name: 'Photo Booth Rental', tier: 'basic', price: 12000,
                includes: ['Photo booth with props', 'Instant prints', 'Digital copies', 'Fun accessories'],
                status: 'active', displayOrder: 3
            },
            {
                category: 'special', name: 'Mehendi Artist', tier: 'basic', price: 15000,
                includes: ['Professional mehendi artist', '4 hours', 'Bridal + guest mehendi'],
                status: 'active', displayOrder: 4
            },
            {
                category: 'special', name: 'Event Coordinator', tier: 'premium', price: 20000,
                includes: ['Dedicated coordinator', 'Full event management', 'Vendor coordination', 'Timeline management'],
                status: 'active', displayOrder: 5
            }
        ]);
        console.log(`✅ Created ${services.length} service packages`);

        console.log('\n🎉 Venue seed data created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
};

seed();
