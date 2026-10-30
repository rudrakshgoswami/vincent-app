import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Calendar,
    Clock,
    Users,
    MapPin,
    X,
    Loader2,
    AlertTriangle,
    CheckCircle,
    Info,
    Coffee,
    ChevronRight,
    ArrowLeft,
    Inbox,
    ShieldCheck
} from 'lucide-react';
import { fetchMyReservations, cancelReservation } from '../api';

export default function MyTableReservations() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('upcoming'); // all, upcoming, past
    const [showSuccess, setShowSuccess] = useState(false);
    const [cancellingId, setCancellingId] = useState(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (searchParams.get('success') === 'true') {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 8000);
        }

        loadReservations();
    }, [user, navigate, searchParams]);

    const loadReservations = async () => {
        setLoading(true);
        try {
            const res = await fetchMyReservations();
            if (res.success) {
                setReservations(res.data.reservations);
            }
        } catch (error) {
            console.error('Fetch reservations error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (reservationId) => {
        if (!confirm('Are you sure you want to cancel this reservation? Refund credits will be processed as per policy.')) return;

        setCancellingId(reservationId);
        try {
            const res = await cancelReservation(reservationId, 'Cancelled by user');
            if (res.success) {
                loadReservations();
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error('Cancel error:', error);
            alert('Failed to cancel reservation: ' + (error.message || 'Unknown error'));
        } finally {
            setCancellingId(null);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'border-yellow-200 bg-yellow-50 text-yellow-700',
            confirmed: 'border-green-200 bg-green-50 text-green-700',
            completed: 'border-blue-200 bg-blue-50 text-blue-700',
            cancelled: 'border-red-200 bg-red-50 text-red-700',
            no_show: 'border-gray-200 bg-gray-100 text-gray-700'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${styles[status]}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    const filteredReservations = reservations.filter(r => {
        // Build the exact reservation datetime from date + start time
        const [hours, minutes] = (r.timeSlot?.start || '00:00').split(':');
        const reservationTime = new Date(r.date);
        reservationTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const now = new Date();
        // Strictly time-based: if reservation time is in the future → upcoming, otherwise → past
        const isPast = reservationTime < now;

        if (filter === 'upcoming') return !isPast; // even 1 minute left = upcoming
        if (filter === 'past') return isPast;       // even 1 minute past = past
        return true; // 'all' shows everything
    });

    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-4">
            <div className="container mx-auto max-w-5xl">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 animate-fade-in">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/5 rounded-full text-secondary font-bold text-[10px] uppercase tracking-[0.2em] mb-4">
                            <Coffee size={14} className="text-primary" />
                            Guest Portfolio
                        </div>
                        <h1 className="text-4xl md:text-5xl">My Reservations</h1>
                        <p className="text-text-muted mt-2">View and manage your culinary engagements at Vincent.</p>
                    </div>
                    <button
                        onClick={() => navigate('/reserve-table')}
                        className="btn-primary flex items-center gap-3 text-xs tracking-[0.2em] font-black uppercase group"
                    >
                        Schedule New Experience
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {showSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 flex items-center gap-5 animate-scale-up shadow-premium">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                            <CheckCircle size={28} />
                        </div>
                        <div>
                            <h3 className="text-green-900 font-bold uppercase tracking-widest text-sm mb-1">Booking Successfully Confirmed</h3>
                            <p className="text-green-700 text-xs">Your table is secured. We look forward to hosting you at Vincent.</p>
                        </div>
                        <button onClick={() => setShowSuccess(false)} className="ml-auto text-green-400 hover:text-green-600">
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="flex gap-1 mb-10 bg-surface p-1 rounded-xl w-fit border border-border">
                    {['upcoming', 'past', 'all'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === t
                                ? 'bg-white text-secondary shadow-premium'
                                : 'text-text-muted hover:text-primary hover:bg-white/50'
                                }`}
                        >
                            {t} Engagement
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <p className="text-xs font-bold uppercase tracking-[0.3em]">Synching with Curated Database...</p>
                    </div>
                ) : filteredReservations.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-border border-dashed shadow-inner-soft animate-fade-in">
                        <div className="w-20 h-20 mx-auto mb-6 bg-surface rounded-full flex items-center justify-center text-text-muted/30">
                            <Inbox size={40} />
                        </div>
                        <h3 className="text-xl font-heading text-secondary mb-2">No {filter} reservations found</h3>
                        <p className="text-text-muted text-sm mb-8 max-w-xs mx-auto">Your portal is empty. Let's change that by booking a table for your next evening.</p>
                        <button
                            onClick={() => navigate('/reserve-table')}
                            className="btn-outline text-[10px] px-10 font-black uppercase tracking-widest"
                        >
                            Explore Table Layout
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {filteredReservations.map((r, idx) => (
                            <div
                                key={r._id}
                                className="card-premium group hover:border-primary transition-all duration-500 animate-slide-up"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-4 mb-3">
                                            <h3 className="text-2xl font-heading text-secondary mb-0">Table #{r.table?.tableNumber || 'N/A'}</h3>
                                            {getStatusBadge(r.status)}
                                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                                Ref: <span className="text-secondary">{r.reservationNumber}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                            <div className="flex items-center gap-3 group/item">
                                                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                                    <Calendar size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] uppercase tracking-widest font-black text-text-muted leading-none mb-1">Date</p>
                                                    <p className="font-bold text-secondary text-xs">{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 group/item">
                                                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                                    <Clock size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] uppercase tracking-widest font-black text-text-muted leading-none mb-1">Time</p>
                                                    <p className="font-bold text-secondary text-xs">{r.timeSlot.start} — {r.timeSlot.end}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 group/item">
                                                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                                    <Users size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] uppercase tracking-widest font-black text-text-muted leading-none mb-1">Guests</p>
                                                    <p className="font-bold text-secondary text-xs">{r.guestCount} People</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 group/item">
                                                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                                    <MapPin size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] uppercase tracking-widest font-black text-text-muted leading-none mb-1">Ambiance</p>
                                                    <p className="font-bold text-secondary text-xs">{r.table?.area || 'Restaurant'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-4 pt-6 lg:pt-0 border-t lg:border-t-0 border-border">
                                        <div className="text-left lg:text-right">
                                            <p className="text-[9px] uppercase tracking-widest font-black text-text-muted mb-1">Paid Deposit</p>
                                            <p className="text-2xl font-heading text-primary leading-none">₹{r.advanceAmount}</p>
                                        </div>

                                        {r.status === 'confirmed' && (
                                            <button
                                                onClick={() => handleCancel(r._id)}
                                                disabled={cancellingId === r._id}
                                                className="px-5 py-2.5 rounded-lg border-2 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group/btn"
                                            >
                                                {cancellingId === r._id ? <Loader2 className="animate-spin w-3 h-3" /> : <X size={14} className="group-hover/btn:scale-125 transition-transform" />}
                                                Revoke Commitment
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {r.status === 'cancelled' && (
                                    <div className="mt-6 pt-6 border-t border-border flex items-start gap-4 p-4 bg-red-50/50 rounded-xl">
                                        <div className="p-2 bg-red-100 rounded-lg text-red-500">
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Revocation Metadata</p>
                                            <p className="text-xs text-red-600/80 mb-2 font-bold italic">Reason: {r.cancellationReason}</p>
                                            {r.refundAmount > 0 && (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100/50 border border-green-200 rounded-full text-[9px] font-black text-green-700 uppercase tracking-widest">
                                                    <ShieldCheck size={12} />
                                                    Refund of ₹{r.refundAmount} Processing
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Secure Footer */}
                <div className="mt-20 flex flex-col items-center gap-6 py-12 border-t border-border opacity-40 grayscale group">
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col items-center gap-1">
                            <ShieldCheck size={24} className="group-hover:text-secondary transition-colors" />
                            <span className="text-[8px] font-black uppercase tracking-[0.3em]">Encrypted</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Coffee size={24} className="group-hover:text-secondary transition-colors" />
                            <span className="text-[8px] font-black uppercase tracking-[0.3em]">Hospitality</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <CheckCircle size={24} className="group-hover:text-secondary transition-colors" />
                            <span className="text-[8px] font-black uppercase tracking-[0.3em]">Verified</span>
                        </div>
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-widest">The Vincent Culinary Society © 2026</p>
                </div>
            </div>
        </div>
    );
}
