/*
 * PLAN AN EVENT -- availability-first venue search.
 *
 * WHAT THIS PAGE USED TO BE, AND WHY IT WAS REPLACED
 *
 * It was a form that asked for a name, a phone number, a date, a start and
 * end time, a guest count, a venue type and a venue, and then posted all of
 * that to createBooking(). Three things were wrong with it:
 *
 *   1. Its type tabs were 'hall' and 'lawn'. No venue has either type --
 *      the enum is banquet_hall, lawn_garden, rooftop, conference_hall,
 *      poolside, farmhouse, hotel_ballroom -- so the venue picker was
 *      filtered down to nothing on every visit, whatever was in the
 *      database.
 *   2. createBooking is createVenueBookingOrder, which posts to
 *      /venue-bookings/create-order. That endpoint wants venueId,
 *      eventDate, timeSlot, guestCount and a priced-up grandTotal, and it
 *      answers with a Razorpay order to be paid. The form sent none of
 *      those fields, so the request failed every time: no venueId meant a
 *      404 before anything else was even read.
 *   3. On success it displayed "Booking Confirmed!". Even had the request
 *      gone through, the booking it creates is PAYMENT_PENDING with a
 *      15-minute lock -- it is not confirmed until the advance is paid and
 *      the signature verified. The page would have told people they had a
 *      venue when they did not.
 *
 * WHAT IT DOES NOW
 *
 * It answers the one question the rest of the site cannot: "which venues
 * are actually free on my date, for my number of guests?" /venues filters
 * by type, capacity, price and rating but knows nothing about dates, and
 * /venues/:id only shows one venue's calendar at a time.
 *
 * It deliberately does NOT take a payment or create a booking. Picking a
 * venue holds the slot with lockVenueSlot and hands over to
 * /venues/:id/book, which owns pricing, catering, GST and payment. One
 * booking path, not two.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { fetchVenues, checkVenueAvailability, lockVenueSlot, getImageUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import {
    Calendar, Users, Search, ArrowRight, Loader2, Lock, Ban,
    CheckCircle2, AlertCircle, MapPin, Building2, SlidersHorizontal
} from 'lucide-react';
import LoadError from '../components/LoadError';

/*
 * The four slots and the seven types below are the server's own values --
 * the keys venueController.checkAvailability returns and the Venue model's
 * type enum. Inventing labels here is what broke the old page, so if a
 * venue ever carries a type that is not in this list the label falls back
 * to the raw value rather than the venue disappearing.
 */
const SLOTS = [
    { key: 'morning', label: 'Morning', time: '6 AM – 12 PM' },
    { key: 'afternoon', label: 'Afternoon', time: '12 – 6 PM' },
    { key: 'evening', label: 'Evening', time: '6 PM – 12 AM' },
    { key: 'fullDay', label: 'Full day', time: '6 AM – 12 AM' }
];

const VENUE_TYPES = [
    { value: '', label: 'Any type' },
    { value: 'banquet_hall', label: 'Banquet hall' },
    { value: 'lawn_garden', label: 'Lawn & garden' },
    { value: 'rooftop', label: 'Rooftop' },
    { value: 'conference_hall', label: 'Conference hall' },
    { value: 'poolside', label: 'Poolside' },
    { value: 'farmhouse', label: 'Farmhouse' },
    { value: 'hotel_ballroom', label: 'Hotel ballroom' }
];

const SLOT_KEYS = SLOTS.map(s => s.key);
const TYPE_VALUES = VENUE_TYPES.map(t => t.value);

const slotLabel = (key) => SLOTS.find(s => s.key === key)?.label || key;
const typeLabel = (value) => VENUE_TYPES.find(t => t.value === value)?.label || value;

/*
 * toISOString() would do this in one call, but it converts to UTC first.
 * At 00:30 in Surat that is still yesterday in UTC, so "today" came out a
 * day early and the date input would have accepted a date in the past.
 */
const dateValue = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const addDays = (isoDate, days) => {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    return dateValue(date);
};

const readableDate = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
};

