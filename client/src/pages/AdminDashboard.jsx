import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    ShoppingBag, IndianRupee, Calendar, Users,
    TrendingUp, Clock, AlertCircle, RefreshCw,
    ChefHat, MapPin, Phone, ArrowRight, Bell,
    UtensilsCrossed, Building2, CheckCircle, XCircle
} from 'lucide-react';
import {
    fetchOrderStats, fetchReservationStats,
    fetchAllOrders, fetchAllReservations,
    fetchVenueBookingStats, getUserStats,
    fetchAllVenueBookings
} from '../api';
import { useSocketEvent, SOCKET_EVENTS } from '../context/SocketContext';

// ── Status badge helpers ──────────────────────────────────────
const ORDER_STATUS = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    preparing: { label: 'Preparing', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    ready: { label: 'Ready', color: 'bg-green-100 text-green-700 border-green-200' },
    delivered: { label: 'Delivered', color: 'bg-gray-100 text-gray-600 border-gray-200' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
};

const RESV_STATUS = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    seated: { label: 'Seated', color: 'bg-green-100 text-green-700 border-green-200' },
    completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600 border-gray-200' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
    no_show: { label: 'No-Show', color: 'bg-red-100 text-red-700 border-red-200' },
};

const StatusBadge = ({ status, map }) => {
    const s = map[status?.toLowerCase()] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>
            {s.label}
        </span>
    );
};

