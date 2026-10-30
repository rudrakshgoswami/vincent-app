import { useState, useEffect, useRef } from 'react';
import {
    Mail, Phone, MapPin, Calendar, Clock, LogOut, ShieldCheck,
    Sparkles, ChevronRight, User as UserIcon, Camera, Edit2,
    Check, X, Loader2, Smartphone, KeyRound, AlertCircle, ShoppingBag,
    CreditCard, TrendingUp, Award, Coffee, Heart, Star, Utensils,
    Target, Gift, Zap, BarChart3, PieChart, TrendingDown, ChevronDown,
    Plus, Trash2, Home, Building2
} from 'lucide-react';
import {
    getCurrentUser, updateUserProfile, uploadProfilePicture,
    requestUpdateOTP, verifyUpdateOTP, fetchMyOrders,
    fetchMyReservations, fetchMyVenueBookings,
    requestUserPasswordOTP, verifyUserPasswordOTP
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BASE_URL = 'http://localhost:5000';

export default function Profile() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useState('overview');

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        profilePicture: '',
        birthDate: '',
        addresses: []
    });

    // Dashboard Data States
    const [orders, setOrders] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalReservations: 0,
        totalSpent: 0,
        memberSince: ''
    });

    // Verification States
    const [verificationMode, setVerificationMode] = useState(null);
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [verifyingOTP, setVerifyingOTP] = useState(false);
    const [newValue, setNewValue] = useState('');
    const [loadError, setLoadError] = useState(null);

    // Password Change State
    const [pwdFlow, setPwdFlow] = useState({ step: 'idle', otp: '', newPwd: '', confirmPwd: '', loading: false });

    const fileInputRef = useRef(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const profileRes = await getCurrentUser();
            const u = profileRes.data.user;
            setUser(u);
            setFormData({
                name: u.name || '',
                email: u.email || '',
                phone: u.phone || '',
                profilePicture: u.profilePicture || '',
                birthDate: u.birthDate || '',
                addresses: u.addresses || []
            });

            let userOrders = [];
            let userReservations = [];

            try {
                const ordersRes = await fetchMyOrders();
                console.log('📦 Orders API Response:', ordersRes);

                // Handle different response formats
                userOrders = Array.isArray(ordersRes.data) ? ordersRes.data :
                    Array.isArray(ordersRes.data?.orders) ? ordersRes.data.orders :
                        Array.isArray(ordersRes.orders) ? ordersRes.orders :
                            Array.isArray(ordersRes) ? ordersRes : [];

                console.log('📦 Extracted Orders:', userOrders.length, userOrders);
                setOrders(userOrders);
            } catch (err) {
                console.error('❌ Failed to load orders:', err);
                setOrders([]);
            }

            try {
                const resRes = await fetchMyReservations();
                console.log('📅 Reservations API Response:', resRes);

                // Handle different response formats
                userReservations = Array.isArray(resRes.data?.reservations) ? resRes.data.reservations :
                    Array.isArray(resRes.reservations) ? resRes.reservations :
                        Array.isArray(resRes.data) ? resRes.data :
                            Array.isArray(resRes) ? resRes : [];

                console.log('📅 Extracted Reservations:', userReservations.length, userReservations);
                setReservations(userReservations);
            } catch (err) {
                console.error('❌ Failed to load reservations:', err);
                setReservations([]);
            }

            let userBookings = [];
            try {
                const bookingsRes = await fetchMyVenueBookings();
                userBookings = Array.isArray(bookingsRes) ? bookingsRes : 
                              Array.isArray(bookingsRes.data) ? bookingsRes.data :
                              Array.isArray(bookingsRes.bookings) ? bookingsRes.bookings : [];
                setBookings(userBookings);
            } catch (err) {
                console.error('❌ Failed to load venue bookings:', err);
                setBookings([]);
            }


            // Calculate stats from actual data
            console.log('📊 Calculating Profile Stats...');
            console.log('Orders:', userOrders.length, userOrders);
            console.log('Reservations:', userReservations.length, userReservations);

            // Calculate total spent from all completed/delivered orders
            const totalSpent = userOrders.reduce((sum, order) => {
                const amount = order.totalAmount || order.total || 0;
                return sum + amount;
            }, 0);

            // Also add reservation amounts
            const reservationSpent = userReservations.reduce((sum, res) => {
                const amount = res.totalAmount || res.amount || 0;
                return sum + amount;
            }, 0);

            // NEW: Add venue booking amounts (all active ones)
            const venueSpent = userBookings.reduce((sum, b) => {
                if (b.status !== 'CANCELLED' && b.status !== 'REJECTED') {
                    return sum + (b.grandTotal || 0);
                }
                return sum;
            }, 0);

            const totalLifetimeValue = totalSpent + reservationSpent + venueSpent;

            console.log('💎 LIFETIME VALUE CALC:', {
                foodOrders: totalSpent,
                reservations: reservationSpent,
                venues: venueSpent,
                total: totalLifetimeValue
            });

            setStats({
                totalOrders: userOrders.length,
                totalReservations: userReservations.length + userBookings.length,
                totalSpent: totalLifetimeValue,
                memberSince: new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
            });

            console.log('✅ Stats Updated:', {
                orders: userOrders.length,
                reservations: userReservations.length,
                spent: totalLifetimeValue
            });

        } catch (err) {
            console.error('Critical error loading profile:', err);
            setLoadError(err.message || 'Failed to load profile data');
            setTimeout(() => navigate('/login'), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressChange = (index, field, value) => {
        const newAddresses = [...formData.addresses];
        newAddresses[index] = { ...newAddresses[index], [field]: value };
        setFormData(prev => ({ ...prev, addresses: newAddresses }));
    };

    const addNewAddress = () => {
        setFormData(prev => ({
            ...prev,
            addresses: [...prev.addresses, { street: '', city: '', state: '', pincode: '' }]
        }));
    };

    const removeAddress = (index) => {
        setFormData(prev => ({
            ...prev,
            addresses: prev.addresses.filter((_, i) => i !== index)
        }));
    };

    const handleProfileUpdate = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // Check if email or phone changed
            const emailChanged = formData.email !== user.email;
            const phoneChanged = formData.phone !== user.phone;

            if (emailChanged) {
                // Trigger OTP verification for email
                await requestUpdateOTP('email', formData.email);
                setVerificationMode('email');
                setNewValue(formData.email);
                setShowOTPModal(true);
                setSaving(false);
                setMessage({ type: 'success', text: 'OTP sent to your current email address for verification!' });
                return;
            }

            if (phoneChanged) {
                // Trigger OTP verification for phone
                await requestUpdateOTP('phone', formData.phone);
                setVerificationMode('phone');
                setNewValue(formData.phone);
                setShowOTPModal(true);
                setSaving(false);
                setMessage({ type: 'success', text: 'OTP sent to your current phone number for verification!' });
                return;
            }

            // Update other fields without OTP
            await updateUserProfile({
                name: formData.name,
                birthDate: formData.birthDate,
                addresses: formData.addresses,
                profilePicture: formData.profilePicture
            });

            setMessage({ type: 'success', text: 'Profile updated successfully' });
            setIsEditing(false);
            loadProfile();
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        try {
            const response = await uploadProfilePicture(file);
            setFormData(prev => ({ ...prev, profilePicture: response.url }));
            await updateUserProfile({ profilePicture: response.url });
            setMessage({ type: 'success', text: 'Profile picture updated' });
            loadProfile();
        } catch (err) {
            console.error('[Upload Error]:', err);
            setMessage({ type: 'error', text: `Upload failed: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    const submitOTP = async () => {
        setVerifyingOTP(true);
        try {
            await verifyUpdateOTP(verificationMode, newValue, otp);
            setShowOTPModal(false);
            setOtp('');
            setVerificationMode(null);
            setNewValue('');
            setMessage({ type: 'success', text: `${verificationMode === 'email' ? 'Email' : 'Phone'} verified and updated successfully!` });
            setIsEditing(false);
            loadProfile();
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Invalid OTP. Please try again.' });
        } finally {
            setVerifyingOTP(false);
        }
    };

    const handleRequestPwdOTP = async () => {
        setPwdFlow(prev => ({ ...prev, loading: true }));
        try {
            const res = await requestUserPasswordOTP();
            if (res.success) {
                setPwdFlow(prev => ({ ...prev, step: 'otp', loading: false }));
                setMessage({ type: 'success', text: 'OTP sent to your registered email.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to send OTP' });
            setPwdFlow(prev => ({ ...prev, loading: false }));
        }
    };

    const handleVerifyPwdOTP = async (e) => {
        e.preventDefault();
        if (pwdFlow.newPwd !== pwdFlow.confirmPwd) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        setPwdFlow(prev => ({ ...prev, loading: true }));
        try {
            const res = await verifyUserPasswordOTP(pwdFlow.otp, pwdFlow.newPwd);
            if (res.success) {
                setPwdFlow({ step: 'idle', otp: '', newPwd: '', confirmPwd: '', loading: false });
                setMessage({ type: 'success', text: 'Password updated successfully!' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Invalid OTP' });
            setPwdFlow(prev => ({ ...prev, loading: false }));
        }
    };

    // Gamification Calculations
    const getLoyaltyTier = () => {
        const spent = stats.totalSpent;
        if (spent >= 50000) return { name: 'Diamond Elite', color: 'from-cyan-500 to-blue-600', nextTier: null, progress: 100 };
        if (spent >= 25000) return { name: 'Platinum VIP', color: 'from-purple-500 to-pink-500', nextTier: 50000, progress: (spent / 50000) * 100 };
        if (spent >= 10000) return { name: 'Gold Member', color: 'from-yellow-500 to-orange-500', nextTier: 25000, progress: (spent / 25000) * 100 };
        if (spent >= 5000) return { name: 'Silver Guest', color: 'from-gray-400 to-gray-500', nextTier: 10000, progress: (spent / 10000) * 100 };
        return { name: 'Bronze Explorer', color: 'from-orange-300 to-orange-400', nextTier: 5000, progress: (spent / 5000) * 100 };
    };

    const getAchievements = () => {
        const achievements = [];
        if (stats.totalOrders >= 1) achievements.push({ icon: '🎉', title: 'First Order', desc: 'Started your journey' });
        if (stats.totalOrders >= 10) achievements.push({ icon: '🔥', title: 'Regular Patron', desc: '10 orders completed' });
        if (stats.totalOrders >= 50) achievements.push({ icon: '⚡', title: 'Super Fan', desc: '50+ orders' });
        if (stats.totalOrders >= 100) achievements.push({ icon: '👑', title: 'Legendary', desc: '100+ orders' });
        if (stats.totalReservations >= 5) achievements.push({ icon: '📅', title: 'Social Butterfly', desc: '5+ reservations' });
        if (stats.totalSpent >= 10000) achievements.push({ icon: '💎', title: 'Big Spender', desc: '₹10K+ invested' });
        return achievements;
    };

    const loyaltyTier = getLoyaltyTier();
    const achievements = getAchievements();

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-20 bg-background">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                <p className="text-sm font-black uppercase tracking-[0.4em] text-secondary">Loading Your Space...</p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-20 bg-red-50">
                <AlertCircle className="w-20 h-20 text-red-600 mb-6" />
                <h2 className="text-3xl font-heading text-red-700 mb-4">Profile Load Failed</h2>
                <p className="text-sm text-red-600 mb-2">{loadError}</p>
                <p className="text-xs text-gray-500 mb-8">Redirecting to login...</p>
                <button
                    onClick={() => navigate('/login')}
                    className="px-8 py-4 bg-red-600 text-white rounded-full text-sm font-black uppercase hover:bg-red-700"
                >
                    Return to Login
                </button>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#faf8f5] via-[#f5f1ea] to-[#ede8df] pointer-events-none" />

            {/* Message Toast */}
            {message.text && (
                <div className={`fixed top-24 right-6 z-50 p-4 rounded-2xl border animate-slide-in-right flex items-center gap-3 shadow-2xl ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    <p className="text-sm font-bold">{message.text}</p>
                    <button onClick={() => setMessage({ type: '', text: '' })} className="ml-2 opacity-60 hover:opacity-100">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* HERO HEADER */}
            <div className="relative pt-32 pb-16 bg-gradient-to-br from-secondary via-[#2d3436] to-surfaceDark overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-10 right-[5%] w-80 h-80 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-0 left-[-8%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-8">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl backdrop-blur-xl hover:scale-105 transition-transform duration-500 relative">
                                    {formData.profilePicture ? (
                                        <img
                                            src={formData.profilePicture.startsWith('http') ? formData.profilePicture : `${BASE_URL}${formData.profilePicture}`}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-6xl font-heading text-white bg-white/10 backdrop-blur-xl">
                                            {user.name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 scale-110" />
                                </div>
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className="absolute bottom-2 right-2 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all border-4 border-white/20"
                                >
                                    <Camera size={18} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>

                            {/* Name & Info */}
                            <div className="flex-grow">
                                <p className="text-sm font-medium text-white/60 mb-2 tracking-wide">Welcome back,</p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="text-5xl md:text-6xl font-heading text-white mb-3 leading-tight bg-white/10 backdrop-blur-md border-b-2 border-white/30 focus:border-primary outline-none px-4 py-2 rounded-xl w-full max-w-2xl"
                                        placeholder="Your Name"
                                    />
                                ) : (
                                    <h1 className="text-5xl md:text-6xl font-heading text-white mb-3 leading-tight">
                                        {user.name}
                                    </h1>
                                )}
                                <p className="text-white/70 text-lg font-medium">Member since {stats.memberSince}</p>
                            </div>

                            {/* Edit Button */}
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full text-sm font-bold hover:bg-white/20 transition-all shadow-xl flex items-center gap-2"
                                >
                                    <Edit2 size={16} />
                                    Edit Profile
                                </button>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleProfileUpdate}
                                        disabled={saving}
                                        className="px-6 py-3 bg-primary text-white rounded-full text-sm font-bold hover:bg-primary/90 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={18} /> : <><Check size={16} /> Save</>}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            loadProfile();
                                        }}
                                        className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full text-sm font-bold hover:bg-white/20 transition-all flex items-center gap-2"
                                    >
                                        <X size={16} /> Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Loyalty Tier Banner */}
                        <div className={`bg-gradient-to-r ${loyaltyTier.color} rounded-3xl p-6 shadow-2xl relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <Award size={32} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Your Tier</p>
                                        <h3 className="text-3xl font-heading text-white">{loyaltyTier.name}</h3>
                                    </div>
                                </div>
                                {loyaltyTier.nextTier && (
                                    <div className="text-right hidden md:block">
                                        <p className="text-white/80 text-xs font-bold mb-1">Next: ₹{loyaltyTier.nextTier.toLocaleString('en-IN')}</p>
                                        <p className="text-white text-sm">₹{(loyaltyTier.nextTier - stats.totalSpent).toLocaleString('en-IN')} to unlock</p>
                                    </div>
                                )}
                            </div>
                            {loyaltyTier.nextTier && (
                                <div className="mt-4 relative">
                                    <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                        <div
                                            className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${loyaltyTier.progress}%` }}
                                        />
                                    </div>
                                    <p className="text-white/90 text-xs font-bold mt-2">{Math.round(loyaltyTier.progress)}% to next tier</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="container mx-auto px-6 relative z-20 pb-24 -mt-8">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Tab Navigation */}
                        <div className="bg-white rounded-2xl p-2 shadow-lg border border-border/30 flex gap-2 overflow-x-auto">
                            {['overview', 'account', 'orders', 'reservations', 'venues', 'achievements'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-secondary hover:bg-surface'
                                        }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Stats Grid */}
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-border/30 hover:shadow-xl transition-all group">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Coffee size={24} className="text-primary" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-wider text-text-muted">Total Orders</p>
                                        </div>
                                        <p className="text-5xl font-heading text-secondary mb-1">{stats.totalOrders}</p>
                                        <p className="text-sm text-text-muted">Culinary experiences</p>
                                    </div>

                                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-border/30 hover:shadow-xl transition-all group">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Utensils size={24} className="text-primary" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-wider text-text-muted">Reservations</p>
                                        </div>
                                        <p className="text-5xl font-heading text-secondary mb-1">{stats.totalReservations}</p>
                                        <p className="text-sm text-text-muted">Tables booked</p>
                                    </div>

                                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 shadow-lg border border-primary/20 hover:shadow-xl transition-all group">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <TrendingUp size={24} className="text-primary" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-wider text-primary/70">Lifetime Value</p>
                                        </div>
                                        <p className="text-3xl md:text-4xl lg:text-3xl xl:text-4xl font-heading text-primary mb-1 break-words">
                                            ₹{Math.round(stats.totalSpent).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-sm text-primary/60">Total invested</p>
                                    </div>
                                </div>

                                {/* Quick Insights */}
                                <div className="bg-white rounded-3xl p-8 shadow-lg border border-border/30">
                                    <div className="flex items-center gap-3 mb-6">
                                        <BarChart3 size={24} className="text-primary" />
                                        <h3 className="text-2xl font-heading text-secondary">Your Dining Insights</h3>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="bg-surface/50 rounded-2xl p-5">
                                            <p className="text-sm font-bold text-text-muted mb-3">Average Order Value</p>
                                            <p className="text-3xl font-heading text-secondary">
                                                ₹{stats.totalOrders > 0 ? Math.round(stats.totalSpent / stats.totalOrders).toLocaleString('en-IN') : '0'}
                                            </p>
                                        </div>
                                        <div className="bg-surface/50 rounded-2xl p-5">
                                            <p className="text-sm font-bold text-text-muted mb-3">Most Active Month</p>
                                            <p className="text-3xl font-heading text-secondary">
                                                {new Date().toLocaleDateString('en-IN', { month: 'long' })}
                                            </p>
                                        </div>
                                    </div>

                                    {stats.totalOrders > 0 && (
                                        <div className="mt-6 p-5 bg-primary/5 rounded-2xl border border-primary/20">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Target size={20} className="text-primary" />
                                                <p className="text-sm font-bold text-secondary">Personalized Goal</p>
                                            </div>
                                            <p className="text-base text-text-muted">
                                                Order {loyaltyTier.nextTier ? '3 more times' : '5 more times'} this month to unlock exclusive rewards! 🎁
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ACCOUNT TAB */}
                        {activeTab === 'account' && (
                            <div className="space-y-6">
                                {/* Contact Info */}
                                <div className="bg-white rounded-3xl p-8 shadow-lg border border-border/30">
                                    <h3 className="text-2xl font-heading text-secondary mb-6">Contact Information</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-5 bg-surface/50 rounded-2xl">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                <Mail size={20} className="text-primary" />
                                            </div>
                                            <div className="flex-grow">
                                                <p className="text-xs font-black uppercase tracking-wider text-text-muted mb-1">Email</p>
                                                {isEditing ? (
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        className="w-full text-base font-bold text-secondary bg-white border-2 border-primary/30 focus:border-primary outline-none py-2 px-3 rounded-xl"
                                                    />
                                                ) : (
                                                    <p className="text-base font-bold text-secondary">{user.email}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-5 bg-surface/50 rounded-2xl">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                <Phone size={20} className="text-primary" />
                                            </div>
                                            <div className="flex-grow">
                                                <p className="text-xs font-black uppercase tracking-wider text-text-muted mb-1">Phone</p>
                                                {isEditing ? (
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        value={formData.phone}
                                                        onChange={handleInputChange}
                                                        className="w-full text-base font-bold text-secondary bg-white border-2 border-primary/30 focus:border-primary outline-none py-2 px-3 rounded-xl"
                                                        placeholder="Enter phone number"
                                                    />
                                                ) : (
                                                    <p className="text-base font-bold text-secondary">{user.phone || 'Not set'}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-5 bg-surface/50 rounded-2xl">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                <Calendar size={20} className="text-primary" />
                                            </div>
                                            <div className="flex-grow">
                                                <p className="text-xs font-black uppercase tracking-wider text-text-muted mb-1">Birth Date</p>
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        name="birthDate"
                                                        value={formData.birthDate}
                                                        onChange={handleInputChange}
                                                        className="w-full text-base font-bold text-secondary bg-white border-2 border-primary/30 focus:border-primary outline-none py-2 px-3 rounded-xl"
                                                    />
                                                ) : (
                                                    <p className="text-base font-bold text-secondary">
                                                        {user.birthDate ? new Date(user.birthDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Addresses */}
                                <div className="bg-white rounded-3xl p-8 shadow-lg border border-border/30">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-2xl font-heading text-secondary">Saved Addresses</h3>
                                        {isEditing && (
                                            <button
                                                onClick={addNewAddress}
                                                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-secondary transition-all flex items-center gap-2"
                                            >
                                                <Plus size={16} />
                                                Add Address
                                            </button>
                                        )}
                                    </div>

                                    {formData.addresses.length > 0 ? (
                                        <div className="space-y-3">
                                            {formData.addresses.map((addr, index) => (
                                                <div key={index} className="p-5 bg-surface/50 rounded-2xl group hover:shadow-md transition-all">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                                            <Home size={18} className="text-primary" />
                                                        </div>
                                                        <div className="flex-grow">
                                                            {isEditing ? (
                                                                <div className="space-y-3">
                                                                    <input
                                                                        value={addr.street}
                                                                        onChange={(e) => handleAddressChange(index, 'street', e.target.value)}
                                                                        className="w-full text-sm font-bold bg-white border-2 border-border focus:border-primary outline-none py-2 px-3 rounded-xl"
                                                                        placeholder="Street Address"
                                                                    />
                                                                    <div className="grid grid-cols-3 gap-3">
                                                                        <input
                                                                            value={addr.city}
                                                                            onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                                                                            className="text-sm bg-white border-2 border-border focus:border-primary outline-none py-2 px-3 rounded-xl"
                                                                            placeholder="City"
                                                                        />
                                                                        <input
                                                                            value={addr.state}
                                                                            onChange={(e) => handleAddressChange(index, 'state', e.target.value)}
                                                                            className="text-sm bg-white border-2 border-border focus:border-primary outline-none py-2 px-3 rounded-xl"
                                                                            placeholder="State"
                                                                        />
                                                                        <input
                                                                            value={addr.pincode}
                                                                            onChange={(e) => handleAddressChange(index, 'pincode', e.target.value)}
                                                                            className="text-sm bg-white border-2 border-border focus:border-primary outline-none py-2 px-3 rounded-xl"
                                                                            placeholder="Pincode"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <p className="text-base font-bold text-secondary mb-1">{addr.street}</p>
                                                                    <p className="text-sm text-text-muted">{addr.city}, {addr.state} — {addr.pincode}</p>
                                                                </>
                                                            )}
                                                        </div>
                                                        {isEditing && (
                                                            <button
                                                                onClick={() => removeAddress(index)}
                                                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-surface/30 border-2 border-dashed border-border rounded-2xl p-12 text-center">
                                            <MapPin size={48} className="mx-auto text-border mb-4 opacity-50" />
                                            <p className="text-base font-heading text-secondary mb-2">No addresses saved</p>
                                            <p className="text-sm text-text-muted mb-6">Add delivery addresses for faster checkout</p>
                                            {isEditing && (
                                                <button
                                                    onClick={addNewAddress}
                                                    className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-secondary transition-all shadow-lg"
                                                >
                                                    Add Your First Address
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Security */}
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50/50 rounded-2xl p-6 border border-green-200/50 shadow-md">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                                                <ShieldCheck size={24} className="text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-green-900 mb-1">Account Verified & Secure</p>
                                                <p className="text-xs text-green-700">Protected with email and phone verification</p>
                                            </div>
                                        </div>
                                        {pwdFlow.step === 'idle' && (
                                            <button
                                                onClick={handleRequestPwdOTP}
                                                disabled={pwdFlow.loading}
                                                className="px-5 py-2 bg-white border border-green-200 text-green-700 rounded-xl text-sm font-bold hover:bg-green-50 transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {pwdFlow.loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                                                Change Password
                                            </button>
                                        )}
                                    </div>

                                    {pwdFlow.step === 'otp' && (
                                        <form onSubmit={handleVerifyPwdOTP} className="mt-4 space-y-4 border-t border-green-200 pt-4">
                                            <p className="text-xs text-green-700 font-medium">Enter the OTP sent to your registered phone number, then set your new password.</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={pwdFlow.otp}
                                                    onChange={e => setPwdFlow(prev => ({ ...prev, otp: e.target.value }))}
                                                    placeholder="6-digit OTP"
                                                    className="p-3 text-center text-xl font-bold tracking-widest border-2 border-green-200 rounded-xl focus:border-green-500 outline-none bg-white"
                                                    required
                                                />
                                                <input
                                                    type="password"
                                                    value={pwdFlow.newPwd}
                                                    onChange={e => setPwdFlow(prev => ({ ...prev, newPwd: e.target.value }))}
                                                    placeholder="New Password"
                                                    className="p-3 border-2 border-green-200 rounded-xl focus:border-green-500 outline-none bg-white"
                                                    required
                                                    minLength={8}
                                                />
                                                <input
                                                    type="password"
                                                    value={pwdFlow.confirmPwd}
                                                    onChange={e => setPwdFlow(prev => ({ ...prev, confirmPwd: e.target.value }))}
                                                    placeholder="Confirm Password"
                                                    className="p-3 border-2 border-green-200 rounded-xl focus:border-green-500 outline-none bg-white"
                                                    required
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    type="submit"
                                                    disabled={pwdFlow.loading}
                                                    className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {pwdFlow.loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                    Update Password
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPwdFlow({ step: 'idle', otp: '', newPwd: '', confirmPwd: '', loading: false })}
                                                    className="px-6 py-2 border border-green-200 text-green-700 rounded-xl text-sm font-bold hover:bg-green-50 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ORDERS TAB */}
                        {activeTab === 'orders' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-8 shadow-lg border border-border/30">
                                    <h3 className="text-2xl font-heading text-secondary mb-6">Recent Orders</h3>
                                    {orders.length > 0 ? (
                                        <div className="space-y-3">
                                            {orders.slice(0, 5).map(order => (
                                                <div key={order._id} className="p-5 bg-surface/50 rounded-2xl hover:shadow-md transition-all">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                                <ShoppingBag size={20} className="text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-secondary">Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}</p>
                                                                <p className="text-sm text-text-muted">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-primary">₹{order.totalAmount}</p>
                                                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                                                                {order.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <ShoppingBag size={48} className="mx-auto text-border mb-4 opacity-50" />
                                            <p className="text-base font-heading text-secondary mb-2">No orders yet</p>
                                            <p className="text-sm text-text-muted">Start your culinary journey today!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* RESERVATIONS TAB */}
                        {activeTab === 'reservations' && (() => {
                            try {
                                return (
                                    <div className="space-y-6">
                                        {/* Table Reservations */}
                                        {Array.isArray(reservations) && reservations.length > 0 && (
                                            <div className="bg-white rounded-3xl p-8 shadow-lg border border-border/30">
                                                <h3 className="text-2xl font-heading text-secondary mb-6">Table Reservations ({reservations.length})</h3>
                                                <div className="space-y-3">
                                                    {reservations.map((reservation, idx) => {
                                                        try {
                                                            return (
                                                                <div key={reservation?._id || `res-${idx}`} className="p-5 bg-surface/50 rounded-2xl hover:shadow-md transition-all">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                                                <Calendar size={20} className="text-primary" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-secondary">
                                                                                    {reservation?.date ? new Date(reservation.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                                                                                </p>
                                                                                <p className="text-sm text-text-muted">
                                                                                    {reservation?.timeSlot ? (reservation.timeSlot.start ? `${reservation.timeSlot.start} - ${reservation.timeSlot.end}` : reservation.timeSlot) : 'N/A'} • {reservation?.guestCount || 0} guests
                                                                                    {reservation?.tableNumbers && Array.isArray(reservation.tableNumbers) && reservation.tableNumbers.length > 0 && ` • Table ${reservation.tableNumbers.join(', ')}`}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            {reservation?.totalAmount && <p className="font-bold text-primary">₹{reservation.totalAmount}</p>}
                                                                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${reservation?.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                                                reservation?.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                                    'bg-primary/10 text-primary'
                                                                                }`}>
                                                                                {reservation?.status || 'pending'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        } catch (err) {
                                                            console.error('Error rendering reservation:', err, reservation);
                                                            return (
                                                                <div key={`error-${idx}`} className="p-4 bg-red-50 rounded-lg text-sm text-red-700">
                                                                    Error displaying reservation {idx + 1}
                                                                </div>
                                                            );
                                                        }
                                                    })}
                                                </div>
                                            </div>
                                        )}


                                        {/* Empty State */}
                                        {(!Array.isArray(reservations) || reservations.length === 0) && (!Array.isArray(bookings) || bookings.length === 0) && (
                                            <div className="bg-white rounded-3xl p-8 shadow-lg border border-border/30">
                                                <div className="text-center py-12">
                                                    <Calendar size={48} className="mx-auto text-border mb-4 opacity-50" />
                                                    <p className="text-base font-heading text-secondary mb-2">No reservations yet</p>
                                                    <p className="text-sm text-text-muted mb-6">Book a table to get started!</p>
                                                    <button
                                                        onClick={() => navigate('/book-table')}
                                                        className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-secondary transition-all"
                                                    >
                                                        Book Now
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            } catch (error) {
                                console.error('❌ CRITICAL ERROR IN RESERVATIONS TAB:', error);
                                return (
                                    <div className="bg-white rounded-3xl p-8 shadow-lg border border-red-200">
                                        <div className="text-center py-12">
                                            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                                            <p className="text-base font-heading text-secondary mb-2">Unable to load reservations</p>
                                            <p className="text-sm text-text-muted mb-4">Something went wrong. Please refresh the page.</p>
                                            <button
                                                onClick={() => window.location.reload()}
                                                className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-secondary transition-all"
                                            >
                                                Refresh Page
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                        })()}

                        {/* VENUES TAB */}
                        {activeTab === 'venues' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-8 shadow-lg border border-border/30">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-2xl font-heading text-secondary">Venue Bookings</h3>
                                        <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl">
                                            <Building2 size={16} className="text-primary" />
                                            <span className="text-sm font-bold text-primary">{bookings.length} Events</span>
                                        </div>
                                    </div>

                                    {bookings.length > 0 ? (
                                        <div className="space-y-4">
                                            {bookings.map((booking, idx) => (
                                                <div key={booking._id || idx} className="p-6 bg-surface/50 rounded-2xl hover:shadow-md transition-all border border-transparent hover:border-primary/10">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                                                <Home size={24} className="text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-lg text-secondary">{booking.venueName || 'Premier Venue'}</p>
                                                                <p className="text-sm text-text-muted flex items-center gap-2">
                                                                    <Calendar size={14} />
                                                                    {new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                </p>
                                                                <p className="text-xs font-medium text-primary mt-1 uppercase tracking-wider">
                                                                    One Line Summary: {booking.venueName} booking for {booking.guestCount} guests — Status: {booking.status}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                                                            <p className="font-bold text-xl text-secondary">₹{booking.grandTotal?.toLocaleString()}</p>
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                                                booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                                                                booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                            }`}>
                                                                {booking.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 bg-surface/30 rounded-3xl border-2 border-dashed border-border/50">
                                            <Building2 size={64} className="mx-auto text-border mb-4 opacity-30" />
                                            <p className="text-xl font-heading text-secondary mb-2">No Venue Bookings</p>
                                            <p className="text-sm text-text-muted mb-8 max-w-xs mx-auto">Elevate your special moments with our world-class venues.</p>
                                            <button
                                                onClick={() => navigate('/venues')}
                                                className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:shadow-lg transition-all"
                                            >
                                                Explore Venues
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Venue Quick Stats */}
                                {bookings.length > 0 && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-gradient-to-br from-secondary to-surfaceDark p-8 rounded-3xl text-white shadow-xl">
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50 mb-2">Venue Investment</p>
                                            <p className="text-4xl font-heading mb-4">₹{bookings.reduce((sum, b) => sum + (b.grandTotal || 0), 0).toLocaleString()}</p>
                                            <div className="h-1 w-20 bg-primary rounded-full" />
                                        </div>
                                        <div className="bg-white p-8 rounded-3xl border border-border shadow-lg">
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-2">Next Event</p>
                                            {bookings.filter(b => new Date(b.eventDate) >= new Date()).length > 0 ? (
                                                <>
                                                    <p className="text-2xl font-heading text-secondary mb-1">
                                                        {new Date(bookings.filter(b => new Date(b.eventDate) >= new Date()).sort((a,b) => new Date(a.eventDate) - new Date(b.eventDate))[0].eventDate).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-sm font-bold text-primary">Mark your calendar!</p>
                                                </>
                                            ) : (
                                                <p className="text-2xl font-heading text-text-muted italic">None Scheduled</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) }

                        {/* ACHIEVEMENTS TAB */}
                        {activeTab === 'achievements' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-8 shadow-lg border border-border/30">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Award size={24} className="text-primary" />
                                        <h3 className="text-2xl font-heading text-secondary">Your Achievements</h3>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {achievements.map((badge, idx) => (
                                            <div key={idx} className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 hover:shadow-lg transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-5xl group-hover:scale-110 transition-transform">{badge.icon}</div>
                                                    <div>
                                                        <p className="font-bold text-secondary text-lg">{badge.title}</p>
                                                        <p className="text-sm text-text-muted">{badge.desc}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {achievements.length === 0 && (
                                        <div className="text-center py-12">
                                            <Star size={48} className="mx-auto text-border mb-4 opacity-50" />
                                            <p className="text-base font-heading text-secondary mb-2">No achievements yet</p>
                                            <p className="text-sm text-text-muted">Complete orders and reservations to earn badges!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDEBAR */}
                    <div className="lg:col-span-4">
                        <div className="lg:sticky lg:top-24 space-y-6">
                            {/* Quick Actions */}
                            <div className="bg-white rounded-3xl p-6 shadow-xl border border-border">
                                <h3 className="text-sm font-black uppercase tracking-wider text-secondary mb-6 flex items-center gap-2">
                                    <Sparkles size={16} className="text-primary" />
                                    Quick Actions
                                </h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => navigate('/menu')}
                                        className="w-full group flex items-center gap-4 p-4 bg-gradient-to-r from-primary to-primary/90 text-white rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all"
                                    >
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                            <ShoppingBag size={20} />
                                        </div>
                                        <div className="flex-grow text-left">
                                            <p className="font-bold text-sm">Order Food</p>
                                            <p className="text-xs opacity-80">Browse our menu</p>
                                        </div>
                                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>

                                    <button
                                        onClick={() => navigate('/book-table')}
                                        className="w-full group flex items-center gap-4 p-4 bg-gradient-to-r from-secondary to-surfaceDark text-white rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all"
                                    >
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                            <Calendar size={20} />
                                        </div>
                                        <div className="flex-grow text-left">
                                            <p className="font-bold text-sm">Book a Table</p>
                                            <p className="text-xs opacity-80">Reserve your spot</p>
                                        </div>
                                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>

                                    <button
                                        onClick={() => navigate('/venues')}
                                        className="w-full group flex items-center gap-4 p-4 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all"
                                    >
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                            <Building2 size={20} />
                                        </div>
                                        <div className="flex-grow text-left">
                                            <p className="font-bold text-sm">Book Venue</p>
                                            <p className="text-xs opacity-80">Host your event</p>
                                        </div>
                                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* My Links */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate('/my-orders')}
                                    className="w-full group flex items-center justify-between p-5 bg-white border border-border rounded-2xl hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <ShoppingBag size={18} className="text-primary" />
                                        </div>
                                        <span className="font-bold text-secondary">My Orders</span>
                                    </div>
                                    <ChevronRight size={20} className="text-text-muted group-hover:translate-x-1 group-hover:text-primary transition-all" />
                                </button>

                                <button
                                    onClick={() => navigate('/my-table-reservations')}
                                    className="w-full group flex items-center justify-between p-5 bg-white border border-border rounded-2xl hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Calendar size={18} className="text-primary" />
                                        </div>
                                        <span className="font-bold text-secondary">My Reservations</span>
                                    </div>
                                    <ChevronRight size={20} className="text-text-muted group-hover:translate-x-1 group-hover:text-primary transition-all" />
                                </button>
                                <button
                                    onClick={() => navigate('/my-venue-bookings')}
                                    className="w-full group flex items-center justify-between p-5 bg-white border border-border rounded-2xl hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Building2 size={18} className="text-primary" />
                                        </div>
                                        <span className="font-bold text-secondary">My Venue Bookings</span>
                                    </div>
                                    <ChevronRight size={20} className="text-text-muted group-hover:translate-x-1 group-hover:text-primary transition-all" />
                                </button>
                            </div>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold hover:bg-red-600 hover:text-white transition-all shadow-md"
                            >
                                <LogOut size={18} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* OTP Verification Modal */}
            {showOTPModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-secondary/90 backdrop-blur-lg animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/20 animate-scale-up relative">
                        <button
                            onClick={() => {
                                setShowOTPModal(false);
                                setOtp('');
                                setVerificationMode(null);
                                setNewValue('');
                            }}
                            className="absolute top-6 right-6 text-secondary/40 hover:text-primary transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="p-12 text-center">
                            <div className="mb-8 inline-block">
                                <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center text-primary border border-border shadow-lg">
                                    <Smartphone className="animate-bounce" size={32} />
                                </div>
                            </div>

                            <h2 className="text-3xl font-heading text-secondary mb-3">Verify Update</h2>
                            <p className="text-sm text-text-muted mb-2">
                                We've sent a 6-digit OTP to your old {verificationMode === 'email' ? 'email' : 'phone number'}
                            </p>
                            <p className="text-xs text-primary font-bold mb-8">
                                New {verificationMode}: {newValue}
                            </p>

                            <div className="space-y-6">
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-4xl font-heading tracking-[0.5em] text-center border-b-4 border-primary/20 focus:border-primary bg-transparent py-4 text-secondary outline-none transition-all"
                                    placeholder="••••••"
                                    autoFocus
                                />

                                <button
                                    onClick={submitOTP}
                                    disabled={otp.length !== 6 || verifyingOTP}
                                    className="w-full py-4 bg-secondary text-white rounded-2xl text-sm font-black uppercase tracking-wider shadow-xl hover:bg-primary transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none"
                                >
                                    {verifyingOTP ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Verify & Update'}
                                </button>

                                <p className="text-xs text-text-muted">
                                    This confirms it's really you making this change
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
