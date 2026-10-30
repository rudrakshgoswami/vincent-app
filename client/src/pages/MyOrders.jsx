import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { fetchMyOrders, getImageUrl } from '../api';
import OrderCancellationModal from '../components/OrderCancellationModal';
import {
    Package,
    CheckCircle,
    Clock,
    Loader2,
    ChefHat,
    ShoppingBag,
    XCircle,
    ArrowRight,
    Calendar,
    MapPin,
    CreditCard,
    Search,
    AlertCircle,
    IndianRupee,
    Box,
    RefreshCw,
    Sparkles,
    SearchX
} from 'lucide-react';

const STATUS_CONFIGS = {
    pending: { label: 'Placed', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CheckCircle },
    preparing: { label: 'Preparing', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: ChefHat },
    ready: { label: 'Ready', color: 'text-green-500', bg: 'bg-green-500/10', icon: Package },
    delivered: { label: 'Delivered', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: CheckCircle },
    completed: { label: 'Completed', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle }
};

export default function MyOrders() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { socket } = useSocket();
    const [allOrders, setAllOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'history'
    const [showSuccess, setShowSuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCancellationModal, setShowCancellationModal] = useState(false);
    const [cancellationData, setCancellationData] = useState(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (searchParams.get('success') === 'true') {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
        }
        loadOrders();
    }, [user]);

    useEffect(() => {
        if (!socket || !user) return;
        socket.emit('join:user', user._id);
        const handleOrderUpdate = () => loadOrders();
        const handleOrderCancellation = (data) => {
            setCancellationData(data);
            setShowCancellationModal(true);
            loadOrders();
        };
        socket.on('order:statusChanged', handleOrderUpdate);
        socket.on('order:created', handleOrderUpdate);
        socket.on('order:cancelled', handleOrderCancellation);
        return () => {
            socket.off('order:statusChanged');
            socket.off('order:created');
            socket.off('order:cancelled');
        };
    }, [socket, user]);

    useEffect(() => {
        let filtered = [...allOrders];
        if (activeTab === 'active') {
            filtered = filtered.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status));
        } else if (activeTab === 'history') {
            filtered = filtered.filter(o => ['delivered', 'completed', 'cancelled'].includes(o.status));
        }
        if (searchTerm) {
            filtered = filtered.filter(o =>
                o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.items?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        setFilteredOrders(filtered);
    }, [activeTab, allOrders, searchTerm]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const response = await fetchMyOrders();
            const orders = response.data?.orders || response.orders || [];
            setAllOrders(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading && allOrders.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-20 grayscale opacity-40">
                <Box className="w-16 h-16 text-secondary mb-6 animate-bounce" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary">Synchronizing Order Registry...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32 animate-fade-in">
            {/* Hero Section (Condensed) */}
            <div className="pt-16 pb-12 bg-secondary relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                        <div>
                            <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-6">
                                <ShoppingBag size={12} className="text-primary" />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary-light">Operational Tracking</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-heading text-white mb-1 leading-tight">Your <span className="text-primary italic">Manifests</span></h1>
                            <p className="text-white/50 text-sm font-medium uppercase tracking-widest">A detailed ledger of your culinary journeys</p>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                            {['all', 'active', 'history'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setActiveTab(t)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-10 relative z-20">
                {/* Search / Success Bar */}
                <div className="flex flex-col gap-6">
                    {showSuccess && (
                        <div className="bg-white p-4 rounded-2xl border border-green-100 shadow-premium-hover flex items-center gap-4 animate-slide-in">
                            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h4 className="text-lg font-heading text-secondary">Transaction Authenticated</h4>
                                <p className="text-xs font-black uppercase tracking-widest text-green-600">Your order has been inducted into the fulfillment chain.</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-3 rounded-full border border-border shadow-premium flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search manifests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-surface border-transparent focus:border-primary/20 rounded-full py-3 px-14 text-sm font-bold placeholder:text-text-muted/40 transition-all outline-none"
                            />
                        </div>
                        <button onClick={loadOrders} className="w-12 h-12 bg-surface rounded-full flex items-center justify-center text-secondary hover:bg-primary hover:text-white transition-all shadow-sm border border-border">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Orders Grid */}
                {filteredOrders.length === 0 ? (
                    <div className="py-40 text-center animate-fade-in bg-white/50 rounded-[4rem] border border-border mt-10 border-dashed">
                        <SearchX size={64} className="text-text-muted/20 mx-auto mb-8" />
                        <h3 className="text-3xl font-heading text-secondary mb-4">No Records Discovered</h3>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-text-muted mb-12">Try refining your filter parameters</p>
                        <Link to="/order" className="btn-primary px-12 py-5 text-xs font-black uppercase tracking-[0.3em]">
                            Initiate New Manifest
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-10 mt-12 animate-fade-in-up">
                        {filteredOrders.map((order) => {
                            const status = STATUS_CONFIGS[order.status] || STATUS_CONFIGS.pending;
                            const Icon = status.icon;

                            return (
                                <div key={order._id} className="card-premium group overflow-hidden border-transparent hover:border-primary/20 transition-all duration-700">
                                    <div className="flex flex-col lg:flex-row">
                                        {/* Status Sidebar (Condensed Desktop) */}
                                        <div className="lg:w-64 bg-surface/30 p-6 md:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border">
                                            <div>
                                                <div className={`w-12 h-12 ${status.bg} rounded-xl flex items-center justify-center ${status.color} shadow-sm border border-current/10 mb-6`}>
                                                    <Icon size={24} />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-2">Manifest Status</p>
                                                <h4 className={`text-xl font-heading ${status.color} mb-1 italic`}>{status.label}</h4>
                                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">{formatDate(order.createdAt)}</p>
                                            </div>

                                            <div className="pt-6">
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-2">Fiscal Total</p>
                                                <p className="text-3xl font-heading text-secondary leading-none">₹{order.totalAmount.toFixed(0)}</p>
                                            </div>
                                        </div>

                                        {/* Main Order Content */}
                                        <div className="flex-1 p-6 md:p-8">
                                            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-border/50">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1">Electronic ID</p>
                                                    <h3 className="text-2xl font-heading text-secondary leading-none">#{order.orderNumber}</h3>
                                                </div>
                                                <div className="flex items-center gap-8">
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Mode</p>
                                                        <p className="text-xs font-black uppercase tracking-widest text-secondary bg-surface px-4 py-2 rounded-full border border-border">{order.orderType}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Payment</p>
                                                        <p className={`text-xs font-black uppercase tracking-widest ${order.paymentStatus === 'paid' ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50'} px-4 py-2 rounded-full border border-current/10`}>
                                                            {order.paymentStatus === 'paid' ? 'Authenticated' : 'Pending'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-10">
                                                <div>
                                                    <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-4">Culinary Composition</h5>
                                                    <div className="space-y-4">
                                                        {order.items?.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center group/item">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 bg-surface rounded-xl overflow-hidden shadow-inner-soft border border-border group-hover:scale-105 transition-transform">
                                                                        {item.menuItem?.image || item.image ? (
                                                                            <img src={getImageUrl(item.menuItem?.image || item.image)} alt="" className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-text-muted/20"><Package size={14} /></div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-secondary uppercase tracking-tight leading-none mb-1">{item.name || item.menuItem?.name}</p>
                                                                        <p className="text-[11px] font-black text-primary uppercase">Quantity: {item.quantity}</p>
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm font-heading font-medium text-secondary">₹{item.subtotal || (item.price * item.quantity)}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-between">
                                                    <div>
                                                        <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-4">Logistics Summary</h5>
                                                        <div className="space-y-4">
                                                            {order.orderType === 'delivery' && order.deliveryAddress ? (
                                                                <div className="flex gap-4">
                                                                    <MapPin className="text-primary flex-shrink-0" size={18} />
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Coordinates</p>
                                                                        <p className="text-xs font-bold text-secondary uppercase leading-relaxed">{order.deliveryAddress.street}, {order.deliveryAddress.city}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-4">
                                                                    <UtensilsCrossed className="text-primary flex-shrink-0" size={18} />
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Experience</p>
                                                                        <p className="text-xs font-bold text-secondary uppercase leading-relaxed">In-Studio Dining at Vincent Global</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {order.status === 'cancelled' && (
                                                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-4">
                                                                    <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Revocation Motive</p>
                                                                        <p className="text-xs font-bold text-red-900 uppercase leading-relaxed">{order.cancellationReason || 'Operation Aborted'}</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="pt-6">
                                                        <button
                                                            onClick={() => navigate('/menu')}
                                                            className="w-full flex items-center justify-between p-4 bg-surface border border-border rounded-xl group/btn hover:border-primary/50 transition-all shadow-inner-soft"
                                                        >
                                                            <div className="flex flex-col items-start gap-1">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted group-hover/btn:text-primary transition-colors">Repeat Experience</span>
                                                                <span className="text-[11px] font-black uppercase tracking-widest text-secondary">Induct identical manifest</span>
                                                            </div>
                                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform text-primary" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar (Live Status for Active) */}
                                    {!['delivered', 'completed', 'cancelled'].includes(order.status) && (
                                        <div className="bg-secondary p-3 flex items-center justify-between px-8 border-t border-white/10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(182,154,113,0.8)]" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-light">Pipeline Monitoring Active</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {['pending', 'confirmed', 'preparing', 'ready'].map((s, i) => {
                                                    const statuses = ['pending', 'confirmed', 'preparing', 'ready'];
                                                    const currentIndex = statuses.indexOf(order.status);
                                                    return (
                                                        <div key={s} className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${i <= currentIndex ? 'bg-primary scale-125 shadow-[0_0_8px_rgba(182,154,113,0.5)]' : 'bg-white/10'}`} />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <OrderCancellationModal
                isOpen={showCancellationModal}
                onClose={() => setShowCancellationModal(false)}
                cancellationData={cancellationData}
            />

            <style>{`
                .invisible-scrollbar::-webkit-scrollbar { display: none; }
                .invisible-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}

const UtensilsCrossed = ({ size, className }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m16 2 2 2" />
        <path d="m20 2-5 5" />
        <path d="m21 8-2 2" />
        <path d="m14 3-5 5" />
        <path d="m5 13 4-4" />
        <path d="m15 15-5 5" />
        <path d="m20 20-5-5" />
        <path d="m2 20 5-5" />
        <path d="M7 8a2 2 0 0 1-2-2c0-1.1.9-2 2-2s2 .9 2 2a2 2 0 0 1-2 2Z" />
        <path d="M12 15a3 3 0 0 1-3-3l1.5-1.5" />
    </svg>
);
