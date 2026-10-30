import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMenu, getImageUrl } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, X, Search, Sparkles, Star, ArrowRight, ChefHat, Info } from 'lucide-react';

export default function Order() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);
    const { addToCart, isCartOpen, setIsCartOpen, cart, updateQuantity, removeFromCart, cartTotal } = useCart();

    useEffect(() => {
        fetchMenu().then(data => {
            setCategories(data);
            if (data.length > 0) setActiveCategory(data[0].id || data[0]._id || data[0].name);
            setLoading(false);
        });
    }, []);

    const scrollToCategory = (id) => {
        setActiveCategory(id);
        const element = document.getElementById(`category-${id}`);
        if (element) {
            window.scrollTo({
                top: element.offsetTop - 140,
                behavior: 'smooth'
            });
        }
    };

    const handleCheckout = () => {
        if (!user) {
            navigate('/login?redirect=/checkout');
            return;
        }
        navigate('/checkout');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-20 grayscale opacity-40">
                <ChefHat className="w-16 h-16 text-secondary mb-6 animate-bounce" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-secondary">Synchronizing Culinary Inventory...</p>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen pt-0 pb-32 animate-fade-in relative">
            {/* Cart Sidebar (Premium Overhaul) */}
            <div
                className={`fixed inset-0 z-[100] bg-secondary/60 backdrop-blur-sm transition-opacity duration-500 ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsCartOpen(false)}
            />
            <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-premium transform transition-transform duration-700 ease-in-out z-[110] border-l border-border flex flex-col overflow-hidden ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-border bg-surface/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 scale-125 rotate-12">
                        <ShoppingBag size={100} />
                    </div>
                    <div className="flex justify-between items-center relative z-10">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1">Your Selection</p>
                            <h2 className="text-2xl font-heading text-secondary italic">Experience Cart</h2>
                        </div>
                        <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-secondary hover:text-primary transition-colors shadow-sm">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center text-text-muted/20 mb-4">
                                <ShoppingBag size={28} />
                            </div>
                            <h3 className="text-lg font-heading text-secondary mb-1">Registry Vacant</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Initiate your culinary journey from the menu.</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="group relative flex gap-6 items-center bg-white p-4 rounded-3xl border border-transparent hover:border-primary/20 transition-all duration-500 hover:shadow-premium-hover">
                                <div className="w-20 h-20 flex-shrink-0 bg-surface rounded-xl overflow-hidden border border-border">
                                    <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all" />
                                </div>
                                <div className="flex-grow">
                                    <h4 className="text-base font-heading text-secondary leading-none mb-1 group-hover:text-primary transition-colors">{item.name}</h4>
                                    <p className="text-[11px] font-black tracking-widest text-primary uppercase mb-3">₹{item.price}</p>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center bg-surface border border-border rounded-lg p-1">
                                            <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition-colors text-text-muted">
                                                <Minus size={10} />
                                            </button>
                                            <span className="px-3 text-xs font-black text-secondary">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition-colors text-text-muted">
                                                <Plus size={10} />
                                            </button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-red-600 transition-colors">Discard</button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-heading text-secondary">₹{item.price * item.quantity}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-surface/50 border-t border-border mt-auto">
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Subtotal Indicated</p>
                            <p className="text-xs font-bold text-secondary">₹{cartTotal.toFixed(0)}</p>
                        </div>
                        <div className="flex justify-between items-center text-primary pt-3 border-t border-border">
                            <p className="text-xs font-black uppercase tracking-[0.4em]">Proprietary Total</p>
                            <p className="text-2xl font-heading">₹{cartTotal.toFixed(0)}</p>
                        </div>
                    </div>

                    <button
                        disabled={cart.length === 0}
                        onClick={handleCheckout}
                        className="w-full bg-secondary text-white py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.4em] shadow-premium hover:bg-primary transition-all disabled:opacity-30 flex items-center justify-center gap-3 group/btn"
                    >
                        {cart.length === 0 ? 'Registry Vacant' : 'Induct for Fulfillment'}
                        {cart.length > 0 && <ArrowRight size={12} className="group-hover:translate-x-2 transition-transform" />}
                    </button>
                    <p className="text-center mt-4 text-[8px] font-black uppercase tracking-[0.5em] text-text-muted opacity-40">Payment Securely Authenticated via Razorpay</p>
                </div>
            </div>

            {/* Main Premium Edge-to-Edge Header Section */}
            <div className="relative pt-[120px] pb-24 overflow-hidden bg-[#0A261A] mb-16 shadow-2xl w-full border-b-[6px] border-primary/20">
                {/* Embedded CSS for Floating Animations */}
                <style>{`
                    @keyframes float-slow {
                        0%, 100% { transform: translateY(0) rotate(0deg); }
                        50% { transform: translateY(-30px) rotate(8deg); }
                    }
                    @keyframes float-reverse {
                        0%, 100% { transform: translateY(0) rotate(0deg); }
                        50% { transform: translateY(30px) rotate(-8deg); }
                    }
                `}</style>
                
                {/* Background Details & Dots Pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.6) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
                
                {/* Ambient Glows */}
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#10b981] rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

                {/* Designer Aesthetic Objects */}
                <div className="absolute top-[10%] right-[10%] text-white/5 rotate-12 pointer-events-none" style={{ animation: 'float-slow 25s ease-in-out infinite' }}>
                    <ArrowRight size={300} strokeWidth={0.5} className="rotate-45" />
                </div>
                <div className="absolute bottom-[5%] left-[5%] text-white/5 -rotate-45 pointer-events-none" style={{ animation: 'float-reverse 20s ease-in-out infinite' }}>
                    <ShoppingBag size={400} strokeWidth={0.5} />
                </div>

                <div className="container mx-auto px-8 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-white/10 backdrop-blur-md text-white rounded-full mb-6 border border-white/20 shadow-sm animate-fade-in-up">
                            <Sparkles size={12} className="text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/90">Operational Gastronomy</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-heading text-white leading-tight mb-4 drop-shadow-xl animate-fade-in-up font-delay-100">
                            Place <span className="italic text-primary">Manifest.</span>
                        </h1>
                        <p className="text-white/70 text-lg font-medium leading-relaxed animate-fade-in-up font-delay-200">
                            Select from our curated chapters to initiate a tailored culinary event at your residence.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-end md:items-center animate-fade-in-up font-delay-200">
                        <div className="relative group w-full md:w-auto">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-primary transition-colors z-10" size={18} />
                            <input
                                type="text"
                                placeholder="Discover chapters..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-80 bg-white/5 backdrop-blur-md border border-white/20 rounded-full py-4 pl-14 pr-8 text-sm font-bold placeholder:text-white/50 text-white transition-all outline-none focus:bg-white/10 focus:border-white/40 shadow-xl"
                            />
                        </div>
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-14 h-14 bg-primary text-[#0A261A] rounded-full flex items-center justify-center relative shadow-xl hover:bg-white hover:text-black transition-all active:scale-95 group flex-shrink-0"
                        >
                            <ShoppingBag size={20} className="group-hover:animate-bounce" />
                            {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center border-2 border-[#0A261A] animate-fade-in shadow-sm">{cart.length}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            {/* Sticky Category Navigation */}
            <div className="sticky top-16 md:top-[72px] z-40 bg-white/95 backdrop-blur-md border-y border-border shadow-sm mb-12">
                <div className="w-full max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 flex gap-3 overflow-x-auto pb-1 md:pb-0 w-full invisible-scrollbar mask-gradient-right">
                        {categories.map((cat) => (
                            <button
                                key={cat.id || cat.name}
                                onClick={() => scrollToCategory(cat.id || cat.name)}
                                className={`flex-shrink-0 whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.05em] transition-all duration-300 shadow-sm ${
                                    activeCategory === (cat.id || cat.name) 
                                        ? 'bg-secondary text-white transform scale-[1.02]' 
                                        : 'bg-surface text-secondary hover:bg-border border border-border/50'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Grid */}
            <div className="w-full max-w-[1600px] mx-auto px-6">
                <div className="space-y-16">
                    {categories.map((category) => {
                        const items = (category.Items || []).filter(i =>
                            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            i.description.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        if (searchTerm && items.length === 0) return null;

                        return (
                            <section key={category.id || category.name} id={`category-${category.id || category.name}`} className="scroll-mt-48">
                                <div className="flex items-center gap-4 mb-8">
                                    <h2 className="text-2xl font-heading text-secondary italic">{category.name}</h2>
                                    <div className="flex-grow h-px bg-border" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">{items.length} Selections</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                                    {items.map((item) => (
                                        <div key={item.id} className="group relative bg-white rounded-2xl border border-border shadow-soft hover:shadow-premium-hover transition-all duration-700 hover:-translate-y-1.5 overflow-hidden flex flex-col">
                                            <div className="w-full aspect-[4/3] overflow-hidden relative">
                                                <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.3] group-hover:grayscale-0" />
                                                {item.isVeg && (
                                                    <div className="absolute top-6 left-6 flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-md text-green-600 rounded-full shadow-sm">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Pure Veg</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                            </div>

                                            <div className="p-5 flex-grow flex flex-col">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="text-xl font-heading text-secondary group-hover:text-primary transition-colors leading-none">{item.name}</h3>
                                                    <span className="text-base font-heading text-secondary italic">₹{item.price}</span>
                                                </div>
                                                <p className="text-text-muted text-xs font-medium mb-6 flex-grow opacity-80 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all duration-500">
                                                    {item.description}
                                                </p>

                                                <button
                                                    onClick={() => addToCart(item)}
                                                    className="w-full py-3 border-2 border-primary/20 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-primary hover:bg-primary hover:text-white transition-all transform active:scale-95 flex items-center justify-center gap-3"
                                                >
                                                    <Plus size={12} /> Add to Manifest
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* Order Tips Footer */}
            <div className="container mx-auto px-6 mt-20">
                <div className="bg-surfaceDark p-10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-10 border border-white/5">
                    <div className="max-w-xl text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3 text-primary mb-4">
                            <Info size={24} />
                            <span className="text-[11px] font-black uppercase tracking-[0.4em]">Operational Guidance</span>
                        </div>
                        <h2 className="text-3xl font-heading text-white mb-4">Induction Protocol</h2>
                        <p className="text-white/40 text-[11px] font-medium leading-relaxed tracking-wider uppercase">
                            Minimum procurement value: ₹500. Logistics estimated time: 45-60 minutes depending on your territorial coordinates. All manifestations are securely processed via encrypted fiscal channels.
                        </p>
                    </div>
                    <div className="flex-shrink-0 grid grid-cols-2 gap-3">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center group hover:bg-primary transition-colors duration-700">
                            <Star className="text-primary mx-auto mb-3 group-hover:text-white" size={20} />
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Quality Assured</p>
                        </div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center group hover:bg-primary transition-colors duration-700">
                            <ChefHat className="text-primary mx-auto mb-3 group-hover:text-white" size={20} />
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Chef Curated</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E8E5DF; border-radius: 99px; }
            `}</style>
        </div>
    );
}

const Plus = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const Minus = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);
