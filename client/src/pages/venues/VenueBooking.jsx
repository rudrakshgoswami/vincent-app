import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Check, Calendar, Users, Utensils, Package,
    CreditCard, PartyPopper, Clock, Star, MapPin, Phone, Mail, AlertCircle,
    ChevronDown, ChevronUp, Plus, Minus, Info, Shield, Sparkles, X, Loader2,
    PanelRightOpen, PanelRightClose, ChevronLeft, ChevronRight, CheckCircle, Zap
} from 'lucide-react';
import {
    fetchVenue, fetchCateringPackages, fetchCateringExtras,
    createVenueBookingOrder, verifyVenueBookingPayment, extendVenueBookingLock, getRazorpayKey, fetchCateringPackageById, getImageUrl, cancelVenueBooking,
    releaseVenueSlot
} from '../../api';
import { initiatePayment } from '../../utils/paymentHandler';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent, SOCKET_EVENTS } from '../../context/SocketContext';
import CounterVarietySlider from '../../components/CounterVarietySlider';
import FlavorCarousel from '../../components/FlavorCarousel';

const fmt = (p) => '₹' + (p || 0).toLocaleString('en-IN');
const STEPS = ['Event Details', 'Catering', 'Contact', 'Summary', 'Payment'];
const SLOT_LABELS = { morning: '6:00 AM - 12:00 PM', afternoon: '12:00 PM - 6:00 PM', evening: '6:00 PM - 12:00 AM', fullDay: '6:00 AM - 12:00 AM' };
const EVENT_TYPES = [
    { value: 'wedding_reception', label: 'Wedding / Reception', icon: '💒' },
    { value: 'birthday_party', label: 'Birthday Party', icon: '🎂' },
    { value: 'anniversary', label: 'Anniversary', icon: '💍' },
    { value: 'corporate_event', label: 'Corporate Event', icon: '💼' },
    { value: 'conference', label: 'Conference / Seminar', icon: '📊' },
    { value: 'engagement', label: 'Engagement', icon: '💐' },
    { value: 'baby_shower', label: 'Baby Shower', icon: '👶' },
    { value: 'other', label: 'Other', icon: '🎉' }
];

