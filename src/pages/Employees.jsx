// Employee Timesheet & Performance Summaries Page
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendance } from '../context/AttendanceContext';
import { exportToCSV } from '../../src/utils/exportUtils';

export function Employees({ onToast }) {
    const navigate = useNavigate();
    const { rawData, setEmployeeFilter } = useAttendance();

    const empMap = new Map();
    rawData.forEach(r => {
        if (!empMap.has(r.employeeId)) {
            empMap.set(r.employeeId, {
                id: r.employeeId,
                name: r.employeeName,
                totalDays: 0,
                fullDays: 0,
                morningDays: 0,
                afternoonDays: 0,
                leaveDays: 0,
                absentDays: 0,
                lateDays: 0,
                lateMinutes: 0
            });
        }
        const cur = empMap.get(r.employeeId);
        cur.totalDays++;
        if (r.status === "FULL DAY PRESENT") cur.fullDays++;
        else if (r.status === "PRESENT IN THE MORNING") cur.morningDays++;
        else if (r.status === "PRESENT IN THE AFTERNOON") cur.afternoonDays++;
        else if (r.status === "ON LEAVE") cur.leaveDays++;
        else if (r.status === "ABSENT") cur.absentDays++;

        if ((r.lateMinutes || 0) > 0) {
            cur.lateDays++;
            cur.lateMinutes += r.lateMinutes;
        }
    });

    const empList = Array.from(empMap.values()).sort((a, b) => Number(a.id) - Number(b.id));

    const handleFilterRecords = (empId) => {
        setEmployeeFilter(empId);
        navigate("/records");
    };

    const handleExportSummaryCSV = () => {
        if (!rawData.length) {
            if (onToast) onToast("No data available to export.", "warning");
            return;
        }

        const headers = ["Employee ID", "Employee Name", "Total Days", "Full Days", "Morning Half", "Afternoon Half", "Leave Days", "Absent Days", "Equivalent Present", "Attendance %", "Total Late Mins"];
        const rows = empList.map(e => {
            const equiv = e.fullDays + (e.morningDays * 0.5) + (e.afternoonDays * 0.5);
            const pct = e.totalDays > 0 ? Math.round((equiv / e.totalDays) * 100) : 0;
            return [e.id, e.name || "", e.totalDays, e.fullDays, e.morningDays, e.afternoonDays, e.leaveDays, e.absentDays, equiv.toFixed(1), `${pct}%`, e.lateMinutes];
        });

        exportToCSV(`employee_timesheet_summary_${new Date().toISOString().slice(0, 10)}`, headers, rows);
        if (onToast) onToast("Exported employee summary CSV", "success");
    };

    return (
        <section className="page-view active">
            <div className="section-heading">
                <div className="section-heading-left">
                    <h2>👥 Employee Timesheet & Performance Summaries</h2>
                    <p>Monthly aggregate metrics, attendance percentage & late day counts per employee</p>
                </div>
            </div>

            <div className="table-responsive">
                <div className="table-info-bar">
                    <div>Employee Aggregates ({empList.length} staff members)</div>
                    <button 
                        className="btn btn-default" 
                        onClick={handleExportSummaryCSV}
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                    >
                        Export Summary CSV
                    </button>
                </div>

                <div className="table-scroll-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Full Days</th>
                                <th>Morning Half</th>
                                <th>Afternoon Half</th>
                                <th>Leave Days</th>
                                <th>Absent Days</th>
                                <th>Equiv Present</th>
                                <th>Attendance %</th>
                                <th>Late Count</th>
                                <th>Total Late (Mins)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empList.length === 0 ? (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                                        No employee data loaded.
                                    </td>
                                </tr>
                            ) : (
                                empList.map(emp => {
                                    const equivPresent = emp.fullDays + (emp.morningDays * 0.5) + (emp.afternoonDays * 0.5);
                                    const attPercent = emp.totalDays > 0 ? Math.round((equivPresent / emp.totalDays) * 100) : 0;

                                    return (
                                        <tr key={emp.id}>
                                            <td>
                                                <span className="mono font-semibold" style={{ fontSize: "13.5px", color: "var(--text-primary)" }}>
                                                    {emp.id}
                                                </span>
                                            </td>
                                            <td className="mono font-semibold" style={{ color: "var(--success)" }}>{emp.fullDays}</td>
                                            <td className="mono">{emp.morningDays}</td>
                                            <td className="mono">{emp.afternoonDays}</td>
                                            <td className="mono" style={{ color: "var(--cyan)" }}>{emp.leaveDays}</td>
                                            <td className="mono" style={{ color: "var(--danger)" }}>{emp.absentDays}</td>
                                            <td className="mono font-semibold">{equivPresent.toFixed(1)}</td>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <div style={{ flex: 1, height: "6px", background: "var(--border-light)", borderRadius: "99px", overflow: "hidden", minWidth: "60px" }}>
                                                        <div style={{ 
                                                            width: `${attPercent}%`, 
                                                            height: "100%", 
                                                            background: attPercent > 80 ? 'var(--success)' : attPercent > 50 ? 'var(--warning)' : 'var(--danger)', 
                                                            borderRadius: "99px" 
                                                        }}></div>
                                                    </div>
                                                    <span className="mono font-semibold" style={{ fontSize: "12px" }}>{attPercent}%</span>
                                                </div>
                                            </td>
                                            <td className="mono font-semibold" style={{ color: emp.lateDays > 0 ? 'var(--warning-dark)' : 'inherit' }}>
                                                {emp.lateDays}
                                            </td>
                                            <td className="mono font-semibold" style={{ color: emp.lateMinutes > 0 ? 'var(--danger)' : 'inherit' }}>
                                                {emp.lateMinutes}m
                                            </td>
                                            <td>
                                                <button 
                                                    className="btn btn-default" 
                                                    style={{ padding: "4px 8px", fontSize: "11px" }}
                                                    onClick={() => handleFilterRecords(emp.id)}
                                                >
                                                    Filter Records
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
