import axios from 'axios';

// Determine Base URL
// In production (Cloud Run), we serve frontend from the same origin, so we use relative path '/api'
// In development, we might need full URL if running separate vite server
const isProduction = import.meta.env.PROD;
const baseURL = import.meta.env.VITE_API_BASE_URL || (isProduction ? '/api' : 'http://localhost:3000/api');

const api = axios.create({
    baseURL,
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    headers: {
        'Content-Type': 'application/json',
    },
});

// ────────────────────────────────────────────
// Helpers: storage + JWT decode
// ────────────────────────────────────────────

/** Determine which storage holds the active session (sessionStorage wins). */
const getActiveStorage = () =>
    sessionStorage.getItem('token') ? sessionStorage : localStorage;

/** Read the current access token from whichever storage has it. */
const getToken = () =>
    sessionStorage.getItem('token') || localStorage.getItem('token');

/** Read the refresh token from whichever storage has it. */
const getRefreshToken = () =>
    sessionStorage.getItem('refreshToken') ?? localStorage.getItem('refreshToken');

/**
 * Decode a JWT payload WITHOUT a library.
 * Returns `null` on any parse failure — never throws.
 */
const decodeJwtPayload = (token: string): { exp?: number } | null => {
    try {
        const base64 = token.split('.')[1];
        if (!base64) return null;
        const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
};

/** Returns true when the token will expire within `marginSec` seconds. */
const isTokenExpiringSoon = (token: string, marginSec = 60): boolean => {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return false;           // can't tell → don't refresh
    return payload.exp - Date.now() / 1000 < marginSec;
};

// ────────────────────────────────────────────
// Shared refresh-lock (Layer 2 safety net)
// ────────────────────────────────────────────

/** Single in-flight refresh promise — all concurrent 401s wait on this. */
let refreshPromise: Promise<string> | null = null;

/**
 * Perform the actual token refresh.
 * Resolves with the new access token or throws.
 */
const doRefresh = async (): Promise<string> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const activeStorage = getActiveStorage();
    const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });

    const { token: newToken, refreshToken: newRefresh, user: newUser } = data;
    activeStorage.setItem('token', newToken);
    if (newRefresh) activeStorage.setItem('refreshToken', newRefresh);
    if (newUser)    activeStorage.setItem('user', JSON.stringify(newUser));

    return newToken;
};

/**
 * Queue-safe refresh: only the FIRST caller fires the request;
 * every subsequent caller awaits the same promise.
 */
const refreshWithLock = (): Promise<string> => {
    if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
};

// ────────────────────────────────────────────
// Layer 1 — Proactive pre-expiry refresh
// ────────────────────────────────────────────

api.interceptors.request.use(async (config) => {
    const token = getToken();
    if (token) {
        // If the token is about to expire (<60 s left), refresh BEFORE sending
        if (isTokenExpiringSoon(token, 60)) {
            try {
                const freshToken = await refreshWithLock();
                config.headers.Authorization = `Bearer ${freshToken}`;
                return config;
            } catch {
                // refresh failed — attach the old token; the 401 interceptor will handle it
            }
        }
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// ────────────────────────────────────────────
// Layer 2 — 401 safety net with refresh-lock
// ────────────────────────────────────────────

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const is401 = error.response?.status === 401;
        const isAuthEndpoint = originalRequest.url === '/auth/login' || originalRequest.url === '/auth/refresh';

        if (is401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;

            try {
                const newToken = await refreshWithLock();

                // Replay the original request with the fresh token
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed — clear BOTH storages to fully reset auth state
                const hadToken = !!getToken();
                for (const store of [localStorage, sessionStorage]) {
                    store.removeItem('refreshToken');
                    store.removeItem('token');
                    store.removeItem('user');
                }
                if (hadToken) {
                    window.location.href = '/login?expired=1';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
