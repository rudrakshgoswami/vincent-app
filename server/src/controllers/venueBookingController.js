import VenueBooking from '../models/VenueBooking.js';
import Venue from '../models/Venue.js';
import { generateAndSendInvoice } from '../utils/invoiceHelper.js';
import crypto from 'crypto';
import { getIO, SOCKET_EVENTS } from '../utils/socket.js';
import { calculateAdvanceAmount } from '../utils/paymentUtils.js';
import VenueSlotLock from '../models/VenueSlotLock.js';


// ============================================
// USER BOOKING ENDPOINTS
// ============================================

// POST /api/venue-bookings/create-order — creates temporary lock + razorpay order
import razorpay from '../utils/razorpay.js';

export const createBookingOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            venueId, eventDate, timeSlot, guestCount, eventType, eventTypeOther,
            specialRequirements, contactInfo, specialInstructions,
            hasCatering, catering,
            additionalServices,
            venueBasePrice, venueGstRate, venueGstAmount, venueTotal,
            securityDeposit,
            servicesSubtotal, servicesGstRate, servicesGstAmount, servicesTotal,
            grandTotal, balanceDueDate
        } = req.body;


        // Validate venue exists
        const venue = await Venue.findById(venueId);
        if (!venue) return res.status(404).json({ message: 'Venue not found' });

        // CONCURRENCY CONTROL: Slot Conflict Validation Logic
        // Normalize to UTC midnight to ensure consistency regardless of server local time
        const targetDateUTC = new Date(new Date(eventDate).toISOString().split('T')[0] + 'T00:00:00.000Z');

        // Fetch all active bookings or non-expired locks for this venue/date
        const conflictingBookings = await VenueBooking.find({
            venue: venueId,
            eventDate: targetDateUTC,
            status: { $in: ['PAYMENT_PENDING', 'CONFIRMED', 'AWAITING_ADMIN_APPROVAL', 'COMPLETED'] },
            $or: [
                { lockExpiresAt: { $gt: new Date() } },
                { lockExpiresAt: { $exists: false } }
            ]
        });

        // Validation Logic:
        // 1. Same slot cannot be booked twice.
        // 2. Full Day blocks ALL slots.
        // 3. Any booked slot blocks Full Day.
        const isFullDayRequested = timeSlot === 'fullDay';
        const alreadyBookedSlots = conflictingBookings.map(b => b.timeSlot);

        let conflict = false;
        let conflictMessage = '';

        if (alreadyBookedSlots.includes(timeSlot)) {
            conflict = true;
            conflictMessage = 'This slot is already reserved or being booked.';
        } else if (isFullDayRequested && alreadyBookedSlots.length > 0) {
            conflict = true;
            conflictMessage = 'Full Day is unavailable because some partial slots are already booked.';
        } else if (!isFullDayRequested && alreadyBookedSlots.includes('fullDay')) {
            conflict = true;
            conflictMessage = 'Partial slots are unavailable because the Full Day is already reserved.';
        }

        if (conflict) {
            return res.status(409).json({ message: conflictMessage });
        }



        // Slot labels
        const slotLabels = {
            morning: '6:00 AM - 12:00 PM',
            afternoon: '12:00 PM - 6:00 PM',
            evening: '6:00 PM - 12:00 AM',
            fullDay: '6:00 AM - 12:00 AM'
        };

        // SECURE CALCULATION: Never trust frontend for advance amount
        const { advanceAmount, balanceAmount, advancePercent } = calculateAdvanceAmount(grandTotal);

        if (advanceAmount <= 0) {
            return res.status(400).json({ message: 'Invalid total amount' });
        }

        const amountInPaise = Math.round(advanceAmount * 100);


        // CREATE RAZORPAY ORDER FIRST
        const rzpOptions = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_venue_${Date.now()}`,
            notes: {
                venueId: venueId.toString(),
                userId: userId.toString(),
                eventType: eventType || 'other',
                eventDate: targetDateUTC.toDateString()
            }
        };

        let rzpOrder;
        try {
            rzpOrder = await razorpay.orders.create(rzpOptions);
        } catch (rzpErr) {
            console.error('Razorpay Order Creation Error:', rzpErr);
            return res.status(500).json({ 
                message: 'Failed to initiate payment with Razorpay', 
                error: rzpErr.message || rzpErr.description 
            });
        }

        // Create booking with temp lock (15 mins)
        const lockExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        const booking = new VenueBooking({
            user: userId,
            venue: venueId,
            venueName: venue.name,
            eventDate: targetDateUTC,
            timeSlot,
            slotLabel: slotLabels[timeSlot] || timeSlot,
            eventType: eventType || 'other',
            eventTypeOther,
            guestCount,
            specialRequirements,
            contactInfo,
            specialInstructions,
            hasCatering: hasCatering || false,
            catering: hasCatering ? catering : undefined,
            additionalServices: additionalServices || [],
            venueBasePrice,
            venueGstRate: venueGstRate || 18,
            venueGstAmount: venueGstAmount || 0,
            venueTotal: venueTotal || 0,
            securityDeposit: securityDeposit || venue.pricing.securityDeposit || 10000,
            servicesSubtotal: servicesSubtotal || 0,
            servicesGstRate: servicesGstRate || 18,
            servicesGstAmount: servicesGstAmount || 0,
            servicesTotal: servicesTotal || 0,
            grandTotal,
            advancePercent,
            advanceAmount,
            balanceAmount,
            balanceDueDate: new Date(Math.max(Date.now() + 3 * 24 * 60 * 60 * 1000, new Date(eventDate).getTime() - 15 * 24 * 60 * 60 * 1000)),
            status: 'PAYMENT_PENDING',
            paymentStatus: 'ADVANCE_PENDING',

            lockExpiresAt,
            razorpayOrderId: rzpOrder.id, // Store Order ID
            statusHistory: [{ status: 'PAYMENT_PENDING', changedBy: 'system', reason: 'Booking initiated (Slot locked for 15 mins)' }]

        });


        await booking.save();

        // 3. IMPORTANT: Clear the short-term slot lock if it exists for this user/slot
        await VenueSlotLock.deleteOne({
            venue: venueId,
            eventDate: targetDateUTC,
            timeSlot: timeSlot,
            user: userId
        });

        // Notify other users via Socket.io that this slot is now locked
        try {
            const io = getIO();
            io.emit(SOCKET_EVENTS.VENUE_SLOT_LOCKED, {
                venueId,
                date: targetDateUTC,
                timeSlot,
                lockExpiresAt
            });
        } catch (sErr) { console.warn('Socket emit failed:', sErr.message); }

        res.json({
            amount: advanceAmount,
            amountPaise: rzpOrder.amount,
            currency: rzpOrder.currency,
            razorpayOrderId: rzpOrder.id,
            bookingId: booking._id,
            bookingRef: booking.bookingRef,
            lockExpiresAt: booking.lockExpiresAt,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Create venue booking order error:', err);
        const errorMsg = err.message || 'Unknown error occurred';
        res.status(500).json({ message: errorMsg });
    }
};

export const verifyBookingPayment = async (req, res) => {
    try {
        const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ message: 'Missing payment verification details' });
        }

        // 1. Verify Signature
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (generated_signature !== razorpaySignature) {
            console.error('Signature Mismatch!', { generated_signature, razorpaySignature });
            
            // Log failure in DB if booking exists
            const booking = await VenueBooking.findById(bookingId);
            if (booking) {
                booking.paymentStatus = 'FAILED';
                booking.statusHistory.push({
                    status: booking.status,
                    changedBy: 'system',
                    reason: 'Payment signature verification failed'
                });
                await booking.save();
            }

            
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        // 2. Double check with Razorpay API (Production Level)
        try {
            const rzpPayment = await razorpay.payments.fetch(razorpayPaymentId);
            if (rzpPayment.status !== 'captured' && rzpPayment.status !== 'authorized') {
                // If not captured/authorized, it's not a success yet
                return res.status(400).json({ message: `Payment is in ${rzpPayment.status} state. Expected captured.` });
            }
            // Update paymentMethod from actual Razorpay response
            var methodUsed = rzpPayment.method; // e.g., 'upi', 'card', 'netbanking'
        } catch (fetchErr) {
            console.warn('Could not fetch payment details from Razorpay API, proceeding with signature only');
        }

        // 3. Find and update booking
        const booking = await VenueBooking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // Prevent duplicate processing
        if (booking.paymentStatus === 'ADVANCE_PAID' || booking.paymentStatus === 'FULLY_PAID') {
            return res.json({ success: true, message: 'Already processed', booking });
        }

        // [SAFETY] Check if booking was cancelled (e.g. user closed modal during UPI processing)
        if (booking.status === 'CANCELLED') {
            // Check if slot is still available or if someone else took it
            const conflict = await VenueBooking.findOne({
                venue: booking.venue,
                eventDate: booking.eventDate,
                timeSlot: booking.timeSlot,
                status: { $in: ['CONFIRMED', 'AWAITING_ADMIN_APPROVAL', 'COMPLETED', 'PAYMENT_PENDING'] },
                _id: { $ne: booking._id }
            });

            if (conflict) {
                // Money taken but slot lost!
                booking.paymentStatus = 'REFUND_REQUIRED';
                booking.paymentHistory.push({
                    transactionId: razorpayPaymentId,
                    amount: booking.advanceAmount,
                    method: methodUsed || 'online',
                    purpose: 'advance_conflict',
                    status: 'captured',
                    notes: 'Slot was taken by another user after this booking was cancelled. Refund needed.'
                });
                await booking.save();
                return res.status(409).json({ 
                    success: false, 
                    message: 'This slot is no longer available as it was booked by someone else after you cancelled. Your payment was processed; please contact support for a refund.',
                    bookingId: booking._id
                });
            }
            // Slot still available? Un-cancel it.
        }

        booking.razorpayOrderId = razorpayOrderId;
        booking.razorpayPaymentId = razorpayPaymentId;
        booking.razorpaySignature = razorpaySignature;
        booking.paymentMethod = methodUsed || booking.paymentMethod || 'online';
        booking.paymentStatus = 'ADVANCE_PAID';
        booking.status = 'CONFIRMED'; // Automatically confirm once payment is verified
        booking.lockExpiresAt = undefined; // Permanently release lock timer
        
        // Record in history
        booking.paymentHistory.push({
            transactionId: razorpayPaymentId,
            orderId: razorpayOrderId,
            amount: booking.advanceAmount,
            method: booking.paymentMethod,
            purpose: 'advance',
            status: 'captured',
            recordedBy: 'system',
            signature: razorpaySignature
        });

        booking.statusHistory.push({
            status: 'CONFIRMED',
            changedBy: 'system',
            reason: `Advance payment verified. Booking confirmed.`
        });

        await booking.save();


        // 4. Update venue booking count
        await Venue.findByIdAndUpdate(booking.venue, { $inc: { bookingCount: 1 } });

        // 5. Emit socket event for admin
        // 5. Emit socket event for all clients (CONFIRMED)
        try {
            const io = getIO();
            io.emit(SOCKET_EVENTS.VENUE_SLOT_CONFIRMED, {
                venueId: booking.venue,
                date: booking.eventDate,
                timeSlot: booking.timeSlot
            });
            // Also notify admin for list updates
            io.emit('new_venue_booking', {
                bookingId: booking._id,
                bookingRef: booking.bookingRef,
                venueName: booking.venueName,
                eventDate: booking.eventDate,
                grandTotal: booking.grandTotal
            });
        } catch (_) { /* socket not critical */ }

        res.json({
            success: true,
            bookingConfirmed: true,
            booking: {
                _id: booking._id,
                bookingRef: booking.bookingRef,
                status: booking.status,
                venueName: booking.venueName,
                eventDate: booking.eventDate,
                timeSlot: booking.timeSlot,
                slotLabel: booking.slotLabel,
                guestCount: booking.guestCount,
                grandTotal: booking.grandTotal,
                advanceAmount: booking.advanceAmount,
                balanceAmount: booking.balanceAmount,
                paymentStatus: booking.paymentStatus,
                razorpayPaymentId,
                contactInfo: booking.contactInfo
            }
        });
    } catch (err) {
        console.error('Verify venue booking payment error:', err);
        res.status(500).json({ success: false, message: err.message || 'Verification failed' });
    }
};

// GET /api/venue-bookings/my — user's bookings
export const getMyBookings = async (req, res) => {
    try {
        const bookings = await VenueBooking.find({
            user: req.user._id,
            $or: [
                { status: { $ne: 'DRAFT' } },
                { paymentStatus: { $ne: 'ADVANCE_PENDING' } }
            ]
        })


            .populate('venue', 'name media location')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/venue-bookings/:id
export const getBookingById = async (req, res) => {
    try {
        const booking = await VenueBooking.findById(req.params.id)
            .populate('venue', 'name media location contact');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/venue-bookings/:id/cancel
export const cancelBooking = async (req, res) => {
    try {
        const booking = await VenueBooking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (!['AWAITING_ADMIN_APPROVAL', 'CONFIRMED', 'PAYMENT_PENDING'].includes(booking.status)) {
            return res.status(400).json({ message: 'Cannot cancel this booking' });
        }
 
        const oldStatus = booking.status;
        booking.status = 'CANCELLED';

        booking.cancellationReason = req.body.cancellationReason || 'Cancelled by user';
        booking.cancelledBy = 'user';
        booking.cancelledAt = new Date();
        
        // Release lock if it was pending
        if (oldStatus === 'PAYMENT_PENDING') {
            booking.lockExpiresAt = undefined;
        }

        booking.statusHistory.push({
            status: 'CANCELLED',
            changedBy: 'user',
            reason: booking.cancellationReason
        });

        await booking.save();

        // Release slot via socket if it was locked
        if (oldStatus === 'PAYMENT_PENDING') {
            try {
                const io = getIO();
                io.emit(SOCKET_EVENTS.VENUE_SLOT_RELEASED, {
                    venueId: booking.venue,
                    date: booking.eventDate,
                    timeSlot: booking.timeSlot
                });
            } catch (err) {
                console.error('Socket Emission Failed (Cancel):', err);
            }
        }

        res.json({ message: 'Booking cancelled', booking });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/venue-bookings/:id/extend-lock
export const extendLock = async (req, res) => {
    try {
        const booking = await VenueBooking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.paymentStatus !== 'ADVANCE_PENDING') {
            return res.status(400).json({ message: 'No active lock to extend' });
        }


        if (booking.lockExtended) {
            return res.status(400).json({ message: 'Lock already extended once' });
        }

        booking.lockExpiresAt = new Date(booking.lockExpiresAt.getTime() + 5 * 60 * 1000);
        booking.lockExtended = true;
        await booking.save();

        res.json({ message: 'Lock extended', lockExpiresAt: booking.lockExpiresAt });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/venue-bookings/:id/review
export const submitReview = async (req, res) => {
    try {
        const booking = await VenueBooking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.status !== 'COMPLETED') {
            return res.status(400).json({ message: 'Can only review completed bookings' });
        }

        if (booking.review?.rating) {
            return res.status(400).json({ message: 'Review already submitted for this booking' });
        }

        const { rating, comment } = req.body;
        
        // Also add review to venue
        const venue = await Venue.findById(booking.venue);
        if (venue) {
            // Check if user already reviewed this venue (as per "one review per user" requirement)
            const alreadyReviewed = venue.reviews.find(r => r.user.toString() === req.user._id.toString());
            if (alreadyReviewed) {
                return res.status(400).json({ message: 'You have already reviewed this venue' });
            }

            booking.review = { rating, comment, createdAt: new Date() };
            await booking.save();

            venue.reviews.push({
                user: req.user._id,
                userName: req.user.name,
                rating,
                comment,
                eventType: booking.eventType
            });
            // Recalculate average
            const approved = venue.reviews.filter(r => r.status === 'approved' || r.status === 'pending');
            venue.rating = approved.reduce((sum, r) => sum + r.rating, 0) / approved.length;
            venue.reviewCount = approved.length;
            await venue.save();
        }

        res.json({ message: 'Review submitted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ============================================
// ADMIN BOOKING ENDPOINTS
// ============================================

export const getAllBookingsAdmin = async (req, res) => {
    try {
        const { status, venue, dateFrom, dateTo, search, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (status && status !== 'all') filter.status = status;
        if (venue) filter.venue = venue;
        if (dateFrom || dateTo) {
            filter.eventDate = {};
            if (dateFrom) filter.eventDate.$gte = new Date(dateFrom);
            if (dateTo) filter.eventDate.$lte = new Date(dateTo);
        }
        if (search) {
            filter.$or = [
                { bookingRef: { $regex: search, $options: 'i' } },
                { venueName: { $regex: search, $options: 'i' } },
                { 'contactInfo.fullName': { $regex: search, $options: 'i' } },
                { 'contactInfo.phone': { $regex: search, $options: 'i' } },
                { 'contactInfo.email': { $regex: search, $options: 'i' } }
            ];
        }

        // Exclude expired temp locks
        filter.$and = filter.$and || [];
        filter.$and.push({
            $or: [
                { paymentStatus: { $ne: 'ADVANCE_PENDING' } },
                { lockExpiresAt: { $gt: new Date() } }
            ]
        });

        const skip = (Number(page) - 1) * Number(limit);
        const total = await VenueBooking.countDocuments(filter);
        const bookings = await VenueBooking.find(filter)
            .populate('venue', 'name media')
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.json({ bookings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateBookingStatusAdmin = async (req, res) => {
    try {
        const booking = await VenueBooking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const { status, cancellationReason, adminNotes } = req.body;

        booking.status = status;
        booking.statusHistory.push({
            status,
            changedBy: 'admin',
            reason: cancellationReason || `Status updated to ${status}`
        });

        if (status === 'CANCELLED' || status === 'REJECTED') {
            booking.cancellationReason = cancellationReason;
            booking.cancelledBy = 'admin';
            booking.cancelledAt = new Date();
        }


        if (adminNotes) {
            booking.adminNotes.push({ note: adminNotes, addedBy: req.user.name || 'Admin' });
        }

        await booking.save();
        res.json({ message: `Booking ${status}`, booking });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getBookingStatsAdmin = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [total, pending, confirmed, thisMonth, upcoming, revenue] = await Promise.all([
            VenueBooking.countDocuments({ status: { $nin: ['CANCELLED', 'REJECTED'] } }),
            VenueBooking.countDocuments({ status: 'AWAITING_ADMIN_APPROVAL' }),
            VenueBooking.countDocuments({ status: 'CONFIRMED' }),
            VenueBooking.countDocuments({ createdAt: { $gte: startOfMonth }, status: { $nin: ['CANCELLED', 'REJECTED'] } }),
            VenueBooking.countDocuments({
                eventDate: { $gte: now, $lte: in7Days },
                status: { $in: ['CONFIRMED', 'AWAITING_ADMIN_APPROVAL'] }
            }),
            VenueBooking.aggregate([
                { $match: { paymentStatus: { $in: ['ADVANCE_PAID', 'FULLY_PAID', 'PARTIALLY_PAID'] }, createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$grandTotal' }, collected: { $sum: { $reduce: { input: '$paymentHistory', initialValue: 0, in: { $add: ['$$value', '$$this.amount'] } } } } } }
            ])

        ]);

        res.json({
            totalBookings: total,
            pendingConfirmation: pending,
            confirmedBookings: confirmed,
            thisMonthBookings: thisMonth,
            upcomingEvents: upcoming,
            monthlyRevenue: revenue[0]?.total || 0,
            collectedAmount: revenue[0]?.collected || 0
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const addAdminNoteToBooking = async (req, res) => {
    try {
        const booking = await VenueBooking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        booking.adminNotes.push({
            note: req.body.note,
            addedBy: req.user.name || 'Admin'
        });
        await booking.save();
        res.json({ message: 'Note added', booking });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const recordBalancePayment = async (req, res) => {
    try {
        const booking = await VenueBooking.findById(req.params.id).populate('venue');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const { amount, method, reference, notes } = req.body;
        
        // Negative amount prevention
        if (Number(amount) <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount. Amount must be greater than zero.' });
        }

        let currentTotalPaid = (booking.paymentHistory || []).reduce((s, p) => s + Number(p.amount || 0), 0);
        const hasAdvanceInHistory = (booking.paymentHistory || []).some(p => p.purpose === 'advance');
        if (!hasAdvanceInHistory && ['ADVANCE_PAID', 'PARTIALLY_PAID', 'FULLY_PAID'].includes(booking.paymentStatus)) {
            currentTotalPaid += Number(booking.advanceAmount || 0);
        }
        if (currentTotalPaid === 0 && (booking.paymentHistory || []).length === 0 && Number(booking.advanceAmount || 0) > 0) {
             currentTotalPaid = Number(booking.advanceAmount);
        }

        const outstandingBalance = Number(booking.grandTotal || 0) - currentTotalPaid;

        const amt = Number(amount);
        if (isNaN(amt) || amt > (outstandingBalance + 1)) { // 1 INR tolerance
            return res.status(400).json({ message: `Payment exceeds outstanding balance of ₹${outstandingBalance.toLocaleString('en-IN')}` });
        }

        // Update history
        booking.paymentHistory.push({
            transactionId: reference || notes || `MAN-${Date.now()}`,
            amount: Number(amount),
            method: method || 'manual',
            purpose: 'balance',
            status: 'captured',
            recordedBy: req.user.name || 'Admin',
            notes: notes || reference
        });
        // Calculate total amount paid across ALL history (advance + balance + others)
        const totalPaid = booking.paymentHistory
            .filter(p => p.status === 'captured')
            .reduce((sum, p) => sum + p.amount, 0);

        // Update payment status based on total vs grandTotal
        if (totalPaid >= booking.grandTotal - 1) { // 1 INR tolerance
            booking.paymentStatus = 'FULLY_PAID';
            // Also ensure status is confirmed if it was awaiting approval
            if (booking.status === 'AWAITING_ADMIN_APPROVAL') {
                booking.status = 'CONFIRMED';
            }
            
            // Generate and send invoice upon full payment
            await generateAndSendInvoice(booking).catch(err => console.error('Invoice Email Failed:', err));
        } else if (totalPaid > booking.advanceAmount) {
            booking.paymentStatus = 'PARTIALLY_PAID';
        }

        await booking.save();

        res.json({ 
            success: true,
            message: `Recorded ₹${amount} payment via ${method?.toUpperCase()}`, 
            booking 
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/venue-bookings/:id/invoice — One-page printable invoice
export const getInvoice = async (req, res) => {
    try {
        const booking = await VenueBooking.findById(req.params.id)
            .populate('venue', 'name media type location')
            .populate('user', 'fullName email phone');

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const bookingUserId = booking.user?._id?.toString() || booking.user?.toString();
        if (bookingUserId !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // ── Calculations ──────────────────────────────────────
        const totalPaid = (booking.paymentHistory || [])
            .filter(p => p.status === 'captured')
            .reduce((s, p) => s + p.amount, 0);
        const liveBalance = Math.max(0, booking.grandTotal - totalPaid);
        const isFullyPaid = liveBalance <= 0;
        const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        const slotMap = { morning: '6AM–12PM', afternoon: '12PM–6PM', evening: '6PM–12AM', fullDay: '6AM–12AM' };
        const eventLabel = (booking.eventType || 'other').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        // ── Line items ──────────────────────────────────────────
        const lines = [];
        lines.push({ desc: `Venue — ${booking.venue.name} (${slotMap[booking.timeSlot] || booking.timeSlot})`, amt: booking.venueTotal });
        if (booking.venueGstAmount > 0) lines.push({ desc: `  GST @ ${booking.venueGstRate}%`, amt: booking.venueGstAmount, sub: true });
        if (booking.hasCatering) {
            lines.push({ desc: `Catering — ${booking.catering.packageName || 'Package'} × ${booking.catering.guestCount} pax`, amt: booking.catering.baseTotal });
            (booking.catering.extraItems || []).forEach(e => lines.push({ desc: `  Extra: ${e.name} ×${e.quantity}`, amt: e.total, sub: true }));
            (booking.catering.liveStations || []).forEach(l => lines.push({ desc: `  Live Station: ${l.name}`, amt: l.total, sub: true }));
            if (booking.catering.beveragePackage?.name) lines.push({ desc: `  Beverage: ${booking.catering.beveragePackage.name}`, amt: booking.catering.beveragePackage.total, sub: true });
            if (booking.catering.kidsMenu?.enabled) lines.push({ desc: `  Kids Menu ×${booking.catering.kidsMenu.count}`, amt: booking.catering.kidsMenu.total, sub: true });
            if (booking.catering.midnightSnacks?.enabled) lines.push({ desc: `  Midnight Snacks`, amt: booking.catering.midnightSnacks.total, sub: true });
            if (booking.catering.gstAmount > 0) lines.push({ desc: `  Catering GST @ ${booking.catering.gstRate}%`, amt: booking.catering.gstAmount, sub: true });
        }
        (booking.additionalServices || []).forEach(s => lines.push({ desc: `${s.name} (${s.category})`, amt: s.total }));
        if (booking.servicesGstAmount > 0) lines.push({ desc: `  Services GST @ ${booking.servicesGstRate}%`, amt: booking.servicesGstAmount, sub: true });
        lines.push({ desc: 'Security Deposit (Refundable)', amt: booking.securityDeposit });

        const lineRowsHtml = lines.map(l => `
            <tr>
                <td style="padding:4px 8px;font-size:10.5px;color:${l.sub ? '#64748b' : '#e2e8f0'}">${l.desc}</td>
                <td style="padding:4px 8px;font-size:10.5px;text-align:right;color:${l.sub ? '#64748b' : '#f1f5f9'};white-space:nowrap">${fmt(l.amt)}</td>
            </tr>`).join('');

        const payLedger = (booking.paymentHistory || []).map(p => `
            <tr>
                <td style="padding:3px 6px;font-size:9.5px;color:#94a3b8">${fmtDate(p.timestamp)}</td>
                <td style="padding:3px 6px;font-size:9.5px;color:#cbd5e1;text-transform:capitalize">${(p.purpose || 'payment').replace(/_/g, ' ')}</td>
                <td style="padding:3px 6px;font-size:9.5px;color:#94a3b8;text-transform:uppercase">${p.method || '—'}</td>
                <td style="padding:3px 6px;font-size:9.5px;text-align:right;color:#4ade80;font-weight:700">${fmt(p.amount)}</td>
            </tr>`).join('');

        const statusMap = {
            CONFIRMED: { label: 'CONFIRMED', color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
            AWAITING_ADMIN_APPROVAL: { label: 'PENDING APPROVAL', color: '#a5b4fc', bg: 'rgba(99,102,241,0.12)' },
            COMPLETED: { label: 'COMPLETED', color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
            CANCELLED: { label: 'CANCELLED', color: '#fca5a5', bg: 'rgba(239,68,68,0.12)' },
        };
        const sc = statusMap[booking.status] || statusMap.AWAITING_ADMIN_APPROVAL;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${booking.bookingRef}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet"/>
<style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#0a0a10;color:#e2e8f0;font-family:'Inter',sans-serif}
    .page{width:210mm;min-height:297mm;background:#0e0e18;padding:9mm 11mm;display:flex;flex-direction:column;gap:5px;margin:0 auto}
    /* TOP BAR */
    .top-bar{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:7px;border-bottom:1px solid #1e1e30}
    .brand{font-family:'Playfair Display',serif;font-size:20px;color:#c9a96e;letter-spacing:4px}
    .brand-sub{font-size:7.5px;color:#374151;letter-spacing:0.3em;text-transform:uppercase;margin-top:2px}
    .inv-right{text-align:right}
    .inv-lbl{font-size:7.5px;color:#4a5568;letter-spacing:0.3em;text-transform:uppercase}
    .inv-ref{font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:#c9a96e}
    .inv-date{font-size:8.5px;color:#374151;margin-top:1px}
    /* BADGES */
    .status-row{display:flex;gap:5px;align-items:center;flex-wrap:wrap}
    .badge{padding:2px 9px;border-radius:100px;font-size:7.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase}
    /* PARTIES */
    .parties{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
    .party{background:#131320;border:1px solid #1e1e30;border-radius:7px;padding:7px 9px}
    .party-lbl{font-size:7px;font-weight:700;letter-spacing:0.3em;color:#374151;text-transform:uppercase;margin-bottom:4px}
    .party-name{font-size:10.5px;font-weight:700;color:#f1f5f9;margin-bottom:2px}
    .party-line{font-size:8.5px;color:#64748b;line-height:1.5}
    .party-line span{color:#c9a96e}
    /* EVENT ROW */
    .event-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
    .ev{background:#131320;border:1px solid #1e1e30;border-radius:6px;padding:5px 8px}
    .ev-lbl{font-size:7px;font-weight:700;letter-spacing:0.25em;color:#374151;text-transform:uppercase;margin-bottom:2px}
    .ev-val{font-size:10px;font-weight:700;color:#e2e8f0}
    /* BODY GRID */
    .body-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:6px;flex:1}
    /* ITEMS */
    .items-card{background:#131320;border:1px solid #1e1e30;border-radius:7px;overflow:hidden}
    .card-ttl{padding:4px 8px;font-size:7px;font-weight:700;letter-spacing:0.28em;color:#374151;text-transform:uppercase;border-bottom:1px solid #1e1e30;background:#0e0e18}
    .items-table{width:100%;border-collapse:collapse}
    .items-table td{border-bottom:1px solid #1a1a28}
    .items-table tr:last-child td{border-bottom:none}
    .total-tr td{border-top:1px solid #c9a96e!important;padding:5px 8px!important;font-size:11.5px!important;font-weight:900!important;color:#c9a96e!important}
    /* LEDGER */
    .ledger-table{width:100%;border-collapse:collapse}
    .ledger-table td{border-bottom:1px solid #1a1a28}
    .ledger-table tr:last-child td{border-bottom:none}
    .ledger-total td{border-top:1px solid #252535!important;background:#0e1018;font-weight:700!important;color:#4ade80!important}
    /* RIGHT COL */
    .right-col{display:flex;flex-direction:column;gap:5px}
    .summary-card{background:#131320;border:1px solid #1e1e30;border-radius:7px;overflow:hidden}
    .fin-row{display:flex;justify-content:space-between;padding:4px 9px;font-size:9.5px;border-bottom:1px solid #1a1a28}
    .fin-row:last-child{border-bottom:none}
    .fin-lbl{color:#64748b}
    .fin-val{font-weight:700;color:#e2e8f0}
    .fin-row.accent{background:rgba(201,169,110,0.06)}
    .fin-row.accent .fin-lbl{color:#e2e8f0;font-weight:700}
    .fin-row.accent .fin-val{font-size:12px;color:#c9a96e}
    /* BALANCE */
    .balance-box{border-radius:7px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center}
    .balance-box.paid{background:rgba(5,46,22,0.55);border:1px solid rgba(22,163,74,0.3)}
    .balance-box.due{background:rgba(69,10,10,0.55);border:1px solid rgba(239,68,68,0.3)}
    .bal-title{font-size:9px;font-weight:700}
    .bal-sub{font-size:7.5px;margin-top:1px}
    .paid .bal-title,.paid .bal-amount{color:#4ade80}
    .paid .bal-sub{color:rgba(74,222,128,0.55)}
    .due .bal-title,.due .bal-amount{color:#fca5a5}
    .due .bal-sub{color:rgba(252,165,165,0.55)}
    .bal-amount{font-size:15px;font-weight:900}
    /* SIGNATURES */
    .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:5px}
    .sig-box{background:#131320;border:1px solid #1e1e30;border-radius:7px;padding:7px 9px;text-align:center}
    .sig-space{height:18px}
    .sig-line{height:1px;background:#252535;margin:3px 0}
    .sig-name{font-size:9px;font-weight:700;color:#e2e8f0}
    .sig-role{font-size:7px;color:#374151;letter-spacing:0.15em;text-transform:uppercase}
    .seal{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:1px dashed rgba(201,169,110,0.4);font-size:6.5px;font-weight:700;color:#c9a96e;text-align:center;line-height:1.3;margin-bottom:3px}
    /* FOOTER */
    .footer{border-top:1px solid #1e1e30;padding-top:5px;display:flex;justify-content:space-between;align-items:center;margin-top:auto}
    .footer-brand{font-size:8.5px;color:#374151}
    .footer-brand span{color:#c9a96e;font-weight:700}
    .footer-note{font-size:7px;color:#1f2937;letter-spacing:0.06em}
    /* NO PRINT */
    .np{text-align:center;padding:10px;display:flex;justify-content:center;gap:9px}
    .btn{padding:7px 18px;border-radius:7px;border:none;cursor:pointer;font-size:9.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase}
    .btn-p{background:#c9a96e;color:#000}
    .btn-s{background:#131320;color:#c9a96e;border:1px solid #252535}
    @media print{
        html,body{background:#fff;color:#000}
        .page{background:#fff;padding:7mm 9mm;min-height:auto}
        .np{display:none}
        .party,.ev,.items-card,.summary-card,.balance-box,.sig-box{background:#f8fafc!important;border-color:#e2e8f0!important}
        .brand,.inv-ref,.total-tr td,.fin-row.accent .fin-val,.bal-amount{color:#8b5e1a!important}
        .top-bar,.footer{border-color:#e2e8f0!important}
        .card-ttl{background:#f1f5f9!important}
        .balance-box.paid{background:#f0fdf4!important}
        .balance-box.due{background:#fef2f2!important}
        .paid .bal-title,.paid .bal-amount{color:#16a34a!important}
        .due .bal-title,.due .bal-amount{color:#dc2626!important}
        .paid .bal-sub{color:#86efac!important}
        .due .bal-sub{color:#fca5a5!important}
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
        @page{size:A4;margin:0}
    }
</style>
</head>
<body>
<div class="np">
    <button class="btn btn-p" onclick="window.print()">⬇ Save as PDF / Print</button>
    <button class="btn btn-s" onclick="window.close()">✕ Close</button>
</div>
<div class="page">

    <!-- TOP BAR -->
    <div class="top-bar">
        <div><div class="brand">VINCENT</div><div class="brand-sub">Gastronomy Cloud · Venue Division</div></div>
        <div class="inv-right">
            <div class="inv-lbl">Tax Invoice</div>
            <div class="inv-ref">${booking.bookingRef}</div>
            <div class="inv-date">Issued: ${fmtDate(booking.createdAt)} &nbsp;·&nbsp; GSTIN: 27AAAAA0000A1Z5</div>
        </div>
    </div>

    <!-- STATUS -->
    <div class="status-row">
        <span class="badge" style="background:${sc.bg};color:${sc.color}">${sc.label}</span>
        <span class="badge" style="background:rgba(99,102,241,0.1);color:#a5b4fc">${(booking.paymentStatus||'').replace(/_/g,' ')}</span>
        ${booking.hasCatering ? '<span class="badge" style="background:rgba(201,169,110,0.1);color:#c9a96e">Catering</span>' : ''}
        ${(booking.additionalServices?.length > 0) ? `<span class="badge" style="background:rgba(168,85,247,0.1);color:#c084fc">${booking.additionalServices.length} Services</span>` : ''}
        <span style="font-size:8px;color:#374151;margin-left:auto">Source: ${booking.bookingSource||'Online'}</span>
    </div>

    <!-- PARTIES -->
    <div class="parties">
        <div class="party">
            <div class="party-lbl">Billed To</div>
            <div class="party-name">${booking.contactInfo.fullName}</div>
            <div class="party-line">${booking.contactInfo.email} · ${booking.contactInfo.phone}${booking.contactInfo.alternatePhone?' / '+booking.contactInfo.alternatePhone:''}</div>
        </div>
        <div class="party">
            <div class="party-lbl">Venue</div>
            <div class="party-name">${booking.venue.name}</div>
            <div class="party-line">${booking.venue.location?.address||'Vincent Venue Complex'}<br/><span>Event: ${eventLabel}</span></div>
        </div>
        <div class="party">
            <div class="party-lbl">Issued By</div>
            <div class="party-name">Vincent Gastronomy Cloud</div>
            <div class="party-line">101, Elite Business Park, Cybercity, MH<br/><span>PAN: AABCV1234D · GSTIN: 27AAAAA0000A1Z5</span></div>
        </div>
    </div>

    <!-- EVENT -->
    <div class="event-grid">
        <div class="ev"><div class="ev-lbl">Event Date</div><div class="ev-val">${fmtDate(booking.eventDate)}</div></div>
        <div class="ev"><div class="ev-lbl">Time Slot</div><div class="ev-val">${slotMap[booking.timeSlot]||booking.timeSlot}</div></div>
        <div class="ev"><div class="ev-lbl">Guests</div><div class="ev-val">${booking.guestCount} pax</div></div>
        <div class="ev"><div class="ev-lbl">Balance Due By</div><div class="ev-val" style="color:${isFullyPaid?'#4ade80':'#fca5a5'}">${isFullyPaid?'Settled ✓':fmtDate(booking.balanceDueDate)}</div></div>
    </div>

    <!-- BODY -->
    <div class="body-grid">

        <!-- LEFT: ITEMS + LEDGER -->
        <div class="items-card">
            <div class="card-ttl">Itemized Charges</div>
            <table class="items-table"><tbody>
                ${lineRowsHtml}
                <tr class="total-tr"><td>Grand Total (incl. taxes)</td><td style="text-align:right;white-space:nowrap">${fmt(booking.grandTotal)}</td></tr>
            </tbody></table>
            ${payLedger ? `
            <div class="card-ttl" style="margin-top:0">Payment Ledger</div>
            <table class="ledger-table"><tbody>
                ${payLedger}
                <tr class="ledger-total">
                    <td colspan="3" style="padding:3px 6px;font-size:9.5px">Total Paid</td>
                    <td style="padding:3px 6px;font-size:9.5px;text-align:right">${fmt(totalPaid)}</td>
                </tr>
            </tbody></table>` : ''}
        </div>

        <!-- RIGHT: SUMMARY + BALANCE + SIGNATURES -->
        <div class="right-col">
            <div class="summary-card">
                <div class="card-ttl">Financial Summary</div>
                <div class="fin-row"><span class="fin-lbl">Advance (${booking.advancePercent}%)</span><span class="fin-val">${fmt(booking.advanceAmount)}</span></div>
                <div class="fin-row"><span class="fin-lbl">Original Balance</span><span class="fin-val">${fmt(booking.balanceAmount)}</span></div>
                ${booking.hasCatering?`<div class="fin-row"><span class="fin-lbl">Catering Total</span><span class="fin-val">${fmt(booking.catering.total)}</span></div>`:''}
                ${booking.servicesTotal>0?`<div class="fin-row"><span class="fin-lbl">Services Total</span><span class="fin-val">${fmt(booking.servicesTotal)}</span></div>`:''}
                <div class="fin-row"><span class="fin-lbl">Security Deposit</span><span class="fin-val">${fmt(booking.securityDeposit)}</span></div>
                <div class="fin-row"><span class="fin-lbl">Total Paid</span><span class="fin-val" style="color:#4ade80">${fmt(totalPaid)}</span></div>
                <div class="fin-row accent"><span class="fin-lbl">Grand Total</span><span class="fin-val">${fmt(booking.grandTotal)}</span></div>
            </div>

            <div class="balance-box ${isFullyPaid?'paid':'due'}">
                <div>
                    <div class="bal-title">${isFullyPaid?'✓ Settled in Full':'⚠ Balance Outstanding'}</div>
                    <div class="bal-sub">${isFullyPaid?'All dues cleared':('Due by '+fmtDate(booking.balanceDueDate))}</div>
                </div>
                <div class="bal-amount">${isFullyPaid?'₹ 0':fmt(liveBalance)}</div>
            </div>

            <div class="sig-row">
                <div class="sig-box">
                    <div style="font-size:7px;color:#374151;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:1px">Client</div>
                    <div class="sig-space"></div>
                    <div class="sig-line"></div>
                    <div class="sig-name">${booking.contactInfo.fullName}</div>
                    <div class="sig-role">Acknowledgement</div>
                </div>
                <div class="sig-box">
                    <div style="font-size:7px;color:#374151;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:1px">Authorised By</div>
                    <div class="seal">VCNT<br/>SEAL</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">Vincent Venues Mgmt</div>
                    <div class="sig-role">Auth. Signatory</div>
                </div>
            </div>

            <div style="background:#131320;border:1px solid #1e1e30;border-radius:6px;padding:5px 8px;font-size:7.5px;color:#374151;line-height:1.7">
                <span style="color:#4a5568;font-weight:700">T&amp;C: </span>Deposit refundable 7d post-event. Cancel: 30d+ 80%, 15–30d 50%, &lt;15d nil. Balance clears by due date.
            </div>
        </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
        <div class="footer-brand"><span>VINCENT</span> Gastronomy Cloud Pvt Ltd · support@vincentvenues.com · +91-98765-43210</div>
        <div class="footer-note">Generated ${new Date().toLocaleString('en-IN')} · System-verified · ${booking.bookingRef}</div>
    </div>

</div>
</body>
</html>`;

        res.send(html);

    } catch (err) {
        console.error('Invoice error:', err);
        res.status(500).json({ message: err.message });
    }
};

