import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, RefreshCw, AlertCircle, ShieldCheck, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { verifyOTP, resendOTP } from '../api';
import { useAuth } from '../context/AuthContext';

export default function VerifyOtp() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [contact, setContact] = useState({ email: '', phone: '', otpPreference: 'phone' });
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (location.state) {
            setContact({
                email: location.state.email || '',
                phone: location.state.phone || '',
                otpPreference: location.state.otpPreference || 'phone'
            });
        } else {
            navigate('/register');
        }
    }, [location, navigate]);

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        } else {
            setCanResend(true);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const handleChange = (element, index) => {
        if (isNaN(element.value)) return;
        const newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);
        if (element.nextSibling && element.value) {
            element.nextSibling.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && e.target.previousSibling) {
            e.target.previousSibling.focus();
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('VALIDATION ERROR: COMPLETE THE 6-DIGIT SEQUENCE.');
            setLoading(false);
            return;
        }

        try {
            await verifyOTP({
                email: contact.email,
                phone: contact.phone,
                otp: otpValue
            });

            setSuccess('PROTOCOL SECURED: IDENTITY VALIDATED.');
            setTimeout(() => {
                navigate('/login');
            }, 1000);
        } catch (err) {
            setError(err.message || 'PROTOCOL BREACH: INVALID SEQUENCE.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setLoading(true);
        setError('');
        try {
            await resendOTP({
                email: contact.email,
                phone: contact.phone,
                otpPreference: contact.otpPreference
            });
            setSuccess('New OTP sent! Check your ' + (contact.otpPreference === 'email' ? 'email inbox' : 'phone SMS'));
            setCountdown(60);
            setCanResend(false);
        } catch (err) {
            setError(err.message || 'TRANSMISSION FAILURE.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-secondary flex items-center justify-center p-4 lg:p-6 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-primary/20 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-primary/10 rounded-full blur-[120px] animate-blob delay-500" />
            </div>

            <div className="w-full max-w-2xl h-full max-h-[800px] relative bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 p-10 md:p-16 flex flex-col justify-center animate-scale-up">
                <div className="text-center mb-10 animate-fade-in">
                    <div className="w-16 h-16 bg-surfaceDark rounded-2xl flex items-center justify-center text-primary mx-auto mb-6 shadow-xl border border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                        <ShieldCheck size={32} className="relative z-10" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-3">Security Level 1</p>
                    <h2 className="text-4xl font-heading text-secondary mb-4 leading-tight">Verify <span className="italic text-primary">Identity.</span></h2>
                    <div className="h-1 w-12 bg-primary mx-auto mb-6" />
                    <p className="text-[11px] font-bold text-secondary/60 uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">
                        Verification code sent via {contact.otpPreference === 'email' ? '📧 Email' : '📱 SMS'} to <br />
                        <span className="text-secondary font-black border-b-2 border-primary/30 mt-2 inline-block lowercase tracking-normal">
                            {contact.otpPreference === 'email' ? contact.email : contact.phone}
                        </span>
                    </p>
                </div>

                {/* Messages */}
                <div className="space-y-4 mb-12">
                    {error && (
                        <div className="p-5 bg-red-50 border border-red-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-600 animate-slide-in-right flex items-center gap-3">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-5 bg-green-50 border border-green-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-green-700 flex items-center gap-3 animate-slide-in-right">
                            <CheckCircle size={16} />
                            {success}
                        </div>
                    )}
                </div>

                <form onSubmit={handleVerify} className="space-y-12">
                    <div className="flex justify-between gap-3 md:gap-4 animate-slide-up delay-100">
                        {otp.map((data, index) => (
                            <input
                                key={index}
                                type="text"
                                maxLength="1"
                                className="w-full h-16 md:h-20 bg-surface/30 border-2 border-transparent focus:border-primary/50 focus:bg-white rounded-2xl text-center text-3xl font-heading text-secondary focus:outline-none transition-all shadow-inner-soft"
                                value={data}
                                onChange={e => handleChange(e.target, index)}
                                onKeyDown={e => handleKeyDown(e, index)}
                                onFocus={e => e.target.select()}
                            />
                        ))}
                    </div>

                    <div className="pt-6 animate-slide-up delay-200">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-secondary text-white py-6 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.5em] shadow-xl hover:bg-primary transition-all duration-500 disabled:opacity-30 flex items-center justify-center gap-4 group relative overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-4">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                {loading ? 'Verifying Code...' : 'Access Heritage'}
                                {!loading && <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />}
                            </span>
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center animate-fade-in delay-300">
                    <button
                        onClick={handleResend}
                        disabled={!canResend || loading}
                        className={`inline-flex items-center gap-4 px-8 py-3.5 rounded-full border border-border text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${canResend ? 'text-secondary bg-white hover:bg-surface hover:shadow-lg' : 'text-secondary/40 opacity-40 cursor-not-allowed'}`}
                    >
                        <RefreshCw size={14} className={loading && canResend ? 'animate-spin' : ''} />
                        {canResend ? 'Request New Code' : `Resend in ${countdown}s`}
                    </button>
                </div>

                <div className="mt-12 pt-8 border-t border-border/50 text-center animate-fade-in delay-400">
                    <p className="text-[10px] font-black uppercase tracking-[0.8em] text-secondary/30">Vincent Security Protocol</p>
                </div>
            </div>
        </div>
    );
}
