// Comprehensive Attendance & Leave Reports Hub
import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { useLeave } from '../context/LeaveContext';
import { exportToCSV, exportToExcel, printCurrentView } from '../utils/exportUtils';
import { formatDateDisplay } from '../utils/dateUtils';
import { employeeService } from '../services/employeeService';

export function Reports({ onToast }) {
    const { filteredData, rawData } = useAttendance();
    const { requests, leaveTypes } = useLeave();

    const [reportType, setReportType] = useState("attendance"); // "attendance" or "leave"

    // Leave Report Filters
    const [empFilter, setEmpFilter] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [startDateFilter, setStartDateFilter] = useState("");
    const [endDateFilter, setEndDateFilter] = useState("");

    const [employees, setEmployees] = useState(() => employeeService.getAllSync());
    useEffect(() => {
        employeeService.getAll().then(data => {
            if (data && data.length) setEmployees(data);
        }).catch(() => {});
    }, []);
    const departments = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);

    // Filtered Leave Report Data
    const filteredLeaves = requests.filter(r => {
        if (empFilter && String(r.employeeId) !== String(empFilter)) return false;
        if (deptFilter && r.department !== deptFilter) return false;
        if (typeFilter && r.leaveType !== typeFilter) return false;
        if (statusFilter && r.status !== statusFilter) return false;
        if (startDateFilter && r.startDate < startDateFilter) return false;
        if (endDateFilter && r.endDate > endDateFilter) return false;
        return true;
    });

    const handleExportCSV = () => {
        if (reportType === "attendance") {
            if (!filteredData.length) {
                if (onToast) onToast("No attendance data to export", "warning");
                return;
            }
            const headers = ["Date", "Day", "Employee ID", "Employee Name", "Status", "First In", "Lunch Out", "Lunch In", "Last Out", "Work Duration (Mins)", "Morning Late Mins", "Afternoon Late Mins", "Total Late Mins"];
            const rows = filteredData.map(r => [
                r.date, r.day, r.employeeId, r.employeeName || "", r.status, r.firstLogin, r.afternoonCheckout, r.afternoonCheckin, r.lastLogout, r.workDurationMinutes, r.morningLateMinutes, r.afternoonLateMinutes, r.lateMinutes
            ]);
            exportToCSV(`attendance_detailed_report_${new Date().toISOString().slice(0, 10)}`, headers, rows);
        } else {
            if (!filteredLeaves.length) {
                if (onToast) onToast("No leave data to export", "warning");
                return;
            }
            const headers = ["Request ID", "Employee ID", "Employee Name", "Department", "Leave Type", "Start Date", "End Date", "Working Days", "Reason", "Status", "Approved By", "Applied Date"];
            const rows = filteredLeaves.map(r => [
                r.id, r.employeeId, r.employeeName, r.department || "", r.leaveType, r.startDate, r.endDate, r.days, r.reason, r.status, r.approvedBy || "", r.appliedDate
            ]);
            exportToCSV(`leave_management_report_${new Date().toISOString().slice(0, 10)}`, headers, rows);
        }
        if (onToast) onToast("Exported CSV successfully", "success");
    };

    const handleExportExcel = () => {
        if (reportType === "attendance") {
            if (!filteredData.length) {
                if (onToast) onToast("No attendance data to export", "warning");
                return;
            }
            const data = filteredData.map(r => ({
                "Date": r.date,
                "Day": r.day,
                "Employee ID": r.employeeId,
                "Employee Name": r.employeeName || "",
                "Status": r.status,
                "First In": r.firstLogin || "",
                "Lunch Out": r.afternoonCheckout || "",
                "Lunch In": r.afternoonCheckin || "",
                "Last Out": r.lastLogout || "",
                "Work Duration (Mins)": r.workDurationMinutes,
                "Total Late (Mins)": r.lateMinutes
            }));
            exportToExcel(`attendance_report_${new Date().toISOString().slice(0, 10)}`, "Attendance", data);
        } else {
            if (!filteredLeaves.length) {
                if (onToast) onToast("No leave data to export", "warning");
                return;
            }
            const data = filteredLeaves.map(r => ({
                "Request ID": r.id,
                "Employee ID": r.employeeId,
                "Employee Name": r.employeeName,
                "Department": r.department || "",
                "Leave Type": r.leaveType,
                "Start Date": r.startDate,
                "End Date": r.endDate,
                "Days": r.days,
                "Status": r.status,
                "Reason": r.reason,
                "Approved By": r.approvedBy || ""
            }));
            exportToExcel(`leave_report_${new Date().toISOString().slice(0, 10)}`, "Leave Requests", data);
        }
        if (onToast) onToast("Exported Excel spreadsheet successfully", "success");
    };

    return (
        <section className="page-view active">
            <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="section-heading-left">
                    <h2>📑 Comprehensive Analytics & Audit Reports</h2>
                    <p>Generate filtered attendance & leave audits, export to CSV/Excel or print formatted sheets</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn btn-default" onClick={printCurrentView} title="Print Report">
                        🖨️ Print
                    </button>
                    <button className="btn btn-default" onClick={handleExportCSV}>
                        Export CSV
                    </button>
                    <button className="btn btn-primary" onClick={handleExportExcel}>
                        Export Excel (.XLSX)
                    </button>
                </div>
            </div>

            {/* Report Type Tabs */}
            <div className="tabs-container">
                <button 
                    className={`tab-btn ${reportType === 'attendance' ? 'active' : ''}`}
                    onClick={() => setReportType('attendance')}
                >
                    📋 Attendance Report ({filteredData.length} records)
                </button>
                <button 
                    className={`tab-btn ${reportType === 'leave' ? 'active' : ''}`}
                    onClick={() => setReportType('leave')}
                >
                    🏖️ Leave Audit Report ({filteredLeaves.length} applications)
                </button>
            </div>

            {/* Leave Report Filters */}
            {reportType === "leave" && (
                <div className="filters-toolbar" style={{ gridTemplateColumns: "repeat(3, 1fr) repeat(3, 1fr) auto", marginBottom: "16px" }}>
                    <div className="filter-group">
                        <label className="filter-label">Employee</label>
                        <select className="select-field" value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
                            <option value="">All Employees</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Department</label>
                        <select className="select-field" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Leave Type</label>
                        <select className="select-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                            <option value="">All Leave Types</option>
                            {leaveTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Status</label>
                        <select className="select-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="PENDING">PENDING</option>
                            <option value="APPROVED">APPROVED</option>
                            <option value="REJECTED">REJECTED</option>
                            <option value="CANCELLED">CANCELLED</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">From Date</label>
                        <input className="input-field" type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">To Date</label>
                        <input className="input-field" type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} />
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button className="btn btn-default" onClick={() => {
                            setEmpFilter(""); setDeptFilter(""); setTypeFilter(""); setStatusFilter(""); setStartDateFilter(""); setEndDateFilter("");
                        }}>
                            Reset
                        </button>
                    </div>
                </div>
            )}

            {/* Report Content */}
            {reportType === "attendance" ? (
                <div className="table-responsive">
                    <div className="table-info-bar">
                        <div>Master Attendance Audit Log ({filteredData.length} records)</div>
                    </div>
                    <div className="table-scroll-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Employee ID</th>
                                    <th>Status</th>
                                    <th>First In</th>
                                    <th>Last Out</th>
                                    <th>Work Mins</th>
                                    <th>Total Late</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.slice(0, 100).map(row => (
                                    <tr key={`${row.employeeId}-${row.date}-${row._index}`}>
                                        <td className="mono font-semibold">{formatDateDisplay(row.date)}</td>
                                        <td>{row.day}</td>
                                        <td className="mono font-semibold">{row.employeeId}</td>
                                        <td>
                                            <span className={`badge ${row.status === 'FULL DAY PRESENT' ? 'badge-full' : row.status === 'ON LEAVE' ? 'badge-leave' : row.status === 'ABSENT' ? 'badge-absent' : 'badge-morning'}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="mono">{row.firstLogin || '—'}</td>
                                        <td className="mono">{row.lastLogout || '—'}</td>
                                        <td className="mono">{row.workDurationMinutes}m</td>
                                        <td className="mono" style={{ color: row.lateMinutes > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                            {row.lateMinutes > 0 ? `+${row.lateMinutes}m` : '0m'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="table-responsive">
                    <div className="table-info-bar">
                        <div>Filtered Leave Management Audit Data ({filteredLeaves.length} records)</div>
                    </div>
                    <div className="table-scroll-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Department</th>
                                    <th>Leave Type</th>
                                    <th>Date Range</th>
                                    <th>Days</th>
                                    <th>Status</th>
                                    <th>Reason</th>
                                    <th>Decision Signoff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeaves.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                                            No leave records match the specified filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeaves.map(r => (
                                        <tr key={r.id}>
                                            <td>
                                                <span className="mono font-semibold">{r.employeeId}</span> — {r.employeeName}
                                            </td>
                                            <td><span className="badge badge-off">{r.department}</span></td>
                                            <td className="font-semibold">{r.leaveType}</td>
                                            <td className="mono" style={{ fontSize: "12px" }}>
                                                {formatDateDisplay(r.startDate)} → {formatDateDisplay(r.endDate)}
                                            </td>
                                            <td className="mono font-semibold" style={{ color: "var(--primary)" }}>{r.days} d</td>
                                            <td>
                                                <span className={`badge ${r.status === 'APPROVED' ? 'badge-approved' : r.status === 'PENDING' ? 'badge-pending' : 'badge-rejected'}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td style={{ maxWidth: "220px", fontSize: "12.5px" }}>{r.reason}</td>
                                            <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                                {r.status === "APPROVED" && (r.approvedBy || "Approved")}
                                                {r.status === "REJECTED" && (r.rejectionReason || "Rejected")}
                                                {r.status === "PENDING" && "Pending"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}
