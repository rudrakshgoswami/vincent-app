import https from 'https';

/*
 * Sends an SMS via Fast2SMS, then Twilio, then the console.
 *
 * Two things were wrong with the previous version, and together they made
 * registration impossible on a fresh checkout.
 *
 * First, a placeholder counted as configured. .env.example ships
 * FAST2SMS_API_KEY=your_fast2sms_key, which is a non-empty string, so
 * `if (FAST2SMS_API_KEY)` was true and the real provider was called with a
 * key that cannot work.
 *
 * Second, each provider block returned early, so when Fast2SMS answered 412
 * Invalid Authentication the promise resolved false and the console fallback
 * below was never reached. The OTP went nowhere: not to a phone, not to the
 * terminal. You could register and then never get past the verify screen.
 *
 * Now a placeholder is treated as absent, and a provider that fails falls
 * through to the next one, ending at the console. The OTP always surfaces
 * somewhere.
 */

const PLACEHOLDER = /^(your[_-]|<|xxx|placeholder|changeme|todo)/i;

/** True when at least one SMS provider is actually configured. */
export const smsConfigured = () =>
    configured(process.env.FAST2SMS_API_KEY)
    || (configured(process.env.TWILIO_ACCOUNT_SID)
        && configured(process.env.TWILIO_AUTH_TOKEN)
        && configured(process.env.TWILIO_PHONE_NUMBER));

const configured = (value) =>
    typeof value === 'string' && value.trim() !== '' && !PLACEHOLDER.test(value.trim());

const trySendFast2SMS = (apiKey, phone, message) =>
    new Promise((resolve) => {
        let number = phone.replace(/\D/g, '');
        if (number.startsWith('91') && number.length === 12) number = number.slice(2);

        console.log(`Sending SMS to ${number} via Fast2SMS...`);

        const req = https.request({
            hostname: 'www.fast2sms.com',
            path: `/dev/bulkV2?authorization=${apiKey}&route=q`
                + `&message=${encodeURIComponent(message)}&numbers=${number}`,
            method: 'GET',
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (res.statusCode === 200 && parsed.return === true) {
                        console.log(`SMS sent via Fast2SMS to ${number}`);
                        return resolve(true);
                    }
                    console.error(`Fast2SMS declined (${res.statusCode}): ${parsed.message}`);
                } catch {
                    console.error(`Fast2SMS returned something that is not JSON: ${body.slice(0, 120)}`);
                }
                resolve(false);
            });
        });

        req.on('error', (err) => {
            console.error(`Fast2SMS request failed: ${err.message}`);
            resolve(false);
        });
        req.end();
    });

const trySendTwilio = (sid, token, from, phone, message) =>
    new Promise((resolve) => {
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');
        const body = new URLSearchParams({
            To: phone.startsWith('+') ? phone : `+91${phone}`,
            From: from,
            Body: message,
        }).toString();

        const req = https.request({
            hostname: 'api.twilio.com',
            port: 443,
            path: `/2010-04-01/Accounts/${sid}/Messages.json`,
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            res.resume();
            if (res.statusCode === 201) {
                console.log(`SMS sent via Twilio to ${phone}`);
                return resolve(true);
            }
            console.error(`Twilio declined with status ${res.statusCode}`);
            resolve(false);
        });

        req.on('error', (err) => {
            console.error(`Twilio request failed: ${err.message}`);
            resolve(false);
        });
        req.write(body);
        req.end();
    });

const logToConsole = (phone, message) => {
    const otp = (message.match(/\b\d{6}\b/) || [])[0];
    console.log('\n+----------------------------------------------------------+');
    console.log('|            SMS NOT SENT - CONSOLE FALLBACK               |');
    console.log('+----------------------------------------------------------+');
    console.log(`|  TO      : ${phone.padEnd(44)}|`);
    console.log(`|  MESSAGE : ${message.slice(0, 44).padEnd(44)}|`);
    if (otp) {
        console.log('+----------------------------------------------------------+');
        console.log(`|  OTP CODE: ${otp.padEnd(44)}|`);
        console.log('|  Copy the code above into the verify screen.             |');
    }
    console.log('+----------------------------------------------------------+\n');
    return true;
};

const sendSMS = async (phone, message) => {
    const {
        TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
        FAST2SMS_API_KEY,
    } = process.env;

    if (configured(FAST2SMS_API_KEY)) {
        if (await trySendFast2SMS(FAST2SMS_API_KEY, phone, message)) return true;
        console.warn('Fast2SMS did not deliver, trying the next option.');
    }

    if (configured(TWILIO_ACCOUNT_SID) && configured(TWILIO_AUTH_TOKEN)
        && configured(TWILIO_PHONE_NUMBER)) {
        if (await trySendTwilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
            TWILIO_PHONE_NUMBER, phone, message)) return true;
        console.warn('Twilio did not deliver, falling back to the console.');
    }

    return logToConsole(phone, message);
};

export default sendSMS;
