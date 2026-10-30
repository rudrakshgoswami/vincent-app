import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api';
import { useAuth } from '../context/AuthContext';
import { Shield, Loader2, User, Lock, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await adminLogin(username, password);
            const { accessToken, refreshToken, user } = response.data;

            if (!user.isAdmin) {
                throw new Error('Not authorized as an admin');
            }

            // access token → React memory, refresh token → sessionStorage (tab-isolated)
            login(accessToken, refreshToken, user);

            // Redirect to admin dashboard
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.message || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] flex overflow-hidden">
            {/* Left Side: Visual/Background */}
            <div className="hidden lg:flex lg:w-1/2 relative">
                <img
                    src="/admin-bg.png"
                    alt="Restaurant Interior"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/40 to-transparent"></div>
                <div className="relative z-10 w-full p-16 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 text-white mb-8">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                                <Shield className="w-6 h-6 text-secondary" />
                            </div>
                            <span className="text-2xl font-heading tracking-wider">VINCENT</span>
                        </div>
                        <h2 className="text-5xl text-white font-heading leading-tight mb-6">
                            Management <br />
                            <span className="text-primary italic">Excellence</span>
                        </h2>
                        <p className="text-white/70 text-lg max-w-md font-body leading-relaxed">
                            Access the heartbeat of Vincent Restaurant. Control reservations,
                            manage tables, and ensure every guest experiences the pinnacle of fine dining.
                        </p>
                    </div>

                    <div className="flex gap-12 text-white/50 text-sm uppercase tracking-[0.2em]">
                        <span>Est. 1994</span>
                        <span>Fine Dining</span>
                        <span>Admin Portal</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 relative">
                {/* Mobile Header (Hidden on Laptop) */}
                <div className="lg:hidden absolute top-12 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-heading text-secondary">Vincent</h1>
                </div>

                <div className="w-full max-w-md animate-fade-in-up">
                    <div className="mb-10 lg:text-left text-center">
                        <h2 className="text-4xl font-heading text-secondary mb-3">Admin Access</h2>
                        <p className="text-text-muted">Enter your credentials to manage the workspace.</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 text-red-600 text-sm border-l-4 border-red-500 flex items-center gap-3">
                            <div className="shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold">!</div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-8">
                        <div className="space-y-2 group">
                            <label className="text-xs uppercase tracking-[0.15em] text-text-muted font-semibold transition-colors group-focus-within:text-primary">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-border transition-colors group-focus-within:text-primary" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-4 pl-8 text-lg transition-all"
                                    placeholder="Enter username"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-xs uppercase tracking-[0.15em] text-text-muted font-semibold transition-colors group-focus-within:text-primary">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-border transition-colors group-focus-within:text-primary" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-4 pl-8 text-lg transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-secondary text-white h-16 rounded-sm text-lg font-medium tracking-wide flex items-center justify-center gap-3 hover:bg-secondary/95 transition-all group overflow-hidden relative shadow-lg shadow-secondary/10"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    <span>Sign into Dashboard</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center px-4">
                        <button
                            onClick={() => navigate('/')}
                            className="text-sm text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            ← Back to Restaurant Website
                        </button>
                    </div>

                    <div className="mt-12 p-6 bg-surface border border-border/50 rounded-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150 duration-700"></div>
                        <p className="text-xs text-text-muted leading-loose relative z-10">
                            <span className="font-bold text-secondary tracking-widest uppercase block mb-1">Development Access</span>
                            Username: <span className="text-primary font-mono select-all">admin</span> <br />
                            Password: <span className="text-primary font-mono select-all">admin123</span>
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-12 text-center text-text-muted/50 text-xs">
                    <p>© {new Date().getFullYear()} Vincent Fine Dining Group</p>
                </div>
            </div>
        </div>
    );
}

