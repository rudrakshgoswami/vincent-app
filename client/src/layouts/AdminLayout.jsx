import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingBag,
    Calendar,
    UtensilsCrossed,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Grid3x3,
    BarChart3,
    MessageSquare,
    Loader2,
    Building2,
    FileText,
    Utensils,
    Quote
} from 'lucide-react';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../api';

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading, logout, isAdmin } = useAuth();

    // Wait for auth to initialize (silentRefresh to complete on page reload)
    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            navigate('/admin/login');
        }
    }, [loading, user, isAdmin, navigate]);

    const handleLogout = () => {
        logout(); // clears memory + cookie, redirects to /login
        navigate('/admin/login');
    };

    // Show spinner while auth is being restored from refresh cookie
    if (loading || !user || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-gray-500">Loading admin panel...</p>
                </div>
            </div>
        );
    }

    const admin = user; // alias for rest of component

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        { icon: ShoppingBag, label: 'Orders', path: '/admin/orders' },
        { icon: Calendar, label: 'Table Reservations', path: '/admin/reservations' },
        { icon: Grid3x3, label: 'Table Management', path: '/admin/tables' },
        { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
        { icon: UtensilsCrossed, label: 'Menu Management', path: '/admin/menu' },
        { type: 'divider', label: 'Venue System' },
        { icon: Building2, label: 'Venues', path: '/admin/venues' },
        { icon: FileText, label: 'Venue Bookings', path: '/admin/venue-bookings' },

        { icon: Utensils, label: 'Catering', path: '/admin/catering' },


        { type: 'divider', label: 'System' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: MessageSquare, label: 'Contact Messages', path: '/admin/messages' },
        { icon: Settings, label: 'Settings & Profile', path: '/admin/profile' },
    ];

    const isActive = (path) => location.pathname === path;

    if (!admin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-secondary text-white transition-all duration-300 flex flex-col fixed h-full z-20`}>
                {/* Logo */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        {sidebarOpen && (
                            <div>
                                <h1 className="text-xl font-heading">Vincent</h1>
                                <p className="text-[11px] text-white/50">Admin Panel</p>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 overflow-y-auto scrollbar-hide">
                    <ul className="space-y-1">
                        {menuItems.map((item, idx) => (
                            item.type === 'divider' ? (
                                <li key={`div-${idx}`} className="pt-3 pb-1">
                                    {sidebarOpen && <p className="px-3 text-[10px] uppercase tracking-widest text-white/30 font-semibold">{item.label}</p>}
                                    {!sidebarOpen && <div className="border-t border-white/10 mx-2"></div>}
                                </li>
                            ) : (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isActive(item.path)
                                            ? 'bg-primary text-white'
                                            : 'hover:bg-white/10 text-white/80 hover:text-white'
                                            }`}
                                        title={!sidebarOpen ? item.label : ''}
                                    >
                                        <item.icon size={18} />
                                        {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                                    </Link>
                                </li>
                            )
                        ))}
                    </ul>
                </nav>

                {/* Admin Info & Logout */}
                <div className="p-3 border-t border-white/10">
                    {sidebarOpen && (
                        <div className="mb-2 px-2">
                            <p className="text-base font-medium truncate">{admin.name}</p>
                            <p className="text-[11px] text-white/50 truncate">{admin.email}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                        <LogOut size={16} />
                        {sidebarOpen && <span className="text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-[margin-left] duration-300 min-h-screen`}>
                {/* Top Navbar */}
                <header className={`bg-white border-b border-gray-200 fixed top-0 right-0 ${sidebarOpen ? 'left-64' : 'left-20'} z-10 transition-all duration-300`}>
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-heading text-secondary">
                                {menuItems.find(item => isActive(item.path))?.label || 'Admin Panel'}
                            </h2>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-base font-medium text-secondary">{admin.name}</p>
                                    <p className="text-[11px] text-text-muted capitalize">{admin.role?.replace('_', ' ')}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                    {admin.profilePicture ? (
                                        <img src={getImageUrl(admin.profilePicture)} alt="Admin" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                                            <span className="text-lg font-bold">{admin.name?.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 pt-[72px]">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