export default function VenueBooking() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const location = useLocation();

    const date = searchParams.get('date');
    const slot = searchParams.get('slot');

    const SESSION_KEY = id && date && slot ? `venue_booking_${id}_${date}_${slot}` : null;
    const initialSavedData = useMemo(() => {
        if (!SESSION_KEY) return null;
        try {
            const data = sessionStorage.getItem(SESSION_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    }, [SESSION_KEY]);

    const [venue, setVenue] = useState(null);
    const [step, setStep] = useState(initialSavedData?.step ?? 0);
    const [loading, setLoading] = useState(true);

    // Step 1: Event Details
    const [eventType, setEventType] = useState(initialSavedData?.eventType ?? 'wedding_reception');
    const [eventTypeOther, setEventTypeOther] = useState(initialSavedData?.eventTypeOther ?? '');
    const [guestCount, setGuestCount] = useState(initialSavedData?.guestCount ?? 200);
    const [specialRequirements, setSpecialRequirements] = useState(initialSavedData?.specialRequirements ?? '');

    // Step 2: Catering
    const [hasCatering, setHasCatering] = useState(initialSavedData?.hasCatering ?? true);
    const [cateringPackages, setCateringPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(initialSavedData?.selectedPackage ?? null);
    const [selectedExtras, setSelectedExtras] = useState(initialSavedData?.selectedExtras ?? []);
    const [cateringExtras, setCateringExtras] = useState([]);
    const [selectedBeverage, setSelectedBeverage] = useState(initialSavedData?.selectedBeverage ?? null);

    // Dynamic Menu States
    const [menuData, setMenuData] = useState(null);
    const [loadingMenu, setLoadingMenu] = useState(false);
    const [selectedItems, setSelectedItems] = useState(initialSavedData?.selectedItems ?? {});
    const [selectedCounters, setSelectedCounters] = useState(initialSavedData?.selectedCounters ?? []);
    const [selectedVariants, setSelectedVariants] = useState(initialSavedData?.selectedVariants ?? {}); // { itemId: [variantName1, variantName2] }
    const [detailedCounter, setDetailedCounter] = useState(null);

    // Step 4: Contact
    const [contact, setContact] = useState(initialSavedData?.contact ?? { fullName: user?.name || '', email: user?.email || '', phone: user?.phone || '', alternatePhone: '', address: '' });
    const [specialInstructions, setSpecialInstructions] = useState(initialSavedData?.specialInstructions ?? '');
    const [isJainMode, setIsJainMode] = useState(initialSavedData?.isJainMode ?? false);

    // Step 6: Payment
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const [bookingResult, setBookingResult] = useState(null);
    const [lockTimer, setLockTimer] = useState(0);
    const [lockExpiry, setLockExpiry] = useState(null);
    const [lastOrderData, setLastOrderData] = useState(null);
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);

    useEffect(() => {
        if (!SESSION_KEY || !venue) return; // Wait until init load is somewhat done
        if (bookingResult || step === 5) {
            sessionStorage.removeItem(SESSION_KEY);
            return;
        }
        const dataToSave = {
            step, eventType, eventTypeOther, guestCount, specialRequirements,
            hasCatering, selectedPackage, selectedExtras, selectedBeverage,
            selectedItems, selectedCounters, selectedVariants,
            contact, specialInstructions, isJainMode
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(dataToSave));
    }, [
        SESSION_KEY, venue, step, eventType, eventTypeOther, guestCount, specialRequirements,
        hasCatering, selectedPackage, selectedExtras, selectedBeverage, selectedItems,
        selectedCounters, selectedVariants, contact, specialInstructions, bookingResult, isJainMode
    ]);

    useEffect(() => { loadData(); }, [id]);
    useEffect(() => {
        if (location.state?.lockExpiresAt) {
            setLockExpiry(location.state.lockExpiresAt);
        }
    }, [location.state]);

    useEffect(() => { if (user && !initialSavedData?.contact?.fullName) setContact(c => ({ ...c, fullName: c.fullName || user.name || '', email: c.email || user.email || '', phone: c.phone || user.phone || '' })); }, [user]);

    const toggleVariantSelection = (itemId, variantName, limit) => {
        setSelectedVariants(prev => {
            const current = prev[itemId] || [];
            if (current.includes(variantName)) {
                return { ...prev, [itemId]: current.filter(name => name !== variantName) };
            } else {
                if (current.length < limit) {
                    return { ...prev, [itemId]: [...current, variantName] };
                }
                if (limit === 1) {
                    return { ...prev, [itemId]: [variantName] };
                }
                return prev;
            }
        });
    };

    // Lock timer countdown
    useEffect(() => {
        if (!lockExpiry) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((new Date(lockExpiry) - Date.now()) / 1000));
            setLockTimer(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [lockExpiry]);

    useEffect(() => {
        if (lockTimer === 0 && lockExpiry && !bookingResult) {
            setPaymentError('Your temporary slot lock has expired. Please refresh or try re-locking the slot.');
        }
    }, [lockTimer, lockExpiry, bookingResult]);

    // Cleanup: Release lock on unmount if not committed
    useEffect(() => {
        const handleUnload = () => {
            if (bookingResult) return; // Already successful

            if (lastOrderData?.bookingId) {
                // We have a formal booking order, cancel it
                cancelVenueBooking(lastOrderData.bookingId, {
                    cancellationReason: 'User navigated away or closed tab during payment'
                }).catch(() => { });
            } else if (date && slot) {
                // Still in pre-booking phase, release the pre-lock
                releaseVenueSlot({ venueId: id, date, timeSlot: slot }).catch(() => { });
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            handleUnload();
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [id, date, slot, bookingResult, lastOrderData]);

    // Live Availability Awareness
    useSocketEvent(SOCKET_EVENTS.VENUE_SLOT_LOCKED, (data) => {
        if (data.venueId === id && data.timeSlot === slot && new Date(data.date).toISOString().split('T')[0] === date) {
            if (!lockExpiry) {
                setPaymentError('Alert: Someone else just started booking this slot. You might be unable to proceed.');
            }
        }
    });

    const getEffectiveLimit = (cat) => {
        if (!selectedPackage || !cat) return 0;
        const pkgLimit = cat.packageLimits?.find(l => (l.packageId?._id || l.packageId) === (selectedPackage._id || selectedPackage));
        return pkgLimit ? pkgLimit.limit : cat.selectionLimit;
    };

    useSocketEvent(SOCKET_EVENTS.VENUE_SLOT_CONFIRMED, (data) => {
        if (data.venueId === id && data.timeSlot === slot && new Date(data.date).toISOString().split('T')[0] === date) {
            setPaymentError('This slot was just booked by another user. Please choose another date or slot.');
            setStep(0);
        }
    });

    useSocketEvent(SOCKET_EVENTS.VENUE_SLOT_RELEASED, (data) => {
        if (data.venueId === id && data.timeSlot === slot && new Date(data.date).toISOString().split('T')[0] === date) {
            if (paymentError && !lockExpiry) {
                setPaymentError(null);
            }
        }
    });

    const handleSelectPackage = async (pkg) => {
        setSelectedPackage(pkg);
        if (!pkg) { setMenuData(null); return; }
        setLoadingMenu(true);
        try {
            const res = await fetchCateringPackageById(pkg._id);
            setMenuData({ categories: res.categories || [], items: res.foodItems || [], counters: res.liveCounters || [] });
            const initSel = {};
            (res.categories || []).forEach(cat => { initSel[cat._id] = []; });
            setSelectedItems(initSel);
            setSelectedVariants({});
            setSelectedCounters((res.liveCounters || []).filter(c => !c.isAddOn).map(c => c._id));
        } catch (err) { console.error(err); } finally { setLoadingMenu(false); }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [venueRes, pkgsRes, extrasRes] = await Promise.all([
                fetchVenue(id), fetchCateringPackages(), fetchCateringExtras()
            ]);
            setVenue(venueRes);
            const pkgsList = pkgsRes?.packages || pkgsRes?.data || (Array.isArray(pkgsRes) ? pkgsRes : []);
            const extrasList = extrasRes?.extras || extrasRes?.data || (Array.isArray(extrasRes) ? extrasRes : []);
            setCateringPackages(pkgsList);
            setCateringExtras(extrasList);

            if (initialSavedData?.selectedPackage) {
                const pkgIdToFetch = initialSavedData.selectedPackage._id || initialSavedData.selectedPackage;
                setLoadingMenu(true);
                try {
                    const res = await fetchCateringPackageById(pkgIdToFetch);
                    setMenuData({ categories: res.categories || [], items: res.foodItems || [], counters: res.liveCounters || [] });
                } catch (e) {
                    console.error("Failed to load saved package menu", e);
                } finally {
                    setLoadingMenu(false);
                }
            } else if (pkgsList?.length > 0) {
                const initPkg = pkgsList.find(p => p.isPopular) || pkgsList[0];
                handleSelectPackage(initPkg);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const isCateringValid = useMemo(() => {
        if (!hasCatering) return true;
        if (!selectedPackage || !menuData) return false;
        
        for (const cat of menuData.categories) {
            if (cat.isMandatory) {
                const limit = getEffectiveLimit(cat);
                const count = (selectedItems[cat._id] || []).length;
                if (count !== limit) return false;
            }
        }

        for (const itemId of Object.values(selectedItems).flat()) {
            const item = menuData.items.find(i => i._id === itemId);
            if (item?.hasVariants) {
                const limitObj = item.variantPackageLimits?.find(l => (l.packageId?._id || l.packageId || '').toString() === selectedPackage?._id.toString());
                const limit = limitObj?.limit || 1;
                const vCount = (selectedVariants[itemId] || []).length;
                if (vCount === 0 || vCount > limit) return false;
            }
        }
        return true;
    }, [hasCatering, selectedPackage, menuData, selectedItems, selectedVariants]);

    // Price Calculations
    const isWeekend = date ? [0, 6].includes(new Date(date).getDay()) : false;
    const priceKey = isWeekend ? 'weekend' : 'weekday';
    const venueBasePrice = venue?.pricing?.[priceKey]?.[slot] || 0;
    const venueGstRate = venue?.pricing?.gstRate || 18;
    const venueGstAmount = Math.round(venueBasePrice * venueGstRate / 100);
    const venueTotal = venueBasePrice + venueGstAmount;
    const securityDeposit = venue?.pricing?.securityDeposit || 10000;

    const cateringBase = hasCatering && selectedPackage ? selectedPackage.pricePerPlate * guestCount : 0;

    let counterAddonsTotal = 0;
    if (hasCatering && menuData?.counters) {
        menuData.counters.forEach(c => {
            if (c.isAddOn && selectedCounters.includes(c._id)) {
                counterAddonsTotal += ((c.addOnPricePerPlate || 0) * guestCount);
            }
        });
    }

    const extrasTotal = selectedExtras.reduce((sum, e) => {
        if (e.pricingType === 'per_plate') return sum + ((e.price || 0) * guestCount);
        if (e.pricingType === 'flat') return sum + (e.price || 0);
        return sum + (e.price || e.pricePerPlate || e.pricePerPerson || e.fixedPrice || 0) * (e.qty || guestCount);
    }, 0) + counterAddonsTotal;

    const beverageTotal = selectedBeverage ? (selectedBeverage.pricePerPerson || 0) * guestCount : 0;
    const cateringSubtotal = cateringBase + extrasTotal + beverageTotal;
    const cateringGstRate = selectedPackage?.gstRate || 5;
    const cateringGstAmount = Math.round(cateringSubtotal * cateringGstRate / 100);
    const cateringTotal = cateringSubtotal + cateringGstAmount;

    const UPI_LIMIT_SAFETY_CAP = 99000;
    const TOTAL_THRESHOLD = 250000;
    const grandTotal = venueTotal + (hasCatering ? cateringTotal : 0) + securityDeposit;

    let calculatedAdvance = 0;
    let calculatedPercent = 40;

    if (grandTotal <= TOTAL_THRESHOLD) {
        calculatedAdvance = Math.round(grandTotal * 0.4);
        calculatedPercent = 40;
    } else {
        calculatedAdvance = UPI_LIMIT_SAFETY_CAP;
        calculatedPercent = Number(((calculatedAdvance / grandTotal) * 100).toFixed(1));
    }

    const advanceAmount = calculatedAdvance;
    const advancePercent = calculatedPercent;
    const balanceAmount = grandTotal - advanceAmount;

    const handlePayment = async () => {
        setPaymentLoading(true);
        setPaymentError(null);
        try {
            const payload = {
                venueId: id, eventDate: date, timeSlot: slot, guestCount, eventType,
                eventTypeOther: eventType === 'other' ? eventTypeOther : undefined,
                specialRequirements, contactInfo: contact, specialInstructions,
                hasCatering, catering: hasCatering ? {
                    package: selectedPackage?._id, packageName: selectedPackage?.name,
                    pricePerPlate: selectedPackage?.pricePerPlate || 0, guestCount,
                    baseTotal: cateringBase,
                    extraItems: selectedExtras.map(e => ({ itemId: e._id, name: e.name, pricePerPlate: e.price || e.pricePerPlate || e.fixedPrice || 0, quantity: e.qty, total: (e.price || e.pricePerPlate || e.fixedPrice || 0) * (e.qty || guestCount) })),
                    extraItemsTotal: extrasTotal,
                    beveragePackage: selectedBeverage ? { name: selectedBeverage.name, pricePerPerson: selectedBeverage.pricePerPerson, total: beverageTotal } : undefined,
                    subtotal: cateringSubtotal, gstRate: cateringGstRate, gstAmount: cateringGstAmount, total: cateringTotal
                } : undefined,
                venueBasePrice, venueGstRate, venueGstAmount, venueTotal, securityDeposit,
                grandTotal, advancePercent, advanceAmount, balanceAmount
            };
            const orderData = await createVenueBookingOrder(payload);
            setLastOrderData(orderData);
            setLockExpiry(orderData.lockExpiresAt);
            await initiatePayment({
                razorpayOrderId: orderData.razorpayOrderId,
                amount: orderData.amount,
                user: { name: contact.fullName, email: contact.email, phone: contact.phone },
                description: `Venue Booking Deposit - ${venue?.name}`,
                onSuccess: async (response) => {
                    setPaymentLoading(true);
                    try {
                        const result = await verifyVenueBookingPayment({
                            bookingId: orderData.bookingId,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        });
                        setBookingResult(result.booking || result);
                        setStep(5);
                    } catch (err) {
                        setPaymentError('Verification failed: ' + err.message);
                    } finally {
                        setPaymentLoading(false);
                    }
                },
                onError: (err) => {
                    setPaymentError(err.message || 'Payment failed or cancelled');
                    setPaymentLoading(false);
                },
                onDismiss: async () => {
                    setPaymentLoading(false);
                    setPaymentError('Payment was cancelled or the window was closed. Please try again.');
                    if (orderData?.bookingId) {
                        try { await cancelVenueBooking(orderData.bookingId, 'Manual cancellation'); } catch (e) { }
                    }
                }
            });
        } catch (err) {
            setPaymentError(err.message || 'Failed to initiate booking');
            setPaymentLoading(false);
        }
    };

    const retryLastPayment = async () => {
        if (!lastOrderData) { handlePayment(); return; }
        setPaymentLoading(true);
        setPaymentError(null);
        try {
            await initiatePayment({
                razorpayOrderId: lastOrderData.razorpayOrderId,
                amount: lastOrderData.amount,
                user: { name: contact.fullName, email: contact.email, phone: contact.phone },
                description: `Retry Payment - ${venue?.name}`,
                onSuccess: async (response) => {
                    setPaymentLoading(true);
                    try {
                        const result = await verifyVenueBookingPayment({
                            bookingId: lastOrderData.bookingId,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        });
                        setBookingResult(result.booking || result);
                        setStep(5);
                    } catch (err) {
                        setPaymentError('Verification failed: ' + err.message);
                    } finally {
                        setPaymentLoading(false);
                    }
                },
                onError: (err) => {
                    setPaymentError(err.message || 'Payment failed');
                    setPaymentLoading(false);
                },
                onDismiss: async () => {
                    setPaymentLoading(false);
                    setPaymentError('Payment was cancelled.');
                    if (lastOrderData?.bookingId) {
                        try { await cancelVenueBooking(lastOrderData.bookingId, 'Manual cancellation retry'); } catch (e) { }
                    }
                }
            });
        } catch (err) {
            setPaymentError(err.message);
            setPaymentLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="flex flex-col items-center gap-3"><Loader2 className="w-10 h-10 text-primary animate-spin" /><p className="text-text-muted text-sm">Loading booking...</p></div>
        </div>
    );

    if (!venue || !date || !slot) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center"><p className="text-4xl mb-3">⚠️</p><h2 className="text-xl font-heading text-secondary mb-2">Missing Booking Details</h2><button onClick={() => navigate('/venues')} className="text-primary hover:underline">← Back to Venues</button></div>
        </div>
    );

    if (step === 5 && bookingResult) return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
            <div className="bg-white rounded-3xl border border-border shadow-premium max-w-lg w-full p-8 text-center animate-scale-up">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><PartyPopper className="text-green-600" size={36} /></div>
                <h1 className="text-3xl font-heading text-secondary mb-2">Booking Confirmed!</h1>
                <p className="text-text-muted mb-6">Your venue has been booked successfully.</p>
                <div className="bg-surface rounded-2xl p-5 text-left space-y-3 mb-6">
                    <div className="flex justify-between text-sm"><span className="text-text-muted">Booking Ref</span><span className="font-semibold text-primary">{bookingResult.bookingRef}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-muted">Venue</span><span className="font-medium">{bookingResult.venueName || venue?.name}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-muted">Date</span><span className="font-medium">{new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-muted">Slot</span><span className="font-medium capitalize">{slot === 'fullDay' ? 'Full Day' : slot}</span></div>
                    <div className="border-t border-border pt-2 flex justify-between text-sm"><span className="text-text-muted">Grand Total</span><span className="font-heading text-lg text-secondary">{fmt(grandTotal)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-muted">Advance Paid</span><span className="font-semibold text-green-600">{fmt(advanceAmount)}</span></div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/venues')} className="flex-1 py-3 border border-border rounded-xl text-sm font-medium hover:bg-surface transition-colors">Browse Venues</button>
                    <button onClick={() => navigate('/my-venue-bookings')} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">My Bookings</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            <div className="sticky top-[72px] z-30 w-full bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button onClick={() => step === 0 ? navigate(`/venues/${id}`) : setStep(s => s - 1)} className="flex items-center gap-1.5 text-text-muted hover:text-primary transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest group">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-border flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-all"><ArrowLeft size={14} /></div>
                                <span className="hidden xs:inline">Prev</span>
                            </button>
                            <div className="h-6 w-px bg-border hidden sm:block" />
                            <div className="flex flex-col justify-center">
                                <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] leading-none mb-1 opacity-60">Step 0{step + 1}</p>
                                <h3 className="text-sm font-heading text-secondary leading-none truncate max-w-[120px] sm:max-w-none">{STEPS[step]}</h3>
                            </div>
                        </div>
                        <div className="hidden lg:flex items-center gap-3">
                            {STEPS.map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500 ${i === step ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : i < step ? 'text-green-600' : 'text-text-muted/40'}`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${i === step ? 'bg-primary text-white' : i < step ? 'bg-green-500 text-white' : 'bg-surface border border-border'}`}>{i < step ? <Check size={12} /> : i + 1}</div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{s}</span>
                                    </div>
                                    {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
                                </div>
                            ))}
                        </div>
                        <div className="flex lg:hidden items-center gap-1.5">
                            {STEPS.map((s, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-border'}`} />)}
                        </div>
                        <div className="hidden md:flex items-center gap-4">
                            {lockExpiry && lockTimer > 0 && (
                                <div className="flex items-center gap-2 bg-accent/5 px-3 py-1.5 rounded-full border border-accent/10">
                                    <Clock size={12} className="text-accent animate-pulse" />
                                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{Math.floor(lockTimer / 60)}:{String(lockTimer % 60).padStart(2, '0')}</span>
                                </div>
                            )}
                            <div className="text-[10px] font-black uppercase tracking-widest text-text-muted/40">ID: {id?.slice(-6).toUpperCase()}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-10 relative min-h-screen">
                <div className="absolute top-20 -left-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-blob pointer-events-none" />
                <div className="absolute bottom-20 -right-20 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[150px] animate-blob delay-500 pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row gap-0 lg:gap-12 items-start relative z-10">
                    <div className={`transition-all duration-700 ease-in-out flex-1 ${isOverviewOpen ? 'lg:w-[68%] xl:w-[78%]' : 'w-full max-w-[1700px] mx-auto'}`}>
                        {!isOverviewOpen && (
                            <button onClick={() => setIsOverviewOpen(true)} className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 bg-secondary text-white py-6 px-1.5 rounded-l-xl shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-50 group items-center flex-col gap-4 border-l border-y border-white/10 hover:pr-3 transition-all duration-500">
                                <div className="bg-primary p-2 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-500"><PanelRightOpen size={20} className="text-white" /></div>
                                <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold uppercase tracking-[0.4em] text-white/50 group-hover:text-primary transition-colors duration-500">Booking Summary</span>
                            </button>
                        )}

                        {step === 0 && (
                            <div className="bg-white rounded-2xl border border-border p-5 animate-fade-in text-secondary">
                                <h2 className="text-xl font-heading text-secondary mb-4">Event Details</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">Event Type</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                                            {EVENT_TYPES.map(et => (
                                                <button key={et.value} onClick={() => setEventType(et.value)} className={`p-2 rounded-lg border text-center transition-all text-xs ${eventType === et.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'}`}>
                                                    <span className="text-lg block mb-0.5">{et.icon}</span>{et.label}
                                                </button>
                                            ))}
                                        </div>
                                        {eventType === 'other' && <input type="text" placeholder="Specify event type" value={eventTypeOther} onChange={e => setEventTypeOther(e.target.value)} className="mt-2 w-full px-4 py-2.5 rounded-lg border border-border text-sm outline-none" />}
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">Expected Guests: <span className="text-primary">{guestCount}</span></label>
                                        <input type="range" min={venue.capacity?.min || 50} max={venue.capacity?.max || 1000} step={10} value={guestCount} onChange={e => setGuestCount(Number(e.target.value))} className="w-full accent-primary" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">Special Requirements</label>
                                        <textarea rows={3} value={specialRequirements} onChange={e => setSpecialRequirements(e.target.value)} placeholder="Any specific requirements..." className="w-full px-4 py-2.5 rounded-lg border border-border text-sm resize-none" />
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setStep(1)} 
                                    className="mt-6 w-full bg-primary text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 group transition-all hover:shadow-xl hover:scale-[1.01]"
                                >
                                    Continue to Catering 
                                    <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-6 animate-fade-in text-secondary">
                                <div className="bg-white rounded-2xl border border-border overflow-hidden">
                                    <div className="bg-primary/5 p-6 border-b border-border flex justify-between items-center text-secondary">
                                        <div><h2 className="text-2xl font-heading">Flavor & Feast</h2><p className="text-xs text-text-muted">Select catering for your celebration</p></div>
                                        <label className="flex items-center gap-3 cursor-pointer bg-white px-4 py-2 rounded-2xl shadow-sm border border-border">
                                            <span className="text-xs font-bold uppercase tracking-wider">Include Catering</span>
                                            <div className={`w-12 h-6 rounded-full transition-all relative ${hasCatering ? 'bg-primary' : 'bg-gray-200'}`} onClick={() => setHasCatering(!hasCatering)}>
                                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-md ${hasCatering ? 'left-7' : 'left-1'}`} />
                                            </div>
                                        </label>
                                    </div>
                                    {hasCatering && (
                                        <div className="p-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {cateringPackages.map(pkg => (
                                                    <div key={pkg._id} onClick={() => handleSelectPackage(pkg)} className={`relative rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${selectedPackage?._id === pkg._id ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' : 'border-border bg-white hover:border-primary/20'}`}>
                                                        <div className="h-32 relative overflow-hidden">
                                                            <img src={pkg.thumbnail ? getImageUrl(pkg.thumbnail) : `https://picsum.photos/seed/${encodeURIComponent(pkg.name)}/400/300`} alt={pkg.name} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                                        </div>
                                                        <div className="p-6 pt-4">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-heading text-xl">{pkg.name}</h4>
                                                                <div className="text-right">
                                                                    <p className="text-xl font-heading text-primary leading-none">{fmt(pkg.pricePerPlate)}</p>
                                                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Plate</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-text-muted line-clamp-2">{pkg.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {hasCatering && selectedPackage && (
                                    <div className="space-y-8">
                                        <div className="bg-white rounded-3xl border border-border overflow-hidden text-secondary">
                                            <div className="bg-secondary p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px] pointer-events-none" />
                                                <div className="relative z-10">
                                                    <h3 className="text-3xl font-heading mb-1.5">Customize Your {selectedPackage?.name} Menu</h3>
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
                                                    <p className="hidden md:block text-[13px] text-white/60 font-medium">
                                                        Enable to only show dishes prepared without onion and garlic.
                                                    </p>
                                                    <label className="flex items-center gap-3 cursor-pointer bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full shadow-sm border border-white/20 transition-all select-none shrink-0">
                                                        <span className={`text-sm tracking-widest uppercase font-black transition-colors ${isJainMode ? 'text-green-400' : 'text-[#cca776]'}`}>🌿 Jain Mode</span>
                                                        <div className={`w-12 h-6 rounded-full transition-all relative shadow-inner ${isJainMode ? 'bg-green-500' : 'bg-black/30'}`} onClick={() => {
                                                            const newVal = !isJainMode;
                                                            setIsJainMode(newVal);
                                                            if (newVal) {
                                                                if (!specialInstructions.includes("Jain Preparation (No Onion, No Garlic)")) {
                                                                    setSpecialInstructions(prev => (prev ? prev + "\n" : "") + "Jain Preparation (No Onion, No Garlic)");
                                                                }
                                                            } else {
                                                                setSpecialInstructions(prev => prev.replace(/\n?Jain Preparation \(No Onion, No Garlic\)/g, ""));
                                                            }
                                                        }}>
                                                            <div className={`w-4 h-4 rounded-full absolute top-1 transition-all shadow-md ${isJainMode ? 'bg-white left-7' : 'bg-gray-300 left-1'}`} />
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="p-8">
                                                {loadingMenu ? <div className="py-20 text-center animate-pulse">Designing your menu...</div> : menuData && (
                                                    <div className="space-y-12">
                                                        {menuData.categories.map(cat => {
                                                            const items = menuData.items
                                                                .filter(i => (i.categoryId?._id || i.categoryId) === cat._id)
                                                                .filter(i => isJainMode ? (i.isJain !== false) : true);
                                                            const limit = getEffectiveLimit(cat);
                                                            const selected = (selectedItems[cat._id] || []).length;
                                                            return (
                                                                <div key={cat._id}>
                                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-100 pb-4 mb-6 gap-4">
                                                                        <div>
                                                                            <h4 className="text-[1.35rem] font-heading text-secondary leading-none mb-2">{cat.name}</h4>
                                                                            <p className="text-[10px] text-[#9A9A9A] font-bold uppercase tracking-[0.2em]">
                                                                                Select your preferred {cat.name.toLowerCase()} for the event
                                                                            </p>
                                                                        </div>
                                                                        <div className="px-4 py-2 bg-[#F9F6F0] text-[#cca776] rounded-full text-[10px] uppercase font-black tracking-widest border border-[#cca776]/20 shadow-sm leading-none shrink-0">
                                                                            Pick {limit} ({selected}/{limit})
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                                                                        {items.length === 0 ? (
                                                                            <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No Jain options available in this category</p>
                                                                            </div>
                                                                        ) : items.map(item => {
                                                                            const isSel = (selectedItems[cat._id] || []).includes(item._id);
                                                                            const isMax = !isSel && selected >= limit;
                                                                            return (
                                                                                <div key={item._id} className="group relative flex flex-col h-full">
                                                                                    <div
                                                                                        onClick={() => !isMax && setSelectedItems(prev => {
                                                                                            const curr = prev[cat._id] || [];
                                                                                            if (curr.includes(item._id)) return { ...prev, [cat._id]: curr.filter(id => id !== item._id) };
                                                                                            return { ...prev, [cat._id]: [...curr, item._id] };
                                                                                        })}
                                                                                        className={`flex-1 flex flex-col rounded-[1.25rem] cursor-pointer transition-all duration-300 ease-out overflow-hidden border ${
                                                                                            isSel 
                                                                                                ? 'border-[#cca776] ring-1 ring-[#cca776] bg-white shadow-xl scale-[1.02] z-10' 
                                                                                                : isMax 
                                                                                                    ? 'border-border/50 opacity-50 grayscale-[0.5] cursor-not-allowed bg-gray-50' 
                                                                                                    : 'border-border bg-white hover:border-[#cca776]/40 hover:shadow-lg'
                                                                                        }`}
                                                                                    >
                                                                                        {/* Top Image Section */}
                                                                                        <div className="w-full aspect-[4/3] md:aspect-[16/10] relative overflow-hidden bg-gray-50">
                                                                                            {item.image ? (
                                                                                                <img 
                                                                                                    src={getImageUrl(item.image)} 
                                                                                                    alt={item.name} 
                                                                                                    className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isSel ? 'scale-105' : 'group-hover:scale-105'}`} 
                                                                                                />
                                                                                            ) : (
                                                                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-100">
                                                                                                    <Utensils size={32} className="opacity-20 mb-2" />
                                                                                                </div>
                                                                                            )}
                                                                                            
                                                                                            {/* Dietary Badge (Moved below) */}
                                                                                            {/* Selection Check Badge */}
                                                                                            <div className={`absolute top-2.5 right-2.5 flex items-center justify-center w-[26px] h-[26px] bg-[#cca776] text-white rounded-full shadow-lg transition-all transform duration-300 ${isSel ? 'scale-100 opacity-100 z-20' : 'scale-50 opacity-0'}`}>
                                                                                                <Check size={14} strokeWidth={3.5} />
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Bottom Text Content */}
                                                                                        <div className="px-5 pt-4 pb-3 flex-1 flex flex-col bg-white">
                                                                                            <div className="mb-4 flex flex-col gap-1.5">
                                                                                                <h3 className={`font-heading text-[17px] leading-tight transition-colors duration-300 ${isSel ? 'text-secondary' : 'text-secondary group-hover:text-secondary/80'}`}>
                                                                                                    {item.name}
                                                                                                </h3>
                                                                                                {!isJainMode && item.isJain !== false && (
                                                                                                    <span className="text-[9px] text-[#28a745] font-black tracking-widest uppercase flex items-center gap-1">
                                                                                                        🌿 JAIN AVAILABLE
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                            
                                                                                            {/* Footer */}
                                                                                            <div className="mt-auto border-t border-gray-100/80 pt-3 flex items-center justify-between">
                                                                                                <span className="text-[9px] font-black tracking-[0.2em] text-gray-400 uppercase">Master Chef Pick</span>
                                                                                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isSel ? 'text-[#cca776]' : 'text-[#cca776] group-hover:text-[#b89565]'}`}>
                                                                                                    {isSel ? 'Included' : 'Select Plate'}
                                                                                                </span>
                                                                                            </div>
                                                                                             </div>
                                                                                        </div>

                                                                                    {/* Variants Dropdown for Selected Item */}
                                                                                    {isSel && item.hasVariants && item.variants?.length > 0 && (() => {
                                                                                        const limitObj = item.variantPackageLimits?.find(l => (l.packageId?._id || l.packageId || '').toString() === selectedPackage?._id.toString());
                                                                                        const vLimit = limitObj?.limit || 1;
                                                                                        
                                                                                        return (
                                                                                            <div className="mt-4 p-6 bg-gradient-to-br from-[#FDFAF6] to-white rounded-2xl border-2 border-[#cca776]/20 shadow-xl shadow-[#cca776]/5 animate-slide-down relative overflow-hidden">
                                                                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#cca776]/40 to-[#cca776]/10 rounded-l-2xl" />
                                                                                                <p className="text-sm font-black text-[#cca776] uppercase tracking-wider mb-2 flex items-center gap-2 ml-2">
                                                                                                    <Check size={16} className="bg-[#cca776]/10 rounded-full p-0.5" />
                                                                                                    Select {vLimit > 1 ? `up to ${vLimit} Flavors` : 'One Flavor'}:
                                                                                                </p>
                                                                                                
                                                                                                {/* Infinite Looping Carousel */}
                                                                                                <FlavorCarousel 
                                                                                                    variants={item.variants}
                                                                                                    selectedNames={selectedVariants[item._id] || []}
                                                                                                    onToggle={(vName) => toggleVariantSelection(item._id, vName, vLimit)}
                                                                                                />
                                                                                                {(selectedVariants[item._id] || []).length === 0 && (
                                                                                                    <p className="text-[11px] text-[#cca776] mt-4 ml-2 font-black flex items-center gap-1.5"><Info size={13} /> ACTION REQUIRED: PLEASE PICK A FLAVOR</p>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {menuData.counters?.length > 0 && (
                                                            <div className="bg-surface/50 rounded-3xl p-8 border border-border">
                                                                <h4 className="text-2xl font-heading mb-8">Live Gourmet Stations</h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                                    {menuData.counters.map(c => (
                                                                        <div key={c._id} className={`bg-white rounded-[2.5rem] border-2 overflow-hidden transition-all ${selectedCounters.includes(c._id) ? 'border-primary shadow-2xl' : 'border-border hover:border-primary/20'}`}>
                                                                            <div className="h-48 overflow-hidden relative">
                                                                                {c.varieties?.length > 0 ? <CounterVarietySlider varieties={c.varieties} /> : <img src={getImageUrl(c.image)} className="w-full h-full object-cover" alt={c.name} />}
                                                                            </div>
                                                                            <div className="p-8">
                                                                                <h4 className="font-heading text-2xl mb-2">{c.name}</h4>
                                                                                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                                                                                    <div><p className="text-[10px] uppercase font-black">{c.isAddOn ? 'Add-on' : 'Included'}</p><p className="text-xl font-black text-primary">{c.isAddOn ? fmt(c.addOnPricePerPlate) : 'Free'}</p></div>
                                                                                    <div className="flex gap-2">
                                                                                        <button onClick={(e) => { e.stopPropagation(); setDetailedCounter(c); }} className="px-4 py-2 text-xs font-black rounded-xl border border-gray-200 flex items-center gap-2"><Info size={14}/>Details</button>
                                                                                        {c.isAddOn && <button onClick={() => setSelectedCounters(prev => prev.includes(c._id) ? prev.filter(id => id !== c._id) : [...prev, c._id])} className={`px-4 py-2 rounded-xl font-black text-xs ${selectedCounters.includes(c._id) ? 'bg-secondary text-white' : 'bg-primary text-white'}`}>{selectedCounters.includes(c._id) ? 'Remove' : 'Add'}</button>}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {hasCatering && cateringExtras.length > 0 && (
                                    <div className="mt-12 space-y-6">
                                        <h4 className="text-2xl font-heading">Premium Add-ons</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {cateringExtras.map(extra => {
                                                const isSel = selectedExtras.some(e => e._id === extra._id);
                                                return (
                                                    <div key={extra._id} onClick={() => setSelectedExtras(prev => isSel ? prev.filter(e => e._id !== extra._id) : [...prev, extra])} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${isSel ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-white hover:border-primary/20'}`}>
                                                        <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center text-xl">{extra.icon || '✨'}</div>
                                                        <div className="flex-1">
                                                            <p className="font-heading text-secondary">{extra.name}</p>
                                                            <p className="text-primary font-bold text-sm">{fmt(extra.price)} {extra.pricingType === 'per_plate' ? '/ guest' : ''}</p>
                                                        </div>
                                                        {isSel && <CheckCircle size={20} className="text-primary" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {hasCatering && (
                                    <div className="bg-white rounded-3xl border border-border overflow-hidden text-secondary p-8 mt-8 shadow-sm">
                                        <h3 className="text-xl font-heading mb-4">Catering Notes & Dietary Requests</h3>
                                        <textarea 
                                            rows={3} 
                                            value={specialInstructions} 
                                            onChange={e => setSpecialInstructions(e.target.value)} 
                                            placeholder="Any special catering instructions (e.g. Jain Preparation, less spicy...)" 
                                            className="w-full px-5 py-4 rounded-xl border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-gray-400"
                                        />
                                    </div>
                                )}

                                <div className="mt-12 flex flex-col gap-3 relative">
                                    <button 
                                        disabled={!isCateringValid}
                                        onClick={() => setStep(2)} 
                                        className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all relative z-10 ${isCateringValid ? 'bg-secondary text-white hover:shadow-xl group' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        Proceed to Contact Information 
                                        <ArrowRight size={22} className={`transition-transform ${isCateringValid ? 'group-hover:translate-x-1' : ''}`} />
                                    </button>
                                    {!isCateringValid && (
                                        <p className="text-sm font-bold text-red-500 text-center animate-pulse flex items-center justify-center gap-2 mt-2">
                                            <AlertCircle size={16} /> Please pick the required flavors and dishes from the menu above to proceed.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="bg-white rounded-2xl border border-border p-6 animate-fade-in text-secondary">
                                <h2 className="text-2xl font-heading mb-6">Contact Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['fullName', 'email', 'phone', 'alternatePhone'].map(f => (
                                        <div key={f}><label className="text-sm font-semibold mb-1.5 block capitalize">{f.replace(/([A-Z])/g, ' $1')}</label><input type="text" value={contact[f]} onChange={e => setContact(c => ({ ...c, [f]: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-border text-sm outline-none" /></div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setStep(3)} 
                                    className="mt-6 w-full bg-primary text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 group transition-all hover:shadow-lg"
                                >
                                    Continue to Summary 
                                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4 animate-fade-in text-secondary">
                                <div className="bg-white rounded-2xl border border-border p-5">
                                    <h2 className="text-xl font-heading mb-4">Booking Summary</h2>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between"><span>Venue Fee</span><span>{fmt(venueTotal)}</span></div>
                                        {hasCatering && <div className="flex justify-between"><span>Catering Fee</span><span>{fmt(cateringTotal)}</span></div>}
                                        <div className="flex justify-between"><span>Security Deposit</span><span>{fmt(securityDeposit)}</span></div>
                                        <div className="border-t pt-2 flex justify-between font-heading text-xl text-secondary"><span>Grand Total</span><span>{fmt(grandTotal)}</span></div>
                                    </div>
                                </div>
                                <button onClick={() => { setStep(4); handlePayment(); }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"><CreditCard size={20} /> Pay {fmt(advanceAmount)} Now</button>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="bg-white rounded-2xl border border-border p-8 text-center animate-fade-in text-secondary">
                                {paymentLoading ? (
                                    <><Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" /><h2 className="text-xl font-heading mb-2">Processing Payment</h2><p className="text-sm text-text-muted">Completing transaction...</p></>
                                ) : paymentError ? (
                                    <><AlertCircle size={48} className="text-red-500 mx-auto mb-4" /><h2 className="text-xl font-heading mb-2">Payment Error</h2><p className="text-sm text-red-600 mb-6">{paymentError}</p><button onClick={retryLastPayment} className="w-full bg-primary text-white py-3 rounded-xl">Retry Payment</button></>
                                ) : (
                                    <><Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" /><h2 className="text-xl font-heading mb-2">Awaiting Payment</h2></>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Desktop Sidebar Summary */}
                    <div className={`hidden lg:block transition-all duration-700 sticky top-[136px] self-start ${isOverviewOpen ? 'w-[400px] opacity-100 ml-6' : 'w-0 opacity-0 overflow-hidden'}`}>
                        <div className="bg-white rounded-[2rem] border border-border p-6 shadow-xl relative text-secondary">
                            <button onClick={() => setIsOverviewOpen(false)} className="absolute top-6 right-6 p-2 bg-surface rounded-full text-text-muted hover:text-red-500 transition-colors"><X size={20} /></button>
                            <h3 className="font-heading text-2xl mb-6">Quotation</h3>
                            <div className="space-y-4 text-sm font-medium">
                                <div className="flex justify-between"><span>Venue</span><span>{fmt(venueTotal)}</span></div>
                                {hasCatering && <div className="flex justify-between"><span>Catering</span><span>{fmt(cateringTotal)}</span></div>}
                                <div className="flex justify-between"><span>Deposit</span><span>{fmt(securityDeposit)}</span></div>
                                <div className="border-t pt-4 flex justify-between font-heading text-2xl"><span>Total</span><span>{fmt(grandTotal)}</span></div>
                                <div className="bg-primary/10 p-4 rounded-2xl text-primary flex justify-between"><span>Advance Required</span><span className="font-heading text-xl">{fmt(advanceAmount)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Footer Bar */}
            <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t p-4 flex items-center justify-between transition-transform duration-300 ${step === 4 ? 'translate-y-full' : 'translate-y-0'}`}>
                <div onClick={() => setIsOverviewOpen(true)}>
                    <p className="text-[10px] font-black uppercase text-text-muted">Grand Total</p>
                    <p className="text-xl font-heading text-secondary">{fmt(grandTotal)}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right"><p className="text-[10px] font-black uppercase text-text-muted">Advance</p><p className="text-primary font-heading text-lg leading-none">{fmt(advanceAmount)}</p></div>
                    <button onClick={() => setIsOverviewOpen(true)} className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-secondary"><Info size={20} /></button>
                </div>
            </div>

            {/* Mobile Overview Overlay */}
            {isOverviewOpen && (
                <div className="fixed inset-0 z-[1000] lg:hidden bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsOverviewOpen(false)}>
                    <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-8 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-8" />
                        <h3 className="text-2xl font-heading text-secondary mb-6">Order Summary</h3>
                        <div className="space-y-4 mb-8 text-secondary font-medium">
                            <div className="flex justify-between"><span>Venue Fee</span><span>{fmt(venueTotal)}</span></div>
                            {hasCatering && <div className="flex justify-between"><span>Catering Fee</span><span>{fmt(cateringTotal)}</span></div>}
                            <div className="flex justify-between"><span>Security Deposit</span><span>{fmt(securityDeposit)}</span></div>
                            <div className="border-t pt-4 flex justify-between font-heading text-2xl text-secondary"><span>Grand Total</span><span>{fmt(grandTotal)}</span></div>
                        </div>
                        <button onClick={() => setIsOverviewOpen(false)} className="w-full bg-secondary text-white py-4 rounded-2xl font-bold text-lg">Done</button>
                    </div>
                </div>
            )}

            {/* Counter Details Modal */}
            {detailedCounter && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-secondary/90 backdrop-blur-xl animate-fade-in" onClick={() => setDetailedCounter(null)} />
                    <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] overflow-hidden relative shadow-2xl animate-scale-up flex flex-col md:flex-row text-secondary">
                        <button onClick={() => setDetailedCounter(null)} className="absolute top-6 right-6 z-[100] p-3 bg-gray-100 rounded-full"><X size={24} /></button>
                        <div className="w-full md:w-1/2 h-64 md:h-auto overflow-hidden">
                            {detailedCounter.varieties?.length > 0 ? <CounterVarietySlider varieties={detailedCounter.varieties} autoScrollInterval={4000} /> : <img src={getImageUrl(detailedCounter.image)} className="w-full h-full object-cover" alt={detailedCounter.name} />}
                        </div>
                        <div className="w-full md:w-1/2 p-10 overflow-y-auto">
                            <h2 className="text-4xl font-black mb-6">{detailedCounter.name}</h2>
                            <p className="text-gray-600 mb-10 leading-relaxed font-semibold">{detailedCounter.description}</p>
                            {detailedCounter.varieties?.length > 0 && (
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Included Varieties</h4>
                                    {detailedCounter.varieties.map((v, i) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
                                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0"><img src={getImageUrl(v.image)} className="w-full h-full object-cover" alt={v.name} /></div>
                                            <div><p className="font-extrabold text-secondary">{v.name}</p><p className="text-xs text-gray-500 line-clamp-2 mt-1">{v.description}</p></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-10 pt-10 border-t flex items-center justify-between">
                                <div><p className="text-[10px] font-black uppercase text-gray-400">Price Impact</p><p className="text-3xl font-black">{detailedCounter.isAddOn ? fmt(detailedCounter.addOnPricePerPlate) : 'Included'}</p></div>
                                {detailedCounter.isAddOn && (
                                    <button onClick={() => {
                                        const isAlreadySel = selectedCounters.includes(detailedCounter._id);
                                        setSelectedCounters(prev => isAlreadySel ? prev.filter(c => c !== detailedCounter._id) : [...prev, detailedCounter._id]);
                                        setDetailedCounter(null);
                                    }} className={`px-8 py-4 rounded-xl font-black ${selectedCounters.includes(detailedCounter._id) ? 'bg-secondary text-white' : 'bg-primary text-white'}`}>{selectedCounters.includes(detailedCounter._id) ? 'Remove' : 'Add to Package'}</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isJainMode && step === 1 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 z-[9999] animate-bounce">
                    🌿 Showing Jain-friendly items only
                </div>
            )}
        </div>
    );
}
