import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
    Calendar,
    Clock,
    Users,
    MapPin,
    ChevronRight,
    ArrowLeft,
    Check,
    AlertCircle,
    Loader2,
    Coffee,
    Sparkles,
    ShieldCheck,
    Timer
} from 'lucide-react';
import {
    createReservation,
    fetchTableLayout,
    verifyReservationPayment,
    releaseReservationLock
} from '../api';
import { initiatePayment } from '../utils/paymentHandler';
import TableSelector from '../components/TableSelector';
import { useAuth } from '../context/AuthContext';

let socket;

export default function TableReservation() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1: Search parameters
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [timeSlot, setTimeSlot] = useState({ start: '19:00', end: '21:00' });
    const [guestCount, setGuestCount] = useState(2);
    const [areaPreference, setAreaPreference] = useState('Indoor');

    // Step 2: Table Selection
    const [tables, setTables] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null); // { type, tables: [], totalCapacity, totalPrice }
    const [selectedTable, setSelectedTable] = useState(null); // Legacy support for single table display

    // Real-time Locking State
    const [lockTimer, setLockTimer] = useState(0); // Seconds
    const [isLocked, setIsLocked] = useState(false);
    const [userLockId, setUserLockId] = useState(null);

    // Step 3: Reservation Details
    const [occasion, setOccasion] = useState('Casual Dining');
    const [specialRequests, setSpecialRequests] = useState('');

    // Socket Connection
    useEffect(() => {
        socket = io('http://localhost:5000');

        socket.on('table_hold', (data) => {
            const socketDate = new Date(data.date).toISOString().split('T')[0];
            const currentDate = new Date(date).toISOString().split('T')[0];

            if (socketDate === currentDate && data.timeSlot.start === timeSlot.start) {
                // If another user held OUR selected tables, clear our selection
                if (data.userId !== user?._id) {
                    const overlap = selectedOption?.tables.some(t => data.tableIds.includes(t._id));
                    if (overlap) {
                        setSelectedOption(null);
                        setError('One or more of your selected tables have just been held by another guest.');
                        setTimeout(() => setError(''), 5000);
                    }
                }

                setTables(prev => prev.map(t =>
                    data.tableIds.includes(t._id) ? { ...t, isHeld: true, status: 'hold' } : t
                ));
            }
        });

        socket.on('table_booked', (data) => {
            const socketDate = new Date(data.date).toISOString().split('T')[0];
            const currentDate = new Date(date).toISOString().split('T')[0];

            if (socketDate === currentDate && data.timeSlot.start === timeSlot.start) {
                setTables(prev => prev.map(t =>
                    data.tableIds.includes(t._id) ? { ...t, isBooked: true, isHeld: false, status: 'booked' } : t
                ));
            }
        });

        socket.on('table_released', (data) => {
            const socketDate = new Date(data.date).toISOString().split('T')[0];
            const currentDate = new Date(date).toISOString().split('T')[0];

            if (socketDate === currentDate && data.timeSlot.start === timeSlot.start) {
                setTables(prev => prev.map(t =>
                    data.tableIds.includes(t._id) ? { ...t, isHeld: false, isBooked: false, status: 'available' } : t
                ));
            }
        });

        return () => socket.disconnect();
    }, [date, timeSlot]);

    // Hold Timer logic
    useEffect(() => {
        let interval;
        if (lockTimer > 0) {
            interval = setInterval(() => {
                setLockTimer(prev => prev - 1);
            }, 1000);
        } else if (lockTimer === 0 && isLocked) {
            setIsLocked(false);
            setError('Selection session expired. Tables have been released.');
            setSelectedOption(null);
            setStep(2); // Go back to selection
            loadTableLayout();
        }
        return () => clearInterval(interval);
    }, [lockTimer, isLocked]);

    // Load tables when entering Step 2
    useEffect(() => {
        if (step === 2) {
            loadTableLayout();
        }
    }, [step, date, timeSlot]);

    const loadTableLayout = async () => {
        setLoading(true);
        try {
            const res = await fetchTableLayout(date, timeSlot.start, guestCount);
            if (res.success) {
                setTables(res.data.tables);
                setSuggestions(res.data.suggestions || []);

                // Auto-suggest best option if available
                if (res.data.suggestions?.length > 0) {
                    const best = res.data.suggestions[0];
                    setSelectedOption(best);
                    if (best.type === 'single') {
                        setSelectedTable(best.tables[0]);
                    } else {
                        setSelectedTable(null); // It's a combo
                    }
                }
            } else {
                setError('Failed to load table layout');
            }
        } catch (err) {
            setError('Failed to load table layout');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleTableSelect = (tableId) => {
        const table = tables.find(t => t._id === tableId);
        if (!table || table.isBooked || table.isBlocked) return;

        let newTables = [...(selectedOption?.tables || [])];
        const isSelected = newTables.some(t => t._id === tableId);

        if (isSelected) {
            // Remove if already selected
            newTables = newTables.filter(t => t._id !== tableId);
        } else {
            // Check if same area
            if (newTables.length > 0 && newTables[0].area !== table.area) {
                newTables = [table]; // Switch to new area
            } else if (newTables.length >= 3) {
                setError('Maximum 3 tables can be merged');
                setTimeout(() => setError(''), 3000);
                return;
            } else {
                newTables.push(table);
            }
        }

        if (newTables.length === 0) {
            setSelectedOption(null);
            setSelectedTable(null);
            return;
        }

        const totalCapacity = newTables.reduce((sum, t) => sum + t.capacity, 0);
        const totalPrice = newTables.reduce((sum, t) => sum + t.reservationPrice, 0);

        const option = {
            type: newTables.length > 1 ? 'combination' : 'single',
            tables: newTables,
            totalCapacity,
            totalPrice,
            area: newTables[0].area
        };

        setSelectedOption(option);
        setSelectedTable(newTables.length === 1 ? newTables[0] : null);
    };

    const handleSuggestionSelect = (suggestion) => {
        setSelectedOption(suggestion);
        if (suggestion.type === 'single') {
            setSelectedTable(suggestion.tables[0]);
        } else {
            setSelectedTable(null);
        }
    };

    const handlePayment = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Final local validation check
        const isSomeoneElseHolding = selectedOption.tables.some(t => {
            const currentTable = tables.find(tbl => tbl._id === t._id);
            return currentTable?.isHeld && !isLocked; // If held and NOT by us
        });

        if (isSomeoneElseHolding) {
            setError('Selection Sync Error: One or more tables were just held by another user.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const tableIds = selectedOption.tables.map(t => t._id);
            // 1. Create Reservation Order in Backend (Now includes Razorpay Order ID)
            const res = await createReservation({
                tableIds,
                date,
                timeSlot,
                guestCount,
                occasion,
                specialRequests,
                preferences: { area: areaPreference }
            });

            if (!res.success) throw new Error(res.message);

            const { amount, expiresAt, reservationId, razorpayOrderId } = res.data;

            // Start lock timer
            const expiryDate = new Date(expiresAt);
            const secondsLeft = Math.floor((expiryDate - new Date()) / 1000);
            setLockTimer(secondsLeft > 0 ? secondsLeft : 600);
            setIsLocked(true);
            setUserLockId(reservationId);

            // 2. Initiate Razorpay Checkout with pre-created Order ID
            await initiatePayment({
                razorpayOrderId, // Use order ID from backend
                amount, // INR
                user,
                description: `Table Reservation — ${new Date(date).toLocaleDateString()} @ ${timeSlot.start}`,
                onSuccess: async (response) => {
                    setLoading(true);
                    try {
                        const verifyRes = await verifyReservationPayment({
                            reservationId,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        });

                        if (verifyRes.success) {
                            setIsLocked(false);
                            setLockTimer(0);
                            navigate('/my-table-reservations?success=true');
                        } else {
                            throw new Error(verifyRes.message || 'Verification failed');
                        }
                    } catch (err) {
                        setError('Payment verification failed: ' + err.message);
                    } finally {
                        setLoading(false);
                    }
                },
                onError: (err) => {
                    console.error('Reservation Payment Error:', err);
                    setError(err.message || 'Payment failed. Please try again.');
                    setLoading(false);
                },
                onDismiss: () => {
                    setLoading(false);
                }
            });
        } catch (err) {
            console.error('Reservation Initiation Error:', err);
            setError(err.message || 'Failed to initiate reservation');
        } finally {
            setLoading(false);
        }
    };

    // Release lock on unmount
    useEffect(() => {
        return () => {
            if (isLocked && userLockId) {
                releaseReservationLock(userLockId).catch(console.error);
            }
        };
    }, [isLocked, userLockId]);

    const handleReleaseLock = async () => {
        if (!userLockId) return;
        try {
            await releaseReservationLock(userLockId);
        } catch (err) {
            console.error('Failed to release lock:', err);
        } finally {
            setIsLocked(false);
            setLockTimer(0);
            setUserLockId(null);
        }
    };

    const handleBackFromDetails = () => {
        if (isLocked) {
            if (confirm('Releasing these tables will allow others to book them. Continue?')) {
                handleReleaseLock();
                setStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            setStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const steps = [
        { num: 1, label: 'Schedule' },
        { num: 2, label: 'Select' },
        { num: 3, label: 'Details' }
    ];

    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-4">
            <div className="container mx-auto max-w-6xl">
                {/* Visual Header */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/50 rounded-full text-primary font-bold text-[10px] uppercase tracking-[0.2em] mb-4">
                        <Sparkles size={14} />
                        Experience Vincent
                    </div>
                    <h1 className="text-4xl md:text-5xl mb-4">Reserve Your Experience</h1>
                    <p className="text-text-muted max-w-lg mx-auto text-balance">
                        Choose your preferred ambiance and let us prepare the perfect table for your evening.
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="flex justify-center mb-16 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-px bg-border -z-10"></div>
                    <div className="flex items-center justify-between w-full max-w-md">
                        {steps.map((s) => (
                            <div key={s.num} className="flex flex-col items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 shadow-premium ${step >= s.num ? 'bg-secondary text-white ring-4 ring-primary/20 scale-110' : 'bg-white border border-border text-text-muted hover:border-primary/50'
                                    }`}>
                                    {step > s.num ? <Check size={18} strokeWidth={3} /> : s.num}
                                </div>
                                <span className={`text-[10px] uppercase tracking-widest font-bold ${step >= s.num ? 'text-secondary' : 'text-text-muted'}`}>
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    {/* Main Content Area */}
                    <div className="lg:col-span-8 animate-slide-up">
                        {step === 1 && (
                            <div className="card-premium">
                                <div className="flex items-center gap-3 mb-8 border-b border-border pb-6">
                                    <div className="p-3 bg-surface rounded-xl text-primary">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-secondary mb-0.1">Dining Schedule</h2>
                                        <p className="text-sm text-text-muted">Tell us when you'd like to join us.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSearch} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="label-premium">Date</label>
                                            <div className="relative group">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 group-focus-within:text-primary transition-colors" size={20} />
                                                <input
                                                    type="date"
                                                    required
                                                    min={new Date().toISOString().split('T')[0]}
                                                    value={date}
                                                    onChange={e => setDate(e.target.value)}
                                                    className="input-premium pl-12"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-premium">Number of Guests</label>
                                            <div className="relative group">
                                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 group-focus-within:text-primary transition-colors" size={20} />
                                                <select
                                                    value={guestCount}
                                                    onChange={e => setGuestCount(parseInt(e.target.value))}
                                                    className="input-premium pl-12 appearance-none"
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map(n => (
                                                        <option key={n} value={n}>{n} {n === 1 ? 'Person' : 'People'}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label-premium">Preferred Time Slot</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {['18:00', '19:00', '20:00', '21:00', '22:00'].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setTimeSlot({ start: t, end: `${parseInt(t) + 2}:00` })}
                                                    className={`py-3 px-4 rounded-md text-xs font-bold uppercase tracking-widest border-2 transition-all duration-300 ${timeSlot.start === t
                                                        ? 'bg-secondary text-white border-secondary scale-[1.05] shadow-premium'
                                                        : 'bg-white border-border text-text-muted hover:border-primary/50 hover:text-primary'
                                                        }`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label-premium">Preferred Area</label>
                                        <div className="flex gap-6 p-4 bg-surface/50 rounded-xl border border-border/50">
                                            {['Indoor', 'Outdoor', 'Rooftop'].map(area => (
                                                <label key={area} className="flex items-center gap-3 cursor-pointer group">
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="radio"
                                                            name="area"
                                                            checked={areaPreference === area}
                                                            onChange={() => setAreaPreference(area)}
                                                            className="w-5 h-5 appearance-none border-2 border-border rounded-full checked:border-primary transition-all cursor-pointer"
                                                        />
                                                        {areaPreference === area && <div className="absolute w-2.5 h-2.5 bg-primary rounded-full animate-scale-up" />}
                                                    </div>
                                                    <span className={`text-sm font-bold uppercase tracking-widest transition-colors ${areaPreference === area ? 'text-secondary' : 'text-text-muted group-hover:text-primary'}`}>{area}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button type="submit" className="w-full btn-primary py-5 text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 group">
                                            Check Availability
                                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-border shadow-premium">
                                    <div>
                                        <h2 className="text-2xl font-heading mb-1 text-secondary">Spatial Selection</h2>
                                        <p className="text-sm text-text-muted">Choose your preferred spot. You can select up to 3 tables to combine them.</p>
                                    </div>
                                    <div className="flex bg-surface p-1 rounded-lg border border-border w-max">
                                        {['Indoor', 'Outdoor', 'Rooftop'].map(area => (
                                            <button
                                                key={area}
                                                onClick={() => setAreaPreference(area)}
                                                className={`px-5 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${areaPreference === area ? 'bg-white text-secondary shadow-premium' : 'text-text-muted hover:text-primary'
                                                    }`}
                                            >
                                                {area}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {suggestions.length > 0 && (
                                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Sparkles className="text-primary" size={18} />
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Smart Recommendations</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {suggestions.map((suggestion, idx) => {
                                                const isUnavailable = suggestion.tables.some(st => {
                                                    const currentTable = tables.find(t => t._id === st._id);
                                                    return currentTable?.isBooked || (currentTable?.isHeld && !selectedOption?.tables.some(t => t._id === st._id));
                                                });

                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => !isUnavailable && handleSuggestionSelect(suggestion)}
                                                        disabled={isUnavailable}
                                                        className={`flex items-center justify-between p-4 rounded-xl transition-all border-2 ${selectedOption?.tables.map(t => t._id).join(',') === suggestion.tables.map(t => t._id).join(',')
                                                            ? 'bg-white border-primary shadow-lg scale-[1.02]'
                                                            : isUnavailable
                                                                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed grayscale'
                                                                : 'bg-white/50 border-transparent hover:border-primary/30'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 ${isUnavailable ? 'bg-gray-300' : 'bg-secondary'} rounded-lg flex items-center justify-center text-white font-heading text-lg`}>
                                                                {suggestion.type === 'single' ? suggestion.tables[0].tableNumber : suggestion.tables.length}
                                                            </div>
                                                            <div className="text-left">
                                                                <p className={`text-[10px] font-black uppercase tracking-widest ${isUnavailable ? 'text-gray-400' : 'text-secondary'}`}>
                                                                    {suggestion.type === 'single' ? `Table ${suggestion.tables[0].tableNumber}` : 'Combined Tables'}
                                                                </p>
                                                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                                                                    {isUnavailable ? 'Currently Unavailable' : `${suggestion.totalCapacity} Guests • ${suggestion.area}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-sm font-bold ${isUnavailable ? 'text-gray-400' : 'text-primary'}`}>₹{suggestion.totalPrice}</p>
                                                            {idx === 0 && !isUnavailable && <span className="text-[8px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">Best Match</span>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="card-premium p-4 bg-surfaceDark/5 relative overflow-hidden">
                                    {loading ? (
                                        <div className="aspect-[4/3] flex flex-col items-center justify-center bg-white rounded-xl border border-border animate-pulse">
                                            <Loader2 className="animate-spin text-primary w-10 h-10 mb-4" />
                                            <p className="text-text-muted font-bold text-xs uppercase tracking-widest">Scanning Floor Layout...</p>
                                        </div>
                                    ) : (
                                        <div className="animate-scale-up">
                                            <TableSelector
                                                tables={tables}
                                                layoutType={areaPreference}
                                                selectedTableIds={selectedOption?.tables.map(t => t._id) || []}
                                                onSelectTable={handleTableSelect}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-6">
                                    <button
                                        onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="btn-ghost flex items-center gap-2 group"
                                    >
                                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                                        Change Schedule
                                    </button>
                                    <button
                                        onClick={() => { if (selectedOption) { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
                                        disabled={!selectedOption}
                                        className="btn-primary px-12 uppercase text-xs tracking-widest font-black disabled:grayscale disabled:opacity-30"
                                    >
                                        Finalize Selection
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="card-premium animate-fade-in">
                                <div className="flex items-center gap-3 mb-8 border-b border-border pb-6">
                                    <div className="p-3 bg-surface rounded-xl text-primary">
                                        <Sparkles size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-secondary mb-0.1">Experience Details</h2>
                                        <p className="text-sm text-text-muted">Personalize your dining experience.</p>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="label-premium">Occasion</label>
                                            <select
                                                value={occasion}
                                                onChange={e => setOccasion(e.target.value)}
                                                className="input-premium appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]"
                                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23B69A71' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                            >
                                                <option>Casual Dining</option>
                                                <option>Birthday Celebration</option>
                                                <option>Anniversary</option>
                                                <option>Romantic Date</option>
                                                <option>Business Meeting</option>
                                                <option>Social Gathering</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label-premium">Special Requests</label>
                                            <input
                                                type="text"
                                                value={specialRequests}
                                                onChange={e => setSpecialRequests(e.target.value)}
                                                placeholder="e.g. Dietaries, high chair, flowers..."
                                                className="input-premium"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-4 animate-scale-up">
                                            <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                                <AlertCircle size={20} />
                                            </div>
                                            <p className="text-red-800 text-sm font-bold uppercase tracking-wide">{error}</p>
                                        </div>
                                    )}

                                    <div className="bg-surface/50 rounded-2xl p-6 border border-border border-dashed">
                                        <div className="flex items-start gap-4">
                                            <ShieldCheck className="text-primary mt-1 shrink-0" size={24} />
                                            <div>
                                                <p className="text-sm font-bold text-secondary uppercase tracking-widest mb-1">Reservation Policy</p>
                                                <p className="text-[11px] text-text-muted leading-relaxed">
                                                    Your advance payment of <span className="text-secondary font-bold">₹{selectedOption?.totalPrice}</span> is fully adjustable against your final bill.
                                                    Cancellations must be made at least 24 hours in advance for a full refund.
                                                    {selectedOption?.type === 'combination' && (
                                                        <div className="mt-2 text-primary font-black uppercase text-[9px] tracking-widest">
                                                            Note: You are booking {selectedOption.tables.length} tables combined to accommodate your group.
                                                        </div>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-border mt-10">
                                        <button
                                            onClick={handleBackFromDetails}
                                            className="btn-ghost flex items-center justify-center gap-2 font-bold uppercase tracking-widest px-8"
                                        >
                                            <ArrowLeft size={16} /> Change Table
                                        </button>
                                        <button
                                            onClick={handlePayment}
                                            disabled={loading}
                                            className="flex-1 btn-primary py-5 text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-premium hover:shadow-premium-hover active:scale-[0.98] transition-all"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                                <>
                                                    Secure Payment & Confirm
                                                    <span className="opacity-40">|</span>
                                                    ₹{selectedOption?.totalPrice}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Summary */}
                    <div className="lg:col-span-4 sticky top-32 space-y-6">
                        <div className="card-premium !p-0 overflow-hidden shadow-premium hover:shadow-premium-hover transition-all duration-500 group">
                            <div className="bg-secondary p-6 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                                    <Coffee size={120} />
                                </div>
                                <h3 className="text-lg font-bold tracking-[0.2em] uppercase text-white mb-1">Your Reservation</h3>
                                <p className="text-primary-light text-[10px] uppercase tracking-widest font-black opacity-80">Vincent Fine Dining</p>
                            </div>

                            {/* Real-time Hold Timer */}
                            {isLocked && (
                                <div className="bg-yellow-50 border-b border-yellow-100 p-4 flex items-center justify-between animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white">
                                            <Timer size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700">Securing Tables</p>
                                            <p className="text-[9px] text-yellow-600 font-bold">Tables held for payment</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-heading text-yellow-700 leading-none">
                                            {Math.floor(lockTimer / 60)}:{String(lockTimer % 60).padStart(2, '0')}
                                        </p>
                                        <p className="text-[8px] font-black uppercase tracking-tighter text-yellow-500">Remaining</p>
                                    </div>
                                </div>
                            )}

                            <div className="p-8 space-y-6">
                                <div className="space-y-5">
                                    <div className="flex items-center gap-4 group/item">
                                        <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                            <Calendar size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] uppercase tracking-widest font-extrabold text-text-muted mb-0.5">Date</p>
                                            <p className="text-xs font-black text-secondary uppercase tracking-wider">
                                                {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 group/item">
                                        <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                            <Clock size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] uppercase tracking-widest font-extrabold text-text-muted mb-0.5">Time Slot</p>
                                            <p className="text-xs font-black text-secondary uppercase tracking-wider">{timeSlot.start} — {timeSlot.end}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 group/item">
                                        <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                            <Users size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] uppercase tracking-widest font-extrabold text-text-muted mb-0.5">Affinity</p>
                                            <p className="text-xs font-black text-secondary uppercase tracking-wider">{guestCount} Guests</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 group/item">
                                        <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                            <MapPin size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] uppercase tracking-widest font-extrabold text-text-muted mb-0.5">Perspective</p>
                                            <p className="text-xs font-black text-secondary uppercase tracking-wider">{areaPreference} Ambience</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-border pt-8 mt-4">
                                    {selectedOption ? (
                                        <div className="space-y-4 animate-scale-up">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-widest font-extrabold text-text-muted mb-1">
                                                        {selectedOption.type === 'single' ? 'Selected Place' : 'Combined Allocation'}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl font-heading text-secondary leading-none">
                                                            {selectedOption.type === 'single'
                                                                ? `Table #${selectedOption.tables[0].tableNumber}`
                                                                : `${selectedOption.tables.length} Tables`}
                                                        </span>
                                                        {selectedOption.type === 'combination' && (
                                                            <div className="badge-premium !text-[9px] !px-2 !py-0.5 !border-primary/30 !text-primary">Combined</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase tracking-widest font-extrabold text-text-muted mb-1">Pre-payment</p>
                                                    <p className="text-2xl font-heading text-primary leading-none">₹{selectedOption.totalPrice}</p>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-center gap-2">
                                                <Sparkles size={14} className="text-primary" />
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Adjustable against total bill</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center border-2 border-dashed border-border rounded-xl">
                                            <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center mx-auto mb-3 opacity-40">
                                                <Coffee size={20} className="text-text-muted" />
                                            </div>
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Table selection pending</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Additional Info / Security */}
                        <div className="flex items-center justify-center gap-6 px-4">
                            <div className="flex flex-col items-center gap-1 opacity-40">
                                <ShieldCheck size={20} className="text-secondary" />
                                <span className="text-[8px] font-bold uppercase tracking-widest">Secure TLS</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 opacity-40">
                                <Sparkles size={20} className="text-secondary" />
                                <span className="text-[8px] font-bold uppercase tracking-widest">Premium Service</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
