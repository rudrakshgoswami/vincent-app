import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Coffee, Menu as MenuIcon, X, User, LogOut, ShoppingBag, Calendar, Home as HomeIcon, MessageSquare, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'http://localhost:5000';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated, logout } = useAuth();

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Menu', path: '/menu' },
        { name: 'Venues', path: '/venues' },
        { name: 'Order Online', path: '/order' },
        { name: 'Contact', path: '/contact' },
    ];

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showProfileMenu && !event.target.closest('.profile-menu-container')) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showProfileMenu]);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        logout();
        setShowProfileMenu(false);
        navigate('/login');
    };

    const getUserInitials = () => {
        if (!user?.name) return 'U';
        return user.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getProfilePic = () => {
        if (!user?.profilePicture) return null;
        return user.profilePicture.startsWith('http')
            ? user.profilePicture
            : `${BASE_URL}${user.profilePicture}`;
    };

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-xl py-4 shadow-sm border-b border-border transition-all duration-300">
            <div className="container mx-auto px-6 flex items-center justify-between">
                {/* Logo Section */}
                <Link to="/" className="flex items-center gap-4 group">
                    <div className="relative">
                        <div className="w-11 h-11 bg-secondary rounded-2xl flex items-center justify-center transform group-hover:rotate-[10deg] transition-all duration-500 shadow-lg overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Coffee className="w-6 h-6 text-white relative z-10 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background scale-0 group-hover:scale-100 transition-transform duration-500 delay-100" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-heading text-2xl tracking-[0.15em] text-secondary font-bold leading-none">VINCENT</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary mt-1 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-1 group-hover:translate-y-0">Gastronomy Cloud</span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1">
                    <div className="flex items-center bg-surface/50 backdrop-blur-md rounded-full border border-border/50 p-1 mr-4 shadow-inner-soft">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-6 py-2 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold transition-all duration-500 relative flex items-center justify-center group ${isActive(link.path) ? 'text-white' : 'text-secondary/60 hover:text-secondary'}`}
                            >
                                {isActive(link.path) && (
                                    <div className="absolute inset-0 bg-secondary rounded-full shadow-lg animate-scale-up" />
                                )}
                                <span className="relative z-10">{link.name}</span>
                                {!isActive(link.path) && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0" />
                                )}
                            </Link>
                        ))}
                    </div>

                    <div className="h-8 w-px bg-border/60 mx-6" />

                    <div className="flex items-center gap-4">
                        <Link to="/reserve-table" className="group relative overflow-hidden bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] px-8 py-3 rounded-full shadow-lg hover:shadow-primary/30 transition-all duration-500 active:scale-95">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <span className="relative z-10 flex items-center gap-2">
                                <Calendar size={14} />
                                Reservations
                            </span>
                        </Link>

                        {/* User Profile / Login */}
                        {isAuthenticated ? (
                            <div className="relative profile-menu-container">
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className={`flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-full border transition-all duration-500 group ${showProfileMenu ? 'bg-secondary border-secondary shadow-lg' : 'bg-white border-border hover:border-primary/30 shadow-premium'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 overflow-hidden ${showProfileMenu ? 'bg-primary text-white rotate-[360deg]' : 'bg-secondary text-white'}`}>
                                        {getProfilePic() ? (
                                            <img src={getProfilePic()} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            getUserInitials()
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-black tracking-widest uppercase transition-colors duration-500 ${showProfileMenu ? 'text-white' : 'text-secondary'}`}>
                                        {user?.name?.split(' ')[0] || 'User'}
                                    </span>
                                </button>

                                {/* Profile Dropdown (Polished) */}
                                {showProfileMenu && (
                                    <div className="absolute right-0 mt-4 w-72 bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] border border-border overflow-hidden animate-scale-up z-[60]">
                                        <div className="relative p-6 bg-secondary overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
                                                <User size={80} className="text-white" />
                                            </div>
                                            <div className="relative z-10">
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80 mb-2">Member Identity</p>
                                                <p className="text-xl font-heading text-white mb-0.5">{user?.name}</p>
                                                <p className="text-[10px] text-white/40 tracking-widest uppercase">{user?.email}</p>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-white space-y-1">
                                            {[
                                                { to: '/profile', icon: User, label: 'Profile Registry' },
                                                { to: '/my-orders', icon: ShoppingBag, label: 'Order Manifests' },
                                                { to: '/my-venue-bookings', icon: Building2, label: 'Venue Bookings' },
                                                { to: '/my-table-reservations', icon: Calendar, label: 'Table Bookings' },
                                                { to: '/my-messages', icon: MessageSquare, label: 'My Messages' },
                                            ].map((item) => (
                                                <Link
                                                    key={item.to}
                                                    to={item.to}
                                                    onClick={() => setShowProfileMenu(false)}
                                                    className="flex items-center justify-between px-4 py-3 hover:bg-surface rounded-xl transition-all duration-300 group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                            <item.icon size={16} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest group-hover:translate-x-1 transition-transform">{item.label}</span>
                                                    </div>
                                                    <ArrowRight size={14} className="text-primary/40 group-hover:text-primary transition-all group-hover:translate-x-1" />
                                                </Link>
                                            ))}
                                        </div>

                                        <div className="px-3 pb-3">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-4 px-4 py-4 bg-red-50 hover:bg-red-500 group transition-all duration-500 rounded-xl"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                                    <LogOut size={16} />
                                                </div>
                                                <span className="text-[10px] font-black text-red-600 group-hover:text-white uppercase tracking-widest">Log Out</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="group relative px-8 py-3 rounded-full border-2 border-secondary text-secondary hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-secondary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                <span className="relative z-10">Log In</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Mobile Toggle */}
                <button
                    className={`md:hidden p-2.5 rounded-xl transition-all duration-500 ${isOpen ? 'bg-secondary text-white' : 'bg-surface text-secondary'}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={24} /> : <MenuIcon size={24} />}
                </button>
            </div>

            {/* Mobile Menu (Polished) */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-border p-6 shadow-2xl animate-fade-in flex flex-col gap-2">
                    {navLinks.map((link, i) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center justify-between p-4 rounded-xl transition-all duration-500 ${isActive(link.path) ? 'bg-secondary text-white shadow-lg' : 'bg-surface text-secondary hover:translate-x-2'}`}
                            style={{ animationDelay: `${i * 0.1}s` }}
                        >
                            <span className="text-xs font-black uppercase tracking-[.2em]">{link.name}</span>
                            <ArrowRight size={16} className={isActive(link.path) ? 'text-primary' : 'text-primary/40'} />
                        </Link>
                    ))}
                    <Link
                        to="/reserve-table"
                        onClick={() => setIsOpen(false)}
                        className="bg-primary text-white w-full mt-4 p-5 rounded-2xl uppercase tracking-[0.3em] font-black text-[10px] flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
                    >
                        <Calendar size={18} />
                        Reserve Table
                    </Link>

                    {isAuthenticated ? (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <Link
                                to="/profile"
                                onClick={() => setIsOpen(false)}
                                className="flex flex-col items-center gap-2 p-4 bg-surface rounded-xl text-secondary"
                            >
                                <User size={20} className="text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Registry</span>
                            </Link>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    handleLogout();
                                }}
                                className="flex flex-col items-center gap-2 p-4 bg-red-50 rounded-xl text-red-500"
                            >
                                <LogOut size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            onClick={() => setIsOpen(false)}
                            className="w-full mt-4 p-5 rounded-2xl border-2 border-secondary text-secondary flex items-center justify-center font-black text-[10px] uppercase tracking-[0.3em] active:scale-95 transition-all"
                        >
                            Log In
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
}

const ArrowRight = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
);
