import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
    MapPin, Users, Star, ArrowLeft, ChevronLeft, ChevronRight, Phone,
    Mail, Globe, Clock, Calendar, Check, X, Shield, Sparkles,
    Car, Snowflake, Music, Wifi, Zap, Utensils, Monitor, TreePine,
    Quote, ChevronDown, ChevronUp, ExternalLink, Info, Heart
} from 'lucide-react';
import { fetchVenue, fetchMonthlyAvailability, checkVenueAvailability, getImageUrl, fetchVenueReviews, submitReview, lockVenueSlot } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent, SOCKET_EVENTS } from '../../context/SocketContext';


const formatPrice = (price) => '₹' + (price || 0).toLocaleString('en-IN');

const VENUE_TYPE_LABELS = {
    banquet_hall: 'Banquet Hall', lawn_garden: 'Lawn & Garden', rooftop: 'Rooftop',
    conference_hall: 'Conference Hall', poolside: 'Poolside', farmhouse: 'Farmhouse', hotel_ballroom: 'Hotel Ballroom'
};

const SEATING_LABELS = {
    theater: { label: 'Theater', icon: '🎭' },
    banquet: { label: 'Banquet', icon: '🍽️' },
    cocktail: { label: 'Cocktail', icon: '🍸' },
    classroom: { label: 'Classroom', icon: '📚' },
    ushape: { label: 'U-Shape', icon: '🔲' }
};

