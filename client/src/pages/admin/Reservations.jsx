import { useEffect, useState } from 'react';
import {
    Search,
    Filter,
    Calendar as CalendarIcon,
    Clock,
    Users,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    MapPin,
    CreditCard,
    Coffee,
    ArrowUpRight,
    SearchX
} from 'lucide-react';
import { fetchAllReservations, updateReservationStatus } from '../../api';

export default function AdminReservations() {
    const [reservations, setReservations] = useState([]);
    const [filteredReservations, setFilteredReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelResId, setCancelResId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [errorOverlay, setErrorOverlay] = useState(null); // { title, message }

    useEffect(() => {
        loadReservations();
    }, []);

    useEffect(() => {
        filterReservations();
    }, [reservations, statusFilter, searchTerm]);

    const loadReservations = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetchAllReservations();
            // Handle both response shapes: { data: { reservations } } or { reservations }
            const reservationList = response?.data?.reservations ?? response?.reservations ?? [];
            setReservations(reservationList);
            setLoading(false);
        } catch (err) {
            console.error('[ADMIN RESERVATIONS] Load failed:', err);
            setError(err.message || 'Failed to load reservations');
            setLoading(false);
        }
    };

    const filterReservations = () => {
        let filtered = [...reservations];

        if (statusFilter !== 'all') {
            filtered = filtered.filter(res => res.status === statusFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(res =>
                res.reservationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                res.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                res.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredReservations(filtered);
    };

    const handleStatusUpdate = async (reservationId, newStatus, additionalData = {}) => {
        try {
            await updateReservationStatus(
                reservationId,
                newStatus,
                null,
                additionalData.cancellationReason || cancelReason || null
            );
            await loadReservations();
            setIsCancelModalOpen(false);
            setCancelResId(null);
            setCancelReason('');
        } catch (err) {
            alert('Status synchronization failed: ' + err.message);
        } finally {
            setIsCancelling(false);
        }
    };

    const openCancelModal = (resId) => {
        setCancelResId(resId);
        setIsCancelModalOpen(true);
    };

    const handleConfirmCancel = () => {
        if (!cancelReason.trim()) {
            alert('A justification for cancellation is required.');
            return;
        }
        setIsCancelling(true);
        handleStatusUpdate(cancelResId, 'cancelled');
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'border-yellow-200 bg-yellow-50 text-yellow-700 font-black uppercase text-[10px] tracking-widest',
            confirmed: 'border-green-200 bg-green-50 text-green-700 font-black uppercase text-[10px] tracking-widest',
            completed: 'border-blue-200 bg-blue-50 text-blue-700 font-black uppercase text-[10px] tracking-widest',
            cancelled: 'border-red-200 bg-red-50 text-red-700 font-black uppercase text-[10px] tracking-widest',
            'no-show': 'border-gray-200 bg-gray-100 text-gray-700 font-black uppercase text-[10px] tracking-widest'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 grayscale opacity-40">
                <Coffee className="w-12 h-12 text-secondary mb-4 animate-bounce" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Accessing Table Archives...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-6 py-8">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex flex-col items-center text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <h3 className="text-xl font-heading text-red-800 mb-2">Failed to Load Reservations</h3>
                    <p className="text-sm text-red-600 font-mono mb-6 max-w-md">{error}</p>
                    <button
                        onClick={loadReservations}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
                    >
                        <RefreshCw size={14} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-6 py-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-heading text-secondary mb-2">Reservation Nexus</h1>
                    <p className="text-text-muted text-sm uppercase tracking-widest font-bold">
                        {filteredReservations.length} Active Engagements Found
                    </p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button
                        onClick={loadReservations}
                        className="btn-outline flex items-center justify-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest bg-white"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Sync Registry
                    </button>
                </div>
            </div>

            {/* Premium Control Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
                <div className="lg:col-span-8 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/50 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by identifier, guest name, or digital address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-premium pl-14 py-4 !rounded-xl shadow-premium border-transparent bg-white focus:border-primary"
                    />
                </div>

                <div className="lg:col-span-4 relative group">
                    <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/50 group-focus-within:text-primary transition-colors" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input-premium pl-14 py-4 !rounded-xl appearance-none shadow-premium border-transparent bg-white focus:border-primary cursor-pointer"
                    >
                        <option value="all">ALL STATUSES</option>
                        <option value="pending">PENDING ACTIONS</option>
                        <option value="confirmed">CONFIRMED ENGAGEMENTS</option>
                        <option value="completed">FULFILLED EXPERIENCES</option>
                        <option value="cancelled">REVOKED BOOKINGS</option>
                        <option value="no-show">GUEST ABSENCE</option>
                    </select>
                </div>
            </div>

            {/* List Header (Desktop) */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-8 py-4 bg-secondary text-white/50 text-[9px] font-black uppercase tracking-[0.2em] rounded-t-2xl">
                <div className="col-span-3">Guest Particulars</div>
                <div className="col-span-2 text-center">Reference ID</div>
                <div className="col-span-2 text-center">Schedule</div>
                <div className="col-span-2 text-center">Table / Zone</div>
                <div className="col-span-1 text-center">Billing</div>
                <div className="col-span-2 text-right">Administrative Actions</div>
            </div>

            {/* Entry Grid */}
            {filteredReservations.length === 0 ? (
                <div className="bg-white rounded-b-2xl border border-border py-32 text-center shadow-premium flex flex-col items-center">
                    <SearchX size={48} className="text-text-muted/30 mb-6" />
                    <h3 className="text-2xl font-heading text-secondary mb-2">No Records Surface</h3>
                    <p className="text-text-muted text-sm uppercase tracking-widest font-bold max-w-xs">The requested filters resulted in an empty registry.</p>
                    <button onClick={() => { setStatusFilter('all'); setSearchTerm(''); }} className="mt-8 text-primary font-black uppercase text-[10px] tracking-widest hover:underline px-6 py-2 border border-primary/20 rounded-full">Clear Filters</button>
                </div>
            ) : (
                <div className="bg-white rounded-b-2xl border-x border-b border-border shadow-premium divide-y divide-border overflow-hidden">
                    {filteredReservations.map((reservation) => (
                        <div key={reservation._id} className="lg:grid lg:grid-cols-12 gap-4 px-8 py-6 hover:bg-surface/30 transition-colors items-center group">
                            {/* Guest Details */}
                            <div className="col-span-3 mb-4 lg:mb-0">
                                <p className="font-heading text-xl text-secondary mb-1 leading-none">{reservation.user?.name}</p>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest truncate">{reservation.user?.email}</p>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{reservation.user?.phone}</p>
                            </div>

                            {/* Reference */}
                            <div className="col-span-2 text-center mb-4 lg:mb-0">
                                <div className={`inline-block border px-3 py-1 rounded-full mb-2 ${getStatusColor(reservation.status)}`}>
                                    {reservation.status}
                                </div>
                                <p className="text-[10px] font-black text-secondary tracking-widest">#{reservation.reservationNumber}</p>
                            </div>

                            {/* Schedule */}
                            <div className="col-span-2 text-center mb-4 lg:mb-0">
                                <div className="flex flex-col items-center">
                                    <p className="text-xs font-black text-secondary uppercase tracking-widest mb-1">
                                        {new Date(reservation.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </p>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-surface border border-border rounded-lg">
                                        <Clock size={12} className="text-primary" />
                                        <span className="text-[10px] font-black text-secondary">{reservation.timeSlot?.start}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Table / Zone */}
                            <div className="col-span-2 text-center mb-4 lg:mb-0">
                                {reservation.table ? (
                                    <div className="flex flex-col items-center">
                                        <p className="text-xs font-black text-secondary uppercase tracking-widest mb-1">Table #{reservation.table.tableNumber}</p>
                                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em]">{reservation.table.area} Zone</p>
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-bold italic text-text-muted">Unassigned</p>
                                )}
                            </div>

                            {/* Billing */}
                            <div className="col-span-1 text-center mb-4 lg:mb-0">
                                <p className="text-lg font-heading text-primary leading-none mb-1">₹{reservation.advanceAmount || 0}</p>
                                <div className={`text-[8px] font-black uppercase tracking-widest ${reservation.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {reservation.paymentStatus}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="col-span-2 flex justify-end gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                {reservation.status === 'pending' && (
                                    <button
                                        onClick={() => handleStatusUpdate(reservation._id, 'confirmed')}
                                        className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 border border-green-200 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                        title="Approve Reservation"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                )}
                                {reservation.status === 'confirmed' && (
                                    <button
                                        onClick={() => {
                                            if (reservation.paymentStatus !== 'paid' && (reservation.advanceAmount || 0) > 0) {
                                                setErrorOverlay({
                                                    title: 'Payment Outstanding',
                                                    message: `This reservation cannot be marked as COMPLETED because the digital payment status is still '${reservation.paymentStatus}'. Please ensure all dues are cleared before finalizing the service experience.`
                                                });
                                                return;
                                            }
                                            handleStatusUpdate(reservation._id, 'completed');
                                        }}
                                        className={`w-10 h-10 flex items-center justify-center border rounded-xl transition-all shadow-sm ${reservation.paymentStatus !== 'paid' && (reservation.advanceAmount || 0) > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white'}`}
                                        title="Complete Service"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                )}
                                {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                                    <button
                                        onClick={() => openCancelModal(reservation._id)}
                                        className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                        title="Revoke Reservation"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                )}
                                <div className="w-10 h-10 flex items-center justify-center bg-surface text-secondary border border-border rounded-xl cursor-not-allowed opacity-40">
                                    <ArrowUpRight size={18} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination / Footer */}
            <div className="mt-8 flex justify-between items-center px-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-50">Authorized Personnel Only • Vincent Culinary Cloud</p>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-border rounded-lg text-[10px] font-bold uppercase tracking-widest disabled:opacity-20" disabled>Previous</button>
                    <button className="px-4 py-2 border border-border rounded-lg text-[10px] font-bold uppercase tracking-widest disabled:opacity-20" disabled>Next</button>
                </div>
            </div>

            {/* Cancellation Modal (Refined) */}
            {isCancelModalOpen && (
                <div className="overlay-premium z-[9999]" onClick={() => setIsCancelModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-premium w-full max-w-md overflow-hidden animate-scale-up border border-white/20">
                        <div className="p-8 border-b border-border bg-surface/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12">
                                <XCircle size={120} />
                            </div>
                            <h3 className="text-2xl font-heading text-secondary mb-1">Revocation Mandate</h3>
                            <p className="text-text-muted uppercase text-[10px] font-bold tracking-widest">Formal cancellation of Engagement Registry</p>
                        </div>
                        <div className="p-8">
                            <label className="label-premium">Administrative Justification</label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="State the reason for service revocation..."
                                className="input-premium h-32 resize-none !rounded-2xl"
                                required
                            />
                        </div>
                        <div className="p-8 bg-surface/30 flex gap-4">
                            <button
                                onClick={() => {
                                    setIsCancelModalOpen(false);
                                    setCancelReason('');
                                }}
                                disabled={isCancelling}
                                className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-text-muted hover:text-secondary transition-colors"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                disabled={isCancelling || !cancelReason.trim()}
                                className="flex-1 py-4 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-premium hover:bg-red-700 transition-all disabled:grayscale disabled:opacity-50"
                            >
                                {isCancelling ? 'Processing...' : 'Execute Revocation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Error Overlay */}
            {errorOverlay && (
                <div className="overlay-premium z-[99999]" onClick={() => setErrorOverlay(null)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-red-100">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 animate-bounce">
                                <AlertCircle size={40} />
                            </div>
                            <h3 className="text-2xl font-heading text-secondary mb-3">{errorOverlay.title}</h3>
                            <p className="text-sm text-text-muted leading-relaxed mb-8">
                                {errorOverlay.message}
                            </p>
                            <button 
                                onClick={() => setErrorOverlay(null)}
                                className="w-full py-4 bg-secondary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all shadow-lg"
                            >
                                Acknowledge & Correct
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
