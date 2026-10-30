import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchResources, createBooking } from '../api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Users, CheckCircle, AlertCircle, Lock } from 'lucide-react';

export default function Reservations() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const queryParams = new URLSearchParams(location.search);
    const initialType = queryParams.get('type') || 'hall';

    const [resources, setResources] = useState([]);
    const [formData, setFormData] = useState({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        date: '',
        startTime: '',
        endTime: '',
        guestCount: 2,
        type: initialType,
        notes: '',
        ResourceId: ''
    });
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchResources().then(setResources);
        if (user) {
            setFormData(prev => ({
                ...prev,
                customerName: user.name || '',
                customerPhone: user.phone || '',
                customerEmail: user.email || ''
            }));
        }
    }, [user]);

    useEffect(() => {
        setFormData(prev => ({ ...prev, type: initialType }));
    }, [initialType]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isAuthenticated) {
            navigate('/login', { state: { from: location } });
            return;
        }

        setStatus('submitting');
        try {
            await createBooking({ ...formData, userId: user._id });
            setStatus('success');
            setMessage('Your reservation has been confirmed. We look forward to hosting you.');
            setFormData(prev => ({ ...prev, notes: '' }));
        } catch (err) {
            console.error(err);
            setStatus('error');
            setMessage(err.message || 'Something went wrong.');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const currentResourceType = formData.type;
    const availableResources = resources.filter(r => r.type === currentResourceType);

    return (
        <div className="bg-background pt-20 min-h-screen">
            <div className="bg-surface py-12 border-b border-border">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-heading mb-4 capitalize text-secondary">{formData.type} Reservation</h1>
                    <p className="text-text-muted">Complete the form below to secure your spot.</p>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto bg-surface border border-border p-8 md:p-12 shadow-sm relative overflow-hidden">

                    {!isAuthenticated && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6">
                            <Lock className="w-16 h-16 text-primary mb-4" />
                            <h3 className="text-2xl font-heading text-secondary mb-2">Login Required</h3>
                            <p className="text-text-muted mb-6 max-w-md">To ensure a secure and personalized experience, please verify your phone number to continue with your reservation.</p>
                            <button
                                onClick={() => navigate('/login', { state: { from: location } })}
                                className="btn"
                            >
                                Login to Book
                            </button>
                        </div>
                    )}

                    {status === 'success' ? (
                        <div className="text-center py-12 animate-fade-in">
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-3xl font-heading mb-2 text-secondary">Booking Confirmed!</h3>
                            <p className="text-text-muted text-lg mb-8">{message}</p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="btn"
                            >
                                Make Another Booking
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className={`space-y-8 relative z-10 ${!isAuthenticated ? 'blur-sm select-none' : ''}`}>

                            <div className="flex justify-center gap-4 mb-8">
                                {['hall', 'lawn'].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: t, ResourceId: '' })}
                                        className={`px-6 py-3 text-sm uppercase tracking-wider border transition-all ${formData.type === t
                                            ? 'bg-secondary text-white border-secondary font-bold'
                                            : 'bg-transparent text-text-muted border-border hover:border-primary'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-secondary/60 font-medium">Full Name</label>
                                    <input required type="text" name="customerName" value={formData.customerName} onChange={handleChange} className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors" placeholder="John Doe" disabled={!!user} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-secondary/60 font-medium">Email Address</label>
                                    <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange} className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors" placeholder="john@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-secondary/60 font-medium">Phone Number</label>
                                    <input required type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleChange} className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors" placeholder="+1 (555) 000-0000" disabled={!!user} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-secondary/60 font-medium">Guests</label>
                                    <div className="relative">
                                        <Users className="absolute right-3 top-3 w-4 h-4 text-text-muted" />
                                        <input required type="number" min="1" name="guestCount" value={formData.guestCount} onChange={handleChange} className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-secondary/60 font-medium">Date</label>
                                    <input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-secondary/60 font-medium">Start Time</label>
                                    <input required type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-secondary/60 font-medium">End Time</label>
                                    <input required type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest text-secondary/60 font-medium">Select Venue</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleChange({ target: { name: 'ResourceId', value: '' } })}
                                        className={`p-4 border rounded-sm text-center text-sm transition-all ${formData.ResourceId === '' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:border-primary/50'}`}
                                    >
                                        Any Available
                                    </button>
                                    {availableResources.map(r => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => handleChange({ target: { name: 'ResourceId', value: r.id } })}
                                            className={`p-4 border rounded-sm text-center text-sm transition-all ${formData.ResourceId === r.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:border-primary/50'}`}
                                        >
                                            {r.name} <span className="block text-xs text-text-muted mt-1">Cap: {r.capacity}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest text-secondary/60 font-medium">Special Requests</label>
                                <textarea rows="3" name="notes" placeholder="Allergies, special occasions, etc." value={formData.notes} onChange={handleChange} className="w-full bg-background border-b border-border focus:border-primary p-3 outline-none transition-colors resize-none"></textarea>
                            </div>

                            {status === 'error' && (
                                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 border border-red-100 rounded-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {message}
                                </div>
                            )}

                            <button type="submit" disabled={!isAuthenticated || status === 'submitting'} className="btn w-full py-4 text-base tracking-widest shadow-none">
                                {status === 'submitting' ? 'Confirming...' : 'Confirm Request'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
