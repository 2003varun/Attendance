import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAttendance } from '../../context/AttendanceContext';
import { useLeave } from '../../context/LeaveContext';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../utils/apiConfig';

export function Sidebar() {
    const { rawData, datasetName } = useAttendance();
    const { requests } = useLeave();
    const { isEmployee, isManager, isAccountant, role, user } = useAuth();
    const [dbStaffCount, setDbStaffCount] = useState(13);

    useEffect(() => {
        let isMounted = true;
        if (!isEmployee) {
            fetch(getApiUrl('/api/employees?status=Active'))
                .then(res => res.json())
                .then(json => {
                    if (isMounted && json.success) {
                        setDbStaffCount(json.count);
                    }
                })
                .catch(() => {});
        }
        return () => { isMounted = false; };
    }, [isEmployee]);

    const uniqueEmployeesCount = new Set(rawData.map(r => r.employeeId)).size;
    const pendingLeaveCount = requests.filter(r => r.status === "PENDING").length;

    return (
        <aside className="sidebar">
            {/* Branding Header */}
            <div className="brand">
                <div className="brand-icon">
                    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="brand-text">
                    <h2>ATTENDANCE OS</h2>
                    <span>{role ? `${role} PORTAL` : 'ENTERPRISE 2.0'}</span>
                </div>
            </div>

            {/* Navigation Menu */}
            <div className="nav-container">
                <div className="nav-section-title">NAVIGATION</div>
                <ul className="nav-menu">
                    {/* Dashboard */}
                    <li className="nav-item">
                        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <span className="nav-left">
                                <span className="nav-icon">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                                    </svg>
                                </span>
                                <span className="nav-label">Dashboard</span>
                            </span>
                        </NavLink>
                    </li>

                    {/* Manager-only: Employee Management */}
                    {isManager && (
                        <li className="nav-item">
                            <NavLink to="/employees" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <span className="nav-left">
                                    <span className="nav-icon">
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                        </svg>
                                    </span>
                                    <span className="nav-label">Employees</span>
                                </span>
                                {dbStaffCount > 0 && (
                                    <span className="nav-badge" id="badgeStaffCount">{dbStaffCount}</span>
                                )}
                            </NavLink>
                        </li>
                    )}

                    {/* Attendance / Punch Records */}
                    <li className="nav-item">
                        <NavLink to="/records" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <span className="nav-left">
                                <span className="nav-icon">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </span>
                                <span className="nav-label">{isEmployee ? "My Attendance" : "Punch Records"}</span>
                            </span>
                            {!isEmployee && rawData.length > 0 && (
                                <span className="nav-badge" id="badgeRecordsCount">{rawData.length}</span>
                            )}
                        </NavLink>
                    </li>

                    {/* Leave Management / My Leave */}
                    <li className="nav-item">
                        <NavLink to="/leave" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <span className="nav-left">
                                <span className="nav-icon">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008z" />
                                    </svg>
                                </span>
                                <span className="nav-label">{isEmployee ? "Paid Leave" : "Leave Management"}</span>
                            </span>
                            {isManager && pendingLeaveCount > 0 && (
                                <span className="nav-badge badge-warning">
                                    {pendingLeaveCount}
                                </span>
                            )}
                        </NavLink>
                    </li>

                    {/* Holiday Calendar for all roles */}
                    <li className="nav-item">
                        <NavLink to="/holidays" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <span className="nav-left">
                                <span className="nav-icon">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                    </svg>
                                </span>
                                <span className="nav-label">Holidays</span>
                            </span>
                        </NavLink>
                    </li>

                    {/* WORKFORCE SECTION: For Manager & Accountant only */}
                    {!isEmployee && (
                        <>
                            <div className="nav-section-title" style={{ marginTop: '16px' }}>WORKFORCE</div>

                            <li className="nav-item">
                                <NavLink to="/timesheets" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    <span className="nav-left">
                                        <span className="nav-icon">
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                                            </svg>
                                        </span>
                                        <span className="nav-label">Employee Timesheets</span>
                                    </span>
                                    {uniqueEmployeesCount > 0 && (
                                        <span className="nav-badge" id="badgeEmpCount">{uniqueEmployeesCount}</span>
                                    )}
                                </NavLink>
                            </li>

                            <li className="nav-item">
                                <NavLink to="/dates" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    <span className="nav-left">
                                        <span className="nav-icon">
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                            </svg>
                                        </span>
                                        <span className="nav-label">Date-wise Roster</span>
                                    </span>
                                </NavLink>
                            </li>

                            <li className="nav-item">
                                <NavLink to="/matrix" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    <span className="nav-left">
                                        <span className="nav-icon">
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                            </svg>
                                        </span>
                                        <span className="nav-label">Monthly Matrix</span>
                                    </span>
                                </NavLink>
                            </li>

                            <li className="nav-item">
                                <NavLink to="/employee-directory" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    <span className="nav-left">
                                        <span className="nav-icon">
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.999-3.199a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                            </svg>
                                        </span>
                                        <span className="nav-label">Staff Directory</span>
                                    </span>
                                </NavLink>
                            </li>

                            <div className="nav-section-title" style={{ marginTop: '16px' }}>SYSTEM</div>

                            <li className="nav-item">
                                <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    <span className="nav-left">
                                        <span className="nav-icon">
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                            </svg>
                                        </span>
                                        <span className="nav-label">Reports & Exports</span>
                                    </span>
                                </NavLink>
                            </li>
                        </>
                    )}

                    {/* Manager-only: Raw Logs & Upload Hub */}
                    {isManager && (
                        <>
                            <li className="nav-item">
                                <NavLink to="/raw" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    <span className="nav-left">
                                        <span className="nav-icon">
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                                            </svg>
                                        </span>
                                        <span className="nav-label">Raw Logs</span>
                                    </span>
                                </NavLink>
                            </li>

                            <li className="nav-item">
                                <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    <span className="nav-left">
                                        <span className="nav-icon">
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                            </svg>
                                        </span>
                                        <span className="nav-label">Upload Files</span>
                                    </span>
                                </NavLink>
                            </li>
                        </>
                    )}
                </ul>
            </div>

            {/* Sidebar Footer */}
            <div className="sidebar-footer">
                <div className="status-pill">
                    <div className={`status-dot ${rawData.length > 0 ? 'active' : ''}`} id="systemStatusDot"></div>
                    <span id="sideStatusText" className="status-text">
                        {user?.employeeId ? `${user.employeeId} • ONLINE` : "SYSTEM READY"}
                    </span>
                </div>
                <div className="footer-copyright">
                    Attendance OS Pro • All Rights Reserved
                </div>
            </div>
        </aside>
    );
}
