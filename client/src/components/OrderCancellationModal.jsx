import { X, AlertCircle, IndianRupee, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function OrderCancellationModal({ isOpen, onClose, cancellationData }) {
    const { order, reason, refundStatus, refundAmount } = cancellationData || {};

    useEffect(() => {
        if (isOpen) {
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !cancellationData) return null;

    const getRefundStatusConfig = () => {
        switch (refundStatus) {
            case 'completed':
                return {
                    color: 'text-green-500',
                    bg: 'bg-green-500/10',
                    icon: CheckCircle,
                    text: 'Refund Completed'
                };
            case 'processing':
                return {
                    color: 'text-yellow-500',
                    bg: 'bg-yellow-500/10',
                    icon: IndianRupee,
                    text: 'Refund Processing'
                };
            case 'pending':
                return {
                    color: 'text-blue-500',
                    bg: 'bg-blue-500/10',
                    icon: IndianRupee,
                    text: 'Refund Pending'
                };
            case 'failed':
                return {
                    color: 'text-red-500',
                    bg: 'bg-red-500/10',
                    icon: AlertCircle,
                    text: 'Refund Failed - Contact Support'
                };
            default:
                return {
                    color: 'text-gray-500',
                    bg: 'bg-gray-500/10',
                    icon: IndianRupee,
                    text: 'No Refund'
                };
        }
    };

    const refundConfig = getRefundStatusConfig();
    const RefundIcon = refundConfig.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-surface border border-white/10 rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 bg-background border border-white/5 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>

                {/* Heading */}
                <h2 className="text-3xl font-heading text-center mb-3">
                    We're <span className="text-red-500 italic">Sorry</span>
                </h2>

                <p className="text-text-muted text-center mb-6">
                    Unfortunately, your order has been cancelled
                </p>

                {/* Order Details */}
                <div className="bg-background border border-white/5 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-text-muted text-sm">Order Number</span>
                        <span className="font-heading text-lg">{order?.orderNumber || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between items-center mb-3">
                        <span className="text-text-muted text-sm">Order Amount</span>
                        <span className="font-heading text-lg">₹{order?.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>

                    {/* Cancellation Reason */}
                    <div className="border-t border-white/5 pt-3 mt-3">
                        <p className="text-text-muted text-xs mb-2">Cancellation Reason:</p>
                        <p className="text-white text-sm font-medium bg-black/30 rounded-lg p-3">
                            {reason || 'No reason provided'}
                        </p>
                    </div>
                </div>

                {/* Refund Status */}
                {refundStatus && refundStatus !== 'none' && (
                    <div className={`${refundConfig.bg} ${refundConfig.color} rounded-xl p-4 mb-6`}>
                        <div className="flex items-center gap-3">
                            <RefundIcon className="w-6 h-6" />
                            <div className="flex-1">
                                <p className="font-heading text-sm mb-1">{refundConfig.text}</p>
                                <p className="text-xs opacity-80">
                                    Amount: ₹{refundAmount?.toFixed(2) || '0.00'}
                                </p>
                            </div>
                        </div>

                        {refundStatus === 'completed' && (
                            <p className="text-xs mt-3 opacity-70">
                                The refund has been processed and will reflect in your account within 5-7 business days.
                            </p>
                        )}

                        {refundStatus === 'processing' && (
                            <p className="text-xs mt-3 opacity-70">
                                Your refund is being processed. It will reflect in your account soon.
                            </p>
                        )}

                        {refundStatus === 'failed' && (
                            <p className="text-xs mt-3 opacity-70">
                                Refund processing failed. Please contact our support team for assistance.
                            </p>
                        )}
                    </div>
                )}

                {/* Message */}
                <p className="text-text-muted text-sm text-center mb-6">
                    We apologize for any inconvenience caused. We're working hard to serve you better next time.
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-background border border-white/10 hover:bg-white/5 rounded-xl py-3 font-heading transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            onClose();
                            window.location.href = '/order';
                        }}
                        className="flex-1 btn"
                    >
                        Order Again
                    </button>
                </div>

                {/* Support Link */}
                <p className="text-center text-xs text-text-muted mt-6">
                    Need help? <a href="/contact" className="text-primary hover:underline">Contact Support</a>
                </p>
            </div>
        </div>
    );
}