const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        todayOrders: 0, todayRevenue: 0, activeOrders: 0, totalRevenue: 0,
        pendingReservations: 0, pendingVenueBookings: 0, totalUsers: 0
    });
    const [pendingOrders, setPendingOrders] = useState([]);
    const [pendingReservations, setPendingReservations] = useState([]);
    const [pendingVenueBookingsList, setPendingVenueBookingsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    // ── Real-time socket: push new orders/reservations to top ──
    useSocketEvent(SOCKET_EVENTS.ORDER_CREATED, (newOrder) => {
        if (newOrder.status === 'pending') {
            setPendingOrders(prev => [newOrder, ...prev]);
            setStats(s => ({ ...s, todayOrders: s.todayOrders + 1 }));
        }
    });

    useSocketEvent(SOCKET_EVENTS.ORDER_STATUS_CHANGED, (updated) => {
        setPendingOrders(prev => {
            // If no longer pending, remove from list
            if (updated.status !== 'pending') return prev.filter(o => o._id !== updated._id);
            return prev.map(o => o._id === updated._id ? updated : o);
        });
    });

    useSocketEvent(SOCKET_EVENTS.RESERVATION_CREATED, (newResv) => {
        if (newResv.status === 'pending') {
            setPendingReservations(prev => [newResv, ...prev]);
        }
    });

    useSocketEvent(SOCKET_EVENTS.RESERVATION_STATUS_CHANGED, (updated) => {
        setPendingReservations(prev => {
            if (updated.status !== 'pending') return prev.filter(r => r._id !== updated._id);
            return prev.map(r => r._id === updated._id ? updated : r);
        });
    });

    // ── Load all dashboard data ─────────────────────────────────
    const loadData = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            setError('');

            const [orderStats, reservationStats, venueStats, userStats, ordersRes, resvRes, vBookingsRes] = await Promise.all([
                fetchOrderStats().catch(() => ({ data: { stats: {} } })),
                fetchReservationStats().catch(() => ({ data: { stats: {} } })),
                fetchVenueBookingStats().catch(() => ({ data: { stats: {} } })),
                getUserStats().catch(() => ({ data: { stats: {} } })),
                fetchAllOrders({ sort: '-createdAt', limit: 200 }).catch(() => ({ data: { orders: [] } })),
                fetchAllReservations({ sort: '-createdAt', limit: 200 }).catch(() => ({ data: { reservations: [] } })),
                fetchAllVenueBookings({ sort: '-createdAt', limit: 200 }).catch(() => ({ bookings: [] } )),
            ]);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            // Calculate Today's Revenue manually from fetched lists for Tables & Venues
            const orderRev = orderStats.data?.stats?.todayRevenue || 0;
            const resvRev = (resvRes.data?.reservations || [])
                .filter(r => new Date(r.createdAt) >= todayStart && r.paymentStatus === 'paid')
                .reduce((sum, r) => sum + (r.advanceAmount || 0), 0);
            
            const venueArray = vBookingsRes.bookings || vBookingsRes.data?.bookings || [];
            const venueRev = venueArray
                .filter(b => new Date(b.createdAt) >= todayStart && ['ADVANCE_PAID', 'PARTIALLY_PAID', 'FULLY_PAID'].includes(b.paymentStatus))
                .reduce((sum, b) => sum + (b.advanceAmount || 0), 0);
            
            const totalOrderRev = orderStats.data?.stats?.totalRevenue || 0;
            const totalResvRev = reservationStats.data?.stats?.totalRevenue || 0;
            const totalVenueRev = venueStats.collectedAmount || venueStats.monthlyRevenue || 0;
            
            const actualTotalUsers = userStats.data?.stats?.total || userStats.data?.stats?.totalUsers || userStats.data?.totalUsers || 0;

            // Compute active reservations and bookings
            const activeResvs = (resvRes.data?.reservations || []).filter(r => r.status === 'confirmed').length;
            const activeVenues = venueArray.filter(b => b.status === 'CONFIRMED').length;

            setStats({
                todayOrders: orderStats.data?.stats?.todayOrders || 0,
                todayRevenue: orderRev + resvRev + venueRev,
                activeOrders: orderStats.data?.stats?.activeOrders || 0,
                totalRevenue: totalOrderRev + totalResvRev + totalVenueRev,
                activeReservations: activeResvs || reservationStats.data?.stats?.upcomingReservations || 0,
                activeVenueBookings: activeVenues || venueStats.confirmedBookings || 0,
                totalUsers: actualTotalUsers,
            });

            // Filter & sort pending items for the attention board
            const pending = (ordersRes.data?.orders || [])
                .filter(o => o.status === 'pending')
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setPendingOrders(pending);

            const resvs = (resvRes.data?.reservations || [])
                .filter(r => r.status === 'pending')
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setPendingReservations(resvs);

            const vBookings = venueArray
                .filter(b => b.status === 'AWAITING_ADMIN_APPROVAL' || b.status === 'PAYMENT_PENDING')
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setPendingVenueBookingsList(vBookings);

            setLastUpdated(new Date());
        } catch (err) {
            console.error('Dashboard error:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="text-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-text-muted">Loading dashboard...</p>
            </div>
        </div>
    );

    const totalPending = pendingOrders.length + pendingReservations.length + pendingVenueBookingsList.length;

    // Use dynamic columns based on what's active so we don't have empty spaces if only 1 thing is pending.
    let gridCols = 0;
    if (pendingOrders.length > 0) gridCols++;
    if (pendingReservations.length > 0) gridCols++;
    if (pendingVenueBookingsList.length > 0) gridCols++;
    const gridColsClass = gridCols === 3 ? 'lg:grid-cols-3' : gridCols === 2 ? 'lg:grid-cols-2' : 'grid-cols-1';

    return (
        <div className="space-y-8">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-3xl font-heading text-secondary mb-1">Dashboard Overview</h2>
                    <p className="text-text-muted text-sm">
                        {lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : 'Real-time stats for Vincent Restaurant'}
                    </p>
                </div>
                <button
                    onClick={() => loadData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-secondary hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                    <button onClick={() => loadData()} className="ml-auto text-sm text-red-600 underline">Retry</button>
                </div>
            )}

            {/* ── PENDING ALERTS (main feature — always at top) ─── */}
            {totalPending > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl overflow-hidden shadow-sm">
                    {/* Alert header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-amber-500/10 border-b border-amber-200">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Bell className="w-6 h-6 text-amber-600" />
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {totalPending > 9 ? '9+' : totalPending}
                                </span>
                            </div>
                            <div>
                                <h3 className="font-heading text-amber-900 text-lg leading-tight">Needs Your Attention</h3>
                                <p className="text-xs text-amber-700">
                                    {pendingOrders.length > 0 && `${pendingOrders.length} pending order${pendingOrders.length > 1 ? 's' : ''}`}
                                    {pendingOrders.length > 0 && (pendingReservations.length > 0 || pendingVenueBookingsList.length > 0) && ' · '}
                                    {pendingReservations.length > 0 && `${pendingReservations.length} pending reservation${pendingReservations.length > 1 ? 's' : ''}`}
                                    {pendingReservations.length > 0 && pendingVenueBookingsList.length > 0 && ' · '}
                                    {pendingVenueBookingsList.length > 0 && `${pendingVenueBookingsList.length} venue booking${pendingVenueBookingsList.length > 1 ? 's' : ''}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                            {pendingOrders.length > 0 && (
                                <Link to="/admin/orders" className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 bg-white/60 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors">
                                    All Orders <ArrowRight size={10} />
                                </Link>
                            )}
                            {pendingReservations.length > 0 && (
                                <Link to="/admin/reservations" className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 bg-white/60 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors">
                                    All Reservations <ArrowRight size={10} />
                                </Link>
                            )}
                            {pendingVenueBookingsList.length > 0 && (
                                <Link to="/admin/venue-bookings" className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 bg-white/60 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors">
                                    All Venues <ArrowRight size={10} />
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className={`grid gap-0 divide-y lg:divide-y-0 lg:divide-x divide-amber-200 ${gridColsClass}`}>

                        {/* Pending Orders Column */}
                        {pendingOrders.length > 0 && (
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <ShoppingBag size={16} className="text-blue-600" />
                                    <h4 className="font-semibold text-secondary text-sm uppercase tracking-wider">
                                        Pending Orders ({pendingOrders.length})
                                    </h4>
                                </div>
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                                    {pendingOrders.map(order => (
                                        <Link
                                            key={order._id}
                                            to="/admin/orders"
                                            className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition-all group"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="text-xs font-mono text-gray-400">
                                                        #{order.orderNumber || order._id?.slice(-6).toUpperCase()}
                                                    </p>
                                                    <p className="font-semibold text-secondary text-sm mt-0.5">
                                                        {order.user?.name || 'Guest'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-400">{timeAgo(order.createdAt)}</p>
                                                    <p className="font-bold text-secondary mt-0.5">₹{order.totalAmount?.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <UtensilsCrossed size={12} className="text-gray-400" />
                                                <p className="text-xs text-gray-500 truncate flex-1">
                                                    {(order.items || []).slice(0, 2).map(i => i.name || i.item?.name).filter(Boolean).join(', ')}
                                                    {(order.items?.length || 0) > 2 && ` +${order.items.length - 2} more`}
                                                </p>
                                                <StatusBadge status={order.status} map={ORDER_STATUS} />
                                            </div>
                                            {order.deliveryAddress && (
                                                <div className="flex items-center gap-1 mt-2">
                                                    <MapPin size={10} className="text-gray-400" />
                                                    <p className="text-xs text-gray-400 truncate">
                                                        {typeof order.deliveryAddress === 'object'
                                                            ? `${order.deliveryAddress.street || ''}, ${order.deliveryAddress.city || ''}`.replace(/^, /, '')
                                                            : order.deliveryAddress}
                                                    </p>
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Reservations Column */}
                        {pendingReservations.length > 0 && (
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar size={16} className="text-orange-600" />
                                    <h4 className="font-semibold text-secondary text-sm uppercase tracking-wider">
                                        Pending Reservations ({pendingReservations.length})
                                    </h4>
                                </div>
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                    {pendingReservations.map(resv => (
                                        <Link
                                            key={resv._id}
                                            to="/admin/reservations"
                                            className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-orange-200 transition-all group"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="text-xs font-mono text-gray-400">
                                                        #{resv.reservationNumber || resv._id?.slice(-6).toUpperCase()}
                                                    </p>
                                                    <p className="font-semibold text-secondary text-sm mt-0.5">
                                                        {resv.user?.name || resv.guestName || 'Guest'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-400">{timeAgo(resv.createdAt)}</p>
                                                    <StatusBadge status={resv.status} map={RESV_STATUS} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={10} className="text-gray-400" />
                                                    <p className="text-xs text-gray-500">
                                                        {resv.date ? new Date(resv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock size={10} className="text-gray-400" />
                                                    <p className="text-xs text-gray-500">
                                                        {typeof resv.timeSlot === 'object' ? resv.timeSlot?.start : (resv.timeSlot || resv.time || '—')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users size={10} className="text-gray-400" />
                                                    <p className="text-xs text-gray-500">{resv.guestCount || resv.guests || '—'} guests</p>
                                                </div>
                                                {(resv.user?.phone || resv.phone) && (
                                                    <div className="flex items-center gap-1">
                                                        <Phone size={10} className="text-gray-400" />
                                                        <p className="text-xs text-gray-500">{resv.user?.phone || resv.phone}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Venue Bookings Column */}
                        {pendingVenueBookingsList.length > 0 && (
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Building2 size={16} className="text-purple-600" />
                                    <h4 className="font-semibold text-secondary text-sm uppercase tracking-wider">
                                        Venue Bookings ({pendingVenueBookingsList.length})
                                    </h4>
                                </div>
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                                    {pendingVenueBookingsList.map(booking => (
                                        <Link
                                            key={booking._id}
                                            to="/admin/venue-bookings"
                                            className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-purple-200 transition-all group"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-semibold text-secondary text-sm mt-0.5">
                                                        {booking.user?.name || booking.name || 'Client'}
                                                    </p>
                                                    <p className="text-xs text-purple-600 mt-1">{booking.venue?.name || 'Venue Booking'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-400">{timeAgo(booking.createdAt)}</p>
                                                    <StatusBadge status={booking.status} map={{ pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' } }} />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={10} className="text-gray-400" />
                                                    <p className="text-xs text-gray-500">
                                                        {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users size={10} className="text-gray-400" />
                                                    <p className="text-xs text-gray-500">{booking.guestCount || '—'} pax</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* No pending — show a clean all-clear */}
            {!loading && totalPending === 0 && (
                <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-5">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-green-800">All clear!</p>
                        <p className="text-sm text-green-700">No pending orders, reservations, or venue bookings right now.</p>
                    </div>
                </div>
            )}

            {/* ── Stats Grid ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                <StatCard
                    icon={<ShoppingBag className="w-6 h-6 text-blue-500" />}
                    iconBg="bg-blue-500/10"
                    label="Today's Orders"
                    value={stats.todayOrders}
                    sub={`Active: ${stats.activeOrders}`}
                    subColor="text-blue-500"
                />
                <StatCard
                    icon={<IndianRupee className="w-6 h-6 text-green-500" />}
                    iconBg="bg-green-500/10"
                    label="Today's Revenue"
                    value={`₹${stats.todayRevenue.toLocaleString()}`}
                    sub={`Total: ₹${stats.totalRevenue.toLocaleString()}`}
                    subColor="text-text-muted"
                />
                <StatCard
                    icon={<Calendar className="w-6 h-6 text-orange-500" />}
                    iconBg="bg-orange-500/10"
                    label="Table Reservations"
                    value={stats.activeReservations}
                    sub="Active & Confirmed"
                    subColor="text-orange-500"
                    highlight={stats.activeReservations > 0}
                />
                <StatCard
                    icon={<Building2 className="w-6 h-6 text-purple-500" />}
                    iconBg="bg-purple-500/10"
                    label="Venue Bookings"
                    value={stats.activeVenueBookings}
                    sub="Active Events"
                    subColor="text-purple-500"
                    highlight={stats.activeVenueBookings > 0}
                />
                <StatCard
                    icon={<Users className="w-6 h-6 text-teal-500" />}
                    iconBg="bg-teal-500/10"
                    label="Total Users"
                    value={stats.totalUsers}
                    sub="Active Platform Audience"
                    subColor="text-teal-500"
                />
            </div>

            {/* ── Quick Actions ─────────────────────────────────────── */}
            <div>
                <h3 className="text-xl font-heading text-secondary mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[
                        { to: '/admin/orders', icon: <ShoppingBag className="w-7 h-7 text-blue-500" />, title: 'Orders', sub: 'Manage live orders' },
                        { to: '/admin/reservations', icon: <Calendar className="w-7 h-7 text-orange-500" />, title: 'Tables', sub: 'Handle reservations' },
                        { to: '/admin/venue-bookings', icon: <Building2 className="w-7 h-7 text-purple-500" />, title: 'Venues', sub: 'Event bookings' },
                        { to: '/admin/menu', icon: <ChefHat className="w-7 h-7 text-green-500" />, title: 'Menu', sub: 'Add or edit items' },
                        { to: '/admin/users', icon: <Users className="w-7 h-7 text-teal-500" />, title: 'Users', sub: 'Manage accounts' },
                        { to: '/admin/contact-messages', icon: <Phone className="w-7 h-7 text-indigo-500" />, title: 'Inquiries', sub: 'View direct messages' },
                    ].map(({ to, icon, title, sub }) => (
                        <Link
                            key={to}
                            to={to}
                            className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-primary/30 transition-all text-left flex flex-col gap-2 group"
                        >
                            <div className="group-hover:scale-110 transition-transform w-fit bg-gray-50 p-2 rounded-lg">{icon}</div>
                            <div>
                                <h4 className="font-heading text-secondary text-[15px]">{title}</h4>
                                <p className="text-[11px] text-text-muted line-clamp-1">{sub}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Reusable Stat Card ──────────────────────────────────────
function StatCard({ icon, iconBg, label, value, sub, subColor, highlight }) {
    return (
        <div className={`bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${highlight ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
                    {icon}
                </div>
                {highlight && <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />}
            </div>
            <p className="text-text-muted text-sm mb-1">{label}</p>
            <p className="text-3xl font-heading text-secondary">{value}</p>
            <p className={`text-xs mt-2 ${subColor}`}>{sub}</p>
        </div>
    );
}
