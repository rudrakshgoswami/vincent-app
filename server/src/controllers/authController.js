import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import sendSMS from '../utils/sendSMS.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// @desc    Register user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        const { name, email, phone, address, password, otpPreference } = req.body;

        // Validate required fields based on preference
        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }
        if (otpPreference === 'email' && !email) {
            return res.status(400).json({ message: 'Email is required to receive OTP via email' });
        }

        // Password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.'
            });
        }

        // Check availability
        if (email) {
            const exists = await User.findOne({ email });
            if (exists && exists.isVerified) return res.status(400).json({ message: 'Email already registered' });
            if (exists && !exists.isVerified) await User.deleteOne({ _id: exists._id });
        }
        if (phone) {
            const exists = await User.findOne({ phone });
            if (exists && exists.isVerified) return res.status(400).json({ message: 'Phone already registered' });
            if (exists && !exists.isVerified) await User.deleteOne({ _id: exists._id });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        const otpHash = await bcrypt.hash(otp, salt);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const user = await User.create({
            name,
            email,
            phone,
            addresses: address ? [address] : [],
            password,
            otpHash,
            otpExpiresAt,
            isVerified: false
        });

        const preference = otpPreference || 'phone';

        if (preference === 'email' && email) {
            await sendEmail({
                email,
                subject: 'Verify Your Vincent Restaurant Account',
                html: `
                    <h2 style="color:#2d3436">Welcome to Vincent Restaurant!</h2>
                    <p>Your account verification code is:</p>
                    <h1 style="color:#FF5200;font-size:36px;letter-spacing:8px;font-family:monospace">${otp}</h1>
                    <p>This code expires in <strong>10 minutes</strong>.</p>
                    <p style="color:#999;font-size:12px">If you didn't create an account, please ignore this email.</p>
                `
            });
        } else {
            // SMS via phone
            await sendSMS(phone, `Your Vincent Restaurant verification code is: ${otp}. Valid for 10 minutes.`);
        }

        res.status(201).json({
            success: true,
            message: preference === 'email' ? `OTP sent to ${email}` : `OTP sent to ${phone}`,
            userId: user._id,
            otpPreference: preference
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
    try {
        const { email, phone, otp } = req.body;

        const query = email ? { email } : { phone };
        const user = await User.findOne(query);

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
        if (user.otpExpiresAt < Date.now()) return res.status(400).json({ message: 'OTP expired' });

        const isMatch = await bcrypt.compare(otp, user.otpHash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid OTP' });

        user.isVerified = true;
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        await user.save();

        res.json({ success: true, message: 'Verified successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
const resendOTP = async (req, res) => {
    try {
        const { email, phone, otpPreference } = req.body;
        const query = email ? { email } : { phone };
        const user = await User.findOne(query);

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isVerified) return res.status(400).json({ message: 'Already verified' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        user.otpHash = await bcrypt.hash(otp, salt);
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        const preference = otpPreference || (email ? 'email' : 'phone');

        if (preference === 'email' && user.email) {
            await sendEmail({
                email: user.email,
                subject: 'New Verification OTP - Vincent Restaurant',
                html: `<h2>New OTP Requested</h2><p>Your new verification code is:</p><h1 style="color:#FF5200;letter-spacing:8px;font-family:monospace">${otp}</h1><p>Expires in 10 minutes.</p>`
            });
        } else {
            await sendSMS(user.phone, `Your new Vincent Restaurant verification code is: ${otp}. Valid for 10 minutes.`);
        }

        res.json({ success: true, message: 'OTP Resent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Login
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        let user;
        if (email) user = await User.findOne({ email: email.toLowerCase() });
        else if (phone) user = await User.findOne({ phone });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ success: false, message: 'Account not verified. Please verify OTP.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
        }

        // ── Dual Token Strategy (Tab-Isolated) ──────────────────────────
        // 1. ACCESS TOKEN  — short-lived (15 min), returned in JSON body.
        //    Client stores in React memory (per-tab). Sent as Bearer header.
        //
        // 2. REFRESH TOKEN — long-lived (7 days), returned in JSON body.
        //    Client stores in sessionStorage (tab-isolated — each tab has
        //    its own copy). Sent in POST body to /api/auth/refresh.
        //
        // WHY NOT A COOKIE? Cookies are shared across all tabs of the same
        // origin. If User A is in Tab 1 and User B logs in on Tab 2, the
        // cookie is overwritten → Tab 1 switches to User B on next refresh.
        // sessionStorage is completely isolated per tab — this bug cannot
        // happen because each tab stores its own refresh token independently.
        // ────────────────────────────────────────────────────────────────
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Clear any old cookie-based refresh token (backward compat cleanup)
        res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
        res.clearCookie('authToken', { path: '/' });

        // User payload
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            addresses: user.addresses,
            profilePicture: user.profilePicture,
            birthDate: user.birthDate,
            isAdmin: user.isAdmin,
            isActive: user.isActive,
            createdAt: user.createdAt
        };

        res.json({
            success: true,
            data: {
                accessToken,   // ← stored in React memory (per-tab)
                refreshToken,  // ← stored in sessionStorage (per-tab, cleared on tab close)
                user: userData
            }
        });
    } catch (error) {
        console.error('[Login Error]:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Silently refresh access token
// @route   POST /api/auth/refresh
// Called automatically by the frontend when:
//   • The page reloads (access token lost from memory, refresh token read from sessionStorage)
//   • An API call returns 401 TOKEN_EXPIRED
//
// The refresh token is sent in the request BODY (not a cookie) because:
//   • Cookies are shared across all browser tabs — causes cross-tab session bleed
//   • sessionStorage is tab-isolated — each tab sends its own refresh token
const refreshAccessToken = async (req, res) => {
    // Read from request body (sent by frontend from sessionStorage)
    const token = req.body?.refreshToken;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No refresh token',
            code: 'NO_REFRESH_TOKEN'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id).select('-password -otpHash -otpExpiresAt');

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account deactivated' });
        }

        // Issue a new access token
        const newAccessToken = generateAccessToken(user._id);

        res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    addresses: user.addresses,
                    profilePicture: user.profilePicture,
                    birthDate: user.birthDate,
                    isAdmin: user.isAdmin,
                    isActive: user.isActive,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token expired, please login again',
            code: 'REFRESH_EXPIRED'
        });
    }
};

// @desc    Profile
// @route   GET /api/auth/profile
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                success: true,
                data: {
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        addresses: user.addresses,
                        profilePicture: user.profilePicture,
                        isAdmin: user.isAdmin,
                        isActive: user.isActive,
                        isVerified: user.isVerified,
                        createdAt: user.createdAt
                    }
                }
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Forgot Password - Send OTP to phone
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(404).json({ message: 'No user found with this phone number' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        user.otpHash = await bcrypt.hash(otp, salt);
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10m
        await user.save();

        const message = `Your password reset code is: ${otp}`;
        await sendSMS(phone, message);

        res.json({
            success: true,
            message: 'Password reset OTP sent to your phone'
        });

    } catch (error) {
        console.error('[Forgot Password Error]:', error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Reset Password - Verify OTP and update password
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    try {
        const { phone, otp, newPassword } = req.body;

        if (!phone || !otp || !newPassword) {
            return res.status(400).json({ message: 'Phone, OTP and new password are required' });
        }

        // Password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.'
            });
        }

        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
            return res.status(400).json({ message: 'OTP expired or invalid' });
        }

        const isMatch = await bcrypt.compare(otp, user.otpHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Update password and clear OTP
        user.password = newPassword;
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        user.isVerified = true; // Also ensure verified if they reset password
        await user.save();

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now login.'
        });

    } catch (error) {
        console.error('[Reset Password Error]:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logoutUser = async (req, res) => {
    try {
        // Clear refresh token cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/auth/refresh'
        });
        // Also clear old authToken cookie in case it exists
        res.clearCookie('authToken', { path: '/' });

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('[Logout Error]:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get current authenticated user
// @route   GET /api/auth/me
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    addresses: user.addresses,
                    profilePicture: user.profilePicture,
                    birthDate: user.birthDate,
                    isAdmin: user.isAdmin,
                    isActive: user.isActive,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('[Get Current User Error]:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export { registerUser, verifyOTP, resendOTP, loginUser, logoutUser, refreshAccessToken, getCurrentUser, getUserProfile, forgotPassword, resetPassword };
