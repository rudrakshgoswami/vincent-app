import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { verifyPayment, getUserProfile, createRazorpayOrder, getImageUrl } from '../api';
import { initiatePayment } from '../utils/paymentHandler';
import { ShoppingBag, MapPin, Home as HomeIcon, Store, ArrowLeft, Loader2 } from 'lucide-react';

const TAX_PERCENTAGE = 5;
const DELIVERY_CHARGE = 40;

export default function Checkout() {
    const navigate = useNavigate();
    const { cart, clearCart, cartTotal } = useCart();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [orderType, setOrderType] = useState('delivery'); // 'delivery' or 'dine-in'
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (cart.length === 0) {
            navigate('/order');
            return;
        }
        loadUserProfile();
    }, [user, cart]);

    const loadUserProfile = async () => {
        try {
            const response = await getUserProfile();
            if (response.data.user.addresses) {
                setAddresses(response.data.user.addresses);
                if (response.data.user.addresses.length > 0) {
                    setSelectedAddress(0);
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoadingProfile(false);
        }
    };

    // Calculate totals
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = (subtotal * TAX_PERCENTAGE) / 100;
    const deliveryCharge = orderType === 'delivery' ? DELIVERY_CHARGE : 0;
    const totalAmount = subtotal + tax + deliveryCharge;

    const handlePayment = async () => {
        if (orderType === 'delivery' && selectedAddress === null) {
            setError('Please select a delivery address');
            return;
        }

        setError('');
        setLoading(true);

        try {
            // 1. Create Razorpay Order in Backend first
            const orderRes = await createRazorpayOrder(totalAmount, 'INR');
            if (!orderRes || !orderRes.data) throw new Error('Could not create payment order');
            
            const { orderId } = orderRes.data;

            // 2. Open Razorpay Checkout
            await initiatePayment({
                razorpayOrderId: orderId, // Use pre-created order ID
                amount: totalAmount,
                user,
                description: 'Vincent Food Order',
                onSuccess: async (response) => {
                    setLoading(true);
                    try {
                        const verifyResponse = await verifyPayment({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            items: cart.map(item => ({
                                menuItemId: item.id,
                                quantity: item.quantity,
                                specialInstructions: item.notes || ''
                            })),
                            orderType,
                            deliveryAddress: orderType === 'delivery' ? addresses[selectedAddress] : undefined,
                            tableNumber: orderType === 'dine-in' ? 'TBD' : undefined,
                            notes
                        });

                        setPaymentSuccess(true);
                        clearCart();
                        setTimeout(() => {
                            navigate('/my-orders?success=true');
                        }, 2000);
                    } catch (err) {
                        if (err.message.includes('not found')) {
                            setError('Cart contains an old item that no longer exists! Cart has been cleared. Redirecting...');
                            clearCart();
                            setTimeout(() => {
                                navigate('/order');
                            }, 3000);
                        } else {
                            setError('Order verification failed: ' + err.message);
                        }
                    } finally {
                        setLoading(false);
                    }
                },
                onError: (err) => {
                    console.error('Checkout Payment Error:', err);
                    setError(err.message || 'Payment failed');
                    setLoading(false);
                },
                onDismiss: () => {
                    setLoading(false);
                }
            });
        } catch (error) {
            console.error('Checkout Error:', error);
            setError(error.message || 'Failed to place order');
            setLoading(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="min-h-screen bg-background pt-20 grid place-items-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-text-muted">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-12 pb-12">
            <div className="container mx-auto px-6 max-w-4xl">
                {/* Header */}
                <div className="mb-4">
                    <button
                        onClick={() => navigate('/order')}
                        className="flex items-center gap-2 text-text-muted hover:text-white mb-2 transition-colors text-xs"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Back to Menu
                    </button>
                    <h1 className="text-3xl font-heading mb-1">Checkout</h1>
                    <p className="text-sm text-text-muted">Complete your order</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded px-4 py-3 mb-6">
                        <p className="text-red-500">{error}</p>
                    </div>
                )}

                {/* Order Type Selection */}
                <div className="bg-surface border border-white/5 p-4 mb-4 rounded-xl">
                    <h2 className="text-lg font-heading mb-3">Order Type</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setOrderType('delivery')}
                            className={`p-3 border rounded transition-all ${orderType === 'delivery'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <HomeIcon className="w-5 h-5 mx-auto mb-1.5" />
                            <div className="font-heading text-base">Home Delivery</div>
                            <div className="text-[11px] text-text-muted">₹{DELIVERY_CHARGE} delivery charge</div>
                        </button>
                        <button
                            onClick={() => setOrderType('dine-in')}
                            className={`p-3 border rounded transition-all ${orderType === 'dine-in'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <Store className="w-5 h-5 mx-auto mb-1.5" />
                            <div className="font-heading text-base">Dine-In</div>
                            <div className="text-[11px] text-text-muted">No delivery charge</div>
                        </button>
                    </div>
                </div>

                {/* Delivery Address (only for delivery) */}
                {orderType === 'delivery' && (
                    <div className="bg-surface border border-white/5 p-4 mb-4 rounded-xl">
                        <h2 className="text-lg font-heading mb-3">Delivery Address</h2>
                        {addresses.length === 0 ? (
                            <div className="text-text-muted text-center py-8">
                                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No addresses saved.</p>
                                <button onClick={() => navigate('/profile')} className="btn mt-4">
                                    Add Address
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {addresses.map((address, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedAddress(index)}
                                        className={`w-full text-left p-3 border rounded transition-all ${selectedAddress === index
                                            ? 'border-primary bg-primary/10'
                                            : 'border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                                            <div>
                                                <div className="font-heading text-sm mb-0.5">{address.street}</div>
                                                <div className="text-xs text-text-muted">
                                                    {address.city}, {address.state} - {address.pincode}
                                                    {address.landmark && ` (Near ${address.landmark})`}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Order Items */}
                <div className="bg-surface border border-white/5 p-4 mb-4 rounded-xl">
                    <h2 className="text-lg font-heading mb-3">Order Items</h2>
                    <div className="space-y-2">
                        {cart.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                <img src={getImageUrl(item.image)} alt={item.name} className="w-12 h-12 object-cover rounded" />
                                <div className="flex-grow">
                                    <div className="font-heading text-sm">{item.name}</div>
                                    <div className="text-xs text-text-muted">Qty: {item.quantity}</div>
                                </div>
                                <div className="text-primary font-heading text-sm">₹{item.price * item.quantity}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Special Notes */}
                <div className="bg-surface border border-white/5 p-4 mb-4 rounded-xl">
                    <h2 className="text-lg font-heading mb-3">Special Instructions (Optional)</h2>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any special instructions for your order..."
                        className="w-full bg-background/50 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary resize-none"
                        rows="2"
                    />
                </div>

                {/* Order Summary */}
                <div className="bg-surface border border-white/5 p-4 mb-4 rounded-xl">
                    <h2 className="text-lg font-heading mb-3">Order Summary</h2>
                    <div className="space-y-1">
                        <div className="flex justify-between text-text-muted text-sm">
                            <span>Subtotal</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-text-muted text-sm">
                            <span>Tax ({TAX_PERCENTAGE}%)</span>
                            <span>₹{tax.toFixed(2)}</span>
                        </div>
                        {orderType === 'delivery' && (
                            <div className="flex justify-between text-text-muted text-sm">
                                <span>Delivery Charge</span>
                                <span>₹{deliveryCharge.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="border-t border-white/10 pt-2 mt-2">
                            <div className="flex justify-between text-lg font-heading">
                                <span>Total Amount</span>
                                <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Place Order Button or Success Message */}
                {!paymentSuccess ? (
                    <button
                        onClick={handlePayment}
                        disabled={loading || paymentSuccess || (orderType === 'delivery' && selectedAddress === null)}
                        className="btn w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing Payment...
                            </>
                        ) : (
                            <>
                                <ShoppingBag className="w-4 h-4" />
                                Pay ₹{totalAmount.toFixed(2)} & Place Order
                            </>
                        )}
                    </button>
                ) : (
                    <div className="bg-green-500/10 border border-green-500/50 rounded px-6 py-4 text-center">
                        <p className="text-green-500 font-heading">✅ Payment Successful! Redirecting...</p>
                    </div>
                )}

                <p className="text-center text-text-muted text-sm mt-4">
                    🔒 Secure payment powered by Razorpay
                </p>
            </div>
        </div>
    );
}
