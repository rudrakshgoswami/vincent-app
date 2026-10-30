import TableReservation from '../models/TableReservation.js';
import VenueBooking from '../models/VenueBooking.js';
import VenueSlotLock from '../models/VenueSlotLock.js';
import { getIO, SOCKET_EVENTS } from './socket.js';

export const startReservationLockCleanup = () => {
    console.log('✅ Started System-wide Lock Cleanup Job (Every 30s)');

    setInterval(async () => {
        try {
            const now = new Date();

            // --- 1. Table Reservation Cleanup ---
            const expiredTableLocks = await TableReservation.find({
                status: 'pending',
                lockExpiresAt: { $lt: now }
            });

            if (expiredTableLocks.length > 0) {
                const expiredIds = expiredTableLocks.map(l => l._id);
                for (const reservation of expiredTableLocks) {
                    const tableIds = reservation.tables && reservation.tables.length > 0
                        ? reservation.tables
                        : [reservation.table];

                    try {
                        const io = getIO();
                        io.emit('table_released', {
                            tableIds,
                            date: reservation.date,
                            timeSlot: reservation.timeSlot
                        });
                    } catch (ioErr) { }
                }

                await TableReservation.updateMany(
                    { _id: { $in: expiredIds } },
                    {
                        $set: {
                            status: 'cancelled',
                            cancellationReason: 'Payment timeout (5 mins)',
                            cancelledBy: 'system'
                        },
                        $unset: { lockExpiresAt: "" }
                    }
                );
                console.log(`[CLEANUP] Released ${expiredTableLocks.length} expired table locks`);
            }

            // --- 2. Venue Booking Temporary Lock Cleanup ---
            const expiredVenueLocks = await VenueBooking.find({
                status: 'PAYMENT_PENDING',
                lockExpiresAt: { $lt: now }
            });

            if (expiredVenueLocks.length > 0) {
                const expiredIds = expiredVenueLocks.map(l => l._id);
                for (const booking of expiredVenueLocks) {
                    try {
                        const io = getIO();
                        io.emit(SOCKET_EVENTS.VENUE_SLOT_RELEASED, {
                            venueId: booking.venue,
                            date: booking.eventDate,
                            timeSlot: booking.timeSlot
                        });
                    } catch (ioErr) { }
                }

                await VenueBooking.updateMany(
                    { _id: { $in: expiredIds } },
                    {
                        $set: {
                            status: 'CANCELLED',
                            paymentStatus: 'FAILED',
                            cancellationReason: 'Advance payment window expired (15 mins)',
                            cancelledBy: 'system'
                        },
                        $unset: { lockExpiresAt: "" }
                    }
                );
                console.log(`[CLEANUP] Released ${expiredVenueLocks.length} expired venue booking locks`);
            }

            // --- 3. Pre-Booking Slot Lock Cleanup ---
            const expiredSlotLocks = await VenueSlotLock.find({
                expiresAt: { $lt: now }
            });

            if (expiredSlotLocks.length > 0) {
                for (const lock of expiredSlotLocks) {
                    try {
                        const io = getIO();
                        io.emit(SOCKET_EVENTS.VENUE_SLOT_RELEASED, {
                            venueId: lock.venue,
                            date: lock.eventDate,
                            timeSlot: lock.timeSlot
                        });
                    } catch (ioErr) { }
                }

                await VenueSlotLock.deleteMany({
                    _id: { $in: expiredSlotLocks.map(l => l._id) }
                });
                console.log(`[CLEANUP] Deleted ${expiredSlotLocks.length} expired pre-booking slot locks`);
            }

            // --- 3. Venue Balance Overdue Check ---
            const overduePayments = await VenueBooking.updateMany(
                {
                    paymentStatus: { $in: ['ADVANCE_PAID', 'BALANCE_PENDING', 'PARTIALLY_PAID'] },
                    balanceDueDate: { $lt: now },
                    status: 'CONFIRMED'
                },
                {
                    $set: { paymentStatus: 'BALANCE_OVERDUE' }
                }
            );
            if (overduePayments.modifiedCount > 0) {
                console.log(`[CLEANUP] Marked ${overduePayments.modifiedCount} venue bookings as BALANCE_OVERDUE`);
            }

        } catch (error) {
            console.error('[CLEANUP ERROR]', error);
        }
    }, 30000); // Check every 30 seconds
};
