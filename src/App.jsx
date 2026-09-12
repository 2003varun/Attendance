// Main Application Root
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LeaveProvider } from './context/LeaveContext';
import { AttendanceProvider } from './context/AttendanceContext';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { Dashboard } from './pages/Dashboard';
import { Records } from './pages/Records';
import { LeaveManagement } from './pages/LeaveManagement';
import { EmployeeManagement } from './pages/EmployeeManagement';
import { Employees } from './pages/Employees';
import { DateRoster } from './pages/DateRoster';
import { MonthlyMatrix } from './pages/MonthlyMatrix';
import { EmployeeDirectory } from './pages/EmployeeDirectory';
import { Holidays } from './pages/Holidays';
import { Reports } from './pages/Reports';
import { RawLogs } from './pages/RawLogs';
import { UploadHub } from './pages/UploadHub';

function AppContent() {
    const location = useLocation();
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = "info") => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    };

    const getPageMeta = (pathname) => {
        switch (pathname) {
            case "/":
                return {
                    title: "Attendance Analytics Dashboard",
                    subtitle: "Executive attendance KPIs, distribution charts & shift evaluation"
                };
            case "/records":
                return {
                    title: "Master Attendance Records",
                    subtitle: "All employee punch logs, shift calculations, working hours & late minutes"
                };
            case "/leave":
                return {
                    title: "Enterprise Leave Management",
                    subtitle: "Multi-tier leave application, approval workflow & attendance cross-integration"
                };
            case "/employees":
                return {
                    title: "Employee Directory & Profiles",
                    subtitle: "Centralized SQL employee database, designations, shifts & employment records"
                };
            case "/timesheets":
                return {
                    title: "Employee Timesheets & Aggregates",
                    subtitle: "Monthly aggregate metrics, attendance percentage & late counts per employee"
                };
            case "/dates":
                return {
                    title: "Date-wise Daily Roll Call & Headcount",
                    subtitle: "Daily roll-call breakdown with presence rate and absenteeism"
                };
            case "/matrix":
                return {
                    title: "Monthly Attendance Matrix Grid",
                    subtitle: "Comprehensive HR/payroll roster grid showing all employees across every date"
                };
            case "/employee-directory":
                return {
                    title: "Employee Directory & Profiles",
                    subtitle: "Staff designations, departments, reporting lines & organization hierarchy"
                };
            case "/holidays":
                return {
                    title: "Official Holiday Calendar",
                    subtitle: "Corporate gazetted holidays, national observances & automated leave exclusion"
                };
            case "/reports":
                return {
                    title: "Analytics & Audit Reports",
                    subtitle: "Filtered attendance & leave records with CSV, Excel & Print exporting"
                };
            case "/raw":
                return {
                    title: "Raw Device Biometric Stream",
                    subtitle: "Live terminal preview of biometric device logs"
                };
            case "/upload":
                return {
                    title: "Biometric Data Ingestion Hub",
                    subtitle: "Upload new biometric logs (.DAT, .TXT, .CSV, .XLSX) or test sample datasets"
                };
            default:
                return {
                    title: "Attendance OS Pro",
                    subtitle: "Enterprise Workforce & Leave Management Platform"
                };
        }
    };

    const meta = getPageMeta(location.pathname);

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-wrapper">
                <Header 
                    title={meta.title} 
                    subtitle={meta.subtitle} 
                    onToast={showToast} 
                />

                <main className="content-area">
                    <Routes>
                        <Route path="/" element={<Dashboard onToast={showToast} />} />
                        <Route path="/employees" element={<EmployeeManagement onToast={showToast} />} />
                        <Route path="/records" element={<Records onToast={showToast} />} />
                        <Route path="/leave" element={<LeaveManagement onToast={showToast} />} />
                        <Route path="/timesheets" element={<Employees onToast={showToast} />} />
                        <Route path="/dates" element={<DateRoster onToast={showToast} />} />
                        <Route path="/matrix" element={<MonthlyMatrix onToast={showToast} />} />
                        <Route path="/employee-directory" element={<EmployeeDirectory onToast={showToast} />} />
                        <Route path="/holidays" element={<Holidays onToast={showToast} />} />
                        <Route path="/reports" element={<Reports onToast={showToast} />} />
                        <Route path="/raw" element={<RawLogs onToast={showToast} />} />
                        <Route path="/upload" element={<UploadHub onToast={showToast} />} />
                        <Route path="*" element={<Dashboard onToast={showToast} />} />
                    </Routes>
                </main>
            </div>

            {/* Toast Notifications */}
            <div className="toast-container" id="toastContainer">
                {toasts.map(t => (
                    <div key={t.id} className="toast" style={{
                        borderLeft: t.type === 'success' ? '4px solid var(--success)' : t.type === 'danger' ? '4px solid var(--danger)' : '4px solid var(--primary)'
                    }}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthProvider>
                <LeaveProvider>
                    <AttendanceProvider>
                        <AppContent />
                    </AttendanceProvider>
                </LeaveProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
