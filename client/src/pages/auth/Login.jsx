import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginUser, registerUser } from '../../api';
import { Coffee, ArrowRight, Loader2, Eye, EyeOff, User, Mail, Phone, Lock } from 'lucide-react';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true); // Toggle between login/register
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Login form
    const [loginData, setLoginData] = useState({
        emailOrPhone: '',
        password: ''
    });

    // Registration form
    const [registerData, setRegisterData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        address: {
            street: '',
            city: '',
            state: '',
            pincode: ''
        }
    });

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await loginUser(loginData.emailOrPhone, loginData.password);
            login(response.data.user, response.data.token);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || 'Invalid email/phone or password');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
        if (registerData.password !== registerData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (registerData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        if (registerData.phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            setLoading(false);
            return;
        }

        try {
            const userData = {
                name: registerData.name,
                email: registerData.email,
                phone: registerData.phone,
                password: registerData.password,
                address: {
                    label: 'Home',
                    street: registerData.address.street,
                    city: registerData.address.city,
                    state: registerData.address.state,
                    pincode: registerData.address.pincode,
                    isDefault: true
                }
            };

            const response = await registerUser(userData);
            login(response.data.user, response.data.token);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || 'Registration failed. Email or phone may already be registered.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[80px] -translate-x-1/3 translate-y-1/3"></div>

            <div className="w-full max-w-lg bg-white border border-border/50 shadow-xl rounded-sm p-8 md:p-12 relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <Coffee className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h1 className="text-3xl font-heading text-secondary mb-2">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-text-muted">
                        {isLogin
                            ? 'Enter your credentials to continue'
                            : 'Join Vincent Restaurant today'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm border border-red-100 rounded-sm">
                        {error}
                    </div>
                )}

                {isLogin ? (
                    /* ===== LOGIN FORM ===== */
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">
                                Email or Phone Number
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={loginData.emailOrPhone}
                                    onChange={(e) => setLoginData({ ...loginData, emailOrPhone: e.target.value })}
                                    className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-3 pl-10 text-lg transition-colors"
                                    placeholder="email@example.com or 9876543210"
                                    required
                                />
                                <Mail className="absolute left-0 top-3 w-5 h-5 text-text-muted" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-3 pl-10 pr-10 text-lg transition-colors"
                                    placeholder="Enter your password"
                                    required
                                />
                                <Lock className="absolute left-0 top-3 w-5 h-5 text-text-muted" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-3 text-text-muted hover:text-primary"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn h-14 text-lg group"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    Login <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    /* ===== REGISTRATION FORM ===== */
                    <form onSubmit={handleRegister} className="space-y-5">
                        {/* Personal Info */}
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">
                                Full Name
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={registerData.name}
                                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                    className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-3 pl-10 transition-colors"
                                    placeholder="John Doe"
                                    required
                                />
                                <User className="absolute left-0 top-3 w-5 h-5 text-text-muted" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">
                                    Email
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={registerData.email}
                                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                        className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-3 pl-10 transition-colors"
                                        placeholder="email@example.com"
                                        required
                                    />
                                    <Mail className="absolute left-0 top-3 w-5 h-5 text-text-muted" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">
                                    Phone (10 digits)
                                </label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        value={registerData.phone}
                                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                        className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-3 pl-10 transition-colors"
                                        placeholder="9876543210"
                                        required
                                    />
                                    <Phone className="absolute left-0 top-3 w-5 h-5 text-text-muted" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={registerData.password}
                                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                        className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-3 pl-10 pr-10 transition-colors"
                                        placeholder="Min 6 characters"
                                        required
                                    />
                                    <Lock className="absolute left-0 top-3 w-5 h-5 text-text-muted" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-3 text-text-muted hover:text-primary"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={registerData.confirmPassword}
                                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                                        className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-3 pl-10 transition-colors"
                                        placeholder="Re-enter password"
                                        required
                                    />
                                    <Lock className="absolute left-0 top-3 w-5 h-5 text-text-muted" />
                                </div>
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="pt-2 border-t border-border">
                            <p className="text-xs uppercase tracking-wider text-text-muted mb-3 font-medium">Delivery Address</p>

                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={registerData.address.street}
                                    onChange={(e) => setRegisterData({ ...registerData, address: { ...registerData.address, street: e.target.value } })}
                                    className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-2 transition-colors text-sm"
                                    placeholder="Street Address"
                                    required
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        value={registerData.address.city}
                                        onChange={(e) => setRegisterData({ ...registerData, address: { ...registerData.address, city: e.target.value } })}
                                        className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-2 transition-colors text-sm"
                                        placeholder="City"
                                        required
                                    />
                                    <input
                                        type="text"
                                        value={registerData.address.state}
                                        onChange={(e) => setRegisterData({ ...registerData, address: { ...registerData.address, state: e.target.value } })}
                                        className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-2 transition-colors text-sm"
                                        placeholder="State"
                                        required
                                    />
                                </div>

                                <input
                                    type="text"
                                    value={registerData.address.pincode}
                                    onChange={(e) => setRegisterData({ ...registerData, address: { ...registerData.address, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) } })}
                                    className="w-full bg-surface border-b-2 border-border focus:border-primary outline-none py-2 transition-colors text-sm"
                                    placeholder="Pincode (6 digits)"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn h-14 text-lg group"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    Create Account <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Toggle between Login/Register */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="text-sm text-text-muted hover:text-primary transition-colors"
                    >
                        {isLogin ? (
                            <>
                                Don't have an account? <span className="font-semibold underline">Sign Up</span>
                            </>
                        ) : (
                            <>
                                Already have an account? <span className="font-semibold underline">Login</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="mt-8 text-center text-text-muted text-sm relative z-10">
                <p>© {new Date().getFullYear()} Vincent Restaurant. All rights reserved.</p>
            </div>
        </div>
    );
}
