import crypto from 'crypto';
import Razorpay from 'razorpay';

/*
 * One gateway for the whole app, with a demo mode.
 *
 * Without Razorpay credentials nobody could complete a booking, an order or
 * a table reservation, so a fresh clone could not be used past the payment
 * step. Signing up for a payment gateway is a lot to ask of someone who just
 * wants to look at the project.
 *
 * When real credentials are present this is ordinary Razorpay and nothing
 * changes. When they are absent the gateway mints its own order and payment
 * identifiers, prefixed demo_, and the app behaves as though payment
 * succeeded.
 *
 * The demo path cannot be used to fake a real payment. Every demo branch is
 * gated on isLive() being false, so the moment real keys are configured a
 * forged demo_ identifier fails signature verification like any other
 * mismatch.
 */

const PLACEHOLDER = /^(your[_-]|<|xxx|placeholder|changeme|todo)/i;

const real = (value) =>
    typeof value === 'string' && value.trim() !== '' && !PLACEHOLDER.test(value.trim());

export const DEMO_PREFIX = 'demo_';
export const DEMO_KEY = 'demo_gateway';

/** True only when both Razorpay credentials are present and not placeholders. */
export const isLive = () =>
    real(process.env.RAZORPAY_KEY_ID) && real(process.env.RAZORPAY_KEY_SECRET);

/** What the browser should initialise Razorpay checkout with. */
export const publicKey = () => (isLive() ? process.env.RAZORPAY_KEY_ID : DEMO_KEY);

let client = null;
const getClient = () => {
    if (!client) {
        client = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return client;
};

/** Creates a Razorpay order, or a demo one when no credentials are set. */
export const createOrder = async ({ amount, currency = 'INR', receipt, notes }) => {
    if (isLive()) {
        return getClient().orders.create({ amount, currency, receipt, notes });
    }
    return {
        id: `${DEMO_PREFIX}order_${crypto.randomBytes(8).toString('hex')}`,
        amount,
        currency,
        receipt,
        notes,
        status: 'created',
        demo: true,
    };
};

/*
 * Mints the payment id and signature that checkout would normally hand back.
 * Only reachable while the gateway is in demo mode. The signature uses the
 * same HMAC shape as Razorpay, keyed on JWT_SECRET, so the three controllers
 * verify demo and live payments through identical code.
 */
export const mintDemoPayment = (orderId) => {
    if (isLive()) throw new Error('Demo payments are disabled while Razorpay is configured.');
    if (!String(orderId).startsWith(DEMO_PREFIX)) {
        throw new Error('That order was not created by the demo gateway.');
    }
    const paymentId = `${DEMO_PREFIX}pay_${crypto.randomBytes(8).toString('hex')}`;
    return { paymentId, signature: demoSignature(orderId, paymentId) };
};

const demoSignature = (orderId, paymentId) =>
    crypto.createHmac('sha256', process.env.JWT_SECRET || 'demo')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

/** Verifies a payment, live or demo. Returns a boolean, never throws. */
export const verifySignature = ({ orderId, paymentId, signature }) => {
    if (!orderId || !paymentId || !signature) return false;

    if (isLive()) {
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');
        return expected === signature;
    }

    // demo mode: the identifiers must be ones this gateway minted
    if (!String(orderId).startsWith(DEMO_PREFIX)) return false;
    if (!String(paymentId).startsWith(DEMO_PREFIX)) return false;
    return demoSignature(orderId, paymentId) === signature;
};

export default { isLive, publicKey, createOrder, verifySignature, mintDemoPayment };
