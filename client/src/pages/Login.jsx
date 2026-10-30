import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Loader2, CheckCircle, Lock, ArrowRight, ShieldCheck, Sparkles, AlertCircle, Phone, Smartphone, KeyRound, X } from 'lucide-react';
import { loginUser, forgotPassword, resetPassword } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1: Phone, 2: OTP + New Password
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState('');
    const [forgotData, setForgotData] = useState({
        phone: '',
        otp: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [formData, setFormData] = useState({
        emailOrPhone: '',
        password: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleForgotInputChange = (e) => {
        const { name, value } = e.target;
        setForgotData(prev => ({ ...prev, [name]: value }));
        setForgotError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await loginUser(formData.emailOrPhone, formData.password);
            setSuccess('Authenticated successfully. Welcome back.');
            // access token → React memory (per tab)
            // refresh token → sessionStorage (per tab, tab-isolated)
            // user → React state
            login(response.data.accessToken, response.data.refreshToken, response.data.user);
            const from = location.state?.from?.pathname || '/';
            setTimeout(() => {
                navigate(from, { replace: true });
            }, 800);
        } catch (err) {
            setError(err.message || 'Authentication failed');
            if (err.message && err.message.toLowerCase().includes('verified')) {
                setTimeout(() => {
                    navigate('/verify-otp', {
                        state: {
                            email: formData.emailOrPhone.includes('@') ? formData.emailOrPhone : '',
                            phone: !formData.emailOrPhone.includes('@') ? formData.emailOrPhone : ''
                        }
                    });
                }, 2000);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setForgotError('');
        setForgotLoading(true);

        try {
            await forgotPassword(forgotData.phone);
            setForgotSuccess('A 6-digit code has been sent to your phone.');
            setForgotStep(2);
        } catch (err) {
            setForgotError(err.message || 'Failed to send OTP. Please try again.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setForgotError('');

        if (forgotData.newPassword !== forgotData.confirmPassword) {
            setForgotError('Passwords do not match');
            return;
        }

        setForgotLoading(true);

        try {
            await resetPassword({
                phone: forgotData.phone,
                otp: forgotData.otp,
                newPassword: forgotData.newPassword
            });
            setForgotSuccess('Password reset successful! You can now login.');
            setTimeout(() => {
                setShowForgotModal(false);
                setForgotStep(1);
                setForgotData({ phone: '', otp: '', newPassword: '', confirmPassword: '' });
                setForgotSuccess('');
            }, 2000);
        } catch (err) {
            setForgotError(err.message || 'Failed to reset password. Please check OTP.');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="h-screen bg-secondary flex items-center justify-center p-4 lg:p-6 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-blob delay-500" />
            </div>

            <div className="w-full max-w-4xl h-full max-h-[600px] relative grid grid-cols-1 md:grid-cols-2 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 animate-scale-up">
                {/* Left Side: Brand Imagery */}
                <div className="hidden md:block relative bg-surfaceDark overflow-hidden">
                    <img
                        src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop"
                        alt="Vincent Atmosphere"
                        className="w-full h-full object-cover opacity-60 scale-110 hover:scale-100 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/40 to-transparent" />
                    <div className="absolute bottom-10 left-10 right-10 text-white animate-slide-up delay-200">
                        <Sparkles className="text-primary mb-4" size={32} />
                        <h2
                            style={{ color: '#FFFFFF' }}
                            className="text-4xl font-heading mb-3 italic leading-tight"
                        >
                            The Vincent <br />Legacy
                        </h2>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/80 border-l-2 border-primary pl-4 py-1">
                            Excellence Redefined
                        </p>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
                    <div className="mb-8 animate-fade-in delay-100">
                        <h1 className="text-4xl font-heading text-secondary mb-2">Welcome <span className="italic text-primary">Back.</span></h1>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-secondary/70">Access your experience</p>
                    </div>

                    {/* Messages */}
                    <div className="space-y-3 mb-6">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 animate-slide-in-right flex items-center gap-2">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-bold text-green-700 flex items-center gap-2 animate-slide-in-right">
                                <CheckCircle size={14} />
                                {success}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2 group animate-slide-up delay-200">
                            <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">Email or Phone</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={18} />
                                <input
                                    type="text"
                                    name="emailOrPhone"
                                    value={formData.emailOrPhone}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary transition-all outline-none placeholder:text-secondary/30"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group animate-slide-up delay-300">
                            <div className="flex justify-between items-end">
                                <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">Password</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotModal(true);
                                        setForgotStep(1);
                                        setForgotError('');
                                        setForgotSuccess('');
                                    }}
                                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-secondary transition-colors underline-offset-4 hover:underline"
                                >
                                    Forgot?
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary transition-all outline-none placeholder:text-secondary/30"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/40 hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-secondary text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.4em] shadow-xl hover:bg-primary transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-3 group/btn relative overflow-hidden animate-slide-up delay-400"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                                {loading ? 'Verifying...' : 'Sign In'}
                                {!loading && <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />}
                            </span>
                            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                        </button>

                        <div className="pt-6 border-t border-border/50 mt-6 flex flex-col items-center gap-3 animate-fade-in delay-500">
                            <p className="text-xs font-black text-secondary/60 uppercase tracking-widest">New to Vincent?</p>
                            <Link
                                to="/register"
                                className="text-xs font-black uppercase tracking-[0.3em] text-primary hover:text-secondary transition-all border-b-2 border-primary/20 pb-0.5"
                            >
                                Create Account
                            </Link>
                        </div>
                    </form>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-scale-up relative">
                        <button
                            onClick={() => setShowForgotModal(false)}
                            className="absolute top-6 right-6 text-secondary/40 hover:text-primary transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="p-8 md:p-10">
                            <div className="mb-8">
                                <KeyRound className="text-primary mb-4" size={32} />
                                <h2 className="text-3xl font-heading text-secondary mb-2">Reset <span className="italic text-primary">Password.</span></h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-secondary/60">
                                    {forgotStep === 1 ? 'Verify your identity' : 'Create your new credentials'}
                                </p>
                            </div>

                            {forgotError && (
                                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] font-bold text-red-600 flex items-center gap-2 animate-slide-in-right">
                                    <AlertCircle size={14} />
                                    {forgotError}
                                </div>
                            )}

                            {forgotSuccess && (
                                <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded-xl text-[11px] font-bold text-green-700 flex items-center gap-2 animate-slide-in-right">
                                    <CheckCircle size={14} />
                                    {forgotSuccess}
                                </div>
                            )}

                            {forgotStep === 1 ? (
                                <form onSubmit={handleSendOTP} className="space-y-6">
                                    <div className="space-y-2 group">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">Phone Number</label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={18} />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={forgotData.phone}
                                                onChange={handleForgotInputChange}
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary transition-all outline-none"
                                                placeholder="+91 00000 00000"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="w-full bg-secondary text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.4em] shadow-xl hover:bg-primary transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {forgotLoading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                                        {forgotLoading ? 'Sending...' : 'Send OTP'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleResetPassword} className="space-y-6">
                                    <div className="space-y-2 group">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">6-Digit OTP</label>
                                        <input
                                            type="text"
                                            name="otp"
                                            value={forgotData.otp}
                                            onChange={handleForgotInputChange}
                                            required
                                            maxLength={6}
                                            className="w-full px-4 py-3 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-center text-xl font-bold tracking-[0.8em] text-secondary transition-all outline-none"
                                            placeholder="000000"
                                        />
                                    </div>

                                    <div className="space-y-2 group">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={18} />
                                            <input
                                                type="password"
                                                name="newPassword"
                                                value={forgotData.newPassword}
                                                onChange={handleForgotInputChange}
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary transition-all outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 group">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={18} />
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={forgotData.confirmPassword}
                                                onChange={handleForgotInputChange}
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary transition-all outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 pt-2">
                                        <button
                                            type="submit"
                                            disabled={forgotLoading}
                                            className="w-full bg-secondary text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.4em] shadow-xl hover:bg-primary transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {forgotLoading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                                            {forgotLoading ? 'Resetting...' : 'Reset Password'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForgotStep(1)}
                                            className="text-[10px] font-black uppercase tracking-widest text-secondary/40 hover:text-primary transition-colors"
                                        >
                                            Change Phone Number
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Label */}
            <div className="absolute bottom-8 left-0 right-0 text-[11px] font-black uppercase tracking-[0.8em] text-white/40 text-center animate-pulse">
                Vincent Culinary Group • Excellence Redefined
            </div>
        </div>
    );
}
