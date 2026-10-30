import { useEffect, useState } from 'react';
import {
    Users,
    Search,
    Filter,
    UserCheck,
    UserX,
    Shield,
    ShieldOff,
    Trash2,
    Eye,
    Activity,
    RefreshCw,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { getAllUsers, toggleUserActive, getUserActivity, deleteUser, getUserStats } from '../../api';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        isVerified: '',
        isActive: ''
    });

    const [selectedUser, setSelectedUser] = useState(null);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [userActivity, setUserActivity] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadUsers();
        loadStats();
    }, [filters]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await getAllUsers(filters);
            setUsers(response.data.users);
        } catch (err) {
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await getUserStats();
            setStats(response.data.stats);
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const handleToggleActive = async (userId, currentStatus) => {
        const action = currentStatus ? 'block' : 'unblock';
        const reason = currentStatus ? prompt('Reason for blocking this user:') : null;

        if (currentStatus && !reason) return; // Cancel if no reason provided for blocking

        try {
            setActionLoading(true);
            await toggleUserActive(userId, reason);
            await loadUsers();
            await loadStats();
            alert(`User ${action}ed successfully`);
        } catch (err) {
            alert(err.message || `Failed to ${action} user`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewActivity = async (userId) => {
        try {
            setActionLoading(true);
            const response = await getUserActivity(userId);
            setUserActivity(response.data);
            setSelectedUser(users.find(u => u._id === userId));
            setShowActivityModal(true);
        } catch (err) {
            alert(err.message || 'Failed to load user activity');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
            return;
        }

        try {
            setActionLoading(true);
            await deleteUser(userId);
            await loadUsers();
            await loadStats();
            alert('User deleted successfully');
        } catch (err) {
            alert(err.message || 'Failed to delete user');
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading text-secondary mb-1">User Management</h2>
                    <p className="text-text-muted text-sm">Manage registered users and their accounts</p>
                </div>
                <button
                    onClick={() => {
                        loadUsers();
                        loadStats();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <Users className="w-8 h-8 text-blue-600" />
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-2xl font-heading text-secondary">{stats.total}</p>
                        <p className="text-sm text-gray-600">Total Users</p>
                        <p className="text-xs text-gray-500 mt-1">+{stats.newToday} today</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <UserCheck className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-2xl font-heading text-green-600">{stats.verified}</p>
                        <p className="text-sm text-gray-600">Verified Users</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {stats.total > 0 ? ((stats.verified / stats.total) * 100).toFixed(1) : 0}% verified
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <Shield className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-2xl font-heading text-blue-600">{stats.active}</p>
                        <p className="text-sm text-gray-600">Active Users</p>
                        <p className="text-xs text-gray-500 mt-1">Can login and order</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <ShieldOff className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-2xl font-heading text-red-600">{stats.blocked}</p>
                        <p className="text-sm text-gray-600">Blocked Users</p>
                        <p className="text-xs text-gray-500 mt-1">Cannot access system</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <select
                        value={filters.isVerified}
                        onChange={(e) => setFilters({ ...filters, isVerified: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">All Verification Status</option>
                        <option value="true">Verified Only</option>
                        <option value="false">Unverified Only</option>
                    </select>

                    <select
                        value={filters.isActive}
                        onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">All Account Status</option>
                        <option value="true">Active Only</option>
                        <option value="false">Blocked Only</option>
                    </select>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Users Table */}
            {loading ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
                    <div className="text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading users...</p>
                    </div>
                </div>
            ) : users.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No users found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Verified</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Registered</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <span className="text-primary font-semibold">
                                                        {user.name?.charAt(0)?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{user.name}</p>
                                                    {!user.isActive && user.blockReason && (
                                                        <p className="text-xs text-red-600">Blocked: {user.blockReason}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-gray-900">{user.email}</p>
                                            <p className="text-xs text-gray-500">{user.phone}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {user.isActive ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                                    <CheckCircle size={14} />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                                    <XCircle size={14} />
                                                    Blocked
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {user.isVerified ? (
                                                <UserCheck className="w-5 h-5 text-green-600 mx-auto" />
                                            ) : (
                                                <UserX className="w-5 h-5 text-gray-400 mx-auto" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {formatDate(user.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewActivity(user._id)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Activity"
                                                >
                                                    <Activity size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(user._id, user.isActive)}
                                                    disabled={actionLoading}
                                                    className={`p-2 rounded-lg transition-colors ${user.isActive
                                                            ? 'text-red-600 hover:bg-red-50'
                                                            : 'text-green-600 hover:bg-green-50'
                                                        }`}
                                                    title={user.isActive ? 'Block User' : 'Unblock User'}
                                                >
                                                    {user.isActive ? <ShieldOff size={18} /> : <Shield size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user._id, user.name)}
                                                    disabled={actionLoading}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Activity Modal */}
            {showActivityModal && userActivity && (
                <div className="overlay-premium z-[9999]" onClick={() => setShowActivityModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-heading text-secondary">User Activity</h3>
                                    <p className="text-sm text-gray-600">{selectedUser?.name} ({selectedUser?.email})</p>
                                </div>
                                <button
                                    onClick={() => setShowActivityModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-600">{userActivity.stats.totalReservations}</p>
                                    <p className="text-sm text-gray-700">Total Reservations</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-2xl font-bold text-green-600">{userActivity.stats.totalOrders}</p>
                                    <p className="text-sm text-gray-700">Total Orders</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <p className="text-2xl font-bold text-purple-600">₹{userActivity.stats.totalSpent}</p>
                                    <p className="text-sm text-gray-700">Total Spent</p>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="grid grid-cols-2 gap-6">
                                {/* Recent Reservations */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">Recent Reservations</h4>
                                    {userActivity.recentReservations?.length > 0 ? (
                                        <div className="space-y-2">
                                            {userActivity.recentReservations.slice(0, 5).map((res, idx) => (
                                                <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                                                    <p className="font-semibold">{res.reservationNumber}</p>
                                                    <p className="text-gray-600">
                                                        {new Date(res.date).toLocaleDateString()}
                                                    </p>
                                                    <p className={`text-xs ${res.status === 'completed' ? 'text-green-600' :
                                                            res.status === 'cancelled' ? 'text-red-600' :
                                                                'text-blue-600'
                                                        }`}>
                                                        {res.status.toUpperCase()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">No reservations yet</p>
                                    )}
                                </div>

                                {/* Recent Orders */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">Recent Orders</h4>
                                    {userActivity.recentOrders?.length > 0 ? (
                                        <div className="space-y-2">
                                            {userActivity.recentOrders.slice(0, 5).map((order, idx) => (
                                                <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                                                    <p className="font-semibold">{order.orderNumber}</p>
                                                    <p className="text-gray-600">₹{order.finalAmount}</p>
                                                    <p className={`text-xs ${order.status === 'delivered' ? 'text-green-600' :
                                                            order.status === 'cancelled' ? 'text-red-600' :
                                                                'text-blue-600'
                                                        }`}>
                                                        {order.status.toUpperCase()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">No orders yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
