import TableReservation from '../models/TableReservation.js';
import Table from '../models/Table.js';
import crypto from 'crypto';
import { getIO } from '../utils/socket.js';

// @desc    Create reservation payment order
// @route   POST /api/table-reservations/create-order
// @access  Private
import { createOrder, verifySignature } from '../utils/paymentGateway.js';

export const createReservationOrder = async (req, res) => {
    try {
        const { tableId, tableIds, date, timeSlot, guestCount, occasion, specialRequests, preferences } = req.body;

        // Normalize to array of IDs
        const selectedIds = tableIds || (tableId ? [tableId] : []);

        if (selectedIds.length === 0) {
            return res.status(400).json({ message: 'No tables selected' });
        }

        // Validate all tables exist and are available
        const tables = await Table.find({ _id: { $in: selectedIds } });
        if (tables.length !== selectedIds.length) {
            return res.status(404).json({ message: 'One or more tables not found' });
        }

        for (const table of tables) {
            if (!table.isActive || table.isBlocked) {
                return res.status(400).json({ message: `Table ${table.tableNumber} is not available` });
            }
        }

        const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
        if (totalCapacity < guestCount) {
            return res.status(400).json({ message: 'Total capacity insufficient for guest count' });
        }

        // Check for existing active holds or bookings
        const now = new Date();
        const existingReservations = await TableReservation.find({
            $or: [
                { table: { $in: selectedIds } },
                { tables: { $in: selectedIds } }
            ],
            date: new Date(date),
            'timeSlot.start': timeSlot.start,
            status: { $in: ['pending', 'confirmed'] }
        });

        for (const reservation of existingReservations) {
            if (reservation.status === 'confirmed') {
                return res.status(409).json({ success: false, message: 'These tables were just booked by someone else.' });
            }

            if (reservation.status === 'pending') {
                if (reservation.user.toString() === req.user._id.toString()) {
                    // Same user - let's release old one and create new or just keep it. 
                    // To keep it simple, we delete old pending to refresh the flow.
                    await TableReservation.deleteOne({ _id: reservation._id });
                } else if (reservation.lockExpiresAt && reservation.lockExpiresAt > now) {
                    return res.status(409).json({ success: false, message: 'Table is currently locked by another guest.' });
                }
            }
        }

        const advanceAmount = tables.reduce((sum, t) => sum + t.reservationPrice, 0);
        const amountInPaise = Math.round(advanceAmount * 100);

        // CREATE RAZORPAY ORDER
        const rzpOptions = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_res_${Date.now()}`,
            notes: {
                userId: req.user._id.toString(),
                date: new Date(date).toDateString(),
                slot: timeSlot.start
            }
        };

        let rzpOrder;
        try {
            rzpOrder = await createOrder(rzpOptions);
        } catch (rzpErr) {
            console.error('Razorpay Reservation Order Error:', rzpErr);
            return res.status(500).json({ message: 'Could not initiate Razorpay payment' });
        }

        // Lock expires in 10 minutes (raised from 5 for better UX)
        const lockExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const reservation = await TableReservation.create({
            user: req.user._id,
            table: selectedIds.length === 1 ? selectedIds[0] : null,
            tables: selectedIds,
            isCombined: selectedIds.length > 1,
            totalCapacity,
            date: new Date(date),
            timeSlot,
            guestCount,
            occasion: occasion || 'Casual Dining',
            specialRequests: specialRequests || '',
            preferences: preferences || {},
            advanceAmount,
            status: 'pending',
            paymentStatus: 'pending',
            lockExpiresAt,
            razorpayOrderId: rzpOrder.id
        });

        // Emit table_hold event
        try {
            const io = getIO();
            io.emit('table_hold', {
                tableIds: selectedIds,
                date: reservation.date,
                timeSlot: reservation.timeSlot,
                userId: req.user._id,
                expiresAt: lockExpiresAt
            });
        } catch (ioErr) {}

        res.json({
            success: true,
            data: {
                amount: advanceAmount,
                razorpayOrderId: rzpOrder.id,
                reservationId: reservation._id,
                reservationNumber: reservation.reservationNumber,
                expiresAt: lockExpiresAt,
                key: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error('[CREATE RESERVATION ORDER ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify payment and confirm reservation
// @route   POST /api/table-reservations/verify-payment
// @access  Private
export const verifyReservationPayment = async (req, res) => {
    try {
        const { reservationId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        if (!reservationId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ message: 'Missing payment details' });
        }

        // 1. Verify Signature
        const signatureValid = verifySignature({
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            signature: razorpaySignature,
        });

        if (!signatureValid) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        // 2. Double check with Razorpay API (Production Level)
        try {
            const rzpPayment = await razorpay.payments.fetch(razorpayPaymentId);
            if (rzpPayment.status !== 'captured' && rzpPayment.status !== 'authorized') {
                return res.status(400).json({ message: 'Payment not captured' });
            }
        } catch (fetchErr) {
            console.warn('Razorpay fetch failed, relying on signature');
        }

        // 3. Find and verify reservation
        const reservation = await TableReservation.findById(reservationId).populate('table user');
        if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

        // Prevent duplicate
        if (reservation.status === 'confirmed') {
            return res.json({ success: true, message: 'Already confirmed', data: { reservation } });
        }

        const now = new Date();
        if (reservation.status === 'cancelled' || (reservation.status === 'pending' && reservation.lockExpiresAt < now)) {
            // Refund would typically be handled here if payment was actually made
            return res.status(400).json({ message: 'Session expired. Tables released.' });
        }

        // Atomic Check (Again)
        const selectedIds = reservation.tables && reservation.tables.length > 0
            ? reservation.tables
            : [reservation.table?._id];

        const conflict = await TableReservation.findOne({
            $or: [{ table: { $in: selectedIds } }, { tables: { $in: selectedIds } }],
            date: reservation.date,
            'timeSlot.start': reservation.timeSlot.start,
            status: 'confirmed',
            _id: { $ne: reservation._id }
        });

        if (conflict) {
            return res.status(409).json({ message: 'Atomic conflict: Table was already booked.' });
        }

        // 4. Update and Save
        reservation.razorpayOrderId = razorpayOrderId;
        reservation.razorpayPaymentId = razorpayPaymentId;
        reservation.razorpaySignature = razorpaySignature;
        reservation.paymentStatus = 'paid';
        reservation.status = 'confirmed';
        reservation.lockExpiresAt = undefined;
        await reservation.save();

        // 5. Socket Notification
        try {
            const io = getIO();
            io.emit('table_booked', {
                tableIds: selectedIds,
                date: reservation.date,
                timeSlot: reservation.timeSlot
            });
            io.to('admin').emit('reservation:created', { reservation });
        } catch (_) {}

        res.json({
            success: true,
            message: 'Reservation confirmed',
            data: { reservation }
        });
    } catch (error) {
        console.error('[VERIFY PAYMENT ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user's reservations
// @route   GET /api/table-reservations/my
// @access  Private
export const getMyReservations = async (req, res) => {
    try {
        const reservations = await TableReservation.find({ user: req.user._id })
            .populate('table', 'tableNumber capacity area acType floor reservationPrice')
            .populate('tables', 'tableNumber capacity area acType floor reservationPrice')
            .sort({ createdAt: -1 });

        console.log('[GET MY RESERVATIONS]', req.user.email, reservations.length);

        res.json({
            success: true,
            count: reservations.length,
            data: { reservations }
        });
    } catch (error) {
        console.error('[GET MY RESERVATIONS ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reservation by ID
// @route   GET /api/table-reservations/:id
// @access  Private
export const getReservationById = async (req, res) => {
    try {
        const reservation = await TableReservation.findById(req.params.id)
            .populate('table user')
            .populate('tables');

        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        // Check authorization (user can only see their own reservation)
        if (reservation.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json({
            success: true,
            data: { reservation }
        });
    } catch (error) {
        console.error('[GET RESERVATION ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel reservation
// @route   PUT /api/table-reservations/:id/cancel
// @access  Private
export const cancelReservation = async (req, res) => {
    try {
        const reservation = await TableReservation.findById(req.params.id)
            .populate('table');

        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        // Check authorization
        if (reservation.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (reservation.status === 'cancelled') {
            return res.status(400).json({ message: 'Reservation already cancelled' });
        }

        if (reservation.status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel a completed reservation' });
        }

        // Prevent cancelling past reservations even if they are in 'confirmed' status
        const reservationTime = new Date(reservation.date);
        const [hours, minutes] = (reservation.timeSlot?.start || '00:00').split(':');
        reservationTime.setHours(parseInt(hours), parseInt(minutes), 0);

        if (reservationTime < new Date()) {
            return res.status(400).json({ message: 'Cannot cancel a past reservation' });
        }

        // Only allowed for confirmed or pending
        if (!['confirmed', 'pending'].includes(reservation.status)) {
            return res.status(400).json({ message: `Cannot cancel reservation with status: ${reservation.status}` });
        }

        // Calculate refund
        const refundAmount = reservation.calculateRefund();

        reservation.status = 'cancelled';
        reservation.cancelledBy = 'user';
        reservation.cancelledAt = new Date();
        const { reason, cancellationReason } = req.body;
        reservation.cancellationReason = cancellationReason || reason || 'Cancelled by user';

        if (refundAmount > 0 && reservation.paymentStatus === 'paid') {
            reservation.refundAmount = refundAmount;
            reservation.refundStatus = 'processing';

            // TODO: Integrate Razorpay refund API
            console.log('[REFUND PROCESSING]', reservation.reservationNumber, refundAmount);

            // Simulate refund completion
            reservation.refundStatus = 'completed';
        }

        await reservation.save();

        console.log('[RESERVATION CANCELLED]', reservation.reservationNumber);

        // Emit table_released event
        try {
            const io = getIO();
            const tableIds = reservation.tables && reservation.tables.length > 0
                ? reservation.tables.map(id => id.toString())
                : [reservation.table?._id?.toString() || reservation.table?.toString()];

            io.emit('table_released', {
                tableIds: tableIds.filter(Boolean),
                date: reservation.date,
                timeSlot: reservation.timeSlot
            });
        } catch (socketError) {
            console.error('[SOCKET ERROR] Failed to emit table_released', socketError.message);
        }

        res.json({
            success: true,
            message: 'Reservation cancelled successfully',
            data: {
                reservation,
                refundAmount
            }
        });
    } catch (error) {
        console.error('[CANCEL RESERVATION ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark arrival
// @route   PUT /api/table-reservations/:id/arrive
// @access  Private
export const markArrival = async (req, res) => {
    try {
        const reservation = await TableReservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        if (reservation.status !== 'confirmed') {
            return res.status(400).json({ message: 'Reservation not confirmed' });
        }

        reservation.arrivalTime = new Date();
        reservation.status = 'completed';
        await reservation.save();

        console.log('[CUSTOMER ARRIVED]', reservation.reservationNumber);

        res.json({
            success: true,
            message: 'Arrival marked successfully',
            data: { reservation }
        });
    } catch (error) {
        console.error('[MARK ARRIVAL ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

// ========== ADMIN ENDPOINTS ==========

// @desc    Release a held table reservation (manual or timeout)
// @route   PUT /api/table-reservations/:id/release
// @access  Private
export const releaseReservationLock = async (req, res) => {
    try {
        const reservation = await TableReservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        // Only allow releasing pending reservations
        if (reservation.status !== 'pending') {
            return res.status(400).json({ message: 'Can only release pending reservations' });
        }

        // Verify ownership (only user who locked it or admin can release)
        if (reservation.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(401).json({ message: 'Not authorized to release this lock' });
        }

        reservation.status = 'cancelled';
        reservation.cancellationReason = 'Released by user';
        reservation.cancelledBy = 'user';
        reservation.lockExpiresAt = undefined;
        await reservation.save();

        // Emit table_released event
        try {
            const io = getIO();
            const tableIds = reservation.tables && reservation.tables.length > 0
                ? reservation.tables.map(id => id.toString())
                : [reservation.table?._id?.toString() || reservation.table?.toString()];

            io.emit('table_released', {
                tableIds: tableIds.filter(Boolean),
                date: reservation.date,
                timeSlot: reservation.timeSlot
            });
        } catch (socketError) {
            console.error('[SOCKET ERROR] Failed to emit table_released', socketError.message);
        }

        res.json({
            success: true,
            message: 'Table(s) released successfully'
        });
    } catch (error) {
        console.error('[RELEASE LOCK ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reservations (Admin)
// @route   GET /api/admin/table-reservations
// @access  Private/Admin
export const getAllReservations = async (req, res) => {
    try {
        const { date, status, table, sort = '-createdAt', limit = 100 } = req.query;

        const filter = {};
        if (date) {
            const queryDate = new Date(date);
            filter.date = {
                $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
                $lt: new Date(queryDate.setHours(23, 59, 59, 999))
            };
        }
        if (status) filter.status = status;
        if (table) filter.table = table;

        const reservations = await TableReservation.find(filter)
            .populate('user', 'name email phone')
            .populate('table', 'tableNumber capacity area acType floor')
            .populate('tables', 'tableNumber capacity area acType floor')
            .sort(sort)
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: reservations.length,
            data: { reservations }
        });
    } catch (error) {
        console.error('[GET ALL RESERVATIONS ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update reservation status (Admin)
// @route   PUT /api/admin/table-reservations/:id/status
// @access  Private/Admin
export const updateReservationStatus = async (req, res) => {
    try {
        const { status, adminNotes, cancellationReason, tableIds } = req.body;

        const reservation = await TableReservation.findById(req.params.id)
            .populate('user table tables');

        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        // Handle manual table override
        if (tableIds && Array.isArray(tableIds) && tableIds.length > 0) {
            const tables = await Table.find({ _id: { $in: tableIds } });
            if (tables.length === tableIds.length) {
                reservation.tables = tableIds;
                reservation.table = tableIds.length === 1 ? tableIds[0] : null;
                reservation.isCombined = tableIds.length > 1;
                reservation.totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
            }
        }

        const previousStatus = reservation.status;
        reservation.status = status;

        if (adminNotes) reservation.adminNotes = adminNotes;

        if (status === 'cancelled') {
            reservation.cancelledBy = 'admin';
            reservation.cancelledAt = new Date();
            reservation.cancellationReason = cancellationReason || 'Cancelled by admin';

            // Process refund
            if (reservation.paymentStatus === 'paid') {
                const refundAmount = reservation.calculateRefund();
                reservation.refundAmount = refundAmount;
                reservation.refundStatus = 'processing';

                // TODO: Razorpay refund API
                reservation.refundStatus = 'completed';
            }

            // Emit socket event to user
            try {
                const io = getIO();
                io.to(`user:${reservation.user._id}`).emit('reservation:cancelled', {
                    reservation: reservation.toObject(),
                    reason: reservation.cancellationReason,
                    refundAmount: reservation.refundAmount
                });
            } catch (socketError) {
                console.error('[SOCKET ERROR]', socketError);
            }
        }

        await reservation.save();

        console.log('[RESERVATION STATUS UPDATED]', reservation.reservationNumber, previousStatus, '->', status);

        res.json({
            success: true,
            message: 'Reservation status updated successfully',
            data: { reservation }
        });
    } catch (error) {
        console.error('[UPDATE RESERVATION STATUS ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reservation statistics (Admin)
// @route   GET /api/admin/table-reservations/stats
// @access  Private/Admin
export const getReservationStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalReservations = await TableReservation.countDocuments();
        const todayReservations = await TableReservation.countDocuments({
            date: { $gte: today }
        });

        const upcomingReservations = await TableReservation.countDocuments({
            date: { $gte: today },
            status: { $in: ['pending', 'confirmed'] }
        });

        const noShowCount = await TableReservation.countDocuments({
            status: 'no_show'
        });

        const totalRevenue = await TableReservation.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$advanceAmount' } } }
        ]);

        res.json({
            success: true,
            data: {
                stats: {
                    totalReservations,
                    todayReservations,
                    upcomingReservations,
                    pendingCount: await TableReservation.countDocuments({ status: 'pending' }),
                    noShowCount,
                    totalRevenue: totalRevenue[0]?.total || 0
                }
            }
        });
    } catch (error) {
        console.error('[RESERVATION STATS ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};
