import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

// Table status color mapping
const TABLE_COLORS = {
    available: 'bg-green-500 hover:bg-green-600 cursor-pointer',
    booked: 'bg-red-500 cursor-not-allowed opacity-75',
    selected: 'bg-yellow-500 hover:bg-yellow-600 cursor-pointer',
    blocked: 'bg-gray-500 cursor-not-allowed opacity-50',
    locked: 'bg-orange-500 cursor-not-allowed opacity-75'
};

const TableLayout = ({ tables, selectedTableIds, onTableSelect, numberOfGuests }) => {
    const [groupedTables, setGroupedTables] = useState({
        indoor: [],
        outdoor: [],
        ac: []
    });

    useEffect(() => {
        // Group tables by area
        const grouped = {
            indoor: tables.filter(t => t.area === 'indoor'),
            outdoor: tables.filter(t => t.area === 'outdoor'),
            ac: tables.filter(t => t.area === 'ac')
        };
        setGroupedTables(grouped);
    }, [tables]);

    const handleTableClick = (table) => {
        if (!table.isSelectable) return;

        // Check if table capacity is sufficient
        if (table.capacity < numberOfGuests && !selectedTableIds.includes(table._id)) {
            alert(`This table can only accommodate ${table.capacity} guests. You need ${numberOfGuests} seats.`);
            return;
        }

        onTableSelect(table);
    };

    const getTableStatus = (table) => {
        if (selectedTableIds.includes(table._id)) {
            return 'selected';
        }
        return table.status || 'available';
    };

    const TableCard = ({ table }) => {
        const status = getTableStatus(table);
        const colorClass = TABLE_COLORS[status];
        const isDisabled = !table.isSelectable && status !== 'selected';

        return (
            <div
                onClick={() => !isDisabled && handleTableClick(table)}
                className={`
                    relative p-4 rounded-lg border-2 border-white/20
                    transition-all duration-200 transform hover:scale-105
                    ${colorClass}
                    ${isDisabled ? '' : 'active:scale-95'}
                    min-w-[100px] min-h-[100px]
                    flex flex-col items-center justify-center
                    text-white font-heading
                `}
            >
                <div className="text-lg font-bold">#{table.tableNumber}</div>
                <div className="text-sm opacity-90 flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                    <span>{table.capacity}</span>
                </div>
                <div className="text-xs mt-1 capitalize opacity-75">
                    {table.area} • ₹{table.reservationPrice || 0}
                </div>

                {status === 'selected' && (
                    <div className="absolute -top-2 -right-2 bg-white text-yellow-600 rounded-full w-6 h-6 flex items-center justify-center">
                        ✓
                    </div>
                )}
            </div>
        );
    };

    const AreaSection = ({ title, tables, icon }) => {
        if (tables.length === 0) return null;

        return (
            <div className="mb-8">
                <h3 className="text-xl font-heading mb-4 flex items-center gap-2">
                    {icon}
                    {title}
                    <span className="text-sm text-text-muted">({tables.length} tables)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {tables.map(table => (
                        <TableCard key={table._id} table={table} />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Legend */}
            <div className="bg-surface border border-white/5 p-4 rounded">
                <h4 className="font-heading mb-3">Table Status Legend:</h4>
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-500 rounded"></div>
                        <span className="text-sm">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                        <span className="text-sm">Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-500 rounded"></div>
                        <span className="text-sm">Booked</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-orange-500 rounded"></div>
                        <span className="text-sm">Locked</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-500 rounded"></div>
                        <span className="text-sm">Blocked</span>
                    </div>
                </div>
            </div>

            {/* Table Sections by Area */}
            <AreaSection
                title="AC Dining"
                tables={groupedTables.ac}
                icon={<span>❄️</span>}
            />

            <AreaSection
                title="Indoor Dining"
                tables={groupedTables.indoor}
                icon={<span>🏠</span>}
            />

            <AreaSection
                title="Outdoor Dining"
                tables={groupedTables.outdoor}
                icon={<span>🌳</span>}
            />

            {tables.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                    <p>No tables available for selected date and time slot</p>
                </div>
            )}
        </div>
    );
};

TableLayout.propTypes = {
    tables: PropTypes.array.isRequired,
    selectedTableIds: PropTypes.array.isRequired,
    onTableSelect: PropTypes.func.isRequired,
    numberOfGuests: PropTypes.number.isRequired
};

export default TableLayout;
