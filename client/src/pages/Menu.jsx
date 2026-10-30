import { useEffect, useState } from 'react';
import {
    Search,
    Leaf,
    Flame,
    Star,
    Info,
    ChefHat,
    ArrowRight,
    UtensilsCrossed,
    Sparkles
} from 'lucide-react';
import { fetchMenu, getImageUrl } from '../api';

export default function Menu() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

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
                top: element.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-20 grayscale opacity-40">
                <ChefHat className="w-16 h-16 text-secondary mb-6 animate-bounce" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-secondary">Preparing the Masterpiece...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#0A261A] min-h-screen pb-32 animate-fade-in relative z-0">
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

            {/* Infinite Dots Pattern Background - Designer style */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.25] mix-blend-overlay z-[-2]"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.5) 1.5px, transparent 1.5px)',
                    backgroundSize: '24px 24px',
                    backgroundPosition: '0 0'
                }}>
            </div>

            {/* Designing Objects (Prominent Background SVGs) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
                {/* Soft Glowing Orbs to give the green depth */}
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary rounded-full blur-[150px] opacity-20"></div>
                <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-[#10b981] rounded-full blur-[150px] opacity-10"></div>
                <div className="absolute bottom-[10%] left-[20%] w-[400px] h-[400px] bg-[#059669] rounded-full blur-[150px] opacity-20"></div>

                {/* Floating Aesthetic Objects */}
                <div className="absolute top-[5%] left-[5%] text-white/5 rotate-12" style={{ animation: 'float-slow 25s ease-in-out infinite' }}>
                    <Leaf size={400} strokeWidth={0.5} />
                </div>
                <div className="absolute top-[30%] right-[2%] text-white/5 -rotate-12" style={{ animation: 'float-reverse 30s ease-in-out infinite' }}>
                    <ChefHat size={350} strokeWidth={0.5} />
                </div>
                <div className="absolute bottom-[20%] left-[8%] text-white/5 rotate-45" style={{ animation: 'float-slow 28s ease-in-out infinite 2s' }}>
                    <UtensilsCrossed size={450} strokeWidth={0.5} />
                </div>
                <div className="absolute top-[60%] right-[15%] text-white/5 -rotate-45" style={{ animation: 'float-reverse 20s ease-in-out infinite 1s' }}>
                    <Flame size={300} strokeWidth={0.5} />
                </div>
            </div>

            {/* Hero Section */}
            <div className="relative pt-20 pb-20 overflow-hidden bg-transparent z-10">
                <div className="container mx-auto px-6 relative text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6 shadow-sm animate-fade-in-up">
                        <Sparkles size={14} className="text-white" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Aesthetic Experience</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-heading text-white mb-4 animate-fade-in-up font-delay-100 drop-shadow-xl">
                        Our <span className="text-primary italic">Menu</span>
                    </h1>
                </div>
            </div>

            {/* Sticky Navigation & Search */}
            <div className="sticky top-16 lg:top-[76px] z-40 bg-[#0A261A]/80 backdrop-blur-xl border-y border-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
                <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto pb-1 md:pb-0 w-full invisible-scrollbar pr-4 mask-gradient-right">
                        {categories.map((cat) => (
                            <button
                                key={cat.id || cat.name}
                                onClick={() => scrollToCategory(cat.id || cat.name)}
                                className={`flex-shrink-0 whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.05em] transition-all duration-300 shadow-sm ${activeCategory === (cat.id || cat.name)
                                        ? 'bg-primary text-secondary transform scale-[1.02]'
                                        : 'bg-white/5 text-white/70 hover:bg-white/20 hover:text-white border border-white/5'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-80 flex-shrink-0 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Explore our dishes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 focus:border-primary/50 focus:bg-white/10 rounded-full transition-all outline-none text-xs font-medium placeholder:text-white/50 text-white shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Menu Content */}
            <div className="container mx-auto px-4 lg:px-8 mt-12 relative z-10 min-h-screen">
                <div className="space-y-16 relative z-10 max-w-[1400px] mx-auto pb-20">
                    {categories.map((category) => {
                        const items = (category.Items || []).filter(i =>
                            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            i.description.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        if (searchTerm && items.length === 0) return null;

                        return (
                            <section key={category.id || category.name} id={`category-${category.id || category.name}`} className="scroll-mt-40 animate-fade-in-up">
                                <div className="flex items-center gap-4 mb-8 pt-4">
                                    <h2 className="text-[32px] font-heading font-medium text-white tracking-wide">{category.name}</h2>
                                    <div className="h-px bg-white/20 flex-1 ml-4 mt-2"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                                    {items.map((item) => (
                                        <div key={item.id || item._id} className="group flex justify-between items-start p-6 bg-white/95 backdrop-blur-sm shadow-[0_4px_30px_-4px_rgba(0,0,0,0.3)] border border-white/10 hover:bg-white transition-all duration-300 rounded-3xl hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transform hover:-translate-y-1">
                                            <div className="flex-1 pr-4 relative">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    {item.isVeg ? (
                                                        <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-green-500 mt-1 shadow-sm" />
                                                    ) : (
                                                        <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shadow-sm" />
                                                    )}

                                                    <h3 className="text-lg font-heading font-bold text-secondary group-hover:text-primary transition-colors leading-snug">{item.name}</h3>

                                                    <div className="flex gap-2">
                                                        {item.isBestSeller && (
                                                            <span className="text-[10px] font-medium bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide shadow-sm">Chef's Special</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-text-muted text-sm ml-5.5 pl-0.5 line-clamp-2 md:line-clamp-none leading-relaxed font-medium">
                                                    {item.description}
                                                </p>
                                            </div>
                                            <div className="font-heading font-bold text-secondary mt-1 whitespace-nowrap text-lg group-hover:-translate-x-1 transition-transform">
                                                ₹{item.price}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* Menu Footer */}
            <div className="container mx-auto px-6 mt-24">
                <div className="bg-secondary p-10 md:p-12 rounded-3xl relative overflow-hidden text-center text-white shadow-premium">
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <UtensilsCrossed size={400} className="absolute -bottom-20 -right-20 rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <Info size={32} className="mx-auto mb-6 text-primary" />
                        <h2 className="text-3xl md:text-4xl font-heading mb-4 italic">Dietary Information</h2>
                        <p className="text-white/60 max-w-2xl mx-auto text-base leading-relaxed mb-8">
                            Please inform your server of any food allergies or special dietary requirements. Our kitchen meticulously prepares each dish to meet the highest standards of safety and excellence.
                        </p>
                        <div className="flex flex-wrap justify-center gap-8">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Vegetarian</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">House Favorite</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .invisible-scrollbar::-webkit-scrollbar { display: none; }
                .invisible-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
