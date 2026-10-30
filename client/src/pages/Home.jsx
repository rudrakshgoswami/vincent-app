import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight, Sparkles, Star, ChevronDown,
    UtensilsCrossed, CalendarCheck, MapPin, Phone, Mail, Clock
} from 'lucide-react';
import { fetchContactInfo, fetchMenu, fetchVenues, getImageUrl } from '../api';

/* ── Animated counter ──────────────────────────── */
function Counter({ to, suffix = '', duration = 1600 }) {
    const [val, setVal] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) return;
            observer.disconnect();
            let start = null;
            const step = (ts) => {
                if (!start) start = ts;
                const p = Math.min((ts - start) / duration, 1);
                setVal(Math.floor(p * to));
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }, { threshold: 0.4 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [to, duration]);
    return <span ref={ref}>{val}{suffix}</span>;
}

export default function Home() {
    const [contactInfo, setContactInfo] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [venues, setVenues] = useState([]);
    const [totalDishes, setTotalDishes] = useState(0);
    const heroRef = useRef(null);

    // Parallax on hero image
    useEffect(() => {
        const onScroll = () => {
            if (!heroRef.current) return;
            const img = heroRef.current.querySelector('.hero-img');
            if (img) img.style.transform = `scale(1.1) translateY(${window.scrollY * 0.12}px)`;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const load = async () => {
            try { const r = await fetchContactInfo(); setContactInfo(r.data); } catch {}
            try {
                const m = await fetchMenu();
                let all = [];
                m.forEach(c => { if (c.Items) all = [...all, ...c.Items]; });
                setTotalDishes(all.length);
                setMenuItems(all.slice(0, 6));
            } catch {}
            try {
                const v = await fetchVenues();
                const list = v?.venues || (Array.isArray(v) ? v : []);
                setVenues(list.slice(0, 3));
            } catch {}
        };
        load();
    }, []);

    return (
        <div className="w-full overflow-x-hidden bg-background">

            {/* ═══════════ HERO ═══════════ */}
            <section ref={heroRef} className="relative h-[90vh] min-h-[650px] flex flex-col justify-end overflow-hidden bg-secondary">
                <div className="absolute inset-0 overflow-hidden">
                    <img
                        className="hero-img absolute inset-0 w-full h-full object-cover scale-110 will-change-transform opacity-40"
                        src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop"
                        alt="Vincent Dining"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/50 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/70 via-transparent to-transparent" />
                </div>

                <div className="relative z-10 container mx-auto px-6 md:px-16 pb-20 md:pb-28">
                    <div className="max-w-4xl">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="block w-12 h-px bg-primary" />
                            <span className="text-primary text-[10px] font-black uppercase tracking-[0.5em]">Vincent Restaurant</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading text-white leading-[0.9] mb-8">
                            Where Food<br />
                            <span className="italic text-primary">Becomes</span><br />
                            Memory.
                        </h1>

                        <p className="text-white/50 text-base md:text-lg max-w-lg leading-relaxed mb-10 font-medium">
                            Vincent is not just a restaurant — it's an experience crafted
                            flavour by flavour, for those who live deliberately.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/order" className="group flex items-center gap-3 bg-primary text-secondary px-8 py-4 rounded-full text-xs font-black uppercase tracking-[0.3em] hover:bg-primary-light transition-all shadow-lg shadow-primary/20">
                                Order Now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link to="/reserve-table" className="group flex items-center gap-3 border border-white/20 text-white px-8 py-4 rounded-full text-xs font-black uppercase tracking-[0.3em] hover:bg-white/10 backdrop-blur-sm transition-all">
                                Reserve Table <CalendarCheck size={16} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats bar — real data */}
                <div className="relative z-10 border-t border-white/10 bg-secondary/80 backdrop-blur-md">
                    <div className="container mx-auto px-6 md:px-16 py-5 grid grid-cols-3 divide-x divide-white/10">
                        <div className="text-center pr-6">
                            <p className="text-primary text-2xl md:text-3xl font-heading">
                                <Counter to={totalDishes || 100} suffix="+" />
                            </p>
                            <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Dishes on Menu</p>
                        </div>
                        <div className="text-center px-6">
                            <p className="text-primary text-2xl md:text-3xl font-heading">
                                <Counter to={venues.length || 5} suffix="" />
                            </p>
                            <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Venues Available</p>
                        </div>
                        <div className="text-center pl-6">
                            <p className="text-primary text-2xl md:text-3xl font-heading">4.9★</p>
                            <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Average Rating</p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-[100px] right-8 md:right-16 z-10 flex flex-col items-center gap-2 text-white/20">
                    <ChevronDown size={16} className="animate-bounce" />
                </div>
            </section>

            {/* ═══════════ OUR PHILOSOPHY ═══════════ */}
            <section className="py-24 md:py-32 bg-white relative overflow-hidden">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="relative group">
                            <div className="absolute -inset-4 border border-primary/20 rounded-[3rem] -rotate-3 transition-transform group-hover:rotate-0 duration-700" />
                            <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-premium transition-transform group-hover:scale-[1.02] duration-700">
                                <img
                                    src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?q=80&w=2070&auto=format&fit=crop"
                                    alt="Chef Artistry"
                                    className="w-full h-[500px] object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-1000"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent" />
                                <div className="absolute bottom-10 left-10 text-white">
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 text-primary-light">The Master's Touch</p>
                                    <h3 className="text-3xl font-heading italic">Authenticity Redefined</h3>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="inline-flex items-center gap-3 text-primary">
                                <UtensilsCrossed size={18} />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em]">Our Ethos</span>
                            </div>
                            <h2 className="text-4xl md:text-6xl text-secondary font-heading leading-[0.9]">
                                Hand-crafted <br /> <span className="text-primary">& Sustainable.</span>
                            </h2>
                            <p className="text-text-muted text-lg leading-relaxed font-medium">
                                We believe in the power of conscious gastronomy. Every ingredient is a testament to our commitment to the earth and the pure expression of flavor.
                            </p>
                            <Link to="/contact" className="group inline-flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] border-b-2 border-primary pb-2 hover:text-primary transition-all">
                                Discover the Story <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ FEATURED MENU — LIVE API DATA ═══════════ */}
            <section className="py-24 md:py-32 bg-surface relative px-6 overflow-hidden">
                <div className="container mx-auto max-w-7xl relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-14 gap-6">
                        <div>
                            <span className="text-primary font-black tracking-[0.4em] uppercase text-[11px] block mb-4">Signature Chapters</span>
                            <h2 className="text-secondary text-4xl md:text-6xl font-heading mb-2">Curated Selections</h2>
                            <div className="w-20 h-1 bg-primary opacity-30" />
                        </div>
                        <Link to="/menu" className="flex items-center gap-2 btn-outline px-8 py-3 border-secondary/10 hover:border-primary text-xs font-black uppercase tracking-[0.3em]">
                            Full Menu <ArrowRight size={14} />
                        </Link>
                    </div>

                    {menuItems.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {menuItems.map((item, i) => (
                                <Link
                                    to="/order"
                                    key={item._id || i}
                                    className="group relative bg-white p-5 rounded-3xl border border-border shadow-soft hover:shadow-premium-hover transition-all duration-500 hover:-translate-y-2 flex flex-col"
                                >
                                    <div className="h-56 mb-5 rounded-2xl overflow-hidden relative shrink-0">
                                        <img
                                            src={getImageUrl(item.image)}
                                            className="w-full h-full object-cover transform group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                                            alt={item.name}
                                            onError={e => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                        <div className="hidden w-full h-full bg-surface items-center justify-center absolute inset-0">
                                            <UtensilsCrossed size={40} className="text-primary/30" />
                                        </div>
                                        <div className="absolute top-4 right-4 glass px-4 py-2 rounded-full text-xs font-black text-secondary">
                                            ₹{item.price}
                                        </div>
                                    </div>
                                    <div className="px-2 flex-grow flex flex-col">
                                        <h3 className="text-2xl font-heading text-secondary mb-2 group-hover:text-primary transition-colors line-clamp-1">{item.name}</h3>
                                        <p className="text-text-muted font-medium mb-5 text-sm flex-grow leading-relaxed opacity-70 line-clamp-2">
                                            {item.description || 'A signature creation from our chef\'s curated collection.'}
                                        </p>
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex">
                                                {[...Array(5)].map((_, s) => (
                                                    <Star key={s} size={12} className="text-primary fill-primary" />
                                                ))}
                                            </div>
                                            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-secondary hover:text-primary transition-colors">
                                                Order <ArrowRight size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-white rounded-3xl border border-border p-5 animate-pulse">
                                    <div className="h-56 bg-surface rounded-2xl mb-5" />
                                    <div className="space-y-3 px-2">
                                        <div className="h-5 bg-surface rounded w-3/4" />
                                        <div className="h-3 bg-surface rounded w-full" />
                                        <div className="h-3 bg-surface rounded w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════ VENUES — LIVE FROM API ═══════════ */}
            {venues.length > 0 && (
                <section className="py-24 md:py-32 bg-secondary text-white relative px-6 overflow-hidden">
                    <div className="absolute inset-0 opacity-5 pointer-events-none">
                        <UtensilsCrossed size={600} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="container mx-auto max-w-7xl relative z-10">
                        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-14 gap-6">
                            <div>
                                <span className="text-primary font-black tracking-[0.4em] uppercase text-[11px] block mb-4">Our Spaces</span>
                                <h2 className="text-white text-4xl md:text-6xl font-heading">Explore <span className="italic text-primary">Venues.</span></h2>
                            </div>
                            <Link to="/venues" className="flex items-center gap-2 border border-white/20 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all">
                                All Venues <ArrowRight size={14} />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {venues.map((venue, i) => (
                                <Link
                                    to={`/venues`}
                                    key={venue._id || i}
                                    className="group relative rounded-3xl overflow-hidden h-80 border border-white/5 hover:border-primary/30 transition-all"
                                >
                                    {venue.media && venue.media.length > 0 ? (
                                        <img
                                            src={getImageUrl(venue.media[0].url || venue.media[0])}
                                            alt={venue.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-surfaceDark flex items-center justify-center">
                                            <MapPin size={40} className="text-primary/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/30 to-transparent" />
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <h3 className="text-white text-2xl font-heading mb-1 group-hover:text-primary transition-colors">{venue.name}</h3>
                                        {venue.capacity?.max && (
                                            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Up to {venue.capacity.max} guests</p>
                                        )}
                                        {venue.location && (
                                            <p className="text-white/30 text-xs mt-1 flex items-center gap-1">
                                                <MapPin size={10} /> {venue.location.area}{venue.location.city ? `, ${venue.location.city}` : ''}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ═══════════ MARQUEE STRIP ═══════════ */}
            <section className="bg-primary py-4 overflow-hidden">
                <div className="flex gap-12 animate-marquee whitespace-nowrap">
                    {[...Array(3)].map((_, rep) =>
                        ['Fine Dining', '·', 'Private Events', '·', 'Online Ordering', '·', 'Venue Bookings', '·', 'Seasonal Menus', '·', 'Craft Cocktails', '·'].map((t, i) => (
                            <span key={`${rep}-${i}`} className="text-secondary text-sm font-black uppercase tracking-[0.3em]">{t}</span>
                        ))
                    )}
                </div>
            </section>

            {/* ═══════════ CONTACT / CTA ═══════════ */}
            <section className="py-24 md:py-32 bg-white relative px-6 overflow-hidden">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <span className="text-primary font-black tracking-[0.4em] uppercase text-[11px] block mb-4">Get In Touch</span>
                            <h2 className="text-secondary text-4xl md:text-6xl font-heading mb-8 leading-tight">
                                Reach Out to our <br /> <span className="italic text-primary">Concierge.</span>
                            </h2>

                            <div className="space-y-8 pt-4">
                                <div className="flex items-start gap-6 group">
                                    <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-soft">
                                        <Phone size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Direct Line</p>
                                        <p className="text-xl font-heading text-secondary">{contactInfo?.phone || 'Loading...'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-6 group">
                                    <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-soft">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Email</p>
                                        <p className="text-xl font-heading text-secondary">{contactInfo?.email || 'Loading...'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-6 group">
                                    <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-soft">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Address</p>
                                        <p className="text-xl font-heading text-secondary leading-snug max-w-xs">{contactInfo?.address || 'Loading...'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-6 group">
                                    <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-soft">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Hours</p>
                                        <p className="text-xl font-heading text-secondary">{contactInfo?.weekdayHours || 'Loading...'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/5 rounded-[3rem] blur-3xl opacity-50" />
                            <div className="relative bg-secondary p-8 md:p-12 rounded-[2.5rem] shadow-2xl space-y-8">
                                <div className="text-center">
                                    <CalendarCheck className="mx-auto w-12 h-12 text-primary mb-4" />
                                    <h3 className="text-3xl font-heading text-white mb-2">Your Table <span className="italic text-primary">Awaits.</span></h3>
                                    <p className="text-white/40 text-sm leading-relaxed max-w-xs mx-auto">
                                        Book your presence at the Vincent Table for an unforgettable experience.
                                    </p>
                                </div>
                                <Link
                                    to="/reserve-table"
                                    className="w-full flex items-center justify-center gap-4 bg-primary text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                                >
                                    Reserve a Table <CalendarCheck size={16} />
                                </Link>
                                <Link
                                    to="/contact"
                                    className="w-full flex items-center justify-center gap-4 border border-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white/5 transition-all"
                                >
                                    Contact Us
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ FOOTER ═══════════ */}
            <footer className="py-16 bg-background border-t border-border px-6">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="md:col-span-2">
                            <h3 className="text-secondary text-3xl font-heading italic mb-3">Vincent</h3>
                            <p className="text-text-muted text-sm leading-relaxed max-w-xs">
                                A celebration of flavour, craft, and human connection.
                            </p>
                        </div>
                        <div>
                            <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-5">Quick Links</p>
                            <div className="space-y-3">
                                {[['Menu', '/menu'], ['Reserve', '/reserve-table'], ['Order Online', '/order'], ['Venues', '/venues'], ['Contact', '/contact']].map(([l, h]) => (
                                    <Link key={l} to={h} className="block text-text-muted text-sm hover:text-primary transition-colors">{l}</Link>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-5">Contact</p>
                            <div className="space-y-3 text-text-muted text-sm">
                                <div className="flex items-start gap-2"><Phone size={14} className="mt-0.5 shrink-0 text-primary" /> {contactInfo?.phone || ''}</div>
                                <div className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-primary" /> {contactInfo?.address || ''}</div>
                                <div className="flex items-start gap-2"><Clock size={14} className="mt-0.5 shrink-0 text-primary" /> {contactInfo?.weekdayHours || ''}</div>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-text-muted text-xs">© 2026 Vincent Restaurant. All rights reserved.</p>
                        <div className="flex gap-8">
                            <Link to="/privacy" className="text-text-muted text-xs hover:text-primary transition-colors">Privacy</Link>
                            <Link to="/terms" className="text-text-muted text-xs hover:text-primary transition-colors">Terms</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
