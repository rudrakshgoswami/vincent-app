import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

/*
 * The Razorpay client is built on first use rather than at import time.
 *
 * Constructing it eagerly threw "`key_id` or `oauthToken` is mandatory" the
 * moment RAZORPAY_KEY_ID was absent. Because server.js imports the routes,
 * which import the controllers, which import this file, that threw during
 * startup and the whole server refused to boot. Anyone cloning the repo just
 * to look at the menu had to go and register for a payment gateway first.
 *
 * Now the app starts without payment keys and only the payment endpoints
 * fail, with a message that says what to set.
 */

let client = null;

const getClient = () => {
    if (client) return client;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error(
            'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in ' +
            'server/.env to take payments. Browsing, auth, menus, venues and catering all ' +
            'work without them.'
        );
    }

    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return client;
};

/*
 * A proxy so the call sites keep reading naturally:
 *     razorpay.orders.create(...)
 */
export default new Proxy({}, {
    get: (_target, prop) => getClient()[prop],
});
