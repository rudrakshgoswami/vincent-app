import jwt from 'jsonwebtoken';

/**
 * Generate a short-lived ACCESS TOKEN (15 minutes).
 * Sent to client in the JSON response body.
 * Client keeps it in memory (React context) — NEVER in localStorage.
 */
export const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '15m'
    });
};

/**
 * Generate a long-lived REFRESH TOKEN (7 days).
 * Sent to client as an HttpOnly Secure cookie — cannot be read by JS.
 * Used only to silently obtain a new access token when the current one expires.
 */
export const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d'
    });
};

// Keep backward-compat default export (used in some old places, remove after full migration)
const generateToken = (id) => generateAccessToken(id);
export default generateToken;