// ============================================
// INSTANT SLOT LOCKING (Pre-Booking)
// ============================================

export const lockVenueSlot = async (req, res) => {
    try {
        const { venueId, date, timeSlot } = req.body;
        const userId = req.user._id;
        const LOCK_DURATION_MINS = 3;

        if (!venueId || !date || !timeSlot) {
            return res.status(400).json({ message: 'Venue ID, Date, and Slot are required' });
        }

        const targetDateUTC = new Date(new Date(date).toISOString().split('T')[0] + 'T00:00:00.000Z');
        const expiresAt = new Date(Date.now() + LOCK_DURATION_MINS * 60 * 1000);

        // Concurrency Check 1: Already booked or has a payment-pending lock (existing logic)
        const conflict = await VenueBooking.findOne({
            venue: venueId,
            eventDate: targetDateUTC,
            status: { $in: ['CONFIRMED', 'PAYMENT_PENDING', 'AWAITING_ADMIN_APPROVAL', 'COMPLETED'] },
            $or: [
                { timeSlot: timeSlot },
                { timeSlot: 'fullDay' },
                { $and: [{ timeSlot: { $ne: 'fullDay' } }, { $expr: { $eq: [timeSlot, 'fullDay'] } }] }
            ],
            $or: [
                { lockExpiresAt: { $gt: new Date() } },
                { lockExpiresAt: { $exists: false } }
            ]
        });

        if (conflict) {
            return res.status(409).json({ message: 'This slot is already reserved or being booked.' });
        }

        // Concurrency Check 2: Try to create/update short-term lock
        // We use findOneAndUpdate with upsert or try/catch insert to ensure atomicity
        try {
            // First, release any existing locks by THIS user for THIS venue/date to allow changing slots
            await VenueSlotLock.deleteMany({ venue: venueId, user: userId });

            // Now try to lock the new slot
            const newLock = new VenueSlotLock({
                venue: venueId,
                eventDate: targetDateUTC,
                timeSlot,
                user: userId,
                expiresAt
            });

            await newLock.save();

            // Emit socket update
            try {
                const io = getIO();
                io.emit(SOCKET_EVENTS.VENUE_SLOT_LOCKED, {
                    venueId,
                    date: targetDateUTC,
                    timeSlot,
                    lockExpiresAt: expiresAt,
                    isPreLock: true
                });
            } catch (sErr) {}

            res.json({
                message: 'Slot locked successfully',
                lockExpiresAt: expiresAt
            });

        } catch (dbErr) {
            if (dbErr.code === 11000) { // Duplicate key - someone else locked it
                return res.status(409).json({ message: 'This slot was just locked by another user.' });
            }
            throw dbErr;
        }

    } catch (err) {
        console.error('Lock slot error:', err);
        res.status(500).json({ message: err.message });
    }
};

export const releaseVenueSlot = async (req, res) => {
    try {
        const { venueId, date, timeSlot } = req.body;
        const userId = req.user._id;

        const targetDateUTC = new Date(new Date(date).toISOString().split('T')[0] + 'T00:00:00.000Z');

        const deleted = await VenueSlotLock.findOneAndDelete({
            venue: venueId,
            eventDate: targetDateUTC,
            timeSlot,
            user: userId
        });

        if (deleted) {
            try {
                const io = getIO();
                io.emit(SOCKET_EVENTS.VENUE_SLOT_RELEASED, {
                    venueId,
                    date: targetDateUTC,
                    timeSlot
                });
            } catch (sErr) {}
        }

        res.json({ message: 'Slot released' });
    } catch (err) {
        console.error('Release slot error:', err);
        res.status(500).json({ message: err.message });
    }
};
