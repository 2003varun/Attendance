// Top Navigation Bar - Modern Enterprise Redesign
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { useLeave } from '../../context/LeaveContext';
import { exportToCSV } from '../../utils/exportUtils';

export function Header({ title, subtitle, onToast }) {
    const navigate = useNavigate();
    const { role, user, logout, isManager } = useAuth();
    const { filteredData, clearAttendance } = useAttendance();
    const { notifications, markNotificationRead, markAllNotificationsRead } = useLeave();

    const [theme, setTheme] = useState(() => localStorage.getItem("attendance_theme") || "dark");
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef(null);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("attendance_theme", theme);
    }, [theme]);

    useEffect(() => {
        function handleClickOutside(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleTheme = () => {
        setTheme(prev => prev === "dark" ? "light" : "dark");
    };

    const handleExportCSV = () => {
        if (!filteredData.length) {
            if (onToast) onToast("No data available to export.", "warning");
            return;
        }

        const headers = ["Date", "Day", "Employee ID", "Employee Name", "Status", "First In", "Lunch Out", "Lunch In", "Last Out", "Work Duration (Mins)", "Morning Late Mins", "Afternoon Late Mins", "Total Late Mins"];
        const rows = filteredData.map(r => [
            r.date, r.day, r.employeeId, r.employeeName || "", r.status, r.firstLogin, r.afternoonCheckout, r.afternoonCheckin, r.lastLogout, r.workDurationMinutes, r.morningLateMinutes, r.afternoonLateMinutes, r.lateMinutes
        ]);

        exportToCSV(`attendance_records_${new Date().toISOString().slice(0, 10)}`, headers, rows);
        if (onToast) onToast("Exported filtered CSV file", "success");
    };

    const handleClearWorkspace = () => {
        if (window.confirm("Are you sure you want to clear all loaded attendance records?")) {
            clearAttendance();
            if (onToast) onToast("Attendance workspace cleared", "info");
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <header className="top-navbar">
            {/* LEFT SIDE: Title & Subtitle */}
            <div className="header-left">
                <h1 className="header-page-title" id="pageTitle">
                    {title === "Attendance Analytics Dashboard" ? (
                        <>
                            <span>Attendance Analytics </span>
                            <span className="title-highlight">Dashboard</span>
                        </>
                    ) : (
                        title || "Attendance Analytics Dashboard"
                    )}
                </h1>
                <p className="header-page-subtitle" id="pageSubtitle">
                    {subtitle || "Executive attendance KPIs, distribution charts & shift evaluation"}
                </p>
            </div>

            {/* RIGHT SIDE: Structured Toolbar */}
            <div className="header-right">
                {/* First Row: Top Controls */}
                <div className="top-controls">
                    {/* User Identity Pill & Logout */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-light, rgba(255, 255, 255, 0.1))',
                        borderRadius: '10px',
                        padding: '4px 10px',
                    }} title={`Logged in as ${user?.username || ''}`}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: role === 'MANAGER' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : role === 'ACCOUNTANT' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 800
                        }}>
                            {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {user?.fullName || user?.username || 'User'}
                            </span>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                color: role === 'MANAGER' ? '#60a5fa' : role === 'ACCOUNTANT' ? '#34d399' : '#fbbf24',
                                textTransform: 'uppercase'
                            }}>
                                {role}
                            </span>
                        </div>
                        <button
                            id="headerLogoutBtn"
                            onClick={logout}
                            title="Sign Out"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted, #94a3b8)',
                                cursor: 'pointer',
                                padding: '4px',
                                marginLeft: '4px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                        </button>
                    </div>

                    {/* Notification Bell (Circular icon button with badge) */}
                    <div className="notification-menu-wrapper" ref={notifRef}>
                        <button
                            id="notificationBtn"
                            className="icon-circle-btn"
                            onClick={() => setNotifOpen(!notifOpen)}
                            title="Notifications"
                            aria-label="Notifications"
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="notification-badge">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Popover Menu */}
                        {notifOpen && (
                            <div className="notification-popover">
                                <div className="notif-header">
                                    <span>Notifications ({unreadCount} unread)</span>
                                    {unreadCount > 0 && (
                                        <button
                                            className="notif-mark-all"
                                            onClick={markAllNotificationsRead}
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="notif-list">
                                    {notifications.length === 0 ? (
                                        <div className="notif-empty">
                                            No notifications yet.
                                        </div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                className={`notif-item ${!n.read ? 'unread' : ''}`}
                                                onClick={() => markNotificationRead(n.id)}
                                            >
                                                <div className="notif-title">{n.title}</div>
                                                <div className="notif-desc">{n.message}</div>
                                                <div className="notif-time">{n.time}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dark/Light Mode Theme Toggle */}
                    <button
                        id="themeToggleBtn"
                        className="icon-circle-btn"
                        onClick={toggleTheme}
                        title="Toggle Dark/Light Mode"
                        aria-label="Toggle Theme"
                    >
                        {theme === "dark" ? (
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                            </svg>
                        )}
                    </button>

                    {/* Quick Upload Button (Manager only) */}
                    {isManager && (
                        <button
                            id="headerUploadBtn"
                            className="btn btn-default btn-upload"
                            onClick={() => navigate("/upload")}
                        >
                            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            <span>Upload Data</span>
                        </button>
                    )}
                </div>

                {/* Second Row: Action Controls Neatly Aligned Underneath */}
                <div className="action-controls">
                    {/* Primary Action Button */}
                    <button
                        id="headerExportCsvBtn"
                        className="btn btn-primary"
                        onClick={handleExportCSV}
                    >
                        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        <span>Export CSV</span>
                    </button>

                    {/* Secondary Danger Action (Manager only) */}
                    {isManager && (
                        <button
                            id="headerClearBtn"
                            className="btn btn-danger-subtle"
                            onClick={handleClearWorkspace}
                            title="Reset workspace"
                        >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            <span>Clear</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
