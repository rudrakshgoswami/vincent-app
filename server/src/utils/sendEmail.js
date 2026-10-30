import nodemailer from 'nodemailer';

/*
 * Sends an email, or prints it when no mailbox is configured.
 *
 * This used to throw when EMAIL_USER and EMAIL_PASS were unset. Registration
 * calls it directly, so choosing "send my code by email" on a fresh checkout
 * created the account and then answered 500, leaving a user who could never
 * verify and could not register again with the same address.
 *
 * It now mirrors sendSMS: a missing mailbox falls back to the console and the
 * caller is told what happened, so it can show the code in the interface
 * instead of pretending something was delivered.
 */

const PLACEHOLDER = /^(your[_-]|<|xxx|placeholder|changeme|todo)/i;

const real = (value) =>
    typeof value === 'string' && value.trim() !== '' && !PLACEHOLDER.test(value.trim());

/** True when a mailbox is actually configured. */
export const emailConfigured = () =>
    real(process.env.EMAIL_USER) && real(process.env.EMAIL_PASS);

const stripTags = (html = '') =>
    html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const logToConsole = ({ email, subject, html, message }) => {
    const body = message || stripTags(html);
    const code = (body.match(/\b\d{6}\b/) || [])[0];
    console.log('\n+----------------------------------------------------------+');
    console.log('|           EMAIL NOT SENT - CONSOLE FALLBACK              |');
    console.log('+----------------------------------------------------------+');
    console.log(`|  TO      : ${String(email).slice(0, 44).padEnd(44)}|`);
    console.log(`|  SUBJECT : ${String(subject).slice(0, 44).padEnd(44)}|`);
    if (code) {
        console.log('+----------------------------------------------------------+');
        console.log(`|  OTP CODE: ${code.padEnd(44)}|`);
    }
    console.log('+----------------------------------------------------------+\n');
    return { delivered: false, channel: 'console' };
};

const sendEmail = async (options) => {
    if (!emailConfigured()) {
        return logToConsole(options);
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: options.email,
            subject: options.subject,
            html: options.html,
            text: options.message,
        });
        console.log(`Email sent to ${options.email}`);
        return { delivered: true, channel: 'email' };
    } catch (err) {
        console.error(`Email failed (${err.message}), falling back to the console.`);
        return logToConsole(options);
    }
};

export default sendEmail;
