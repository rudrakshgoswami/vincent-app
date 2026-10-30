import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { initApiAuth } from '../api';

const API = 'http://localhost:5000/api';

// Key used to store the refresh token in sessionStorage.
// sessionStorage is TAB-ISOLATED — each browser tab has completely separate storage.
// This is the fix for the cross-tab session bleed bug:
//   - Cookie approach: shared across ALL tabs → User B login in Tab 2 overwrites User A's cookie
//   - sessionStorage approach: Tab 1 has its own token, Tab 2 has its own → fully independent
const SESSION_KEY = 'rt'; // short key to slightly obscure purpose

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true); // TRUE until initial auth check completes

    // Ref so api.js closures always read the LATEST token without stale closure issues
    const tokenRef = useRef(null);
    const refreshTimerRef = useRef(null);

    // ─── Helpers: sessionStorage for refresh token ─────────────
    const saveRefreshToken = (rt) => {
        if (rt) sessionStorage.setItem(SESSION_KEY, rt);
        else sessionStorage.removeItem(SESSION_KEY);
    };
    const loadRefreshToken = () => sessionStorage.getItem(SESSION_KEY);

    // ─── Silent Refresh ────────────────────────────────────────
    // Reads THIS TAB's refresh token from sessionStorage and exchanges
    // it for a new access token. Tab 1 and Tab 2 each have their own
    // refresh token → they can never cross-contaminate each other.
    const silentRefresh = useCallback(async () => {
        const refreshToken = loadRefreshToken();

        if (!refreshToken) {
            // No refresh token in this tab → treat as logged out
            tokenRef.current = null;
            setAccessToken(null);
            setUser(null);
            return null;
        }

        try {
            const res = await fetch(`${API}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }), // sent in body, NOT cookie
            });

            if (!res.ok) {
                // Refresh token expired/invalid → clear this tab's session
                saveRefreshToken(null);
                tokenRef.current = null;
                setAccessToken(null);
                setUser(null);
                return null;
            }

            const data = await res.json();
            const newToken = data.data.accessToken;
            tokenRef.current = newToken;
            setAccessToken(newToken);
            setUser(data.data.user);
            return newToken;
        } catch {
            tokenRef.current = null;
            setAccessToken(null);
            setUser(null);
            return null;
        }
    }, []);

    // ─── Wire api.js once on mount ─────────────────────────────
    // tokenRef avoids stale closures — always reads the latest token
    useEffect(() => {
        initApiAuth(
            async () => tokenRef.current,
            silentRefresh
        );
    }, [silentRefresh]);

    // ─── On App Startup: Restore THIS TAB's session ────────────
    // Each tab independently restores from its own sessionStorage entry.
    // Completely isolated — Tab 1's token never affects Tab 2.
    useEffect(() => {
        const initAuth = async () => {
            setLoading(true);
            await silentRefresh();
            setLoading(false);
        };
        initAuth();

        return () => {
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
        };
    }, []); // run once on mount

    // ─── Auto-refresh every 13 min (before 15-min expiry) ─────
    useEffect(() => {
        if (!accessToken) return;

        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);

        refreshTimerRef.current = setInterval(() => {
            silentRefresh();
        }, 13 * 60 * 1000);

        return () => clearInterval(refreshTimerRef.current);
    }, [accessToken, silentRefresh]);

    // ─── Login ─────────────────────────────────────────────────
    // Stores the refresh token in THIS TAB's sessionStorage only.
    // Other open tabs are completely unaffected.
    const login = useCallback((newAccessToken, newRefreshToken, userData) => {
        saveRefreshToken(newRefreshToken);   // tab-isolated sessionStorage
        tokenRef.current = newAccessToken;
        setAccessToken(newAccessToken);
        setUser(userData);
    }, []);

    // ─── Logout ────────────────────────────────────────────────
    // Only clears THIS TAB's session. Other tabs continue working.
    const logout = useCallback(async () => {
        try {
            await fetch(`${API}/auth/logout`, { method: 'POST' });
        } catch { /* ignore */ }

        saveRefreshToken(null);       // clear this tab's refresh token
        tokenRef.current = null;
        setUser(null);
        setAccessToken(null);
        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
        window.location.href = '/login';
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            accessToken,
            loading,
            isAuthenticated: !!user && !!accessToken,
            isAdmin: !!user?.isAdmin,
            login,
            logout,
            silentRefresh,
            setUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
