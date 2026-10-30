import { useEffect, useState } from 'react';
import {
    Search,
    Filter,
    Clock,
    CheckCircle,
    XCircle,
    ChefHat,
    Package,
    Truck,
    RefreshCw,
    SearchX,
    Coffee,
    ArrowUpRight,
    MapPin,
    IndianRupee,
    Box,
    X
} from 'lucide-react';
import { fetchAllOrders, updateOrderStatus } from '../../api';
import { useSocketEvent, SOCKET_EVENTS } from '../../context/SocketContext';

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelOrderId, setCancelOrderId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        loadOrders();
    }, []);

    useEffect(() => {
        filterOrders();
    }, [orders, statusFilter, searchTerm]);

    // Real-time socket listeners
    useSocketEvent(SOCKET_EVENTS.ORDER_CREATED, (newOrder) => {
        setOrders(prev => [newOrder, ...prev]);
    });

    useSocketEvent(SOCKET_EVENTS.ORDER_STATUS_CHANGED, (updatedOrder) => {
        setOrders(prev => prev.map(order =>
            order._id === updatedOrder._id ? updatedOrder : order
        ));
    });

    const loadOrders = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetchAllOrders();
            setOrders(response.data.orders || []);
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to load orders');
            setLoading(false);
        }
    };

    const filterOrders = () => {
        let filtered = [...orders];
        if (statusFilter !== 'all') filtered = filtered.filter(order => order.status === statusFilter);
        if (searchTerm) {
            filtered = filtered.filter(order =>
                order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredOrders(filtered);
    };

    const handleStatusUpdate = async (orderId, newStatus, reason = null) => {
        try {
            await updateOrderStatus(orderId, newStatus, reason);
            await loadOrders();
            setIsCancelModalOpen(false);
            setCancelOrderId(null);
            setCancelReason('');
        } catch (err) {
            alert('Failed: ' + err.message);
        } finally {
            setIsCancelling(false);
        }
    };

    const openCancelModal = (orderId) => {
        setCancelOrderId(orderId);
        setIsCancelModalOpen(true);
    };

    const handleConfirmCancel = () => {
        if (!cancelReason.trim()) {
            alert('Justification required');
            return;
        }
        setIsCancelling(true);
        handleStatusUpdate(cancelOrderId, 'cancelled', cancelReason);
    };

    const getStatusStyle = (status) => {
        const styles = {
            pending: 'border-yellow-200 bg-yellow-50 text-yellow-700',
            confirmed: 'border-blue-200 bg-blue-50 text-blue-700',
            preparing: 'border-purple-200 bg-purple-50 text-purple-700',
            ready: 'border-green-200 bg-green-50 text-green-700',
            delivered: 'border-gray-200 bg-gray-50 text-gray-700',
            cancelled: 'border-red-200 bg-red-50 text-red-700'
        };
        return styles[status] || 'border-border bg-surface text-text-muted';
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: <Clock size={12} />,
            confirmed: <CheckCircle size={12} />,
            preparing: <ChefHat size={12} />,
            ready: <Package size={12} />,
            delivered: <Truck size={12} />,
            cancelled: <XCircle size={12} />
        };
        return icons[status];
    };

    const nextStatuses = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['preparing', 'cancelled'],
        preparing: ['ready', 'cancelled'],
        ready: ['delivered', 'cancelled'],
        delivered: [],
        cancelled: []
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-32 grayscale opacity-40">
                <Coffee className="w-12 h-12 text-secondary mb-4 animate-bounce" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Accessing Logistic Cloud...</p>
            </div>
        );
    }

    return (
        <div className="px-6 py-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-heading text-secondary mb-2">Order Logistics</h1>
                    <p className="text-text-muted text-sm uppercase tracking-widest font-bold">
                        {filteredOrders.length} Operational Parcels Active
                    </p>
                </div>
                <button onClick={loadOrders} className="btn-primary flex items-center gap-3 px-8">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Refresh Cloud
                </button>
            </div>

            {/* Premium Control Bar */}
            <div className="bg-white p-4 rounded-2xl border border-border shadow-premium mb-10 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[320px] group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by logistics ID or guest signature..."
                        className="input-premium pl-12 py-3 border-transparent bg-surface focus:bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex bg-surface p-1 rounded-xl border border-border">
                    {['all', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-white text-secondary shadow-sm' : 'text-text-muted hover:text-primary'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Feed */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-3xl border border-border border-dashed shadow-inner-soft">
                    <SearchX size={60} className="text-text-muted/20 mx-auto mb-6" />
                    <h3 className="text-2xl font-heading text-secondary mb-2">Registry Silent</h3>
                    <p className="text-text-muted text-sm uppercase tracking-widest font-bold">No operational data matches your current query.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filteredOrders.map((order) => (
                        <div key={order._id} className="card-premium group hover:border-primary transition-all duration-500 animate-slide-up overflow-hidden">
                            <div className="flex flex-col lg:flex-row gap-8">
                                {/* Order Main Context */}
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-4 mb-4">
                                        <h3 className="text-2xl font-heading text-secondary mb-0">#{order.orderNumber}</h3>
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {order.status}
                                        </div>
                                        <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm ${order.orderType === 'delivery' ? 'bg-blue-600 text-white' : 'bg-primary text-white'}`}>
                                            {order.orderType}
                                        </div>
                                        <div className="h-4 w-px bg-border hidden sm:block" />
                                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                            Registered: {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-x-10 gap-y-4 mb-6 py-4 border-y border-border/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                                <Box size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] uppercase font-black text-text-muted tracking-widest leading-none mb-1">Guest</p>
                                                <p className="text-sm font-bold text-secondary uppercase tracking-wider leading-none">{order.user?.name}</p>
                                            </div>
                                        </div>
                                        {order.orderType === 'delivery' && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                                    <MapPin size={18} />
                                                </div>
                                                <div className="max-w-[200px]">
                                                    <p className="text-[9px] uppercase font-black text-text-muted tracking-widest leading-none mb-1">Coordinates</p>
                                                    <p className="text-[10px] font-bold text-secondary uppercase tracking-tight leading-none truncate">{order.deliveryAddress?.city}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                                <IndianRupee size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] uppercase font-black text-text-muted tracking-widest leading-none mb-1">Fiscal Total</p>
                                                <p className="text-xl font-heading text-primary leading-none">₹{order.totalAmount}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Line Items */}
                                    <div className="flex flex-wrap gap-2">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="glass border border-border px-3 py-1.5 rounded-lg flex items-center gap-3 bg-surface/50">
                                                <span className="text-[10px] font-black text-primary">x{item.quantity}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">{item.menuItem?.name || item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Order Actions Sidebar */}
                                <div className="lg:w-64 border-l-0 lg:border-l border-border pl-0 lg:pl-8 flex flex-col justify-center gap-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1 text-center lg:text-left">Logistic Pipeline</p>
                                    <div className="flex flex-row lg:flex-col gap-3">
                                        {nextStatuses[order.status]?.map((nextStatus) => (
                                            <button
                                                key={nextStatus}
                                                onClick={() => nextStatus === 'cancelled' ? openCancelModal(order._id) : handleStatusUpdate(order._id, nextStatus)}
                                                className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 ${nextStatus === 'cancelled'
                                                    ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white'
                                                    : 'bg-secondary text-white border border-secondary hover:bg-primary hover:border-primary'
                                                    }`}
                                            >
                                                {getStatusIcon(nextStatus)}
                                                {nextStatus === 'confirmed' && 'Approve'}
                                                {nextStatus === 'preparing' && 'Begin Prep'}
                                                {nextStatus === 'ready' && 'Dispatch Ready'}
                                                {nextStatus === 'delivered' && 'Finalize'}
                                                {nextStatus === 'cancelled' && 'Revoke'}
                                            </button>
                                        ))}
                                        {nextStatuses[order.status]?.length === 0 && (
                                            <div className="py-4 px-6 bg-surface rounded-2xl border border-border flex items-center justify-center gap-2 opacity-40">
                                                <CheckCircle size={14} className="text-secondary" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Workflow Complete</span>
                                            </div>
                                        )}
                                    </div>
                                    <button className="py-2.5 text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-secondary flex items-center justify-center gap-2 group/btn transition-colors">
                                        Audit Registry <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination / Institutional Footer */}
            <div className="mt-20 flex flex-col items-center gap-6 py-12 border-t border-border opacity-40 grayscale group">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col items-center gap-1">
                        <Box size={24} className="group-hover:text-secondary transition-colors" />
                        <span className="text-[8px] font-black uppercase tracking-[0.3em]">Logistics</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <RefreshCw size={24} className="group-hover:text-secondary transition-colors" />
                        <span className="text-[8px] font-black uppercase tracking-[0.3em]">Synching</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <CheckCircle size={24} className="group-hover:text-secondary transition-colors" />
                        <span className="text-[8px] font-black uppercase tracking-[0.3em]">Compliance</span>
                    </div>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest">Vincent Logistics Cloud Institutional Portal © 2026</p>
            </div>

            {/* Cancellation Modal (Premium) */}
            {isCancelModalOpen && (
                <div className="overlay-premium z-[9999]" onClick={() => setIsCancelModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-premium w-full max-w-md overflow-hidden animate-scale-up border border-white/20" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-border bg-surface/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12">
                                <XCircle size={120} />
                            </div>
                            <h3 className="text-2xl font-heading text-secondary mb-1">Revocation Mandate</h3>
                            <p className="text-text-muted uppercase text-[10px] font-bold tracking-widest">Formal cancellation of Fulfillment Chain</p>
                        </div>
                        <div className="p-8">
                            <label className="label-premium">Operational Justification</label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Explicate the rationale for logistic revocation..."
                                className="input-premium h-32 resize-none !rounded-2xl"
                                required
                            />
                        </div>
                        <div className="p-8 bg-surface/30 flex gap-4">
                            <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-text-muted">Dismiss</button>
                            <button
                                onClick={handleConfirmCancel}
                                disabled={isCancelling || !cancelReason.trim()}
                                className="flex-1 py-4 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-premium hover:bg-red-700 transition-all disabled:opacity-50"
                            >
                                {isCancelling ? 'Processing...' : 'Execute Revocation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
