import Venue from '../models/Venue.js';
import VenueBooking from '../models/VenueBooking.js';
import VenueSlotLock from '../models/VenueSlotLock.js';
import CateringPackage from '../models/CateringPackage.js';
import CateringExtra from '../models/CateringAddOn.js'; // Aliased to match the controller usage


// ============================================
// PUBLIC VENUE ENDPOINTS
// ============================================

// GET /api/venues — list/filter venues
export const getVenues = async (req, res) => {
    try {
        const {
            type, setting, minCapacity, maxCapacity,
            minPrice, maxPrice, amenities, rating,
            area, search, sort, page = 1, limit = 12
        } = req.query;

        const filter = { status: 'active' };

        if (type) filter.type = { $in: type.split(',') };
        if (setting) filter.setting = setting;
        if (minCapacity) filter['capacity.max'] = { $gte: Number(minCapacity) };
        if (maxCapacity) filter['capacity.min'] = { $lte: Number(maxCapacity) };
        if (rating) filter.rating = { $gte: Number(rating) };
        if (area) filter['location.area'] = { $in: area.split(',') };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'location.area': { $regex: search, $options: 'i' } },
                { 'location.city': { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        if (amenities) {
            const amList = amenities.split(',');
            filter['amenities.name'] = { $all: amList.map(a => new RegExp(a, 'i')) };
        }

        // Sort
        let sortObj = { priorityScore: -1, createdAt: -1 };
        switch (sort) {
            case 'price_low': sortObj = { 'pricing.weekday.evening': 1 }; break;
            case 'price_high': sortObj = { 'pricing.weekday.evening': -1 }; break;
            case 'rating': sortObj = { rating: -1 }; break;
            case 'capacity_low': sortObj = { 'capacity.min': 1 }; break;
            case 'newest': sortObj = { createdAt: -1 }; break;
            case 'popular': sortObj = { bookingCount: -1 }; break;
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await Venue.countDocuments(filter);
        const venues = await Venue.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit))
            .select('-reviews -seo -seasonalPricing');

        res.json({
            venues,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/venues/:id — single venue details
export const getVenueById = async (req, res) => {
    try {
        const venue = await Venue.findById(req.params.id);
        if (!venue) return res.status(404).json({ message: 'Venue not found' });

        // Populate approved reviews with user info
        const populated = venue.toObject();
        populated.reviews = (populated.reviews || []).filter(r => r.status === 'approved');

        res.json(venue);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/venues/check-availability
export const checkAvailability = async (req, res) => {
    try {
        const venueId = req.params.id || req.body.venueId;
        const date = req.query.date || req.body.date;

        if (!venueId || !date) return res.status(400).json({ message: 'venueId and date required' });

        const venue = await Venue.findById(venueId);
        if (!venue) return res.status(404).json({ message: 'Venue not found' });

        const targetDateUTC = new Date(`${date.split('T')[0]}T00:00:00.000Z`);

        // Check venue blocked dates
        const isBlocked = (venue.blockedDates || []).find(bd => {
            const bdDate = new Date(bd.date);
            const bdDateStr = bdDate.toISOString().split('T')[0];
            return bdDateStr === date.split('T')[0];
        });

        const dayOfWeek = targetDateUTC.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const priceKey = isWeekend ? 'weekend' : 'weekday';

        // Check existing bookings and active locks
        const conflictingBookings = await VenueBooking.find({
            venue: venueId,
            eventDate: targetDateUTC,
            status: { $in: ['CONFIRMED', 'PAYMENT_PENDING', 'AWAITING_ADMIN_APPROVAL', 'COMPLETED'] },
            $or: [
                { lockExpiresAt: { $gt: new Date() } },
                { lockExpiresAt: { $exists: false } }
            ]
        });

        // Also check short-term slot locks
        const activeLocks = await VenueSlotLock.find({
            venue: venueId,
            eventDate: targetDateUTC,
            expiresAt: { $gt: new Date() }
        });

        const bookedSlots = conflictingBookings.map(b => b.timeSlot);
        const hasFullDay = bookedSlots.includes('fullDay');

        const slots = [
            { name: 'Morning', key: 'morning', time: '6:00 AM - 12:00 PM' },
            { name: 'Afternoon', key: 'afternoon', time: '12:00 PM - 6:00 PM' },
            { name: 'Evening', key: 'evening', time: '6:00 PM - 12:00 AM' },
            { name: 'Full Day', key: 'fullDay', time: '6:00 AM - 12:00 AM' }
        ].map(slot => {
            const blockedByVenue = isBlocked && (isBlocked.slots.includes(slot.key) || isBlocked.slots.includes('all'));
            
            // Logic: 
            // - If Full Day is booked, everything else is unavailable.
            // - If any partial slot is booked, Full Day is unavailable.
            let isAvailable = !blockedByVenue;
            
            if (hasFullDay) {
                isAvailable = false;
            } else if (slot.key === 'fullDay') {
                if (bookedSlots.length > 0) isAvailable = false;
            } else {
                if (bookedSlots.includes(slot.key)) isAvailable = false;
            }

            const currentLock = conflictingBookings.find(b => b.timeSlot === slot.key && b.status === 'PAYMENT_PENDING');
            const shortTermLock = activeLocks.find(l => l.timeSlot === slot.key);

            if (shortTermLock) isAvailable = false;

            return {
                ...slot,
                available: isAvailable,
                blocked: !!blockedByVenue,
                booked: bookedSlots.includes(slot.key) && !currentLock,
                locked: !!currentLock || !!shortTermLock,
                lockExpiresAt: currentLock?.lockExpiresAt || shortTermLock?.expiresAt,
                price: venue.pricing[priceKey]?.[slot.key] || 0,
                gst: Math.round((venue.pricing[priceKey]?.[slot.key] || 0) * (venue.pricing.gstRate / 100))
            };
        });

        res.json({
            date,
            dayName: targetDateUTC.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
            isWeekend,
            slots,
            securityDeposit: venue.pricing.securityDeposit,
            cleaningFee: venue.pricing.cleaningFee,
            gstRate: venue.pricing.gstRate
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/venues/:id/monthly-availability?month=2024-12 — calendar data
export const getMonthlyAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { month } = req.query; // "2024-12"
        if (!month) return res.status(400).json({ message: 'month query required (YYYY-MM)' });

        const venue = await Venue.findById(id);
        if (!venue) return res.status(404).json({ message: 'Venue not found' });

        const [year, mon] = month.split('-').map(Number);
        const startDate = new Date(year, mon - 1, 1);
        const endDate = new Date(year, mon, 0); // last day of month

        // Get all bookings for this month
        // Normalize month boundaries to UTC
        const utcStartDate = new Date(Date.UTC(year, mon - 1, 1));
        const utcEndDate = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));

        const bookings = await VenueBooking.find({
            venue: id,
            eventDate: { $gte: utcStartDate, $lte: utcEndDate },
            status: { $nin: ['CANCELLED', 'REJECTED', 'DRAFT'] }
        }).select('eventDate timeSlot status lockExpiresAt');

        // Build daily availability map
        const days = {};
        for (let d = 1; d <= endDate.getDate(); d++) {
            const date = new Date(year, mon - 1, d);
            date.setHours(0, 0, 0, 0);
            const dateStr = date.toISOString().split('T')[0];

            // Check blocked
            const blocked = (venue.blockedDates || []).find(bd => {
                const bdDate = new Date(bd.date);
                bdDate.setHours(0, 0, 0, 0);
                return bdDate.getTime() === date.getTime();
            });

            const dayBookings = bookings.filter(b => {
                const bd = new Date(b.eventDate);
                const bDateStr = bd.toISOString().split('T')[0];
                return bDateStr === dateStr;
            });

            const slotsBooked = dayBookings.map(b => b.timeSlot);
            const hasLocks = dayBookings.some(b => b.status === 'PAYMENT_PENDING');
            const todayUTC = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z');
            const isPast = date < todayUTC;

            let status = 'available'; // green
            if (isPast) status = 'past';
            else if (blocked && (blocked.slots.includes('all') || blocked.slots.length >= 4)) status = 'blocked';
            else if (slotsBooked.includes('fullDay') || slotsBooked.length >= 3) status = 'fully_booked';
            else if (slotsBooked.length > 0 || blocked) status = 'partially_booked';

            days[dateStr] = {
                date: dateStr,
                day: d,
                status,
                hasLocks, // Explicitly flag if there are temporary locks
                slotsAvailable: 4 - slotsBooked.length,
                slotsBooked: slotsBooked.length
            };
        }

        res.json({ month, venue: id, days });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/venues/catering/packages
export const getCateringPackages = async (req, res) => {
    try {
        const packages = await CateringPackage.find({ status: 'active' }).sort({ displayOrder: 1 });
        res.json(packages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/venues/catering/packages/:id
export const getCateringPackageById = async (req, res) => {
    try {
        const pkg = await CateringPackage.findById(req.params.id);
        if (!pkg) return res.status(404).json({ message: 'Package not found' });
        res.json(pkg);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/venues/catering/extras
export const getCateringExtras = async (req, res) => {
    try {
        const extras = await CateringExtra.find({ status: 'active' }).sort({ category: 1, displayOrder: 1 });
        res.json(extras);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



// ============================================
// ADMIN VENUE ENDPOINTS
// ============================================

export const getAllVenuesAdmin = async (req, res) => {
    try {
        const venues = await Venue.find().sort({ createdAt: -1 });
        res.json(venues);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createVenue = async (req, res) => {
    try {
        const venue = new Venue(req.body);
        await venue.save();
        res.status(201).json(venue);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const updateVenue = async (req, res) => {
    try {
        const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!venue) return res.status(404).json({ message: 'Venue not found' });
        res.json(venue);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const deleteVenue = async (req, res) => {
    try {
        const venue = await Venue.findByIdAndDelete(req.params.id);
        if (!venue) return res.status(404).json({ message: 'Venue not found' });
        res.json({ message: 'Venue deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const addVenueMedia = async (req, res) => {
    try {
        const venue = await Venue.findById(req.params.id);
        if (!venue) return res.status(404).json({ message: 'Venue not found' });
        const { type, url, thumbnailUrl, category, caption } = req.body;
        venue.media.push({ type: type || 'image', url, thumbnailUrl, category, caption, order: venue.media.length });
        await venue.save();
        res.json(venue);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const deleteVenueMedia = async (req, res) => {
    try {
        const venue = await Venue.findById(req.params.id);
        if (!venue) return res.status(404).json({ message: 'Venue not found' });
        venue.media = venue.media.filter(m => m._id.toString() !== req.params.mediaId);
        await venue.save();
        res.json(venue);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const blockVenueDates = async (req, res) => {
    try {
        const venue = await Venue.findById(req.params.id);
        if (!venue) return res.status(404).json({ message: 'Venue not found' });
        const { dates } = req.body; // [{ date, slots, reason, visibility }]
        venue.blockedDates = [...(venue.blockedDates || []), ...dates];
        await venue.save();
        res.json(venue);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// ============================================
// ADMIN CATERING ENDPOINTS
// ============================================

export const getAllCateringPackagesAdmin = async (req, res) => {
    try {
        const packages = await CateringPackage.find().sort({ displayOrder: 1 });
        res.json(packages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createCateringPackageAdmin = async (req, res) => {
    try {
        const pkg = new CateringPackage(req.body);
        await pkg.save();
        res.status(201).json(pkg);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const updateCateringPackageAdmin = async (req, res) => {
    try {
        const pkg = await CateringPackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!pkg) return res.status(404).json({ message: 'Package not found' });
        res.json(pkg);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const deleteCateringPackageAdmin = async (req, res) => {
    try {
        await CateringPackage.findByIdAndDelete(req.params.id);
        res.json({ message: 'Package deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllCateringExtrasAdmin = async (req, res) => {
    try {
        const extras = await CateringExtra.find().sort({ category: 1, displayOrder: 1 });
        res.json(extras);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createCateringExtraAdmin = async (req, res) => {
    try {
        const extra = new CateringExtra(req.body);
        await extra.save();
        res.status(201).json(extra);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const updateCateringExtraAdmin = async (req, res) => {
    try {
        const extra = await CateringExtra.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!extra) return res.status(404).json({ message: 'Extra not found' });
        res.json(extra);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const deleteCateringExtraAdmin = async (req, res) => {
    try {
        await CateringExtra.findByIdAndDelete(req.params.id);
        res.json({ message: 'Extra deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


