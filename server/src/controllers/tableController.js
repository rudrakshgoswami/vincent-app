import Table from '../models/Table.js';
import TableReservation from '../models/TableReservation.js';
import Settings from '../models/Settings.js';
import { getIO } from '../utils/socket.js';

// @desc    Get all tables
// @route   GET /api/tables
// @access  Public
export const getAllTables = async (req, res) => {
    try {
        const { area, floor, acType, minCapacity, activeOnly } = req.query;

        const filter = {};
        if (area) filter.area = area;
        if (floor) filter.floor = floor;
        if (acType) filter.acType = acType;
        if (minCapacity) filter.capacity = { $gte: parseInt(minCapacity) };
        if (activeOnly === 'true') {
            filter.isActive = true;
            filter.isBlocked = false;
        }

        const tables = await Table.find(filter).sort({ tableNumber: 1 });

        res.json({
            success: true,
            count: tables.length,
            data: { tables }
        });
    } catch (error) {
        console.error('[GET TABLES ERROR]', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get table by ID
// @route   GET /api/tables/:id
// @access  Public
export const getTableById = async (req, res) => {
    try {
        const table = await Table.findById(req.params.id);

        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Table not found'
            });
        }

        res.json({
            success: true,
            data: { table }
        });
    } catch (error) {
        console.error('[GET TABLE ERROR]', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Check table availability for specific date and time
// @route   POST /api/tables/check-availability
// @access  Public
export const checkAvailability = async (req, res) => {
    try {
        const { date, timeSlot, guestCount, preferences } = req.body;

        console.log('[CHECK AVAILABILITY]', { date, timeSlot, guestCount, preferences });

        // Get all active tables
        let filter = {
            isActive: true,
            isBlocked: false,
            capacity: { $gte: guestCount }
        };

        // Apply preferences
        if (preferences?.area) filter.area = preferences.area;
        if (preferences?.acType) filter.acType = preferences.acType;

        const tables = await Table.find(filter);

        // Check which tables are already booked for this slot
        const bookedTables = await TableReservation.find({
            date: new Date(date),
            'timeSlot.start': timeSlot.start,
            status: { $in: ['pending', 'confirmed'] }
        }).select('table');

        const bookedTableIds = bookedTables.map(r => r.table.toString());

        // Filter out booked tables
        const availableTables = tables.filter(table =>
            !bookedTableIds.includes(table._id.toString())
        );

        // Sort by best match (exact capacity match first, then by price)
        const sortedTables = availableTables.sort((a, b) => {
            const aExact = a.capacity === guestCount ? 1 : 0;
            const bExact = b.capacity === guestCount ? 1 : 0;

            if (aExact !== bExact) return bExact - aExact;
            return a.reservationPrice - b.reservationPrice;
        });

        // Mark recommended table
        if (sortedTables.length > 0) {
            sortedTables[0].isRecommended = true;
        }

        console.log('[AVAILABILITY CHECK] Found', sortedTables.length, 'available tables');

        res.json({
            success: true,
            count: sortedTables.length,
            data: {
                tables: sortedTables,
                bookedTableIds
            }
        });
    } catch (error) {
        console.error('[CHECK AVAILABILITY ERROR]', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getTableLayout = async (req, res) => {
    try {
        const { date, timeSlot, guestCount } = req.query;
        const gCount = parseInt(guestCount) || 0;

        // Pre-fetch check: Clean up expired locks for this slot to ensure accurate availability
        if (date && timeSlot) {
            const now = new Date();
            const expiredLocks = await TableReservation.find({
                date: new Date(date),
                'timeSlot.start': timeSlot,
                status: 'pending',
                lockExpiresAt: { $lt: now }
            });

            if (expiredLocks.length > 0) {
                const expiredIds = expiredLocks.map(l => l._id);
                await TableReservation.updateMany(
                    { _id: { $in: expiredIds } },
                    {
                        $set: {
                            status: 'cancelled',
                            cancellationReason: 'Selection session expired (timeout)',
                            cancelledBy: 'system',
                            lockExpiresAt: null
                        }
                    }
                );

                // Notify all clients about the released tables
                try {
                    const io = getIO();
                    expiredLocks.forEach(lock => {
                        const ids = lock.tables && lock.tables.length > 0 ? lock.tables.map(tId => tId.toString()) : [lock.table?.toString()];
                        io.emit('table_released', {
                            tableIds: ids.filter(Boolean),
                            date: lock.date,
                            timeSlot: lock.timeSlot
                        });
                    });
                } catch (socketErr) {
                    console.error('[SOCKET ERROR] Failed to emit release for expired locks', socketErr.message);
                }
            }
        }

        const tables = await Table.find({ isActive: true })
            .select('tableNumber capacity shape area acType floor position reservationPrice preferences isBlocked')
            .sort({ area: 1, floor: 1, tableNumber: 1 });

        // If date and time provided, mark booked and held tables
        let bookedTableIds = [];
        let heldTableIds = [];

        if (date && timeSlot) {
            const activeReservations = await TableReservation.find({
                date: new Date(date),
                'timeSlot.start': timeSlot,
                status: { $in: ['pending', 'confirmed'] }
            }).select('table tables status');

            activeReservations.forEach(r => {
                const ids = r.tables && r.tables.length > 0 ? r.tables.map(tId => tId.toString()) : [r.table?.toString()];
                if (r.status === 'confirmed') {
                    bookedTableIds.push(...ids.filter(Boolean));
                } else if (r.status === 'pending') {
                    heldTableIds.push(...ids.filter(Boolean));
                }
            });
        }

        // Add booking status to each table
        const tablesWithStatus = tables.map(table => {
            const tId = table._id.toString();
            const isBooked = bookedTableIds.includes(tId);
            const isHeld = heldTableIds.includes(tId);

            return {
                ...table.toObject(),
                isBooked,
                isHeld,
                status: table.isBlocked ? 'blocked' :
                    isBooked ? 'booked' :
                        isHeld ? 'hold' :
                            'available'
            };
        });

        // Generate smart suggestions if guestCount provided
        let suggestions = [];
        if (gCount > 0 && date && timeSlot) {
            const settings = (await Settings.findOne()) || { allowTableMerging: true, maxTablesPerMerge: 3 };

            if (settings.allowTableMerging) {
                const availableTables = tablesWithStatus.filter(t => t.status === 'available');
                const areas = [...new Set(availableTables.map(t => t.area))];
                let allOptions = [];

                areas.forEach(area => {
                    const areaTables = availableTables.filter(t => t.area === area);
                    const mergeableTables = areaTables.filter(t => t.canMerge);

                    // 1. Single Tables (Any table can be booked singly if it has capacity)
                    areaTables.filter(t => t.capacity >= gCount).forEach(t => {
                        allOptions.push({
                            type: 'single',
                            tables: [t],
                            totalCapacity: t.capacity,
                            totalPrice: t.reservationPrice,
                            area: t.area
                        });
                    });

                    // 2. Pair Combinations (Only mergeable tables)
                    if (settings.maxTablesPerMerge >= 2) {
                        for (let i = 0; i < mergeableTables.length; i++) {
                            for (let j = i + 1; j < mergeableTables.length; j++) {
                                const totalCap = mergeableTables[i].capacity + mergeableTables[j].capacity;
                                if (totalCap >= gCount) {
                                    allOptions.push({
                                        type: 'combination',
                                        tables: [mergeableTables[i], mergeableTables[j]],
                                        totalCapacity: totalCap,
                                        totalPrice: mergeableTables[i].reservationPrice + mergeableTables[j].reservationPrice,
                                        area: area
                                    });
                                }
                            }
                        }
                    }

                    // 3. Triple Combinations (Only mergeable tables)
                    if (settings.maxTablesPerMerge >= 3) {
                        for (let i = 0; i < mergeableTables.length; i++) {
                            for (let j = i + 1; j < mergeableTables.length; j++) {
                                for (let k = j + 1; k < mergeableTables.length; k++) {
                                    const totalCap = mergeableTables[i].capacity + mergeableTables[j].capacity + mergeableTables[k].capacity;
                                    if (totalCap >= gCount) {
                                        allOptions.push({
                                            type: 'combination',
                                            tables: [mergeableTables[i], mergeableTables[j], mergeableTables[k]],
                                            totalCapacity: totalCap,
                                            totalPrice: mergeableTables[i].reservationPrice + mergeableTables[j].reservationPrice + mergeableTables[k].reservationPrice,
                                            area: area
                                        });
                                    }
                                }
                            }
                        }
                    }
                });

                // Rank combinations logically
                suggestions = allOptions.sort((a, b) => {
                    const extraA = a.totalCapacity - gCount;
                    const extraB = b.totalCapacity - gCount;

                    // Prefer minimal extra capacity
                    if (extraA !== extraB) return extraA - extraB;
                    // Prefer fewer tables
                    if (a.tables.length !== b.tables.length) return a.tables.length - b.tables.length;
                    // Prefer lower price
                    return a.totalPrice - b.totalPrice;
                }).slice(0, 5); // Return top 5 best matches
            }
        }

        res.json({
            success: true,
            data: {
                tables: tablesWithStatus,
                suggestions
            }
        });
    } catch (error) {
        console.error('[GET LAYOUT ERROR]', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ========== ADMIN ONLY ENDPOINTS ==========

// @desc    Create new table
// @route   POST /api/admin/tables
// @access  Private/Admin
export const createTable = async (req, res) => {
    try {
        const tableData = req.body;

        // Check if table number already exists
        const existingTable = await Table.findOne({ tableNumber: tableData.tableNumber });
        if (existingTable) {
            return res.status(400).json({
                success: false,
                message: 'Table number already exists'
            });
        }

        const table = await Table.create(tableData);

        console.log('[TABLE CREATED]', table.tableNumber);

        res.status(201).json({
            success: true,
            message: 'Table created successfully',
            data: { table }
        });
    } catch (error) {
        console.error('[CREATE TABLE ERROR]', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update table
// @route   PUT /api/admin/tables/:id
// @access  Private/Admin
export const updateTable = async (req, res) => {
    try {
        const table = await Table.findById(req.params.id);

        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Table not found'
            });
        }

        const updatedTable = await Table.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        console.log('[TABLE UPDATED]', updatedTable.tableNumber);

        res.json({
            success: true,
            message: 'Table updated successfully',
            data: { table: updatedTable }
        });
    } catch (error) {
        console.error('[UPDATE TABLE ERROR]', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete table
// @route   DELETE /api/admin/tables/:id
// @access  Private/Admin
export const deleteTable = async (req, res) => {
    try {
        const table = await Table.findById(req.params.id);

        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Table not found'
            });
        }

        // Check if table has future reservations
        const futureReservations = await TableReservation.countDocuments({
            table: req.params.id,
            date: { $gte: new Date() },
            status: { $in: ['pending', 'confirmed'] }
        });

        if (futureReservations > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete table. It has ${futureReservations} future reservations.`
            });
        }

        await table.deleteOne();

        console.log('[TABLE DELETED]', table.tableNumber);

        res.json({
            success: true,
            message: 'Table deleted successfully'
        });
    } catch (error) {
        console.error('[DELETE TABLE ERROR]', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Block/Unblock table
// @route   PUT /api/admin/tables/:id/block
// @access  Private/Admin
export const toggleTableBlock = async (req, res) => {
    try {
        const { isBlocked, blockReason } = req.body;

        const table = await Table.findById(req.params.id);

        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Table not found'
            });
        }

        table.isBlocked = isBlocked;
        table.blockReason = isBlocked ? blockReason : null;
        await table.save();

        console.log('[TABLE BLOCKED]', table.tableNumber, isBlocked);

        res.json({
            success: true,
            message: `Table ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
            data: { table }
        });
    } catch (error) {
        console.error('[TOGGLE BLOCK ERROR]', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get table statistics
// @route   GET /api/admin/tables/stats
// @access  Private/Admin
export const getTableStats = async (req, res) => {
    try {
        const totalTables = await Table.countDocuments();
        const activeTables = await Table.countDocuments({ isActive: true, isBlocked: false });
        const blockedTables = await Table.countDocuments({ isBlocked: true });

        const tablesByArea = await Table.aggregate([
            { $group: { _id: '$area', count: { $sum: 1 } } }
        ]);

        const tablesByCapacity = await Table.aggregate([
            { $group: { _id: '$capacity', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                totalTables,
                activeTables,
                blockedTables,
                tablesByArea,
                tablesByCapacity
            }
        });
    } catch (error) {
        console.error('[TABLE STATS ERROR]', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
