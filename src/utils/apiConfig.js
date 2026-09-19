// Centralized API Configuration & Client Helper
// Supports local development via proxy, LAN multi-device, and cloud deployments

const rawBaseUrl = (import.meta.env.VITE_API_URL || '').trim();
export const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

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

/**
 * Universal JSON fetch helper with standard headers & JSON parsing
 */
export async function apiFetch(endpoint, options = {}) {
    const url = getApiUrl(endpoint);
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    return res;
}
