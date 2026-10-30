import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchMyVenueBookings, getImageUrl, cancelVenueBooking, fetchVenueBookingInvoice } from '../../api';
import {
    Calendar,
    MapPin,
    Users,
    Clock,
    ArrowRight,
    Search,
    RefreshCw,
    Sparkles,
    SearchX,
    ChevronDown,
    ChevronUp,
    Download,
    Phone,
    Mail,
    AlertCircle,
    CheckCircle2,
    History,
    CreditCard,
    ClipboardList,
    ShieldCheck,
    HelpCircle,
    ArrowUpRight,
    Info
} from 'lucide-react';

const STATUS_CONFIGS = {
    DRAFT: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-400/10', icon: ClipboardList },
    AWAITING_ADMIN_APPROVAL: { label: 'Awaiting Approval', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Clock },
    CONFIRMED: { label: 'Confirmed', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2 },
    COMPLETED: { label: 'Completed', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: History },
    CANCELLED: { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-500/10', icon: ShieldCheck },
    REJECTED: { label: 'Rejected', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertCircle }
};

const PAYMENT_STATUS_CONFIGS = {
    ADVANCE_PENDING: { label: 'Advance Pending', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    ADVANCE_PAID: { label: 'Advance Paid', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    BALANCE_PENDING: { label: 'Balance Pending', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    PARTIALLY_PAID: { label: 'Partially Paid', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    FULLY_PAID: { label: 'Fully Paid', color: 'text-green-500', bg: 'bg-green-500/10' },
    FAILED: { label: 'Payment Failed', color: 'text-red-600', bg: 'bg-red-600/10' },
    BALANCE_OVERDUE: { label: 'Balance Overdue', color: 'text-red-500', bg: 'bg-red-500/10' }
};

export default function MyVenueBookings() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'upcoming', 'past'
    const [expandedBooking, setExpandedBooking] = useState(null);
    const [isDownloading, setIsDownloading] = useState(null);
    const [error, setError] = useState(null); // Added error state as per instruction's loadBookings

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadBookings();
    }, [user]); // Changed back to user dependency to ensure re-load if user context settles later

    const loadBookings = async () => {
        try {
            setLoading(true);
            const res = await fetchMyVenueBookings();
            // The backend returns the array directly, so we use res directly or res.data if wrapped
            const bookingsData = res?.data?.bookings || res?.bookings || res || [];
            setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        } catch (err) {
            console.error('Error loading bookings:', err);
            setError(err.message); // Added error handling as per instruction
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadInvoice = async (bookingId, bookingRef) => {
        try {
            setIsDownloading(bookingId);
            const html = await fetchVenueBookingInvoice(bookingId);
            
            // Create a temporary hidden iframe or new window to print
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                }, 1000);
            }
        } catch (err) {
            console.error('Download failed:', err);
            alert(`Invoice generation failed: ${err.message || 'Server error. Please try again.'}`);
        } finally {
            setIsDownloading(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const filteredBookings = bookings.filter(booking => {
        const matchesSearch = 
            booking.bookingRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.venueName?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const eventDate = new Date(booking.eventDate);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (activeTab === 'upcoming') return matchesSearch && eventDate >= today && booking.status !== 'CANCELLED';
        if (activeTab === 'past') return matchesSearch && (eventDate < today || booking.status === 'COMPLETED');
        return matchesSearch;
    });

    if (loading && bookings.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-20 grayscale opacity-40">
                <History className="w-16 h-16 text-secondary mb-6 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary">Retrieving Venue Ledger...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32 animate-fade-in">
            {/* Hero Section */}
            <div className="pt-24 pb-16 bg-secondary relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                        <div>
                            <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-6">
                                <Calendar size={12} className="text-primary" />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary-light">Event Manifests</span>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-heading text-white mb-2 leading-tight">My <span className="text-primary italic">Venue</span> Bookings</h1>
                            <p className="text-white/40 text-sm font-medium uppercase tracking-[0.2em]">Manage your upcoming celebrations and experiences</p>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                            {['all', 'upcoming', 'past'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setActiveTab(t)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-primary text-white shadow-xl' : 'text-white/40 hover:text-white'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-10 relative z-20">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <AlertCircle className="text-red-500" size={24} />
                            <div>
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-red-500 mb-1 italic">Retrieval Interrupted</h3>
                                <p className="text-text-muted text-[11px] font-medium leading-relaxed">{error}</p>
                            </div>
                        </div>
                        <button 
                            onClick={loadBookings}
                            className="px-6 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                        >
                            Retry Handshake
                        </button>
                    </div>
                )}

                {/* Search / Filter Bar */}
                <div className="flex flex-col gap-6 mb-12">
                    <div className="bg-white p-3 rounded-3xl border border-border shadow-premium flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search by venue or reference..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-surface border-transparent focus:border-primary/20 rounded-2xl py-4 px-14 text-sm font-bold placeholder:text-text-muted/40 transition-all outline-none"
                            />
                        </div>
                        <button onClick={loadBookings} className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center text-secondary hover:bg-primary hover:text-white transition-all shadow-sm border border-border">
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Bookings List */}
                {filteredBookings.length === 0 ? (
                    <div className="py-40 text-center animate-fade-in bg-white/50 rounded-[4rem] border border-border border-dashed">
                        <SearchX size={64} className="text-text-muted/20 mx-auto mb-8" />
                        <h3 className="text-3xl font-heading text-secondary mb-4">No Bookings Found</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-12 italic">The archives do not contain matching records</p>
                        <Link to="/venues" className="px-12 py-5 bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-premium hover:shadow-premium-hover transition-all">
                            Browse Venues
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-10 animate-fade-in-up">
                        {filteredBookings.map((booking) => {
                            const status = STATUS_CONFIGS[booking.status] || STATUS_CONFIGS.AWAITING_ADMIN_APPROVAL;
                            const payStatus = PAYMENT_STATUS_CONFIGS[booking.paymentStatus] || PAYMENT_STATUS_CONFIGS.ADVANCE_PENDING;
                            const StatusIcon = status.icon;
                            const isExpanded = expandedBooking === booking._id;

                            // Dynamic Balance Calculations
                            const totalPaid = booking.paymentHistory?.reduce((sum, p) => sum + p.amount, 0) || 0;
                            const currentBalance = Math.max(0, booking.grandTotal - totalPaid);
                            const isAdvancePaid = booking.paymentStatus !== 'ADVANCE_PENDING' && totalPaid > 0;
                            const isFullyPaid = currentBalance <= 0;

                            return (
                                <div key={booking._id} className={`card-premium overflow-hidden transition-all duration-500 ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}>
                                    <div className="flex flex-col xl:flex-row">
                                        {/* Venue Image Sidebar */}
                                        <div className="xl:w-80 h-64 xl:h-auto relative overflow-hidden group">
                                            <img
                                                src={getImageUrl(booking.venue?.media?.[0]?.url)}
                                                alt={booking.venueName}
                                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                            <div className="absolute bottom-6 left-6 right-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${status.bg} border border-white/10 backdrop-blur-md mb-2`}>
                                                    <StatusIcon size={12} className={status.color} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${status.color}`}>{status.label}</span>
                                                </div>
                                                <h3 className="text-xl font-heading text-white">{booking.venueName}</h3>
                                            </div>
                                        </div>

                                        {/* Main Content */}
                                        <div className="flex-1 p-6 md:p-10">
                                            <div className="flex flex-wrap items-start justify-between gap-6 mb-10">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Booking Reference</p>
                                                    <h4 className="text-2xl font-heading text-secondary">#{booking.bookingRef}</h4>
                                                </div>
                                                <div className="flex items-center gap-10">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-1">Total Fiscal</p>
                                                        <p className="text-2xl font-heading text-secondary font-medium">₹{booking.grandTotal.toLocaleString()}</p>
                                                    </div>
                                                    <div className="text-right group relative">
                                                        {booking.status !== 'CANCELLED' ? (
                                                            <>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Due Amount</p>
                                                                {!isFullyPaid ? (
                                                                    <>
                                                                        <p className="text-2xl font-heading text-secondary font-bold">
                                                                            ₹{currentBalance.toLocaleString()}
                                                                        </p>
                                                                        <div className="absolute -top-6 right-0 scale-75 opacity-0 group-hover:opacity-100 transition-all">
                                                                            <span className="bg-primary text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                                                                {isAdvancePaid ? 'Balance Pending' : 'Advance Required'}
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="flex flex-col items-end">
                                                                        <p className="text-2xl font-heading text-green-600 font-bold leading-none">₹0</p>
                                                                        <div className="mt-1 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                                                            <ShieldCheck size={10} className="text-green-600" />
                                                                            <span className="text-[8px] font-black uppercase tracking-tighter text-green-700">Fully Paid</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col items-end">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-1">Financial State</p>
                                                                <div className="flex items-center gap-1 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                                                    <AlertCircle size={10} className="text-red-500" />
                                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-red-600 italic">Terminated</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-border/50">
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-2">
                                                        <Calendar size={12} className="text-primary" /> Event Date
                                                    </p>
                                                    <p className="text-sm font-bold text-secondary">{formatDate(booking.eventDate)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-2">
                                                        <Clock size={12} className="text-primary" /> Time Slot
                                                    </p>
                                                    <p className="text-sm font-bold text-secondary uppercase">{booking.slotLabel || booking.timeSlot}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-2">
                                                        <Users size={12} className="text-primary" /> Guests
                                                    </p>
                                                    <p className="text-sm font-bold text-secondary">{booking.guestCount} Headcount</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-2">
                                                        <CreditCard size={12} className="text-primary" /> Payment
                                                    </p>
                                                    <div className={`inline-flex px-3 py-1 rounded-full border border-current/10 ${payStatus.bg} ${payStatus.color} text-[10px] font-black uppercase tracking-widest`}>
                                                        {payStatus.label}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expandable Footer Toggle */}
                                            <div className="flex flex-wrap items-center justify-between gap-6 pt-8">
                                                <div className="flex gap-4">
                                                    <button 
                                                        onClick={() => setExpandedBooking(isExpanded ? null : booking._id)}
                                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-primary transition-colors"
                                                    >
                                                        {isExpanded ? <>Collapse details <ChevronUp size={14} /></> : <>Expand breakdown <ChevronDown size={14} /></>}
                                                    </button>
                                                    {!['CANCELLED', 'REJECTED'].includes(booking.status) && (
                                                        <button 
                                                            onClick={() => handleDownloadInvoice(booking._id, booking.bookingRef)}
                                                            disabled={isDownloading === booking._id}
                                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:text-secondary transition-colors disabled:opacity-50"
                                                        >
                                                            {isDownloading === booking._id ? (
                                                                <RefreshCw size={14} className="animate-spin" />
                                                            ) : (
                                                                <Download size={14} />
                                                            )}
                                                            {isDownloading === booking._id ? 'Generating...' : 'Download Invoice'}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex gap-4">
                                                    <Link 
                                                        to={`/venues/${booking.venue?._id}`}
                                                        className="px-6 py-2.5 bg-surface text-[10px] font-black uppercase tracking-widest text-secondary rounded-xl border border-border hover:bg-white transition-all shadow-sm"
                                                    >
                                                        Venue Details
                                                    </Link>
                                                    <button className="px-6 py-2.5 bg-secondary text-[10px] font-black uppercase tracking-widest text-primary-light rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2">
                                                        Support Center <ArrowUpRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Detail View */}
                                    {isExpanded && (
                                        <div className="border-t border-border bg-surface/30 p-8 md:p-12 animate-fade-in">
                                            <div className="grid lg:grid-cols-3 gap-12">
                                                {/* Left: Catering & Services */}
                                                <div className="lg:col-span-2 space-y-12">
                                                    {booking.status !== 'CANCELLED' && booking.hasCatering && (
                                                        <div>
                                                            <div className="flex items-center gap-4 mb-6">
                                                                <div className="p-3 bg-white rounded-2xl border border-border shadow-sm text-primary">
                                                                    <Sparkles size={20} />
                                                                </div>
                                                                <div>
                                                                    <h5 className="text-xl font-heading text-secondary italic">Catering Blueprint</h5>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Package: {booking.catering?.packageName}</p>
                                                                </div>
                                                            </div>
                                                            <div className="bg-white rounded-3xl p-8 border border-border space-y-4">
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="font-bold text-text-muted uppercase tracking-widest text-[11px]">Plate Contribution ({booking.catering?.guestCount} x ₹{booking.catering?.pricePerPlate})</span>
                                                                    <span className="font-heading text-secondary">₹{booking.catering?.baseTotal?.toLocaleString()}</span>
                                                                </div>
                                                                {booking.catering?.extraItemsTotal > 0 && (
                                                                    <div className="flex justify-between items-center text-sm">
                                                                        <span className="font-bold text-text-muted uppercase tracking-widest text-[11px]">Gourmet Extensions</span>
                                                                        <span className="font-heading text-secondary">₹{booking.catering?.extraItemsTotal?.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                                <div className="pt-4 border-t border-dashed border-border flex justify-between items-center">
                                                                    <span className="font-black text-secondary uppercase tracking-widest text-[11px]">Catering Aggregate</span>
                                                                    <span className="font-heading text-xl text-primary font-bold">₹{booking.catering?.total?.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {booking.status !== 'CANCELLED' && booking.additionalServices?.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-4 mb-6">
                                                                <div className="p-3 bg-white rounded-2xl border border-border shadow-sm text-primary">
                                                                    <ShieldCheck size={20} />
                                                                </div>
                                                                <h5 className="text-xl font-heading text-secondary italic">Supplementary Modules</h5>
                                                            </div>
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                                {booking.additionalServices.map((service, idx) => (
                                                                    <div key={idx} className="bg-white p-5 rounded-3xl border border-border flex justify-between items-center">
                                                                        <div>
                                                                            <p className="text-[10px] font-black uppercase text-primary mb-1">{service.category}</p>
                                                                            <p className="text-sm font-bold text-secondary capitalize">{service.name}</p>
                                                                        </div>
                                                                        <p className="font-heading text-secondary font-medium">₹{service.total?.toLocaleString()}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Special Instructions */}
                                                    {booking.specialInstructions && (
                                                        <div>
                                                            <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-4 flex items-center gap-2">
                                                                <HelpCircle size={14} /> Special Directives
                                                            </h5>
                                                            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 italic text-sm text-secondary leading-relaxed">
                                                                "{booking.specialInstructions}"
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Cancellation Details */}
                                                    {booking.status === 'CANCELLED' && (
                                                        <div className="animate-scale-up">
                                                            <div className="flex items-center gap-4 mb-6">
                                                                <div className="p-3 bg-red-50 rounded-2xl border border-red-100 shadow-sm text-red-500">
                                                                    <AlertCircle size={20} />
                                                                </div>
                                                                <div>
                                                                    <h5 className="text-xl font-heading text-red-600 italic">Termination Report</h5>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Cancelled on: {new Date(booking.cancelledAt).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                            <div className="bg-red-50/30 rounded-3xl p-8 border border-red-100 space-y-6">
                                                                <div>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-2">Primary Reason</p>
                                                                    <p className="text-sm font-bold text-secondary">"{booking.cancellationReason || 'No reason provided'}"</p>
                                                                </div>
                                                                
                                                                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-red-100">
                                                                    <div>
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">Refund Entitlement</p>
                                                                        <p className="text-2xl font-heading text-red-600">₹{booking.refundAmount?.toLocaleString() || '0'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">Refund Status</p>
                                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-red-100">
                                                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                                            <span className="text-[10px] font-black uppercase text-red-600">{booking.refundStatus?.replace('_', ' ') || 'NONE'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                <p className="text-[10px] text-red-500 italic flex items-center gap-2">
                                                                    <Info size={12} /> Refunds are processed via original payment mode within 5-7 business days as per the policy cited below.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Venue Policy / Rules */}
                                                    <div>
                                                        <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-6 flex items-center gap-2">
                                                            <ShieldCheck size={14} /> Venue Protocol & Policies
                                                        </h5>
                                                        <div className="grid md:grid-cols-2 gap-4">
                                                            <div className="bg-white p-6 rounded-3xl border border-border shadow-sm">
                                                                <p className="text-[9px] font-black uppercase text-secondary/40 mb-3 tracking-widest">Cancellation Policy</p>
                                                                <div className="space-y-3">
                                                                    {booking.venue?.policies?.cancellation?.length > 0 ? (
                                                                        booking.venue.policies.cancellation.map((rule, idx) => (
                                                                            <div key={idx} className="flex justify-between items-center text-[11px] font-bold">
                                                                                <span className="text-text-muted">{rule.daysBeforeEvent}+ Days Notice</span>
                                                                                <span className="text-green-600">{rule.refundPercent}% Refund</span>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <p className="text-[11px] font-bold text-text-muted">Standard 48-hour cancellation applies.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="bg-white p-6 rounded-3xl border border-border shadow-sm">
                                                                <p className="text-[9px] font-black uppercase text-secondary/40 mb-3 tracking-widest">House Rules</p>
                                                                <div className="space-y-2">
                                                                    <p className="text-[10px] font-bold text-secondary flex items-center gap-2">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Max Advance: {booking.venue?.policies?.maxAdvanceBooking || 365} Days
                                                                    </p>
                                                                    <p className="text-[10px] font-bold text-secondary flex items-center gap-2">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Noise Cutoff: {booking.venue?.policies?.noiseRestrictionAfter || '11:00 PM'}
                                                                    </p>
                                                                    {booking.venue?.policies?.noSmoking && (
                                                                        <p className="text-[10px] font-bold text-secondary flex items-center gap-2">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Non-Smoking Zone
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Payment Timeline & Admin Notes */}
                                                <div className="space-y-12">
                                                    {/* Ledger Timeline */}
                                                    <div>
                                                        <h5 className="text-xl font-heading text-secondary italic mb-8">Fiscal Timeline</h5>
                                                        <div className="space-y-10 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                                                            {booking.paymentHistory?.map((tx, idx) => (
                                                                <div key={idx} className="relative pl-10">
                                                                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-md flex items-center justify-center ${tx.purpose === 'advance' ? 'bg-primary' : 'bg-secondary'}`}>
                                                                        <CheckCircle2 size={10} className="text-white" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[10px] font-black uppercase text-text-muted">{new Date(tx.timestamp).toLocaleDateString()} — {tx.method}</p>
                                                                        <div className="flex justify-between items-center">
                                                                            <p className="text-sm font-bold text-secondary uppercase tracking-tight">{tx.purpose} Inducted</p>
                                                                            <p className="font-heading text-secondary text-sm font-bold">₹{tx.amount?.toLocaleString()}</p>
                                                                        </div>
                                                                        <p className="text-[10px] font-medium text-text-muted truncate opacity-60">ID: {tx.transactionId}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {booking.status !== 'CANCELLED' && !isFullyPaid ? (
                                                                <div className="relative pl-10">
                                                                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-md bg-white flex items-center justify-center">
                                                                        <Clock size={10} className="text-text-muted" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[10px] font-black uppercase text-text-muted">Estimated Ledger Settlement</p>
                                                                        <p className={`text-sm font-bold uppercase tracking-tight italic ${isAdvancePaid ? 'text-blue-500' : 'text-primary'}`}>
                                                                            {isAdvancePaid ? 'Advance Secured — Balance Awaited' : 'Balance Allocation Awaited'}
                                                                        </p>
                                                                        <p className="font-heading text-secondary text-sm font-bold opacity-30">₹{currentBalance.toLocaleString()}</p>
                                                                        {booking.balanceDueDate && (
                                                                            <div className={`mt-2 p-2 rounded-lg border flex items-center gap-2 ${new Date(booking.balanceDueDate) < new Date() ? 'bg-red-50 border-red-100' : 'bg-primary/5 border-primary/10'}`}>
                                                                                <AlertCircle size={10} className={new Date(booking.balanceDueDate) < new Date() ? 'text-red-600 animate-pulse' : 'text-primary'} />
                                                                                <span className={`text-[9px] font-black uppercase tracking-widest ${new Date(booking.balanceDueDate) < new Date() ? 'text-red-700' : 'text-primary'}`}>
                                                                                    {new Date(booking.balanceDueDate) < new Date() ? 'OVERDUE: ' : 'Due by: '}
                                                                                    {formatDate(booking.balanceDueDate)}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : booking.status !== 'CANCELLED' && isFullyPaid ? (
                                                                <div className="relative pl-10">
                                                                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-md bg-green-500 flex items-center justify-center">
                                                                        <ShieldCheck size={10} className="text-white" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[10px] font-black uppercase text-text-muted">Manifest Cleared</p>
                                                                        <p className="text-sm font-bold text-green-600 uppercase tracking-tight">Full Settlement Reached</p>
                                                                        <p className="text-[10px] font-medium text-text-muted flex items-center gap-1"><CheckCircle2 size={10} /> Account is fully cleared</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="relative pl-10">
                                                                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-md bg-red-500 flex items-center justify-center">
                                                                        <AlertCircle size={10} className="text-white" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[10px] font-black uppercase text-text-muted">Ledger Closed</p>
                                                                        <p className="text-sm font-bold text-red-600 uppercase tracking-tight italic">Cancellation Finalized</p>
                                                                        <p className="text-[10px] font-medium text-text-muted">No further transactions permitted</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Contact & Support info */}
                                                    <div className="bg-secondary p-8 rounded-[2rem] text-white">
                                                        <h6 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-6">Manifest Support</h6>
                                                        <div className="space-y-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Phone size={18} className="text-primary-light" /></div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-white/40 uppercase">Hotline</p>
                                                                    <p className="text-sm font-medium">+91 99999 00000</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Mail size={18} className="text-primary-light" /></div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-white/40 uppercase">Email Dispatch</p>
                                                                    <p className="text-sm font-medium">concierge@vincentglobal.com</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Link to="/contact" className="w-full mt-10 py-4 bg-white text-secondary text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all">
                                                            Contact Concierge <ArrowRight size={14} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
