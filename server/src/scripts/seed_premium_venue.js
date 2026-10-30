import mongoose from 'mongoose';
import Venue from '../models/Venue.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedPremiumVenue = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const premiumVenue = {
            name: "The Crystal Grand Ballroom",
            description: "An architectural masterpiece featuring floor-to-ceiling windows, imported Austrian chandeliers, and Italian marble flooring. Our flagship venue offers a seamless blend of classical opulence and modern cinematic aesthetics. With a state-of-the-art D&B Audiotechnik sound system and programmable Intelligent Lighting, every event becomes a production. Perfect for high-profile corporate galas, royal weddings, and luxury fashion showcases.",
            type: "Banquet Hall",
            category: "INDOOR",
            location: "7th Floor, Platinum District, South Heights",
            capacityMin: 300,
            capacityMax: 1500,
            pricing: {
                morningSlot: 150000,
                afternoonSlot: 120000,
                eveningSlot: 250000,
                fullDay: 450000,
                weekendSurchargePercent: 15,
                holidaySurchargePercent: 25
            },
            amenities: ["Stage", "AC", "Sound System", "WiFi", "Photography", "Valet Parking", "Green Room", "LED Screen", "DJ Setup", "Bridal Room", "Generator Backup"],
            media: [
                {
                    type: "image",
                    url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=2070&auto=format&fit=crop",
                    isCover: true
                },
                {
                    type: "image",
                    url: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop",
                    isCover: false
                },
                {
                    type: "image",
                    url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=2069&auto=format&fit=crop",
                    isCover: false
                },
                {
                    type: "video",
                    url: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder for aesthetic tour
                    isCover: false
                }
            ],
            policies: {
                cancellationPolicy: "90% refund if cancelled 60+ days before event. 50% refund if 30-60 days. No refund if less than 30 days.",
                advanceBookingDays: 14,
                minBookingHours: 6,
                termsAndConditions: "Professional event insurance required. No heavy smoke machines without prior authorization. Sound limits apply after midnight."
            },
            isFeatured: true,
            isActive: true,
            rating: 5.0,
            totalReviews: 24,
            contactPhone: "+91 99999 88888",
            contactEmail: "events@crystalgrand.com"
        };

        // Check if already exists
        const existing = await Venue.findOne({ name: premiumVenue.name });
        if (existing) {
            console.log('Venue already exists, updating...');
            await Venue.findByIdAndUpdate(existing._id, premiumVenue);
        } else {
            const newVenue = new Venue(premiumVenue);
            await newVenue.save();
            console.log('Premium venue seeded successfully!');
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding venue:', error);
        process.exit(1);
    }
};

seedPremiumVenue();
