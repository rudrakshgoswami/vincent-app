import nodemailer from 'nodemailer';

/**
 * Sends an email using Nodemailer and Gmail SMTP
 * @param {Object} options - { email, subject, html, message }
 */
const sendEmail = async (options) => {
    // If no credentials, log error clearly and throw — do not silently skip
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
        process.env.EMAIL_USER === 'your_email@gmail.com' ||
        process.env.EMAIL_PASS === 'your_app_password' ||
        process.env.EMAIL_PASS === 'your_16_char_google_app_password_here') {
        console.error('❌ [EMAIL CONFIG] EMAIL_USER / EMAIL_PASS not set in .env! Cannot send email.');
        console.error('   → Set up Gmail App Password at: https://myaccount.google.com/apppasswords');
        throw new Error('Email service not configured. Please set EMAIL_USER and EMAIL_PASS in server .env file.');
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM || `Vincent Admin <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                <h2 style="color: #c9a56a;">Vincent Restaurant</h2>
                <p>Hello,</p>
                <p>${options.message}</p>
                <p style="margin-top: 30px; font-size: 0.8em; color: #777;">
                    If you did not request this, please ignore this email.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${options.email}`);
    } catch (error) {
        console.error(`❌ Email send error: ${error.message}`);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

export default sendEmail;
