import { useEffect, useState } from 'react';
import {
    Search, RefreshCw, AlertCircle, Loader2, ChevronDown, ChevronUp,
    Calendar, Users, MapPin, Phone, Mail, Clock, IndianRupee, Check,
    X, Eye, MessageSquare, FileText, Star, Filter, Building2,
    CreditCard, Ban, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
    fetchAllVenueBookings, updateVenueBookingStatus, fetchVenueBookingStats,
    recordVenueBalancePayment
} from '../../api';

const STATUS_MAP = {
    ADVANCE_PENDING: { label: 'Advance Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    AWAITING_ADMIN_APPROVAL: { label: 'Pending Approval', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    CONFIRMED: { label: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    COMPLETED: { label: 'Completed', color: 'bg-blue-100 text-blue-800', icon: Check },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: Ban },
    REJECTED: { label: 'Rejected', color: 'bg-gray-100 text-gray-800', icon: X },
};

const SLOT_LABELS = {
    morning: '☀️ Morning (6AM-12PM)',
    afternoon: '🌤️ Afternoon (12PM-6PM)',
    evening: '🌙 Evening (6PM-12AM)',
    fullDay: '📅 Full Day (6AM-12AM)',
};

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmt(n) { return n ? `₹${Number(n).toLocaleString('en-IN')}` : '₹0'; }
function calculateTotalPaid(booking) {
    let total = booking.paymentHistory?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
    const hasAdvanceInHistory = booking.paymentHistory?.some(p => p.purpose === 'advance');
    if (!hasAdvanceInHistory && ['ADVANCE_PAID', 'PARTIALLY_PAID', 'FULLY_PAID'].includes(booking.paymentStatus)) {
        total += Number(booking.advanceAmount || 0);
    }
    return total;
}

export default function AdminVenueBookings() {
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    // Action modal
    const [actionModal, setActionModal] = useState(null); // { type: 'confirm'|'reject'|'record_payment'|'cancel', booking }
    const [actionReason, setActionReason] = useState('');
    const [isActioning, setIsActioning] = useState(false);

    // Payment recording state
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [errorOverlay, setErrorOverlay] = useState(null); // { title, message }

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [bookingsRes, statsRes] = await Promise.all([
                fetchAllVenueBookings(),
                fetchVenueBookingStats().catch(() => null)
            ]);
            setBookings(Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes.data?.bookings || bookingsRes.bookings || []));
            if (statsRes) setStats(statsRes.data || statsRes);
        } catch (err) {
            setError(err.message || 'Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (bookingId, newStatus, reason = null) => {
        try {
            setIsActioning(true);
            await updateVenueBookingStatus(bookingId, newStatus, reason);
            await loadData();
            setActionModal(null);
            setActionReason('');
        } catch (err) {
            alert(err.message || 'Status update failed');
        } finally {
            setIsActioning(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!actionModal?.booking?._id || !paymentAmount) return;
        try {
            const gp = Number(actionModal.booking.grandTotal) || 0;
            const adv = Number(actionModal.booking.advanceAmount) || 0;
            
            let totalPaid = calculateTotalPaid(actionModal.booking);
            // Fallback for draft bookings that are somehow not marked PAID
            if (totalPaid === 0 && actionModal.booking.paymentHistory?.length === 0 && adv > 0) {
                 totalPaid = adv;
            }

            // Re-calculate the True Balance
            const currentBalance = gp - totalPaid;

            const amt = Number(paymentAmount);

            if (isNaN(amt) || amt <= 0) {
                setErrorOverlay({
                    title: 'Invalid Amount',
                    message: 'Payment amount must be a valid number greater than zero.'
                });
                return;
            }

            if (amt > currentBalance + 1) {
                setErrorOverlay({
                    title: 'Overpayment Blocked',
                    message: `You are attempting to record ₹${amt.toLocaleString('en-IN')} which exceeds the true balance due of ₹${currentBalance.toLocaleString('en-IN')}. Negative balances are strictly prohibited.`
                });
                return;
            }

            setIsActioning(true);
            await recordVenueBalancePayment(actionModal.booking._id, {
                amount: Number(paymentAmount),
                method: paymentMethod,
                purpose: 'balance',
                notes: paymentNotes
            });
            await loadData();
            setActionModal(null);
            setPaymentAmount('');
            setPaymentNotes('');
        } catch (err) {
            alert(err.message || 'Failed to record payment');
        } finally {
            setIsActioning(false);
        }
    };

    const filtered = bookings.filter(b => {
        if (filterStatus && b.status !== filterStatus) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                b.bookingRef?.toLowerCase().includes(q) ||
                b.contactInfo?.fullName?.toLowerCase().includes(q) ||
                b.contactInfo?.email?.toLowerCase().includes(q) ||
                b.contactInfo?.phone?.includes(q) ||
                b.venue?.name?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-text-muted">Loading venue bookings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-heading text-secondary mb-1">Venue Bookings</h2>
                    <p className="text-text-muted text-sm">{bookings.length} total bookings</p>
                </div>
                <button onClick={loadData} className="p-2 text-text-muted hover:text-secondary hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 self-start">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Bookings', value: stats.totalBookings || bookings.length, icon: Calendar, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Pending Approval', value: stats.pendingConfirmation || bookings.filter(b => b.status === 'AWAITING_ADMIN_APPROVAL').length, icon: Clock, color: 'bg-orange-50 text-orange-700' },
                        { label: 'Confirmed', value: stats.confirmedBookings || bookings.filter(b => b.status === 'CONFIRMED').length, icon: CheckCircle2, color: 'bg-green-50 text-green-700' },
                        { label: 'Revenue Coll.', value: fmt(stats.collectedAmount || bookings.reduce((s, b) => s + (b.paymentHistory?.reduce((ps, p) => ps + p.amount, 0) || 0), 0)), icon: IndianRupee, color: 'bg-primary/10 text-primary' },
                    ].map((s, i) => (
                        <div key={i} className={`${s.color} p-4 rounded-xl`}>
                            <div className="flex items-center gap-2 mb-1">
                                <s.icon size={16} />
                                <span className="text-xs font-medium uppercase tracking-wider">{s.label}</span>
                            </div>
                            <p className="text-2xl font-heading">{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} /><p>{error}</p>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 border border-gray-200 rounded-xl shadow-sm">
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFilterStatus('')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${!filterStatus ? 'bg-secondary text-white border-secondary' : 'bg-white text-gray-600 border-gray-300 hover:border-secondary'}`}>
                        All
                    </button>
                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                        <button key={key} onClick={() => setFilterStatus(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filterStatus === key ? 'bg-secondary text-white border-secondary' : 'bg-white text-gray-600 border-gray-300 hover:border-secondary'}`}>
                            {val.label}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Search..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-72" />
                </div>
            </div>

            {/* Bookings List */}
            <div className="space-y-3">
                {filtered.map(booking => {
                    const status = STATUS_MAP[booking.status] || { label: booking.status, color: 'bg-gray-100 text-gray-800', icon: Clock };
                    const StatusIcon = status.icon;
                    const isExpanded = expandedId === booking._id;
                    const totalPaid = calculateTotalPaid(booking);
                    const balance = booking.grandTotal - totalPaid;

                    return (
                        <div key={booking._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                            {/* Main Row */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : booking._id)}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono font-bold text-primary">{booking.bookingRef || booking._id?.slice(-8).toUpperCase()}</span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                                            <StatusIcon size={10} /> {status.label}
                                        </span>
                                    </div>
                                    <h4 className="text-base font-heading text-secondary truncate">{booking.venue?.name || 'Unknown Venue'}</h4>
                                    <p className="text-xs text-text-muted mt-0.5">
                                        {booking.contactInfo?.fullName || 'No name'} · {booking.contactInfo?.phone || 'No phone'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                        <p className="text-text-muted text-[10px] uppercase tracking-wider">Event Date</p>
                                        <p className="font-medium text-secondary">{formatDate(booking.eventDate)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-text-muted text-[10px] uppercase tracking-wider">Slot</p>
                                        <p className="font-medium text-secondary">{(SLOT_LABELS[booking.timeSlot] || booking.timeSlot || '—').split(' ')[0]}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-text-muted text-[10px] uppercase tracking-wider">Amount</p>
                                        <p className="font-bold text-primary">{fmt(booking.grandTotal)}</p>
                                    </div>
                                    <div className="text-gray-400">
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-5 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        {/* Booking Info */}
                                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                            <h5 className="text-sm font-heading text-secondary mb-3 flex items-center gap-2"><Calendar size={14} /> Booking Details</h5>
                                            <div className="space-y-2 text-sm">
                                                <p><span className="text-text-muted">Type:</span> <span className="font-medium capitalize">{booking.eventType?.replace('_', ' ') || '—'}</span></p>
                                                <p><span className="text-text-muted">Guests:</span> <span className="font-medium">{booking.guestCount || '—'}</span></p>
                                                <p><span className="text-text-muted">Slot:</span> <span className="font-medium">{SLOT_LABELS[booking.timeSlot] || booking.timeSlot}</span></p>
                                                <p><span className="text-text-muted">Created:</span> <span className="text-xs">{formatDateTime(booking.createdAt)}</span></p>
                                            </div>
                                        </div>

                                        {/* Contact Info */}
                                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                            <h5 className="text-sm font-heading text-secondary mb-3 flex items-center gap-2"><Users size={14} /> Customer</h5>
                                            <div className="space-y-2 text-sm">
                                                <p className="font-medium text-secondary">{booking.contactInfo?.fullName || '—'}</p>
                                                <p className="flex items-center gap-1.5 text-text-muted"><Mail size={12} />{booking.contactInfo?.email || '—'}</p>
                                                <p className="flex items-center gap-1.5 text-text-muted"><Phone size={12} />{booking.contactInfo?.phone || '—'}</p>
                                            </div>
                                        </div>

                                        {/* Payment Summary */}
                                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                            <h5 className="text-sm font-heading text-secondary mb-3 flex items-center gap-2"><CreditCard size={14} /> Payment</h5>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-text-muted">Total:</span>
                                                    <span className="font-bold text-secondary">{fmt(booking.grandTotal)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-text-muted">Received:</span>
                                                    <span className="font-bold text-green-600">{fmt(totalPaid)}</span>
                                                </div>
                                                <div className="flex justify-between border-t border-gray-100 pt-1">
                                                    <span className="text-text-muted">Balance:</span>
                                                    <span className={`font-bold ${balance < 0 ? 'text-red-600 animate-pulse' : 'text-primary'}`}>
                                                        {balance < 0 ? `-₹${Math.abs(balance).toLocaleString('en-IN')}` : fmt(balance)}
                                                    </span>
                                                </div>
                                                {balance < 0 && (
                                                    <div className="flex items-center gap-1 text-[10px] text-red-600 font-bold uppercase mt-1">
                                                        <AlertTriangle size={10} /> Overpaid Amount
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* History & Items */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                         {/* Items Summary */}
                                         <div className="space-y-4">
                                            {booking.catering?.package && (
                                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                                    <h5 className="text-sm font-heading text-secondary mb-2">🍽️ Catering</h5>
                                                    <p className="text-sm font-medium">{booking.catering.package?.name || booking.catering.packageName}</p>
                                                    <p className="text-xs text-text-muted">{fmt(booking.catering.pricePerPlate)} × {booking.catering.guestCount} guests = <span className="font-bold text-primary">{fmt(booking.catering.total)}</span></p>
                                                </div>
                                            )}
                                            {booking.additionalServices?.length > 0 && (
                                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                                    <h5 className="text-sm font-heading text-secondary mb-2">✨ Services</h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {booking.additionalServices.map((svc, i) => (
                                                            <span key={i} className="text-[10px] bg-primary/5 text-primary px-2 py-1 rounded-full border border-primary/10 font-bold">
                                                                {svc.service?.name || svc.name} ({fmt(svc.price)})
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                         </div>

                                         {/* Payment History */}
                                         <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                            <h5 className="text-sm font-heading text-secondary mb-3 flex items-center gap-2"><CreditCard size={14} /> Payment History</h5>
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {booking.paymentHistory?.length > 0 ? booking.paymentHistory.map((p, i) => (
                                                    <div key={i} className="flex items-center justify-between text-[11px] p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-secondary uppercase text-[10px] italic">{p.purpose}</span>
                                                                <span className="text-text-muted font-mono">{p.paymentId || (p.razorpayPaymentId ? 'RZP:' + p.razorpayPaymentId : 'MANUAL')}</span>
                                                            </div>
                                                            <div className="text-[10px] text-text-muted">{formatDateTime(p.timestamp)} via {p.method}</div>
                                                        </div>
                                                        <div className="font-bold text-green-600">{fmt(p.amount)}</div>
                                                    </div>
                                                )) : <p className="text-xs text-text-muted text-center py-4 italic">No history preserved.</p>}
                                            </div>
                                         </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 pt-4">
                                        {balance > 0 && booking.status !== 'CANCELLED' && booking.status !== 'REJECTED' && booking.status !== 'COMPLETED' && (
                                            <button onClick={() => { 
                                                setPaymentAmount(balance.toString());
                                                setActionModal({ type: 'record_payment', booking });
                                            }}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm">
                                                <IndianRupee size={16} /> Record Payment
                                            </button>
                                        )}
                                        {booking.status === 'AWAITING_ADMIN_APPROVAL' && (
                                            <>
                                                <button onClick={() => setActionModal({ type: 'confirm', booking })}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm">
                                                    <CheckCircle2 size={16} /> Confirm Booking
                                                </button>
                                                <button onClick={() => setActionModal({ type: 'reject', booking })}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm">
                                                    <Ban size={16} /> Reject
                                                </button>
                                            </>
                                        )}
                                        {booking.status === 'CONFIRMED' && (
                                            <>
                                                <button 
                                                    onClick={() => {
                                                        if (balance > 0) {
                                                            setErrorOverlay({
                                                                title: 'Payment Outstanding',
                                                                message: `This booking cannot be marked as COMPLETED because there is a pending balance of ${fmt(balance)}. Please record the final payment or verify the transaction history before closing the booking.`
                                                            });
                                                            return;
                                                        }
                                                        handleStatusUpdate(booking._id, 'COMPLETED');
                                                    }}
                                                    className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-sm ${balance > 0 ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                                    <Check size={16} /> Mark Completed
                                                </button>
                                                <button onClick={() => setActionModal({ type: 'cancel', booking })}
                                                    className="flex items-center gap-1.5 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors shadow-sm">
                                                    <Ban size={16} /> Cancel
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="py-20 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
                        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-text-muted">No bookings found matching filters.</p>
                    </div>
                )}
            </div>

            {/* Action Modals */}
            {actionModal && (
                <div className="overlay-premium z-[9999]" onClick={() => { setActionModal(null); setActionReason(''); setPaymentAmount(''); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-gray-100">
                            <h3 className="text-xl font-heading text-secondary">
                                {actionModal.type === 'confirm' ? '✅ Confirm Booking' : 
                                 actionModal.type === 'reject' ? '❌ Reject Booking' : 
                                 actionModal.type === 'record_payment' ? '💰 Record Balance Payment' : '⚠️ Cancel Booking'}
                            </h3>
                            <p className="text-sm text-text-muted mt-1">Ref: {actionModal.booking.bookingRef || actionModal.booking._id?.slice(-8).toUpperCase()}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg text-sm">
                                <p><strong>{actionModal.booking.venue?.name}</strong></p>
                                <p className="text-text-muted">{formatDate(actionModal.booking.eventDate)} · {actionModal.booking.contactInfo?.fullName}</p>
                                <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                                    <span className="text-text-muted">Balance Due:</span>
                                    <span className="font-bold text-primary">
                                        {fmt(actionModal.booking.grandTotal - calculateTotalPaid(actionModal.booking))}
                                    </span>
                                </div>
                            </div>

                            {actionModal.type === 'record_payment' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
                                        <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${Number(paymentAmount) > (actionModal.booking.grandTotal - calculateTotalPaid(actionModal.booking)) ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-primary'}`} />
                                        {Number(paymentAmount) > (actionModal.booking.grandTotal - calculateTotalPaid(actionModal.booking)) && (
                                            <p className="text-[11px] text-red-600 font-bold mt-1.5 flex items-center gap-1 animate-fade-in">
                                                <AlertTriangle size={14} /> WARNING: Amount exceeds balance due!
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Method</label>
                                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                                                <option value="cash">Cash</option>
                                                <option value="upi">UPI</option>
                                                <option value="bank_transfer">Bank</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Note</label>
                                            <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Ref ID" />
                                        </div>
                                    </div>
                                </div>
                            ) : actionModal.type !== 'confirm' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                                    <textarea value={actionReason} onChange={e => setActionReason(e.target.value)}
                                        className="w-full h-20 px-4 py-2 border border-gray-300 rounded-lg resize-none"
                                        placeholder="Internal note..." />
                                </div>
                            )}

                            {actionModal.type === 'confirm' && (
                                <div className="text-sm text-green-700 space-y-1">
                                    <p>• Locks the date/slot permanently</p>
                                    <p>• Sends confirmation to customer</p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex gap-3 border-t">
                            <button onClick={() => { setActionModal(null); setActionReason(''); setPaymentAmount(''); }}
                                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={actionModal.type === 'record_payment' ? handleRecordPayment : () => handleStatusUpdate(
                                    actionModal.booking._id,
                                    actionModal.type === 'confirm' ? 'CONFIRMED' : actionModal.type === 'reject' ? 'REJECTED' : 'CANCELLED',
                                    actionReason || undefined
                                )}
                                disabled={isActioning}
                                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm
                                ${actionModal.type === 'confirm' ? 'bg-green-600 hover:bg-green-700' : 
                                  actionModal.type === 'record_payment' ? 'bg-primary hover:bg-primary-dark' : 'bg-red-600 hover:bg-red-700'}`}>
                                {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                                 actionModal.type === 'record_payment' ? <IndianRupee size={16} /> : <Check size={16} />}
                                {actionModal.type === 'record_payment' ? 'Record' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Error Overlay / Negative Prevention Modal */}
            {errorOverlay && (
                <div className="overlay-premium z-[99999]" onClick={() => setErrorOverlay(null)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-red-100" onClick={e => e.stopPropagation()}>
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 animate-bounce">
                                <AlertTriangle size={40} />
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
