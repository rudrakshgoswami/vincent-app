import { Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, XCircle, Loader2 } from 'lucide-react';

/**
 * REQUIREAUTH — protects user-facing routes.
 *
 * WHY THE OLD VERSION BROKE ON REFRESH:
 *   It read localStorage.getItem('token') synchronously. AuthContext never
 *   wrote to localStorage — it uses React state instead. So on every refresh,
 *   localStorage was always empty → immediate redirect to /login, before the
 *   async /api/auth/refresh call could finish restoring the session.
 *
 * THE FIX:
 *   1. Read from AuthContext (useAuth), NOT localStorage.
 *   2. While loading === true (silent refresh in progress), show a spinner.
 *      Never redirect during this phase.
 *   3. Only redirect AFTER loading === false AND isAuthenticated === false.
 *      This gives the refresh call time to restore the session.
 */
export default function RequireAuth({ children }) {
    const location = useLocation();
    const { isAuthenticated, loading } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [shouldRedirect, setShouldRedirect] = useState(false);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            setShowModal(true);
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setShouldRedirect(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [loading, isAuthenticated]);

    // ── Phase 1: Still checking auth (silent refresh in progress) ──
    // CRITICAL: Must wait here. Redirecting now loses authenticated users on F5.
    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-sm text-gray-500 font-medium">Restoring your session...</p>
                </div>
            </div>
        );
    }

    // ── Phase 2: Authenticated ─────────────────────────────────
    if (isAuthenticated) return children;

    // ── Phase 3: Confirmed not-authenticated → redirect ────────
    if (shouldRedirect) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // ── Phase 4: Show "Please Login" modal with countdown ──────
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slideUp">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-heading text-center text-secondary mb-2">
                    Authentication Required
                </h2>
                <p className="text-center text-gray-600 mb-6">
                    Please login to continue with your order or reservation.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Login required for:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Placing food orders</li>
                        <li>• Table reservations</li>
                        <li>• Banquet bookings</li>
                        <li>• Lawn bookings</li>
                    </ul>
                </div>
                <p className="text-center text-sm text-gray-500 mb-4">
                    Redirecting to login in <span className="font-semibold text-primary">{countdown}</span> seconds...
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShouldRedirect(true)}
                        className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                    >
                        <LogIn size={20} />
                        Login Now
                    </button>
                    <button
                        onClick={() => window.history.back()}
                        className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
                <p className="text-center text-sm text-gray-600 mt-4">
                    Don't have an account?{' '}
                    <a href="/register" className="text-primary font-semibold hover:underline">
                        Register now
                    </a>
                </p>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                .animate-slideUp { animation: slideUp 0.4s ease-out; }
            `}</style>
        </div>
    );
}
