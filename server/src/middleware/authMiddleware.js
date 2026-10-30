import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * PROTECT MIDDLEWARE
 *
 * Checks for a valid Access Token in the Authorization header:
 *   Authorization: Bearer <accessToken>
 *
 * Why Authorization header instead of cookie?
 * - Cookies are shared across ALL browser tabs of the same origin.
 *   If User A is in tab 1 and User B logs in on tab 2, the cookie
 *   is overwritten and tab 1 loses its session on next refresh.
 * - Authorization headers are sent EXPLICITLY per request from the
 *   client's memory (React state). Each tab maintains its own token
 *   in its own JS memory → true tab isolation.
 */
export const protect = async (req, res, next) => {
    let token;

    // Primary: Authorization header (Bearer <accessToken>)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Fallback: authToken cookie (backward compat / admin panel legacy)
    else if (req.cookies && req.cookies.authToken) {
        token = req.cookies.authToken;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password -otpHash -otpExpiresAt');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User account no longer exists'
            });
        }

        if (!req.user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        console.error('[Auth Middleware Error]:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Not authorized, token invalid'
        });
    }
};

/**
 * ADMIN MIDDLEWARE
 * Must be used after protect middleware.
 */
export const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Not authorized as an admin'
        });
    }
};

/**
 * OPTIONAL AUTH MIDDLEWARE
 * Tries to authenticate user silently. If token is present and valid,
 * req.user is set. If no token or invalid token, continues without error.
 * Used for routes like contact form where logged-in users get linked but guests can still submit.
 */
export const optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.authToken) {
        token = req.cookies.authToken;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password -otpHash -otpExpiresAt');
        } catch (error) {
            // Silently fail — user just won't be linked
            req.user = null;
        }
    }

    next();
};
