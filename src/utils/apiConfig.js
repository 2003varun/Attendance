// Centralized API Configuration & Client Helper with Global Auth Interceptor
// Supports local development via proxy, LAN multi-device, and cloud deployments

const rawBaseUrl = (import.meta.env.VITE_API_URL || '').trim();
export const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

export function getAuthToken() {
    return localStorage.getItem('auth_token') || '';
}

export function setAuthToken(token) {
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
}

export function clearAuthToken() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
}

/**
 * Resolves full API URL from endpoint path.
 * If VITE_API_URL is configured, prepends it (e.g. "http://192.168.1.50:5000/api/leaves").
 * Otherwise returns the relative path (e.g. "/api/leaves") for Vite proxy routing.
 */
export function getApiUrl(endpoint) {
    if (!endpoint) return API_BASE_URL || '/';
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }

    const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (API_BASE_URL) {
        return `${API_BASE_URL}${cleanPath}`;
    }

    return cleanPath;
}

// Global Auth Header Interceptor for transparent token inclusion across all services
if (typeof window !== 'undefined' && window.fetch && !window._authFetchIntercepted) {
    const originalFetch = window.fetch;
    window.fetch = async function(input, init = {}) {
        const token = getAuthToken();
        const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

        if (token && url && url.includes('/api/')) {
            const headers = new Headers(init.headers || (input instanceof Request ? input.headers : {}));
            if (!headers.has('Authorization')) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            init.headers = headers;
        }
        return originalFetch(input, init);
    };
    window._authFetchIntercepted = true;
}

/**
 * Universal JSON fetch helper with standard headers & JSON parsing
 */
export async function apiFetch(endpoint, options = {}) {
    const url = getApiUrl(endpoint);
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    return res;
}
