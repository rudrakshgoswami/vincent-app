import https from 'https';

/**
 * Sends an SMS using Twilio or Fast2SMS based on configuration
 * @param {string} phone - Target phone number
 * @param {string} message - Content of the SMS
 */
const sendSMS = async (phone, message) => {
    const {
        TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
        FAST2SMS_API_KEY
    } = process.env;

    // 1. TRY FAST2SMS (Simple URL Call)
    if (FAST2SMS_API_KEY) {
        return new Promise((resolve, reject) => {
            // Format phone number - Fast2SMS needs 10 digits without country code
            let formattedPhone = phone.replace(/\D/g, ''); // Remove non-digits
            if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
                formattedPhone = formattedPhone.substring(2); // Remove country code
            }

            console.log(`📤 Sending SMS to ${formattedPhone} via Fast2SMS...`);

            const options = {
                hostname: 'www.fast2sms.com',
                path: `/dev/bulkV2?authorization=${FAST2SMS_API_KEY}&route=q&message=${encodeURIComponent(message)}&numbers=${formattedPhone}`,
                method: 'GET'
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        console.log('Fast2SMS Response:', response);

                        if (res.statusCode === 200 && response.return === true) {
                            console.log(`✅ SMS sent successfully via Fast2SMS to ${formattedPhone}`);
                            console.log(`📱 Message ID: ${response.message[0]}`);
                            resolve(true);
                        } else {
                            console.error(`❌ Fast2SMS failed:`, response);
                            console.error(`Status: ${res.statusCode}, Message: ${response.message}`);
                            resolve(false);
                        }
                    } catch (e) {
                        console.error(`❌ Fast2SMS response parse error:`, e.message);
                        console.error(`Raw response:`, data);
                        resolve(false);
                    }
                });
            });

            req.on('error', (e) => {
                console.error(`❌ Fast2SMS Request Error: ${e.message}`);
                resolve(false);
            });

            req.end();
        });
    }

    // 2. TRY TWILIO (Requires standard auth)
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
        // Since we don't want to force install 'twilio' package immediately if not there,
        // we can use a standard REST API call via https
        return new Promise((resolve, reject) => {
            const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
            const data = new URLSearchParams({
                To: phone.startsWith('+') ? phone : `+91${phone}`, // Defaulting to IN if no +
                From: TWILIO_PHONE_NUMBER,
                Body: message
            }).toString();

            const options = {
                hostname: 'api.twilio.com',
                port: 443,
                path: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length
                }
            };

            const req = https.request(options, (res) => {
                if (res.statusCode === 201) {
                    console.log(`✅ SMS sent via Twilio to ${phone}`);
                    resolve(true);
                } else {
                    console.error(`❌ Twilio failed with status: ${res.statusCode}`);
                    resolve(false);
                }
            });

            req.on('error', (e) => {
                console.error(`❌ Twilio Error: ${e.message}`);
                resolve(false);
            });

            req.write(data);
            req.end();
        });
    }

    // 3. FALLBACK: Log if nothing is configured
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║         📱 SMS NOT SENT - CONSOLE FALLBACK              ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  RECIPIENT: ${phone.padEnd(42)} ║`);
    console.log(`║  MESSAGE: ${message.substring(0, 44).padEnd(44)} ║`);

    // Extract OTP if present
    const otpMatch = message.match(/\b\d{6}\b/);
    if (otpMatch) {
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║  🔑 OTP CODE: ${otpMatch[0]}                                  ║`);
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log('║  ⚠️  COPY THE OTP ABOVE TO VERIFY                        ║');
    }
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    return true;
};

export default sendSMS;