export default function VenueDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);
    const [showAllAmenities, setShowAllAmenities] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showPolicies, setShowPolicies] = useState(false);
    const { user } = useAuth();
    const [realReviews, setRealReviews] = useState([]);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [bookingError, setBookingError] = useState('');
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [isAutoplay, setIsAutoplay] = useState(true);
    const [autoplayProgress, setAutoplayProgress] = useState(0);



    // Calendar
    const today = new Date();
    const [calMonth, setCalMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [monthData, setMonthData] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [slotsData, setSlotsData] = useState(null);
    const [loadingSlots, setLoadingSlots] = useState(false);

    useEffect(() => {
        loadVenue();
        loadReviews();
    }, [id]);

    const images = (venue?.media || []).filter(m => m.type === 'image');
    const approvedReviews = (venue?.reviews || []).filter(r => r.status === 'approved');
    const displayedAmenities = showAllAmenities ? (venue?.amenities || []) : (venue?.amenities || []).slice(0, 8);
    const displayedReviews = showAllReviews ? approvedReviews : approvedReviews.slice(0, 3);

    useEffect(() => {
        if (venue) loadMonthData();
    }, [calMonth, venue]);

    useEffect(() => {
        if (isLightboxOpen) {
            document.body.style.overflow = 'hidden';
            setIsAutoplay(false);
        } else {
            document.body.style.overflow = 'auto';
            setIsAutoplay(true);
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isLightboxOpen]);

    // Autoplay Logic
    useEffect(() => {
        if (!isAutoplay || images.length <= 1) return;

        const interval = setInterval(() => {
            setAutoplayProgress(p => {
                if (p >= 100) {
                    setActiveImage(prev => (prev + 1) % images.length);
                    return 0;
                }
                return p + 1; // Increment progress
            });
        }, 50); // Small interval for smooth progress bar

        return () => clearInterval(interval);
    }, [isAutoplay, images.length]);

    // Reset progress when image changes manually
    useEffect(() => {
        setAutoplayProgress(0);
    }, [activeImage]);


    const loadVenue = async () => {
        setLoading(true);
        try {
            const data = await fetchVenue(id);
            setVenue(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadMonthData = async () => {
        try {
            const data = await fetchMonthlyAvailability(id, calMonth);
            setMonthData(data.days);
        } catch (err) {
            console.error(err);
        }
    };

    const loadReviews = async () => {
        try {
            const data = await fetchVenueReviews(id);
            setRealReviews(data);
        } catch (err) {
            console.error('Error fetching reviews:', err);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setReviewError('Please login to submit a review');
            return;
        }
        if (!newReview.comment.trim()) {
            setReviewError('Please enter a comment');
            return;
        }

        setReviewLoading(true);
        setReviewError('');
        try {
            await submitReview({
                venueId: id,
                rating: newReview.rating,
                comment: newReview.comment
            });
            setReviewSuccess('Review submitted successfully!');
            setNewReview({ rating: 5, comment: '' });
            setShowReviewForm(false);
            loadReviews();
            loadVenue(); // To update average rating
        } catch (err) {
            setReviewError(err.message || 'Failed to submit review');
        } finally {
            setReviewLoading(false);
        }
    };


    const onDateClick = async (dateStr) => {
        setSelectedDate(dateStr);
        setLoadingSlots(true);
        try {
            const data = await checkVenueAvailability(id, dateStr);
            setSlotsData(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleBookNow = async (date, slotKey) => {
        if (!user) {
            navigate('/login', {
                state: { from: location.pathname, reason: 'Please login to book a venue' }
            });
            return;
        }

        try {
            setBookingError('');
            setLoadingSlots(true);
            const lockRes = await lockVenueSlot({ venueId: id, date, timeSlot: slotKey });
            navigate(`/venues/${id}/book?date=${date}&slot=${slotKey}`, {
                state: { lockExpiresAt: lockRes.lockExpiresAt }
            });
        } catch (err) {
            setBookingError(err.message || 'Failed to lock slot. It might have been just taken.');
            // Refresh slots to show updated state
            onDateClick(date);
        } finally {
            setLoadingSlots(false);
        }
    };

    const navigateMonth = (dir) => {
        const [y, m] = calMonth.split('-').map(Number);
        const d = new Date(y, m - 1 + dir, 1);
        setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        setSelectedDate(null);
        setSlotsData(null);
    };

    // Real-time Availability Updates via Sockets
    const handleAvailabilityUpdate = (data) => {
        if (data.venueId !== id) return;

        const eventDateStr = new Date(data.date).toISOString().split('T')[0];

        // 1. If currently viewing this date's slots, refresh them
        if (selectedDate === eventDateStr) {
            onDateClick(eventDateStr);
        }

        // 2. Always refresh monthly calendar if the month matches
        const eventMonth = eventDateStr.substring(0, 7); // "YYYY-MM"
        if (calMonth === eventMonth) {
            loadMonthData();
        }
    };

    useSocketEvent(SOCKET_EVENTS.VENUE_SLOT_LOCKED, handleAvailabilityUpdate);
    useSocketEvent(SOCKET_EVENTS.VENUE_SLOT_CONFIRMED, handleAvailabilityUpdate);
    useSocketEvent(SOCKET_EVENTS.VENUE_SLOT_RELEASED, handleAvailabilityUpdate);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-text-muted text-sm">Loading venue details...</p>
                </div>
            </div>
        );
    }

    if (!venue) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-4xl mb-3">😔</p>
                    <h2 className="text-xl font-heading text-secondary mb-2">Venue Not Found</h2>
                    <Link to="/venues" className="text-primary hover:underline">← Back to Venues</Link>
                </div>
            </div>
        );
    }



    const isWeekend = (dateStr) => {
        const d = new Date(dateStr);
        return d.getDay() === 0 || d.getDay() === 6;
    };

    const priceKey = selectedDate ? (isWeekend(selectedDate) ? 'weekend' : 'weekday') : 'weekday';
    const eveningPrice = venue.pricing?.[priceKey]?.evening || 0;

    // Calendar rendering
    const renderCalendar = () => {
        const [year, month] = calMonth.split('-').map(Number);
        const firstDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayInfo = monthData?.[dateStr];
            const status = dayInfo?.status || 'available';
            const isSelected = selectedDate === dateStr;

            let cellClass = 'p-1.5 rounded-lg text-center cursor-pointer transition-all text-sm font-medium ';
            if (status === 'past') cellClass += 'text-gray-300 cursor-not-allowed';
            else if (status === 'blocked' || status === 'fully_booked') cellClass += 'bg-red-50 text-red-400 cursor-not-allowed line-through';
            else if (status === 'partially_booked') cellClass += 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100';
            else cellClass += 'bg-green-50 text-green-700 hover:bg-green-100';
            if (isSelected) cellClass = 'p-1.5 rounded-lg text-center cursor-pointer transition-all text-sm font-medium bg-primary text-white ring-2 ring-primary/30';

            cells.push(
                <div
                    key={d}
                    className={`relative ${cellClass}`}
                    onClick={() => status !== 'past' && status !== 'blocked' && onDateClick(dateStr)}
                >
                    {d}
                    {dayInfo && status !== 'past' && (
                        <div className="text-[9px] leading-tight mt-0.5">
                            {dayInfo.hasLocks ? (
                                <span className="text-yellow-600 font-bold flex items-center justify-center gap-0.5"><Clock size={8} /> Locked</span>
                            ) : (
                                status === 'fully_booked' ? 'Full' : status === 'partially_booked' ? `${dayInfo.slotsAvailable} left` : 'Open'
                            )}
                        </div>
                    )}
                    {dayInfo?.hasLocks && (
                        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(234,179,8,0.5)]" title="Active Booking in Progress" />
                    )}
                </div>
            );
        }

        return (
            <div>
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => navigateMonth(-1)} className="p-1.5 hover:bg-surface rounded-lg transition-colors"><ChevronLeft size={18} /></button>
                    <h4 className="font-heading text-secondary">{monthName}</h4>
                    <button onClick={() => navigateMonth(1)} className="p-1.5 hover:bg-surface rounded-lg transition-colors"><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="text-center text-xs font-semibold text-text-muted py-1">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">{cells}</div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-100" /> Available</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-100" /> Partial</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-100" /> Booked</span>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Back Nav */}
            <div className="bg-white border-b border-border sticky top-[72px] z-10">
                <div className="container mx-auto px-6 py-3">
                    <div className="flex items-center justify-between">
                        {/* <button onClick={() => navigate('/venues')} className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm">
                            <ArrowLeft size={16} /> Back to Venues
                        </button> */}
                        <div className="flex items-center gap-3">
                            {venue.featured && (
                                <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full flex items-center gap-1"><Sparkles size={12} /> Featured</span>
                            )}
                            <span className="px-2.5 py-0.5 bg-surface text-text-muted text-xs font-medium rounded-full">
                                {VENUE_TYPE_LABELS[venue.type] || venue.type}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Unique "Edge-to-Edge Horizon" Gallery */}
            <section className="relative w-full h-[60vh] lg:h-[85vh] bg-black overflow-hidden group/gallery">
                {images.length > 0 ? (
                    <div className="w-full h-full relative">
                        <img
                            key={activeImage}
                            src={getImageUrl(images[activeImage]?.url)}
                            alt={venue.name}
                            className="w-full h-full object-cover transition-all duration-[2s] scale-100 group-hover/gallery:scale-105"
                        />

                        {/* Elegant Gradient Scrims */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

                        {/* Minimal Floating Info */}
                        <div className="absolute bottom-12 left-12 z-20 animate-slide-up">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-white text-4xl lg:text-6xl font-heading tracking-tight leading-none capitalize">
                                    {images[activeImage]?.caption || venue.name}
                                </h2>
                                <div className="flex items-center gap-4 text-white/60 text-xs font-bold uppercase tracking-[0.4em]">
                                    <span>Capture {activeImage + 1} / {images.length}</span>
                                    <div className="w-12 h-[1px] bg-white/30" />
                                    <span>{venue.location?.area}</span>
                                </div>
                            </div>
                        </div>

                        {/* Floating Progress Dock */}
                        <div className="absolute bottom-12 right-12 flex items-end gap-3 z-20">
                            {images.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveImage(i)}
                                    className={`transition-all duration-500 rounded-full ${activeImage === i ? 'w-12 h-1 bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]' : 'w-2 h-1 bg-white/20 hover:bg-white/50'}`}
                                />
                            ))}
                        </div>

                        {/* Invisible Navigation Zones */}
                        <button
                            onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)}
                            className="absolute inset-y-0 left-0 w-1/4 z-30 cursor-w-resize group/prev"
                        >
                            <div className="absolute left-12 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center border border-white/10 rounded-full text-white opacity-0 group-hover/prev:opacity-100 transition-all bg-white/5 backdrop-blur-md">
                                <ChevronLeft size={20} />
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveImage(i => (i + 1) % images.length)}
                            className="absolute inset-y-0 right-0 w-1/4 z-30 cursor-e-resize group/next"
                        >
                            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center border border-white/10 rounded-full text-white opacity-0 group-hover/next:opacity-100 transition-all bg-white/5 backdrop-blur-md">
                                <ChevronRight size={20} />
                            </div>
                        </button>

                        {/* Fullscreen Expand */}
                        <button
                            onClick={() => { setLightboxIndex(activeImage); setIsLightboxOpen(true); }}
                            className="absolute top-12 right-12 z-30 w-12 h-12 border border-white/20 rounded-full text-white flex items-center justify-center hover:bg-white hover:text-black transition-all backdrop-blur-sm"
                        >
                            <ExternalLink size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface">
                        <span className="text-9xl opacity-10">🏛️</span>
                    </div>
                )}
            </section>

            {/* Main Content */}
            <section className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Title & Rating */}
                        <div>
                            <h1 className="text-3xl md:text-4xl font-heading text-secondary mb-2">{venue.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted mb-4">
                                <div className="flex items-center gap-1.5"><MapPin size={15} className="text-primary" />{venue.location?.address}, {venue.location?.area}</div>
                                <div className="flex items-center gap-1.5"><Users size={15} className="text-primary" />{venue.capacity?.min} - {venue.capacity?.max} guests</div>
                                {venue.rating > 0 && (
                                    <div className="flex items-center gap-1"><Star size={15} className="text-yellow-500 fill-yellow-500" /><span className="font-semibold text-text">{venue.rating?.toFixed(1)}</span><span>({venue.reviewCount} reviews)</span></div>
                                )}
                            </div>

                            {/* Top Contact Section */}
                            <div className="flex flex-wrap gap-6 p-4 bg-surface rounded-2xl border border-border/50">
                                {venue.contact?.phone && (
                                    <a href={`tel:${venue.contact.phone}`} className="flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary transition-colors">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                            <Phone size={14} className="text-primary" />
                                        </div>
                                        {venue.contact.phone}
                                    </a>
                                )}
                                {venue.contact?.email && (
                                    <a href={`mailto:${venue.contact.email}`} className="flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary transition-colors">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                            <Mail size={14} className="text-primary" />
                                        </div>
                                        {venue.contact.email}
                                    </a>
                                )}
                                {venue.location && (
                                    <button
                                        onClick={() => window.open(venue.location.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.location.address} ${venue.location.city}`)}`, '_blank')}
                                        className="flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                            <MapPin size={14} className="text-primary" />
                                        </div>
                                        View on Maps
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="bg-white rounded-2xl border border-border p-6">
                            <h2 className="text-xl font-heading text-secondary mb-3">About This Venue</h2>
                            <p className="text-text-muted leading-relaxed">{venue.description}</p>

                            {venue.area && (
                                <div className="mt-4 flex items-center gap-6 text-sm">
                                    <div><span className="font-medium text-text">Area:</span> <span className="text-text-muted">{venue.area?.toLocaleString()} sq ft</span></div>
                                    {venue.setting && <div><span className="font-medium text-text">Setting:</span> <span className="text-text-muted capitalize">{venue.setting}</span></div>}
                                </div>
                            )}
                        </div>

                        {/* Seating Configurations */}
                        {venue.seatingCapacity && Object.values(venue.seatingCapacity).some(v => v > 0) && (
                            <div className="bg-white rounded-2xl border border-border p-6">
                                <h2 className="text-xl font-heading text-secondary mb-4">Seating Configurations</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {Object.entries(venue.seatingCapacity).filter(([_, v]) => v > 0).map(([key, val]) => (
                                        <div key={key} className="bg-surface rounded-xl p-4 text-center">
                                            <div className="text-2xl mb-1">{SEATING_LABELS[key]?.icon || '💺'}</div>
                                            <p className="text-xs text-text-muted mb-0.5">{SEATING_LABELS[key]?.label || key}</p>
                                            <p className="text-lg font-heading text-secondary">{val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Amenities */}
                        <div className="bg-white rounded-2xl border border-border p-6">
                            <h2 className="text-xl font-heading text-secondary mb-4">Amenities & Facilities</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {displayedAmenities.map((am, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-surface rounded-xl">
                                        <span className="text-lg flex-shrink-0">{am.icon || '✅'}</span>
                                        <div>
                                            <p className="text-sm font-medium text-text">{am.name}</p>
                                            {am.details && <p className="text-xs text-text-muted">{am.details}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {(venue.amenities || []).length > 8 && (
                                <button onClick={() => setShowAllAmenities(!showAllAmenities)} className="mt-3 text-primary text-sm font-medium flex items-center gap-1 hover:underline">
                                    {showAllAmenities ? <>Show Less <ChevronUp size={14} /></> : <>View All {venue.amenities.length} Amenities <ChevronDown size={14} /></>}
                                </button>
                            )}
                        </div>

                        {/* Photo Gallery Grid - Staggered Magazine Style */}
                        {images.length > 0 && (
                            <div className="space-y-12">
                                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-8 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-primary text-xs font-bold uppercase tracking-[0.3em]">Curated Perspective</span>
                                        <h2 className="text-4xl font-heading text-secondary">The Collection</h2>
                                    </div>
                                    <button
                                        onClick={() => { setLightboxIndex(0); setIsLightboxOpen(true); }}
                                        className="h-12 px-8 rounded-full border border-border text-secondary text-xs font-bold uppercase tracking-widest hover:bg-secondary hover:text-white transition-all flex items-center gap-2"
                                    >
                                        Enter Fullsite View <ExternalLink size={14} />
                                    </button>
                                </div>

                                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                                    {images.map((img, i) => (
                                        <div
                                            key={i}
                                            onClick={() => { setLightboxIndex(i); setIsLightboxOpen(true); }}
                                            className="break-inside-avoid relative group/mag cursor-crosshair overflow-hidden rounded-xl border border-border/50"
                                        >
                                            <img
                                                src={getImageUrl(img.url)}
                                                alt=""
                                                className="w-full h-auto object-cover transition-transform duration-[1.5s] group-hover/mag:scale-105"
                                            />
                                            {/* Minimalist Overlay Label */}
                                            <div className="p-4 bg-white border-t border-border flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-primary font-bold uppercase tracking-widest mb-0.5">Plate 0{i + 1}</span>
                                                    <p className="text-sm font-heading text-secondary">{img.caption || 'Venue Interior'}</p>
                                                </div>
                                                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-muted group-hover/mag:bg-primary group-hover/mag:text-white group-hover/mag:border-primary transition-all">
                                                    <ChevronRight size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pricing Table */}
                        <div className="bg-white rounded-2xl border border-border p-6">
                            <h2 className="text-xl font-heading text-secondary mb-4">Pricing</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-3 px-3 font-semibold text-text-muted">Time Slot</th>
                                            <th className="text-right py-3 px-3 font-semibold text-text-muted">Weekday</th>
                                            <th className="text-right py-3 px-3 font-semibold text-text-muted">Weekend</th>
                                            <th className="text-right py-3 px-3 font-semibold text-text-muted">Holiday</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['morning', 'afternoon', 'evening', 'fullDay'].map(slot => (
                                            <tr key={slot} className="border-b border-border-light hover:bg-surface/50">
                                                <td className="py-3 px-3 font-medium text-text capitalize">{slot === 'fullDay' ? 'Full Day' : slot}</td>
                                                <td className="py-3 px-3 text-right">{formatPrice(venue.pricing?.weekday?.[slot])}</td>
                                                <td className="py-3 px-3 text-right">{formatPrice(venue.pricing?.weekend?.[slot])}</td>
                                                <td className="py-3 px-3 text-right">{formatPrice(venue.pricing?.holiday?.[slot])}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
                                <span>Security Deposit: <b>{formatPrice(venue.pricing?.securityDeposit)}</b></span>
                                <span>Cleaning Fee: <b>{formatPrice(venue.pricing?.cleaningFee)}</b></span>
                                <span>Extra Hour: <b>{formatPrice(venue.pricing?.extraHourCharge)}</b>/hr</span>
                                <span>GST: <b>{venue.pricing?.gstRate || 18}%</b> {venue.pricing?.gstIncluded ? '(Included)' : '(Extra)'}</span>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="bg-white rounded-2xl border border-border p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-heading text-secondary">Location & Access</h2>
                                <button
                                    onClick={() => window.open(venue.location?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.location.address} ${venue.location.city}`)}`, '_blank')}
                                    className="px-6 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-full hover:shadow-lg transition-all flex items-center gap-2"
                                >
                                    <MapPin size={14} /> Get Directions
                                </button>
                            </div>
                            <div className="p-6 bg-surface rounded-2xl border border-border/50">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                        <MapPin size={24} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-secondary">{venue.location?.address}</p>
                                        <p className="text-text-muted">{venue.location?.area}, {venue.location?.city} - {venue.location?.pincode}</p>
                                        <p className="text-primary text-sm font-medium mt-2">Open mapping for precision navigation</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reviews */}
                        <div className="bg-white rounded-2xl border border-border p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-heading text-secondary">Reviews</h2>
                                    <p className="text-xs text-text-muted">{venue.reviewCount || 0} real user reviews</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-xl">
                                        <Star size={18} className="text-green-600 fill-green-600" />
                                        <span className="font-bold text-green-700 text-lg">{venue.rating?.toFixed(1) || '0.0'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Review Button/Form */}
                            {!showReviewForm ? (
                                <button
                                    onClick={() => user ? setShowReviewForm(true) : navigate('/login')}
                                    className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-text-muted hover:border-primary hover:text-primary transition-all flex flex-col items-center gap-1 mb-8"
                                >
                                    <Quote size={20} className="opacity-50" />
                                    <span className="text-sm font-medium">{user ? 'Write a Review' : 'Login to write a review'}</span>
                                </button>
                            ) : (
                                <div className="mb-8 border border-primary/20 bg-primary/5 rounded-2xl p-6 animate-fade-in">
                                    <h3 className="font-heading text-secondary mb-4 flex items-center justify-between">
                                        Rate your experience
                                        <button onClick={() => setShowReviewForm(false)} className="text-text-muted hover:text-secondary"><X size={18} /></button>
                                    </h3>
                                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <p className="text-sm font-medium text-text">Rating:</p>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(num => (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={() => setNewReview({ ...newReview, rating: num })}
                                                        className={`p-1 hover:scale-110 transition-transform ${newReview.rating >= num ? 'text-yellow-500' : 'text-gray-300'}`}
                                                    >
                                                        <Star size={24} fill={newReview.rating >= num ? 'currentColor' : 'none'} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <textarea
                                                value={newReview.comment}
                                                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                                placeholder="Share your experience with this venue..."
                                                className="w-full bg-white border border-border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[100px]"
                                                maxLength={500}
                                            />
                                        </div>
                                        {reviewError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{reviewError}</p>}
                                        {reviewSuccess && <p className="text-xs text-green-600 bg-green-50 p-2 rounded-lg">{reviewSuccess}</p>}
                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowReviewForm(false)}
                                                className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={reviewLoading}
                                                className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
                                            >
                                                {reviewLoading ? 'Submitting...' : 'Submit Review'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="space-y-6">
                                {realReviews.length > 0 ? (
                                    realReviews.slice(0, showAllReviews ? realReviews.length : 5).map((review, i) => (
                                        <div key={review._id || i} className="group border-b border-border last:border-0 pb-6 last:pb-0 animate-fade-in">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center text-primary font-bold border border-border">
                                                        {review.userName?.[0] || 'U'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-secondary text-sm">{review.userName}</h4>
                                                        <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                                                            <span>{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                            <span className="w-1 h-1 bg-border rounded-full" />
                                                            <span className="text-green-600 font-medium">Verified User</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100">
                                                    <Star size={12} className="text-yellow-600 fill-yellow-600" />
                                                    <span className="text-xs font-bold text-yellow-700">{review.rating}</span>
                                                </div>
                                            </div>
                                            <p className="text-text-muted text-sm leading-relaxed mb-3">
                                                {review.comment}
                                            </p>
                                            {review.adminReply && (
                                                <div className="ml-8 mt-4 p-4 bg-surface rounded-2xl border-l-4 border-primary/30 relative">
                                                    <div className="absolute -top-3 left-4 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                                                        Management Reply
                                                    </div>
                                                    <p className="text-sm text-text italic">
                                                        "{review.adminReply}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 bg-surface rounded-2xl border border-dashed border-border mt-4">
                                        <p className="text-text-muted text-sm">No reviews yet. Be the first to share your experience!</p>
                                    </div>
                                )}
                            </div>

                            {realReviews.length > 5 && (
                                <button
                                    onClick={() => setShowAllReviews(!showAllReviews)}
                                    className="w-full mt-6 py-3 text-sm font-bold text-primary hover:text-primary-dark transition-colors flex items-center justify-center gap-2 border border-primary/10 rounded-xl hover:bg-primary/5"
                                >
                                    {showAllReviews ? <>Show Less <ChevronUp size={16} /></> : <>See All {realReviews.length} Reviews <ChevronDown size={16} /></>}
                                </button>
                            )}
                        </div>


                        {/* Policies */}
                        <div className="bg-white rounded-2xl border border-border p-6">
                            <button onClick={() => setShowPolicies(!showPolicies)} className="w-full flex items-center justify-between">
                                <h2 className="text-xl font-heading text-secondary">Policies & Rules</h2>
                                {showPolicies ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
                            </button>
                            {showPolicies && (
                                <div className="mt-4 space-y-4 animate-fade-in">
                                    <div>
                                        <h4 className="text-sm font-semibold text-text mb-2">Booking Requirements</h4>
                                        <ul className="space-y-1 text-sm text-text-muted">
                                            <li>• Minimum advance booking: {venue.policies?.minAdvanceBooking || 7} days</li>
                                            <li>• Maximum advance booking: {venue.policies?.maxAdvanceBooking || 365} days</li>
                                            <li>• Advance payment: 40% of total (capped at ₹99,000 for UPI ease)</li>
                                        </ul>
                                    </div>
                                    {venue.policies?.cancellation?.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-text mb-2">Cancellation Policy</h4>
                                            <ul className="space-y-1 text-sm text-text-muted">
                                                {venue.policies.cancellation.map((c, i) => (
                                                    <li key={i}>• {c.daysBeforeEvent}+ days before: {c.refundPercent}% refund</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {venue.policies?.rules?.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-text mb-2">Venue Rules</h4>
                                            <ul className="space-y-1 text-sm text-text-muted">
                                                {venue.policies.rules.map((rule, i) => <li key={i}>• {rule}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column — Booking Widget */}
                    <div className="lg:col-span-1">
                        <div className="lg:sticky lg:top-[120px] space-y-4 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto custom-scrollbar pr-1 relative z-20">
                            {/* Price Card */}
                            <div className="bg-white rounded-2xl border border-border p-6 shadow-premium">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs text-text-muted uppercase tracking-wider">Starting at</p>
                                        <p className="text-3xl font-heading text-secondary">{formatPrice(eveningPrice)}</p>
                                        <p className="text-xs text-text-muted">per slot + GST</p>
                                    </div>
                                    {venue.rating > 0 && (
                                        <div className="flex flex-col items-center bg-green-50 rounded-xl p-2.5">
                                            <div className="flex items-center gap-0.5">
                                                <Star size={14} className="text-green-600 fill-green-600" />
                                                <span className="font-bold text-green-700">{venue.rating?.toFixed(1)}</span>
                                            </div>
                                            <span className="text-[10px] text-green-600">{venue.reviewCount} reviews</span>
                                        </div>
                                    )}
                                </div>

                                {/* Calendar */}
                                <div className="border-t border-border pt-4 mb-4">
                                    <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-1.5"><Calendar size={15} className="text-primary" /> Check Availability</h3>
                                    {renderCalendar()}
                                </div>

                                {/* Slot Selection */}
                                {selectedDate && slotsData && (
                                    <div className="border-t border-border pt-4 mb-4 animate-fade-in">
                                        <h4 className="text-sm font-semibold text-text mb-2">
                                            {slotsData.dayName}, {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {slotsData.isWeekend && <span className="text-xs text-yellow-600 ml-1">(Weekend pricing)</span>}
                                        </h4>
                                        <div className="space-y-2">
                                            {bookingError && (
                                                <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{bookingError}</p>
                                            )}
                                            {loadingSlots ? (
                                                <div className="text-center py-4 text-text-muted text-sm">Loading slots...</div>
                                            ) : (
                                                (slotsData.slots || []).map(slot => (
                                                    <div key={slot.key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${slot.available ? 'border-green-200 bg-green-50/50 hover:bg-green-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                                                        <div>
                                                            <p className="text-sm font-medium text-text">{slot.name}</p>
                                                            <p className="text-xs text-text-muted">{slot.time}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-heading text-secondary">{formatPrice(slot.price)}</p>
                                                            {slot.available ? (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleBookNow(selectedDate, slot.key); }}
                                                                    className="text-xs bg-primary text-white px-3 py-1 rounded-full mt-1 hover:bg-primary-dark transition-colors disabled:opacity-50"
                                                                    disabled={loadingSlots}
                                                                >
                                                                    {loadingSlots ? 'Locking...' : 'Book Now'}
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-red-500">{slot.blocked ? 'Blocked' : slot.locked ? 'Locked' : 'Booked'}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* CTA */}
                                {!selectedDate && (
                                    <p className="text-center text-sm text-text-muted">Select a date above to see available slots</p>
                                )}
                            </div>



                            {/* Quick Info */}
                            <div className="bg-primary/5 rounded-2xl border border-primary/10 p-5">
                                <div className="flex items-start gap-2 text-sm text-primary">
                                    <Info size={16} className="flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium mb-1">Booking Lock</p>
                                        <p className="text-xs text-text-muted">Once you start the booking process, the slot is temporarily locked for 15 minutes to allow you to complete payment.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FULLSCREEN LIGHTBOX GALLERY */}
            {isLightboxOpen && (
                <div className="overlay-premium !bg-black/95 z-[999999] flex flex-col backdrop-blur-md">
                    {/* Header */}
                    <div className="p-6 flex items-center justify-between z-50">
                        <div className="flex flex-col">
                            <h2 className="text-white text-2xl font-heading mb-1">{venue.name} Gallery</h2>
                            <p className="text-white/60 text-xs tracking-widest uppercase">{lightboxIndex + 1} / {images.length}</p>
                        </div>
                        <button
                            onClick={() => setIsLightboxOpen(false)}
                            className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:rotate-90 border border-white/20"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                        {/* Navigation */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={() => setLightboxIndex(i => (i - 1 + images.length) % images.length)}
                                    className="absolute left-8 z-50 p-6 bg-white/5 hover:bg-white/20 text-white rounded-full transition-all group/nav"
                                >
                                    <ChevronLeft size={48} className="group-hover/nav:-translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={() => setLightboxIndex(i => (i + 1) % images.length)}
                                    className="absolute right-8 z-50 p-6 bg-white/5 hover:bg-white/20 text-white rounded-full transition-all group/nav"
                                >
                                    <ChevronRight size={48} className="group-hover/nav:translate-x-1 transition-transform" />
                                </button>
                            </>
                        )}

                        {/* Image Layer */}
                        <div className="relative w-full h-full p-4 lg:p-20 flex flex-col items-center justify-center">
                            <div className="relative max-w-7xl max-h-full aspect-video lg:aspect-auto flex items-center justify-center animate-scale-up">
                                <img
                                    src={getImageUrl(images[lightboxIndex]?.url)}
                                    alt=""
                                    className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/10 transition-all duration-500"
                                />

                                {/* Image Caption Overlay */}
                                <div className="absolute -bottom-12 left-0 right-0 text-center">
                                    <p className="text-white font-medium text-lg lg:text-xl animate-slide-up">
                                        {images[lightboxIndex]?.caption || `Venue View — ${venue.name}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Thumbnail Strip */}
                    <div className="p-8 bg-black/40 backdrop-blur-md border-t border-white/5">
                        <div className="container mx-auto flex gap-4 overflow-x-auto scrollbar-hide py-2 px-4 justify-center">
                            {images.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setLightboxIndex(i)}
                                    className={`relative flex-shrink-0 w-24 h-16 lg:w-32 lg:h-20 rounded-xl overflow-hidden transition-all duration-500 ${lightboxIndex === i ? 'ring-2 ring-primary ring-offset-4 ring-offset-black scale-110 shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]' : 'opacity-40 hover:opacity-80'}`}
                                >
                                    <img src={getImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                                    {lightboxIndex === i && <div className="absolute inset-0 bg-primary/20" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
