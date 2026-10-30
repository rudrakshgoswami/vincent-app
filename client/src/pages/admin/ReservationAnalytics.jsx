import { useEffect, useState } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Users,
    IndianRupee,
    XCircle,
    UserX,
    Clock,
    CheckCircle,
    AlertCircle,
    BarChart3,
    PieChart,
    Activity,
    RefreshCw
} from 'lucide-react';
import { getAdvancedReservationAnalytics } from '../../api';

export default function ReservationAnalytics() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'custom'
    const [customDates, setCustomDates] = useState({ startDate: '', endDate: '' });

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            setError('');

            const params = {};
            if (dateRange === 'custom' && customDates.startDate && customDates.endDate) {
                params.startDate = customDates.startDate;
                params.endDate = customDates.endDate;
            }

            const response = await getAdvancedReservationAnalytics(params);
            setAnalytics(response.data);
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to load analytics');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-text-muted">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <div>
                        <h3 className="font-semibold text-red-900">Error Loading Analytics</h3>
                        <p className="text-sm text-red-700">{error}</p>
                        <button
                            onClick={loadAnalytics}
                            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const { summary, revenue, peakHours, tablePopularity, occasionBreakdown, seatingPreferences, dailyTrend } = analytics || {};

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-heading text-secondary mb-1">Reservation Analytics</h2>
                    <p className="text-text-muted text-sm">
                        Comprehensive insights and performance metrics
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="week">Last 7 Days</option>
                        <option value="month">This Month</option>
                        <option value="custom">Custom Range</option>
                    </select>
                    <button
                        onClick={loadAnalytics}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={customDates.startDate}
                                onChange={(e) => setCustomDates({ ...customDates, startDate: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={customDates.endDate}
                                onChange={(e) => setCustomDates({ ...customDates, endDate: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="self-end">
                            <button
                                onClick={loadAnalytics}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Total Reservations</p>
                    <p className="text-3xl font-heading text-secondary">{summary?.totalReservations || 0}</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Cancellation Rate</p>
                    <p className="text-3xl font-heading text-red-600">{summary?.cancellationRate || 0}%</p>
                    <p className="text-xs text-gray-500 mt-1">{summary?.cancelled || 0} cancelled</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <UserX className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">No-Show Rate</p>
                    <p className="text-3xl font-heading text-orange-600">{summary?.noShowRate || 0}%</p>
                    <p className="text-xs text-gray-500 mt-1">{summary?.noShowCount || 0} no-shows</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Punctuality Rate</p>
                    <p className="text-3xl font-heading text-green-600">{summary?.punctualityRate || 0}%</p>
                    <p className="text-xs text-gray-500 mt-1">{summary?.onTimeArrivals || 0} on time</p>
                </div>
            </div>

            {/* Revenue Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <IndianRupee className="w-8 h-8" />
                        <h3 className="text-lg font-semibold">Total Revenue</h3>
                    </div>
                    <p className="text-4xl font-heading mb-2">₹{(revenue?.totalFromAdvance || 0).toLocaleString()}</p>
                    <p className="text-sm text-green-100">From {revenue?.paidReservations || 0} paid reservations</p>
                    <p className="text-xs text-green-100 mt-2">
                        Avg: ₹{revenue?.averageAdvancePayment || 0} per reservation
                    </p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <UserX className="w-8 h-8" />
                        <h3 className="text-lg font-semibold">Forfeited Revenue</h3>
                    </div>
                    <p className="text-4xl font-heading mb-2">₹{(revenue?.forfeitedFromNoShows || 0).toLocaleString()}</p>
                    <p className="text-sm text-orange-100">From {revenue?.noShowsWithPayment || 0} no-shows</p>
                    <p className="text-xs text-orange-100 mt-2">Non-refundable advances</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity className="w-8 h-8" />
                        <h3 className="text-lg font-semibold">Net Impact</h3>
                    </div>
                    <p className="text-4xl font-heading mb-2">
                        ₹{((revenue?.totalFromAdvance || 0) + (revenue?.forfeitedFromNoShows || 0)).toLocaleString()}
                    </p>
                    <p className="text-sm text-blue-100">Total advance payments collected</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Peak Hours */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <BarChart3 className="w-6 h-6 text-primary" />
                        <h3 className="text-lg font-heading text-secondary">Peak Reservation Hours</h3>
                    </div>
                    {peakHours && peakHours.length > 0 ? (
                        <div className="space-y-3">
                            {peakHours.map((slot, index) => {
                                const maxCount = Math.max(...peakHours.map(s => s.count));
                                const percentage = (slot.count / maxCount) * 100;
                                return (
                                    <div key={index}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700">
                                                {slot._id.replace('-', ' ').toUpperCase()}
                                            </span>
                                            <span className="text-sm text-gray-600">{slot.count} bookings</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-primary h-3 rounded-full transition-all duration-300"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {slot.totalGuests} guests • ₹{slot.revenue?.toLocaleString()} revenue
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No data available</p>
                    )}
                </div>

                {/* Table Popularity */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="w-6 h-6 text-primary" />
                        <h3 className="text-lg font-heading text-secondary">Most Popular Tables</h3>
                    </div>
                    {tablePopularity && tablePopularity.length > 0 ? (
                        <div className="space-y-3">
                            {tablePopularity.slice(0, 5).map((table, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'}`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Table {table.tableNumber}</p>
                                            <p className="text-xs text-gray-500">
                                                {table.area.toUpperCase()} • Capacity: {table.capacity}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-primary">{table.bookingCount}</p>
                                        <p className="text-xs text-gray-500">{table.utilizationRate?.toFixed(1)}% utilized</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No data available</p>
                    )}
                </div>
            </div>

            {/* Occasion & Preferences */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Occasions */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <PieChart className="w-6 h-6 text-primary" />
                        <h3 className="text-lg font-heading text-secondary">Special Occasions</h3>
                    </div>
                    {occasionBreakdown && occasionBreakdown.length > 0 ? (
                        <div className="space-y-2">
                            {occasionBreakdown.map((occasion, index) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                                    <span className="text-sm font-medium text-gray-700 capitalize">
                                        {occasion._id.replace('_', ' ')}
                                    </span>
                                    <span className="text-sm text-gray-600 font-semibold">{occasion.count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No special occasions tracked</p>
                    )}
                </div>

                {/* Seating Preferences */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-6 h-6 text-primary" />
                        <h3 className="text-lg font-heading text-secondary">Seating Preferences</h3>
                    </div>
                    {seatingPreferences && seatingPreferences.length > 0 ? (
                        <div className="space-y-2">
                            {seatingPreferences.map((pref, index) => {
                                const total = seatingPreferences.reduce((sum, p) => sum + p.count, 0);
                                const percentage = (pref.count / total) * 100;
                                return (
                                    <div key={index}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700 capitalize">
                                                {pref._id}
                                            </span>
                                            <span className="text-sm text-gray-600">
                                                {pref.count} ({percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No preferences tracked</p>
                    )}
                </div>
            </div>

            {/* Daily Trend */}
            {dailyTrend && dailyTrend.length > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity className="w-6 h-6 text-primary" />
                        <h3 className="text-lg font-heading text-secondary">Daily Trend</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Reservations</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Guests</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {dailyTrend.map((day, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {new Date(day._id).toLocaleDateString('en-IN', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                            {day.reservations}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                                            {day.guests}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                                            ₹{day.revenue?.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
