import { useState, useEffect } from 'react';
import {
    MapPin, Phone, Mail, Clock, Send,
    Instagram, Facebook, MessageCircle,
    ChevronRight, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchContactInfo, submitContactForm } from '../api';

export default function Contact() {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: ''
    });

    useEffect(() => {
        const getInfo = async () => {
            try {
                const res = await fetchContactInfo();
                setInfo(res.data);
            } catch (err) {
                console.error('Failed to fetch contact info:', err);
            } finally {
                setLoading(false);
            }
        };
        getInfo();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus({ type: '', message: '' });

        try {
            const res = await submitContactForm(formData);
            setStatus({ type: 'success', message: res.message });
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: 'General Inquiry',
                message: ''
            });
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Something went wrong. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    // Smart URL Converter
    // Google blocks regular maps URLs in iframes (X-Frame-Options policy).
    // This function converts to embeddable URLs:
    //   - Proper Google embed URLs → used as-is (the only Google Maps format that works in iframes)
    //   - URLs with lat/lng → converted to OpenStreetMap embed (no restrictions)
    //   - Plain address text → converted to OpenStreetMap search embed
    const getEmbedUrl = (url) => {
        if (!url || !url.trim()) return null;
        const trimmed = url.trim();

        // 1. Already a valid Google Maps embed URL (from Share → Embed a map)
        //    Only this Google format works in iframes — use as-is
        if (trimmed.includes('google.com/maps/embed')) return trimmed;

        // 2. Extract lat/lng from Google Maps share/place URLs like:
        //    https://www.google.com/maps/place/Restaurant/@12.9716,77.5946,15z
        //    https://maps.google.com/?q=12.9716,77.5946
        const coordsMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordsMatch) {
            const lat = parseFloat(coordsMatch[1]);
            const lng = parseFloat(coordsMatch[2]);
            // Use OpenStreetMap embed — no iframe restrictions
            const delta = 0.005; // bounding box size
            return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;
        }

        // 3. Extract ?q= coordinates from URL (e.g. ?q=12.97,77.59)
        try {
            const parsed = new URL(trimmed);
            const q = parsed.searchParams.get('q') || parsed.searchParams.get('query');
            if (q) {
                // Check if q contains coordinates
                const qCoords = q.match(/^(-?\d+\.\d+),(-?\d+\.\d+)$/);
                if (qCoords) {
                    const lat = parseFloat(qCoords[1]);
                    const lng = parseFloat(qCoords[2]);
                    const delta = 0.005;
                    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;
                }
                // q is a place name — use OpenStreetMap search
                return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&query=${encodeURIComponent(q)}`;
            }
        } catch (e) { /* ignore invalid URL */ }

        // 4. Extract place name from /place/NAME/ URLs
        const placeMatch = trimmed.match(/\/place\/([^/@?]+)/);
        if (placeMatch) {
            const place = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
            return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&query=${encodeURIComponent(place)}`;
        }

        // 5. Plain text address (no http) — use OpenStreetMap search
        if (!trimmed.startsWith('http')) {
            return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&query=${encodeURIComponent(trimmed)}`;
        }

        // 6. Unknown URL — return null (show "not configured" message)
        return null;
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* ── Hero Section ─────────────────────────────────────────── */}
            <div className="relative bg-secondary py-20 px-4 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-primary rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-primary rounded-full blur-[120px]" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <h1 className="text-4xl md:text-6xl font-heading text-white mb-6 animate-fadeIn">
                        Get in <span className="text-primary italic">Touch</span>
                    </h1>
                    <p className="text-white/70 max-w-2xl mx-auto text-lg leading-relaxed">
                        Have a question about our menu, planning an event, or want to share your experience?
                        We're here to listen and help.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-16 -mt-10 relative z-20">
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* ── Contact Information Card ────────────────────────── */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 h-full">
                            <h2 className="text-2xl font-heading text-secondary mb-8 flex items-center gap-3">
                                <span className="bg-primary/10 p-2 rounded-xl text-primary">
                                    <Phone size={24} />
                                </span>
                                Contact Info
                            </h2>

                            <div className="space-y-8">
                                <div className="flex gap-4 group">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                        <MapPin className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-secondary mb-1">Our Location</p>
                                        <p className="text-gray-500 text-sm leading-relaxed italic">
                                            {info?.address}
                                            {info?.landmark && <span className="block not-italic text-xs mt-1 text-primary">Landmark: {info.landmark}</span>}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 group">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                        <Phone className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-secondary mb-1">Phone Number</p>
                                        <a href={`tel:${info?.phone}`} className="text-gray-500 text-sm hover:text-primary transition-colors">
                                            {info?.phone}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex gap-4 group">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                        <Mail className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-secondary mb-1">Email Address</p>
                                        <a href={`mailto:${info?.email}`} className="text-gray-500 text-sm hover:text-primary transition-colors truncate block max-w-[200px]">
                                            {info?.email}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex gap-4 group">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                        <Clock className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-secondary mb-1">Opening Hours</p>
                                        <div className="text-gray-500 text-sm space-y-1">
                                            <p className="flex justify-between gap-4">
                                                <span>Mon - Fri</span>
                                                <span className="font-medium text-secondary">{info?.weekdayHours}</span>
                                            </p>
                                            <p className="flex justify-between gap-4">
                                                <span>Sat - Sun</span>
                                                <span className="font-medium text-secondary">{info?.weekendHours}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-gray-100">
                                <p className="text-sm font-semibold text-secondary mb-4 uppercase tracking-wider text-center">Follow Us</p>
                                <div className="flex justify-center gap-4">
                                    {[
                                        { icon: Instagram, link: info?.socialLinks?.instagram, label: 'Instagram' },
                                        { icon: Facebook, link: info?.socialLinks?.facebook, label: 'Facebook' },
                                        { icon: MessageCircle, link: info?.socialLinks?.whatsapp, label: 'WhatsApp' }
                                    ].map((social, i) => (
                                        <a
                                            key={i}
                                            href={social.link || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-secondary hover:bg-primary hover:text-white transition-all transform hover:-translate-y-1"
                                            aria-label={social.label}
                                        >
                                            <social.icon size={20} />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Contact Form Card ────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100">
                            <div className="mb-10">
                                <h2 className="text-3xl font-heading text-secondary mb-2">Send us a Message</h2>
                                <p className="text-gray-500 italic font-medium">We'd love to hear from you!</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-secondary block">Full Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            placeholder="Enter your name"
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-secondary block">Email Address *</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            placeholder="Enter your email"
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-secondary block">Phone Number</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="Optional"
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-secondary block">Subject *</label>
                                        <select
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary appearance-none cursor-pointer"
                                        >
                                            <option>General Inquiry</option>
                                            <option>Complaint</option>
                                            <option>Catering</option>
                                            <option>Reservation Issue</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-secondary block">Your Message *</label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        rows="5"
                                        placeholder="How can we help you?"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary resize-none"
                                    ></textarea>
                                </div>

                                {status.message && (
                                    <div className={`p-4 rounded-2xl flex flex-col gap-2 animate-slideUp ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                                        }`}>
                                        <div className="flex items-center gap-3">
                                            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                            <p className="text-sm font-medium">{status.message}</p>
                                        </div>
                                        {status.type === 'success' && (
                                            <Link
                                                to="/my-messages"
                                                className="text-xs font-bold text-green-600 hover:text-green-800 underline underline-offset-2 ml-8 transition-colors"
                                            >
                                                📬 Track My Messages & Replies →
                                            </Link>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full md:w-auto px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all flex items-center justify-center gap-3 group disabled:opacity-70"
                                >
                                    {submitting ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            Send Message
                                            <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* ── Google Map Section ────────────────────────────── */}
                        <div className="bg-white rounded-3xl p-4 shadow-xl border border-gray-100 overflow-hidden h-[400px]">
                            {getEmbedUrl(info?.googleMapLink) ? (
                                <iframe
                                    src={getEmbedUrl(info.googleMapLink)}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="rounded-2xl"
                                    title="Restaurant Location"
                                ></iframe>
                            ) : (
                                <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-3">
                                    <MapPin size={48} className="opacity-20" />
                                    <p className="italic font-medium">Map location not configured</p>
                                    <p className="text-xs text-gray-300 text-center">Admin can add a Google Maps link in Restaurant Settings</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
                .animate-slideUp { animation: slideUp 0.5s ease-out forwards; }
                .font-heading { font-family: 'Playfair Display', serif; }
            `}</style>
        </div>
    );
}
