import React, { useState } from 'react';
import {
    Users,
    Wind,
    Star,
    Shield
} from 'lucide-react';

export default function TableSelector({
    tables,
    selectedTableIds = [], // Array of selected table IDs
    onSelectTable,
    layoutType = 'Indoor'
}) {
    const [hoveredTable, setHoveredTable] = useState(null);

    // Filter tables by current layout/area
    const currentTables = tables.filter(t => t.area === layoutType);

    const getTableStyles = (table) => {
        const isSelected = selectedTableIds.includes(table._id);
        const isBooked = table.isBooked;
        const isHeld = table.isHeld;
        const isBlocked = table.isBlocked;
        const isCombined = isSelected && selectedTableIds.length > 1;

        if (isBlocked) return 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed opacity-40';
        if (isBooked) return 'bg-border/30 border-border text-text-muted/50 cursor-not-allowed';
        if (isHeld && !isSelected) return 'bg-yellow-50 border-yellow-200 text-yellow-600 cursor-wait animate-pulse';
        if (isSelected) {
            return `bg-secondary border-secondary scale-110 z-20 text-white shadow-premium ring-4 ring-primary/20 ${isCombined ? 'border-dashed border-primary animate-pulse' : ''}`;
        }

        return 'bg-white border-primary/30 text-secondary hover:border-primary hover:scale-105 hover:shadow-premium hover:z-10 group';
    };

    const getShapeStyle = (shape) => {
        switch (shape) {
            case 'round': return 'rounded-full aspect-square';
            case 'rectangle': return 'rounded-md aspect-[1.8/1]';
            case 'square': default: return 'rounded-md aspect-square';
        }
    };

    return (
        <div className="relative w-full aspect-square md:aspect-[1.5/1] bg-white rounded-2xl border border-border overflow-hidden shadow-inner-soft group/map">
            {/* Fine Architecture Grid */}
            <div className="absolute inset-0 grid grid-cols-[repeat(20,1fr)] grid-rows-[repeat(20,1fr)] pointer-events-none opacity-[0.03]">
                {[...Array(400)].map((_, i) => (
                    <div key={i} className="border-[0.5px] border-secondary"></div>
                ))}
            </div>

            {/* Labels */}
            <div className="absolute top-6 left-6 flex items-center gap-3 z-20">
                <div className="glass px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-secondary shadow-sm">
                    {layoutType} Zone
                </div>
            </div>

            {/* Premium Legend */}
            <div className="absolute bottom-6 left-6 glass px-5 py-4 rounded-xl border border-border z-20 flex flex-col gap-3 shadow-premium">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted border-b border-border pb-2">Floor Map Key</p>
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-sm bg-white border border-primary/50 shadow-sm"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Available</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-sm bg-secondary shadow-sm"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Your Choice</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-sm bg-yellow-400 shadow-sm animate-pulse"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Holding</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-50">
                        <div className="w-2.5 h-2.5 rounded-sm bg-border border border-border"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Engaged</span>
                    </div>
                </div>
            </div>

            {/* Tables Layer */}
            <div className="absolute inset-0 transition-transform duration-1000 group-hover/map:scale-[1.01]">
                {currentTables.map((table) => (
                    <button
                        key={table._id}
                        onClick={() => !table.isHeld && !table.isBooked && !table.isBlocked && onSelectTable(table._id)}
                        disabled={table.isBooked || table.isBlocked || (table.isHeld && !selectedTableIds.includes(table._id))}
                        onMouseEnter={() => setHoveredTable(table)}
                        onMouseLeave={() => setHoveredTable(null)}
                        className={`
                            absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500
                            flex items-center justify-center border-2
                            ${getTableStyles(table)}
                            ${getShapeStyle(table.shape)}
                            ${table.capacity > 4 ? 'w-16 md:w-20' : 'w-10 md:w-12'}
                        `}
                        style={{
                            left: `${table.position?.x || 50}%`,
                            top: `${table.position?.y || 50}%`
                        }}
                    >
                        <div className="flex flex-col items-center justify-center leading-none pointer-events-none">
                            <span className={`text-[11px] font-black uppercase tracking-tighter ${selectedTableIds.includes(table._id) ? 'text-white' : 'text-secondary/40 group-hover:text-primary'}`}>
                                {table.tableNumber}
                            </span>
                            <span className={`text-[8px] mt-0.5 font-bold opacity-60 ${selectedTableIds.includes(table._id) ? 'text-white' : 'text-text-muted'}`}>
                                {table.capacity}P
                            </span>
                        </div>

                        {/* Status Overlays */}
                        {table.isBooked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none">
                                <div className="w-full h-px bg-border/50 rotate-45 transform" />
                                <div className="w-full h-px bg-border/50 -rotate-45 transform absolute" />
                            </div>
                        )}

                        {/* Selected Indicator */}
                        {selectedTableIds.includes(table._id) && (
                            <div className={`absolute -top-3 -right-3 ${selectedTableIds.length > 1 ? 'bg-primary animate-bounce' : 'bg-primary'} text-white p-1.5 rounded-full shadow-premium animate-scale-up border-2 border-white z-30`}>
                                <Star size={10} fill="currentColor" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Premium Tooltip */}
            {hoveredTable && (
                <div
                    className="absolute z-50 pointer-events-none animate-scale-up"
                    style={{
                        left: `${hoveredTable.position?.x}%`,
                        top: `${hoveredTable.position?.y}%`,
                        transform: 'translate(-50%, -120%)'
                    }}
                >
                    <div className="bg-secondary text-white p-6 rounded-2xl shadow-premium-hover border border-white/10 w-56 backdrop-blur-xl">
                        <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-3">
                            <div>
                                <h4 className="font-heading text-xl text-white leading-none">Table {hoveredTable.tableNumber}</h4>
                                <p className="text-[10px] uppercase font-bold tracking-widest text-primary mt-1">{hoveredTable.shape} Structure</p>
                            </div>
                            <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black tracking-widest">
                                ₹{hoveredTable.reservationPrice}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Users size={14} className="text-primary-light" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Affinity: {hoveredTable.capacity} Guests</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/80">
                                <Wind size={14} className="text-primary-light" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{hoveredTable.acType} • {hoveredTable.area}</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/80">
                                <Shield size={14} className="text-primary-light" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Quality Inspected</span>
                            </div>
                        </div>

                        {(hoveredTable.isBlocked || hoveredTable.isBooked || hoveredTable.isHeld) && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className={`flex items-center gap-2 py-2 px-3 rounded-lg border group-hover:scale-110 ${hoveredTable.isHeld ? 'bg-yellow-400/10 border-yellow-400/30' : 'bg-white/5 border-white/10'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${hoveredTable.isHeld ? 'bg-yellow-400' : 'bg-red-400'}`} />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${hoveredTable.isHeld ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {hoveredTable.isHeld ? 'Temporarily Held' : 'Not Available'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Tooltip Arrow */}
                    <div className="w-4 h-4 bg-secondary rotate-45 absolute left-1/2 -bottom-2 -translate-x-1/2 border-r border-b border-white/10"></div>
                </div>
            )}
        </div>
    );
}
