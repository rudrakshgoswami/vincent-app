import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Phone, Lock, Loader2, CheckCircle, ShieldCheck, Sparkles, ArrowRight, AlertCircle, MessageSquare } from 'lucide-react';
import { registerUser } from '../api';

export default function Register() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Step: 'form' | 'choose-otp'
    const [step, setStep] = useState('form');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        address: { street: '', city: '', state: '', pincode: '' }
    });

    const passwordCriteria = {
        length: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
        special: /[@$!%*?&]/.test(formData.password)
    };
    const strengthScore = Object.values(passwordCriteria).filter(Boolean).length;
    const isPasswordStrong = strengthScore === 5;
    const getStrengthLabel = () => {
        if (strengthScore === 0) return { label: 'Awaiting Input', color: 'bg-border', text: 'text-text-muted' };
        if (strengthScore <= 2) return { label: 'Insufficient', color: 'bg-red-500', text: 'text-red-500' };
        if (strengthScore <= 4) return { label: 'Moderate', color: 'bg-yellow-500', text: 'text-yellow-600' };
        return { label: 'Exceptional', color: 'bg-primary', text: 'text-primary font-black' };
    };
    const strength = getStrengthLabel();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('address.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Step 1: Validate form, then show OTP method picker
    const handleFormSubmit = (e) => {
        e.preventDefault();
        setError('');
        setStep('choose-otp');
    };

    // Step 2: User picks method, call API and go to verify
    const handleChooseOtp = async (preference) => {
        setLoading(true);
        setError('');
        try {
            const response = await registerUser({ ...formData, otpPreference: preference });
            navigate('/verify-otp', {
                state: {
                    email: formData.email,
                    phone: formData.phone,
                    otpPreference: preference
                }
            });
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
            setStep('form'); // Go back to form on error
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-secondary flex items-center justify-center p-4 lg:p-6 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-blob delay-700" />
            </div>

            {/* ── OTP METHOD MODAL ───────────────────────────────── */}
            {step === 'choose-otp' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-secondary/80 backdrop-blur-md"
                        onClick={() => !loading && setStep('form')}
                    />

                    {/* Modal Card */}
                    <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-scale-up">
                        {/* Top accent */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

                        <div className="p-10">
                            {/* Icon */}
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck size={32} className="text-primary" />
                            </div>

                            <h2 className="text-3xl font-heading text-secondary text-center mb-2">
                                Verify <span className="italic text-primary">Identity</span>
                            </h2>
                            <p className="text-center text-xs text-secondary/50 font-bold uppercase tracking-widest mb-8">
                                Choose how to receive your OTP
                            </p>

                            {error && (
                                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] font-bold text-red-600 flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* SMS Option */}
                                <button
                                    onClick={() => handleChooseOtp('phone')}
                                    disabled={loading}
                                    className="w-full group flex items-center gap-5 p-5 rounded-2xl border-2 border-border hover:border-primary bg-surface/30 hover:bg-primary/5 transition-all duration-300 disabled:opacity-50 text-left"
                                >
                                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                        {loading ? (
                                            <Loader2 size={24} className="text-primary animate-spin" />
                                        ) : (
                                            <MessageSquare size={24} className="text-primary" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-secondary mb-0.5">SMS to Phone</p>
                                        <p className="text-xs text-secondary/50 font-medium">
                                            OTP sent to <span className="font-bold text-secondary">{formData.phone}</span>
                                        </p>
                                    </div>
                                    <ArrowRight size={18} className="ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                {/* Email Option */}
                                <button
                                    onClick={() => handleChooseOtp('email')}
                                    disabled={loading}
                                    className="w-full group flex items-center gap-5 p-5 rounded-2xl border-2 border-border hover:border-primary bg-surface/30 hover:bg-primary/5 transition-all duration-300 disabled:opacity-50 text-left"
                                >
                                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                        {loading ? (
                                            <Loader2 size={24} className="text-primary animate-spin" />
                                        ) : (
                                            <Mail size={24} className="text-primary" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-secondary mb-0.5">Email</p>
                                        <p className="text-xs text-secondary/50 font-medium">
                                            OTP sent to <span className="font-bold text-secondary">{formData.email}</span>
                                        </p>
                                    </div>
                                    <ArrowRight size={18} className="ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('form')}
                                disabled={loading}
                                className="mt-6 w-full text-center text-[11px] font-black uppercase tracking-widest text-secondary/40 hover:text-secondary transition-colors"
                            >
                                ← Back to form
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── REGISTRATION FORM ────────────────────────────────── */}
            <div className="w-full max-w-6xl h-full max-h-[800px] relative grid grid-cols-1 lg:grid-cols-12 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 animate-scale-up">
                {/* Left Side: Brand */}
                <div className="lg:col-span-4 relative bg-surfaceDark overflow-hidden hidden lg:flex flex-col justify-between p-10">
                    <img
                        src="https://images.unsplash.com/photo-1550966841-396ad886fe5e?q=80&w=2070&auto=format&fit=crop"
                        alt="Vincent Heritage"
                        className="absolute inset-0 w-full h-full object-cover grayscale opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/80 to-transparent" />
                    <div className="relative z-10 animate-slide-in-left">
                        <Sparkles className="text-primary mb-6" size={32} />
                        <h2 className="text-4xl font-heading text-white mb-4 italic leading-tight">The Vincent <br />Heritage</h2>
                        <div className="h-0.5 w-12 bg-primary mb-6" />
                        <p className="text-white/70 text-sm font-bold uppercase tracking-[0.2em] leading-relaxed">A Tradition of Excellence.</p>
                    </div>
                    <div className="relative z-10 space-y-6">
                        <div className="flex gap-4 items-center">
                            <div className="w-10 h-10 rounded-full border border-primary/50 flex items-center justify-center text-primary text-xs font-black">01</div>
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">Profile</span>
                        </div>
                        <div className="flex gap-4 items-center opacity-50">
                            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white text-xs font-black">02</div>
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">Verify</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="lg:col-span-8 p-8 md:p-12 flex flex-col justify-center bg-white overflow-hidden">
                    <div className="mb-8 animate-fade-in flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-heading text-secondary mb-2">Join the <span className="italic text-primary">Heritage.</span></h1>
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-secondary/70">Register for preferred access</p>
                        </div>
                        <Link to="/login" className="text-[11px] font-black uppercase tracking-[0.2em] text-primary hover:text-secondary border-b-2 border-primary/30 pb-1 transition-all">Sign In</Link>
                    </div>

                    {/* Error */}
                    {error && step === 'form' && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] font-bold text-red-600 animate-slide-in-right flex items-center gap-2">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-5 animate-slide-up delay-100">
                            <div className="space-y-1 group">
                                <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={16} />
                                    <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full pl-12 pr-4 py-2.5 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary transition-all placeholder:text-secondary/30" placeholder="Your Name" />
                                </div>
                            </div>
                            <div className="space-y-1 group">
                                <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={16} />
                                    <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full pl-12 pr-4 py-2.5 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary transition-all placeholder:text-secondary/30" placeholder="your@email.com" />
                                </div>
                            </div>
                            <div className="space-y-1 group">
                                <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={16} />
                                    <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} pattern="[0-9]{10}" maxLength="10" className="w-full pl-12 pr-4 py-2.5 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary transition-all placeholder:text-secondary/30" placeholder="10-digit mobile" />
                                </div>
                            </div>
                            <div className="space-y-1 group">
                                <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">Secure Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={16} />
                                    <input required type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} minLength="8" className="w-full pl-12 pr-4 py-2.5 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary transition-all placeholder:text-secondary/30" placeholder="Min 8 characters" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/40 hover:text-primary transition-colors">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {formData.password && (
                                    <div className="pt-1 flex justify-between items-center px-1">
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className={`h-1 w-3 rounded-full ${i <= strengthScore ? strength.color : 'bg-surface'}`} />
                                            ))}
                                        </div>
                                        <span className={`text-[9px] font-black uppercase ${strength.text}`}>{strength.label}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 animate-slide-up delay-200">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary border-b-2 border-primary/10 pb-2">Logistics</h3>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">Street</label>
                                    <input type="text" name="address.street" value={formData.address.street} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary outline-none transition-all placeholder:text-secondary/30" placeholder="Street" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">City</label>
                                    <input type="text" name="address.city" value={formData.address.city} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary outline-none transition-all placeholder:text-secondary/30" placeholder="City" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-secondary/80">Pincode</label>
                                    <input type="text" name="address.pincode" value={formData.address.pincode} onChange={handleInputChange} pattern="[0-9]{6}" maxLength="6" className="w-full px-4 py-2.5 bg-surface/40 border border-border focus:border-primary/50 focus:bg-white rounded-xl text-sm font-medium text-secondary outline-none transition-all placeholder:text-secondary/30" placeholder="000000" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border/50 animate-slide-up delay-300">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="text-primary" size={20} />
                                    <p className="text-[11px] font-black text-secondary uppercase tracking-widest leading-none">Protocol Secured</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!isPasswordStrong}
                                    className="w-full md:w-auto px-12 bg-secondary text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.4em] shadow-xl hover:bg-primary transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                                >
                                    <Sparkles size={18} />
                                    Access Heritage
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
