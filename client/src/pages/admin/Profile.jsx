import { useState, useEffect } from 'react';
import {
    User,
    Settings,
    Save,
    Building,
    MapPin,
    Phone,
    Mail,
    Globe,
    Camera,
    Loader2,
    Upload,
    Clock,
    Send,
    KeyRound,
    CheckCircle2,
    X
} from 'lucide-react';
import {
    getAdminProfile,
    updateAdminProfile,
    updateRestaurantSettings,
    uploadImage,
    requestAdminPasswordOTP,
    verifyAdminPasswordOTP,
    getImageUrl
} from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function AdminProfile() {
    const { setUser: setGlobalUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'settings'
    const [message, setMessage] = useState('');

    // Profile State
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        profilePicture: ''
    });

    // Password Change State
    const [passwordFlow, setPasswordFlow] = useState({
        step: 'initial', // 'initial', 'otp', 'verified'
        otp: '',
        newPassword: '',
        confirmPassword: '',
        loading: false
    });

    // Settings State
    const [settings, setSettings] = useState({
        name: '',
        address: '',
        landmark: '',
        phone: '',
        email: '',
        weekdayHours: '',
        weekendHours: '',
        googleMapLink: '',
        socialLinks: {
            instagram: '',
            facebook: '',
            whatsapp: ''
        }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getAdminProfile();
            if (res.success) {
                const { admin, settings: restSettings } = res.data;

                setProfile({
                    name: admin.name || '',
                    email: admin.email || '',
                    profilePicture: admin.profilePicture || ''
                });

                if (restSettings) {
                    let formattedAddress = restSettings.address;
                    if (typeof formattedAddress === 'object' && formattedAddress !== null) {
                        formattedAddress = [
                            formattedAddress.street,
                            formattedAddress.city,
                            formattedAddress.state,
                            formattedAddress.pincode
                        ].filter(Boolean).join(', ');
                    }

                    const phone = restSettings.phone || (restSettings.contact?.phone && restSettings.contact.phone[0]) || '';
                    const email = restSettings.email || restSettings.contact?.email || '';
                    const whatsapp = restSettings.socialLinks?.whatsapp || restSettings.contact?.whatsapp || '';

                    setSettings({
                        ...restSettings,
                        name: restSettings.name || '',
                        address: formattedAddress || '',
                        landmark: restSettings.landmark || '',
                        phone: phone,
                        email: email,
                        weekdayHours: restSettings.weekdayHours || '',
                        weekendHours: restSettings.weekendHours || '',
                        googleMapLink: restSettings.googleMapLink || '',
                        socialLinks: {
                            instagram: restSettings.socialLinks?.instagram || '',
                            facebook: restSettings.socialLinks?.facebook || '',
                            whatsapp: whatsapp
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            setMessage('Error: Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await updateAdminProfile(profile);
            setGlobalUser(prev => ({ ...prev, ...profile }));
            setMessage('Profile updated successfully!');
        } catch (error) {
            setMessage('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRequestOTP = async () => {
        setPasswordFlow(prev => ({ ...prev, loading: true }));
        setMessage('');
        try {
            const res = await requestAdminPasswordOTP();
            if (res.success) {
                setPasswordFlow(prev => ({ ...prev, step: 'otp' }));
                setMessage('OTP has been sent to your registered email.');
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        } finally {
            setPasswordFlow(prev => ({ ...prev, loading: false }));
        }
    };

    const handleVerifyAndSetPassword = async (e) => {
        e.preventDefault();
        if (passwordFlow.newPassword !== passwordFlow.confirmPassword) {
            setMessage('Error: Passwords do not match.');
            return;
        }

        setPasswordFlow(prev => ({ ...prev, loading: true }));
        setMessage('');
        try {
            const res = await verifyAdminPasswordOTP(passwordFlow.otp, passwordFlow.newPassword);
            if (res.success) {
                setPasswordFlow({
                    step: 'initial',
                    otp: '',
                    newPassword: '',
                    confirmPassword: '',
                    loading: false
                });
                setMessage('Password updated successfully!');
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        } finally {
            setPasswordFlow(prev => ({ ...prev, loading: false }));
        }
    };

    const handleSettingsUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await updateRestaurantSettings(settings);
            setMessage('Restaurant settings updated successfully!');
        } catch (error) {
            setMessage('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setSaving(true);
            setMessage('');
            const res = await uploadImage(file);
            if (res.success) {
                const url = res.imageUrl || res.url;
                if (type === 'profile') {
                    setProfile(prev => ({ ...prev, profilePicture: url }));
                    setGlobalUser(prev => ({ ...prev, profilePicture: url }));
                }
                setMessage('Image uploaded successfully!');
            } else {
                setMessage('Error: Upload failed: ' + res.message);
            }
        } catch (error) {
            setMessage('Error: Upload error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-3xl font-heading text-secondary mb-6">Settings & Profile</h1>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`pb-3 px-4 flex items-center gap-2 font-medium transition-colors ${activeTab === 'profile'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <User className="w-4 h-4" />
                    My Profile
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`pb-3 px-4 flex items-center gap-2 font-medium transition-colors ${activeTab === 'settings'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Building className="w-4 h-4" />
                    Restaurant Settings
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 animate-slide-in ${message.startsWith('Error')
                    ? 'bg-red-50 border border-red-100 text-red-600'
                    : 'bg-green-50 border border-green-100 text-green-600'
                    }`}>
                    {message.startsWith('Error') ? <X className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                    <span className="text-sm font-medium">{message}</span>
                </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    {/* Basic Info & Profile Pic */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                        <form onSubmit={handleProfileUpdate} className="space-y-6">
                            <div className="flex flex-col md:flex-row items-center gap-8 mb-4">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-gray-50 shadow-inner">
                                        {profile.profilePicture ? (
                                            <img src={getImageUrl(profile.profilePicture)} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12 text-gray-300" />
                                        )}
                                    </div>
                                    <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                                        <Camera className="w-5 h-5" />
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'profile')}
                                        />
                                    </label>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-xl font-bold text-secondary">{profile.name}</h3>
                                    <p className="text-gray-500 mb-4">{profile.email}</p>
                                    <p className="text-xs text-gray-400">Click the camera icon to upload a profile picture from your device.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        value={profile.name}
                                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save Basic Info
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Password Change Section (OTP Based) */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                                <KeyRound className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-secondary">Security Settings</h3>
                                <p className="text-sm text-gray-500">Change your account password securely using OTP.</p>
                            </div>
                        </div>

                        {passwordFlow.step === 'initial' && (
                            <div className="flex flex-col items-center py-4 text-center">
                                <p className="text-gray-600 mb-6 max-w-md">
                                    To change your password, we need to verify your identity. An OTP will be sent to <strong>{profile.email}</strong>.
                                </p>
                                <button
                                    onClick={handleRequestOTP}
                                    disabled={passwordFlow.loading}
                                    className="px-8 py-3 bg-secondary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-secondary-dark transition-all disabled:opacity-50"
                                >
                                    {passwordFlow.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    Send Verification OTP
                                </button>
                            </div>
                        )}

                        {passwordFlow.step === 'otp' && (
                            <form onSubmit={handleVerifyAndSetPassword} className="max-w-md mx-auto space-y-6 border-t border-gray-100 pt-6 mt-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Verification OTP</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={passwordFlow.otp}
                                        onChange={(e) => setPasswordFlow({ ...passwordFlow, otp: e.target.value })}
                                        className="w-full p-4 text-center text-3xl font-bold tracking-[10px] bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-secondary outline-none transition-all"
                                        placeholder="000000"
                                        required
                                    />
                                    <p className="text-xs text-secondary mt-2 text-center font-medium cursor-pointer hover:underline" onClick={handleRequestOTP}>
                                        Didn't receive? Resend OTP
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                                        <input
                                            type="password"
                                            value={passwordFlow.newPassword}
                                            onChange={(e) => setPasswordFlow({ ...passwordFlow, newPassword: e.target.value })}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={passwordFlow.confirmPassword}
                                            onChange={(e) => setPasswordFlow({ ...passwordFlow, confirmPassword: e.target.value })}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setPasswordFlow(prev => ({ ...prev, step: 'initial' }))}
                                        className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={passwordFlow.loading}
                                        className="flex-[2] px-4 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-secondary-dark transition-all disabled:opacity-50"
                                    >
                                        {passwordFlow.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 animate-fade-in">
                    <form onSubmit={handleSettingsUpdate} className="space-y-8">
                        {/* Basic Info */}
                        <section>
                            <h3 className="text-lg font-bold text-secondary mb-5 flex items-center gap-2 border-b border-gray-50 pb-2">
                                <Building className="w-5 h-5" />
                                Restaurant Profile
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Restaurant name</label>
                                    <input
                                        type="text"
                                        value={settings.name}
                                        onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Primary Phone</label>
                                    <input
                                        type="text"
                                        value={settings.phone}
                                        onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="+91 00000 00000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Email</label>
                                    <input
                                        type="email"
                                        value={settings.email}
                                        onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Location */}
                        <section>
                            <h3 className="text-lg font-bold text-secondary mb-5 flex items-center gap-2 border-b border-gray-50 pb-2">
                                <MapPin className="w-5 h-5" />
                                Store Location
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Address</label>
                                    <input
                                        type="text"
                                        value={settings.address}
                                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-10 py-4 bg-secondary text-white rounded-2xl font-black hover:bg-secondary-dark transition-all shadow-xl shadow-secondary/20 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                Update All Settings
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
