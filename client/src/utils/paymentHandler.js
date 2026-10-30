import { createRazorpayOrder, getRazorpayKey } from '../api';

export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

/**
 * Reusable centralized payment module for handling Razorpay Checkout.
 * Now supports both "create-on-the-fly" and "pre-created" orders.
 */
export const initiatePayment = async ({
    amount, // In INR completely (optional if orderId is provided)
    razorpayOrderId, // [NEW] Accept pre-created order ID
    user,
    description = 'Payment',
    onSuccess,
    onError,
    onDismiss,
    retryCount = 0
}) => {
    try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            throw new Error('Failed to load Razorpay SDK. Check your internet connection.');
        }

        let orderId = razorpayOrderId;
        let rzpAmount = amount ? Math.round(amount * 100) : 0;
        let currency = 'INR';
        let key = '';

        // 1. If no orderId provided, create one (Compatibility mode)
        if (!orderId) {
            console.log('[paymentHandler] No Order ID provided, creating one...');
            const orderRes = await createRazorpayOrder(amount, 'INR');
            orderId = orderRes?.data?.orderId || orderRes?.orderId;
            rzpAmount = orderRes?.data?.amount || orderRes?.amount;
            currency = orderRes?.data?.currency || orderRes?.currency || 'INR';
            key = orderRes?.data?.key || orderRes?.key;
        }

        // 2. Ensure we have the Key
        if (!key) {
            const keyRes = await getRazorpayKey();
            key = keyRes?.data?.key || keyRes?.key || '';
            if (!key) throw new Error('Razorpay API Key missing. Please contact support.');
        }

        // 3. Configure Razorpay Options
        const options = {
            key,
            amount: rzpAmount,
            currency,
            name: 'Vincent',
            description,
            order_id: orderId,
            remember_customer: true,
            // Prefill with user data to prevent validation errors
            prefill: {
                name: user?.name || user?.fullName || '',
                email: user?.email || '',
                contact: user?.phone || user?.contact || ''
            },
            notes: {
                merchant_order_id: orderId
            },
            theme: { 
                color: '#D4AF37',
                backdrop_color: '#000000'
            },
            // [FIX] Simplify config to avoid 'input_validation_failed'
            // We only force UPI intent for better mobile UX, others use defaults
            config: {
                display: {
                    hide_topbar: false,
                    preferences: {
                        show_default_blocks: true // Use Razorpay's intelligent default blocks
                    }
                }
            },
            handler: async function (response) {
                try {
                    // response contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
                    await onSuccess(response);
                } catch (err) {
                    console.error('Success Handler Error:', err);
                    if (onError) onError(err);
                }
            },
            modal: {
                ondismiss: function () {
                    console.log('Payment modal dismissed');
                    if (onDismiss) onDismiss();
                },
                escape: true,
                confirm_close: true // Ensure user doesn't accidentally close large payments
            }
        };

        const rzp = new window.Razorpay(options);

        rzp.on('payment.failed', function (response) {
            console.error('Payment Failed Event:', response.error);
            // Handle specific error codes
            const errorMsg = response.error.description || response.error.reason || 'Payment failed';
            
            if (onError) {
                onError({
                    message: errorMsg,
                    code: response.error.code,
                    source: response.error.source,
                    step: response.error.step,
                    reason: response.error.reason
                });
            }
        });

        rzp.open();

    } catch (err) {
        console.error('Payment Initiation System Error:', err);
        if (onError) onError(err);
    }
};

/**
 * Helper to retry a failed payment attempt
 */
export const retryPayment = (paymentOptions) => {
    console.log('Retrying payment...');
    return initiatePayment({
        ...paymentOptions,
        description: `Retry: ${paymentOptions.description || 'Payment'}`
    });
};