const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function Reservations() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    const today = useMemo(() => dateValue(new Date()), []);
    const defaultDate = useMemo(() => addDays(dateValue(new Date()), 14), []);

    // The URL is the way in: /reservations?date=2026-01-31&guests=400&slot=evening
    // is a shareable search. Anything unrecognised falls back rather than
    // being passed to the API.
    const [form, setForm] = useState(() => {
        const date = searchParams.get('date');
        const guests = Number(searchParams.get('guests'));
        const slot = searchParams.get('slot');
        const type = searchParams.get('type');
        return {
            date: date && date >= dateValue(new Date()) ? date : defaultDate,
            guests: Number.isFinite(guests) && guests > 0 ? guests : 150,
            slot: SLOT_KEYS.includes(slot) ? slot : 'evening',
            type: TYPE_VALUES.includes(type) ? type : ''
        };
    });

    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [formError, setFormError] = useState('');
    const [holdingId, setHoldingId] = useState(null);
    const [holdError, setHoldError] = useState(null);

    const runSearch = useCallback(async (criteria) => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await fetchVenues({
                limit: 24,
                ...(criteria.type ? { type: criteria.type } : {}),
                // The server reads minCapacity as "capacity.max >= n", which
                // is the right test: a venue holding up to 500 fits 300.
                ...(criteria.guests ? { minCapacity: criteria.guests } : {})
            });
            const venues = res?.venues || [];

            const checked = await Promise.all(venues.map(async (venue) => {
                try {
                    const availability = await checkVenueAvailability(venue._id, criteria.date);
                    return { venue, ok: true, ...availability };
                } catch (err) {
                    /*
                     * One venue's check failing must not make that venue look
                     * booked. "We could not check" and "it is taken" are
                     * different answers and the card says which.
                     */
                    console.error(`Availability check failed for ${venue.name}:`, err);
                    return { venue, ok: false, slots: [] };
                }
            }));

            setResults(checked);
        } catch (err) {
            console.error('Venue search failed:', err);
            setLoadError(err);
            setResults(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Runs once on mount with whatever the URL asked for.
    useEffect(() => {
        runSearch(form);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const search = (next) => {
        if (!next.date) {
            setFormError('Pick a date first.');
            return;
        }
        if (next.date < today) {
            setFormError('That date has already passed. Choose today or later.');
            return;
        }
        setFormError('');
        setHoldError(null);
        setForm(next);
        setSearchParams({
            date: next.date,
            guests: String(next.guests),
            slot: next.slot,
            ...(next.type ? { type: next.type } : {})
        }, { replace: true });
        runSearch(next);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        search(form);
    };

    /*
     * Switching the slot needs no new request: checkAvailability returns all
     * four slots for the date, so the cards re-read the data already here.
     */
    const pickSlot = (slot) => {
        setForm(prev => ({ ...prev, slot }));
        setHoldError(null);
        const params = new URLSearchParams(searchParams);
        params.set('slot', slot);
        setSearchParams(params, { replace: true });
    };

    const holdSlot = async (venueId) => {
        if (!isAuthenticated) {
            navigate('/login', {
                state: { from: location, reason: 'Log in to hold a venue slot' }
            });
            return;
        }
        setHoldingId(venueId);
        setHoldError(null);
        try {
            const lock = await lockVenueSlot({
                venueId, date: form.date, timeSlot: form.slot
            });
            navigate(
                `/venues/${venueId}/book?date=${form.date}&slot=${form.slot}&guests=${form.guests}`,
                { state: { lockExpiresAt: lock.lockExpiresAt } }
            );
        } catch (err) {
            setHoldError({
                id: venueId,
                message: err.message || 'That slot could not be held. It may have just been taken.'
            });
            /*
             * Someone else may have taken it a second ago, so re-check --
             * but runSearch must not clear holdError on the way, or the
             * click looks like it did nothing at all. That is how this
             * first read: the hold was refused, the refusal was wiped a
             * frame later, and the page just sat there.
             */
            runSearch(form);
        } finally {
            setHoldingId(null);
        }
    };

    const slotOf = (row) => row.slots?.find(s => s.key === form.slot);
    const availableRows = (results || []).filter(r => r.ok && slotOf(r)?.available);
    const uncheckedCount = (results || []).filter(r => !r.ok).length;
    const dayInfo = (results || []).find(r => r.ok);

    // Which other slots are free somewhere on this date, for the nudge shown
    // when the chosen slot is fully taken.
    const otherFreeSlots = SLOTS.filter(s =>
        s.key !== form.slot &&
        (results || []).some(r => r.ok && r.slots?.find(x => x.key === s.key)?.available)
    );

    return (
        <div className="bg-background pt-20 min-h-screen">
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="bg-surface py-12 border-b border-border">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-primary font-black mb-3">
                        Plan an event
                    </p>
                    <h1 className="text-4xl md:text-5xl font-heading mb-4 text-secondary">
                        Who is free on your date?
                    </h1>
                    <p className="text-text-muted max-w-xl mx-auto">
                        Pick a date, a time and a headcount. We check every venue's
                        calendar and show you what is actually open — with that
                        day's price, not a starting-from figure.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-6 py-10">
                {/* ── Search ─────────────────────────────────────── */}
                <form
                    onSubmit={handleSubmit}
                    className="max-w-5xl mx-auto bg-surface border border-border shadow-sm p-6 md:p-8"
                >
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="event-date" className="text-xs uppercase tracking-widest text-secondary/60 font-medium flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" /> Date
                            </label>
                            <input
                                id="event-date"
                                type="date"
                                min={today}
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="guest-count" className="text-xs uppercase tracking-widest text-secondary/60 font-medium flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" /> Guests
                            </label>
                            <input
                                id="guest-count"
                                type="number"
                                min="1"
                                max="5000"
                                value={form.guests}
                                onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                                className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="venue-type" className="text-xs uppercase tracking-widest text-secondary/60 font-medium flex items-center gap-2">
                                <SlidersHorizontal className="w-3.5 h-3.5" /> Venue type
                            </label>
                            <select
                                id="venue-type"
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors"
                            >
                                {VENUE_TYPES.map(t => (
                                    <option key={t.value || 'any'} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn w-full py-3.5 text-sm tracking-widest shadow-none flex items-center justify-center gap-2"
                            >
                                {loading
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking</>
                                    : <><Search className="w-4 h-4" /> Check availability</>}
                            </button>
                        </div>
                    </div>

                    {/* Slot selector — no refetch, the data is already here */}
                    <div className="mt-8 pt-6 border-t border-border">
                        <p className="text-xs uppercase tracking-widest text-secondary/60 font-medium mb-3">
                            Time
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {SLOTS.map(s => (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => pickSlot(s.key)}
                                    aria-pressed={form.slot === s.key}
                                    className={`px-5 py-3 text-left border transition-all ${form.slot === s.key
                                        ? 'bg-secondary text-white border-secondary'
                                        : 'bg-transparent text-text-muted border-border hover:border-primary'}`}
                                >
                                    <span className="block text-xs uppercase tracking-wider font-bold">{s.label}</span>
                                    <span className={`block text-[11px] mt-0.5 ${form.slot === s.key ? 'text-white/70' : 'text-text-muted'}`}>
                                        {s.time}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {formError && (
                        <div className="mt-6 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 border border-red-100">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {formError}
                        </div>
                    )}
                </form>

                {/* ── Results ────────────────────────────────────── */}
                <div className="max-w-5xl mx-auto mt-10">
                    {loading && (
                        <div className="text-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                            <p className="text-text-muted text-sm">
                                Checking {readableDate(form.date)} against every venue's calendar…
                            </p>
                        </div>
                    )}

                    {!loading && loadError && (
                        <LoadError what="the venue calendar" onRetry={() => runSearch(form)} />
                    )}

                    {!loading && !loadError && results && (
                        <>
                            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
                                <h2 className="text-2xl font-heading text-secondary">
                                    {results.length === 0
                                        ? 'No matching venues'
                                        : availableRows.length === 0
                                            ? `Nothing open for ${slotLabel(form.slot).toLowerCase()}`
                                            : `${availableRows.length} ${availableRows.length === 1 ? 'venue is' : 'venues are'} open`}
                                </h2>
                                <p className="text-sm text-text-muted">
                                    {readableDate(form.date)}
                                    {dayInfo?.isWeekend && <span className="text-primary"> · weekend rates</span>}
                                    {' · '}{slotLabel(form.slot)}
                                    {' · '}{form.guests} guests
                                    {form.type && <> · {typeLabel(form.type)}</>}
                                </p>
                            </div>

                            {uncheckedCount > 0 && (
                                <div className="mb-6 flex items-start gap-2 text-amber-800 text-sm bg-amber-50 p-4 border border-amber-200">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>
                                        {uncheckedCount === 1
                                            ? "One venue's calendar did not answer, so its card cannot say whether it is free."
                                            : `${uncheckedCount} venues' calendars did not answer, so their cards cannot say whether they are free.`}
                                        {' '}
                                        <button onClick={() => runSearch(form)} className="underline font-medium hover:no-underline">
                                            Try again
                                        </button>
                                    </span>
                                </div>
                            )}

                            {/* Nothing matched the filters at all -- an empty
                                result, not a failure. Say which filter is doing it. */}
                            {results.length === 0 && (
                                <div className="text-center py-20 border border-border bg-surface">
                                    <Building2 className="w-12 h-12 mx-auto mb-6 text-secondary/20" />
                                    <h3 className="text-xl font-heading text-secondary mb-3">
                                        No venue takes {form.guests} guests
                                        {form.type && <> in {typeLabel(form.type).toLowerCase()}</>}
                                    </h3>
                                    <p className="text-text-muted mb-6 max-w-md mx-auto text-sm">
                                        This is the guest count and the venue type talking, not the
                                        date — nothing was ruled out by the calendar.
                                    </p>
                                    <div className="flex flex-wrap gap-3 justify-center">
                                        {form.type && (
                                            <button
                                                onClick={() => search({ ...form, type: '' })}
                                                className="px-5 py-2.5 border border-border text-secondary text-sm hover:border-primary transition-colors"
                                            >
                                                Any venue type
                                            </button>
                                        )}
                                        {form.guests > 50 && (
                                            <button
                                                onClick={() => search({ ...form, guests: 50 })}
                                                className="px-5 py-2.5 border border-border text-secondary text-sm hover:border-primary transition-colors"
                                            >
                                                Try 50 guests
                                            </button>
                                        )}
                                        <Link
                                            to="/venues"
                                            className="px-5 py-2.5 border border-border text-secondary text-sm hover:border-primary transition-colors"
                                        >
                                            Browse every venue
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Venues exist, but this slot is taken everywhere. */}
                            {results.length > 0 && availableRows.length === 0 && (
                                <div className="mb-8 p-6 border border-border bg-surface">
                                    <p className="text-secondary mb-4">
                                        All {results.length} matching {results.length === 1 ? 'venue is' : 'venues are'} taken
                                        for {slotLabel(form.slot).toLowerCase()} on {readableDate(form.date)}.
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        {otherFreeSlots.map(s => (
                                            <button
                                                key={s.key}
                                                onClick={() => pickSlot(s.key)}
                                                className="px-5 py-2.5 border border-primary/40 text-primary text-sm hover:bg-primary/5 transition-colors"
                                            >
                                                {s.label} is free
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => search({ ...form, date: addDays(form.date, 1) })}
                                            className="px-5 py-2.5 border border-border text-secondary text-sm hover:border-primary transition-colors"
                                        >
                                            Try {readableDate(addDays(form.date, 1))}
                                        </button>
                                        <button
                                            onClick={() => search({ ...form, date: addDays(form.date, 7) })}
                                            className="px-5 py-2.5 border border-border text-secondary text-sm hover:border-primary transition-colors"
                                        >
                                            Try a week later
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-5">
                                {results.map(row => {
                                    const { venue } = row;
                                    const slot = slotOf(row);
                                    const cover = venue.media?.find(m => m.isCover && m.type === 'image')
                                        || venue.media?.find(m => m.type === 'image');
                                    const minGuests = venue.capacity?.min;
                                    const maxGuests = venue.capacity?.max;
                                    const belowMinimum = minGuests && form.guests < minGuests;

                                    return (
                                        <div
                                            key={venue._id}
                                            className="border border-border bg-surface flex flex-col md:flex-row overflow-hidden"
                                        >
                                            <Link
                                                to={`/venues/${venue._id}`}
                                                className="md:w-64 h-48 md:h-auto bg-background flex-shrink-0 overflow-hidden"
                                            >
                                                {cover ? (
                                                    <img
                                                        src={getImageUrl(cover.url)}
                                                        alt={venue.name}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Building2 className="w-10 h-10 text-secondary/15" />
                                                    </div>
                                                )}
                                            </Link>

                                            <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center gap-6">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-black mb-1.5">
                                                        {typeLabel(venue.type)}
                                                    </p>
                                                    <h3 className="text-xl font-heading text-secondary mb-2">
                                                        <Link to={`/venues/${venue._id}`} className="hover:text-primary transition-colors">
                                                            {venue.name}
                                                        </Link>
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                                                        {(minGuests || maxGuests) && (
                                                            <span className="flex items-center gap-1.5">
                                                                <Users className="w-3.5 h-3.5" />
                                                                {minGuests && maxGuests
                                                                    ? `${minGuests}–${maxGuests} guests`
                                                                    : `up to ${maxGuests} guests`}
                                                            </span>
                                                        )}
                                                        {venue.location?.area && (
                                                            <span className="flex items-center gap-1.5">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                {venue.location.area}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {belowMinimum && (
                                                        <p className="mt-3 text-xs text-amber-700">
                                                            Takes a minimum of {minGuests} guests — you entered {form.guests}.
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Status for the selected slot */}
                                                <div className="md:w-56 flex-shrink-0">
                                                    {!row.ok && (
                                                        <div className="text-sm">
                                                            <p className="text-amber-700 font-medium mb-1">Couldn't check</p>
                                                            <p className="text-xs text-text-muted">
                                                                This venue's calendar didn't answer.{' '}
                                                                <Link to={`/venues/${venue._id}`} className="underline hover:no-underline">
                                                                    Open the venue
                                                                </Link>
                                                            </p>
                                                        </div>
                                                    )}

                                                    {row.ok && !slot && (
                                                        <p className="text-sm text-text-muted">
                                                            {slotLabel(form.slot)} is not offered here.
                                                        </p>
                                                    )}

                                                    {row.ok && slot?.available && (
                                                        <div>
                                                            <p className="text-2xl font-heading text-secondary leading-none">
                                                                {rupees(slot.price)}
                                                            </p>
                                                            <p className="text-[11px] text-text-muted mt-1.5 mb-3">
                                                                + {rupees(slot.gst)} GST
                                                                {row.gstRate ? ` (${row.gstRate}%)` : ''} · {slot.time}
                                                            </p>
                                                            <button
                                                                onClick={() => holdSlot(venue._id)}
                                                                disabled={holdingId === venue._id}
                                                                className="btn w-full py-3 text-xs tracking-widest shadow-none flex items-center justify-center gap-2"
                                                            >
                                                                {holdingId === venue._id
                                                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Holding</>
                                                                    : <>Hold this slot <ArrowRight className="w-3.5 h-3.5" /></>}
                                                            </button>
                                                            <p className="text-[10px] text-text-muted mt-2 text-center">
                                                                Held for 15 minutes while you book
                                                            </p>
                                                        </div>
                                                    )}

                                                    {row.ok && slot && !slot.available && (
                                                        <div className="text-sm">
                                                            <p className="flex items-center gap-1.5 text-secondary/70 font-medium mb-2">
                                                                {slot.blocked
                                                                    ? <><Ban className="w-4 h-4" /> Closed this day</>
                                                                    : slot.locked
                                                                        ? <><Lock className="w-4 h-4" /> Being booked now</>
                                                                        : <><Ban className="w-4 h-4" /> Already booked</>}
                                                            </p>
                                                            {(() => {
                                                                const free = row.slots.filter(s => s.available);
                                                                if (free.length === 0) {
                                                                    return (
                                                                        <p className="text-xs text-text-muted">
                                                                            Nothing free here on this date.
                                                                        </p>
                                                                    );
                                                                }
                                                                return (
                                                                    <div>
                                                                        <p className="text-xs text-text-muted mb-2">Free here:</p>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {free.map(s => (
                                                                                <button
                                                                                    key={s.key}
                                                                                    onClick={() => pickSlot(s.key)}
                                                                                    className="px-3 py-1.5 text-xs border border-primary/40 text-primary hover:bg-primary/5 transition-colors"
                                                                                >
                                                                                    {slotLabel(s.key)} · {rupees(s.price)}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {holdError?.id === venue._id && (
                                                        <p className="mt-3 text-xs text-red-600 flex items-start gap-1.5">
                                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                                            {holdError.message}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {availableRows.length > 0 && (
                                <p className="mt-8 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                    Holding a slot does not book it. You pay the advance on the next
                                    screen, and the booking is confirmed only once that goes through.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
