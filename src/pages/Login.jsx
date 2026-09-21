// Enterprise Login Page for Attendance OS Pro
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function Login() {
    const { login, loading } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim() || !password) {
            setError('Please enter both username/email and password.');
            return;
        }

        try {
            await login(username.trim(), password);
        } catch (err) {
            setError(err.message || 'Invalid username or password.');
        }
    };

    const handleQuickFill = (userVal, passVal) => {
        setUsername(userVal);
        setPassword(passVal);
        setError('');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-primary, #0f172a)',
            color: 'var(--text-primary, #f8fafc)',
            padding: '24px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '440px',
                background: 'var(--card-bg, rgba(30, 41, 59, 0.7))',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                borderRadius: '16px',
                padding: '36px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
            }}>
                {/* Branding */}
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{
                        width: '54px',
                        height: '54px',
                        margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 20px rgba(59, 130, 246, 0.35)'
                    }}>
                        <svg width="28" height="28" fill="none" stroke="#ffffff" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
                        ATTENDANCE OS
                    </h1>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.1em' }}>
                        ENTERPRISE RBAC LOGIN
                    </span>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary, #94a3b8)', marginTop: '8px' }}>
                        Sign in to access your attendance, leaves, and records
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        color: '#f87171',
                        fontSize: '13px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '18px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            marginBottom: '6px',
                            color: 'var(--text-secondary, #94a3b8)'
                        }}>
                            Username / Email / Employee ID
                        </label>
                        <input
                            id="loginUsername"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. manager, TEMP-001"
                            required
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                                background: 'rgba(15, 23, 42, 0.6)',
                                color: '#ffffff',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label style={{
                                fontSize: '12.5px',
                                fontWeight: 600,
                                color: 'var(--text-secondary, #94a3b8)'
                            }}>
                                Password
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#3b82f6',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <input
                            id="loginPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                                background: 'rgba(15, 23, 42, 0.6)',
                                color: '#ffffff',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button
                        id="loginSubmitBtn"
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '13px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '14.5px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                {/* Quick Demo Credentials */}
                <div style={{
                    marginTop: '28px',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))'
                }}>
                    <span style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-muted, #64748b)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '10px',
                        textAlign: 'center'
                    }}>
                        Quick Sign In Preset Roles
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => handleQuickFill('manager', 'manager123')}
                            style={{
                                padding: '8px 6px',
                                background: 'rgba(59, 130, 246, 0.12)',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                borderRadius: '8px',
                                color: '#60a5fa',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            👨‍💼 Manager
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickFill('accountant', 'accountant123')}
                            style={{
                                padding: '8px 6px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                borderRadius: '8px',
                                color: '#34d399',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            📊 Accountant
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickFill('TEMP-001', 'TEMP-001')}
                            style={{
                                padding: '8px 6px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                borderRadius: '8px',
                                color: '#fbbf24',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            👤 TEMP-001
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
