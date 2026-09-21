// Authentication & RBAC Context with Token Management
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiUrl, setAuthToken, clearAuthToken, getAuthToken } from '../utils/apiConfig';

export const ROLES = {
    MANAGER: "MANAGER",
    ACCOUNTANT: "ACCOUNTANT",
    EMPLOYEE: "EMPLOYEE"
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => getAuthToken());
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem("auth_user");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false);

    const role = user?.role || null;

    // Verify token & sync user info on initial load
    useEffect(() => {
        if (token && !user) {
            fetch(getApiUrl('/api/auth/me'))
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        setUser(data.user);
                        localStorage.setItem("auth_user", JSON.stringify(data.user));
                    } else {
                        logout();
                    }
                })
                .catch(() => {
                    // If network fails, retain local cache or logout
                });
        }
    }, [token]);

    const login = async (username, password) => {
        setLoading(true);
        try {
            const res = await fetch(getApiUrl('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Login failed. Please check your credentials.');
            }

            setAuthToken(data.token);
            localStorage.setItem("auth_user", JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            return data.user;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        clearAuthToken();
        setToken(null);
        setUser(null);
    };

    // Synthesize currentUser for existing component compatibility
    const currentUser = user ? {
        id: user.employeeId || user.username,
        employee_id: user.employeeId || user.username,
        employeeId: user.employeeId || user.username,
        name: user.fullName || user.username,
        full_name: user.fullName || user.username,
        email: user.email || '',
        role: user.role
    } : null;

    const value = {
        token,
        user,
        role,
        currentUser,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        logout,
        isEmployee: role === ROLES.EMPLOYEE,
        isManager: role === ROLES.MANAGER,
        isAccountant: role === ROLES.ACCOUNTANT,
        isAdmin: role === ROLES.MANAGER // Backwards compatibility for existing Admin references
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
