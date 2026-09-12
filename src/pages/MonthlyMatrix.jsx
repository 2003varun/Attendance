// Monthly Attendance Matrix Grid View
import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { employeeService } from '../services/employeeService';

export function MonthlyMatrix() {
    const { rawData } = useAttendance();
    const [employees, setEmployees] = useState(() => employeeService.getAllSync());

    useEffect(() => {
        employeeService.getAll().then(data => {
            if (data && data.length) setEmployees(data);
        }).catch(() => {});
    }, []);

    const dates = Array.from(new Set(rawData.map(r => r.date))).sort();
    const emps = Array.from(new Set(rawData.map(r => r.employeeId))).sort((a, b) => Number(a) - Number(b));

    const recordLookup = new Map();
    rawData.forEach(r => {
        recordLookup.set(`${r.employeeId}|${r.date}`, r);
    });

    const empMap = new Map();
    employees.forEach(e => empMap.set(String(e.id || e.employee_id), e.name || e.full_name));

    return (
        <section className="page-view active">
            <div className="section-heading">
                <div className="section-heading-left">
                    <h2>🏢 Monthly Attendance Matrix Grid</h2>
                    <p>Comprehensive HR/payroll roster grid showing all employees across every date</p>
                </div>
            </div>

            <div className="table-responsive">
                <div className="table-info-bar">
                    <div>Monthly Matrix View ({emps.length} Staff × {dates.length} Days)</div>
                    <div style={{ display: "flex", gap: "12px", fontSize: "11px", flexWrap: "wrap" }}>
                        <span><strong style={{ color: "var(--success)" }}>P:</strong> Full Day</span>
                        <span><strong style={{ color: "var(--indigo)" }}>M:</strong> Morning</span>
                        <span><strong style={{ color: "var(--purple)" }}>A:</strong> Afternoon</span>
                        <span><strong style={{ color: "var(--cyan)" }}>L:</strong> On Leave</span>
                        <span><strong style={{ color: "var(--danger)" }}>AB:</strong> Absent</span>
                        <span><strong style={{ color: "var(--text-muted)" }}>WO:</strong> Off</span>
                        <span><strong style={{ color: "var(--warning)" }}>H:</strong> Holiday</span>
                    </div>
                </div>

                <div className="table-scroll-wrap" id="matrixContainer">
                    {rawData.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                            Load attendance data to view matrix grid.
                        </div>
                    ) : (
                        <table className="matrix-table">
                            <thead>
                                <tr>
                                    <th className="emp-name-col">Employee (ID & Name)</th>
                                    {dates.map(d => (
                                        <th key={d} title={d}>{d.split("-")[2]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {emps.map(empId => {
                                    const displayName = empMap.get(String(empId)) || `Employee ${empId}`;

                                    return (
                                        <tr key={empId}>
                                            <td className="emp-name-col">
                                                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, gap: "1px" }}>
                                                    <span className="mono font-semibold" style={{ color: "var(--text-primary)", fontSize: "12.5px" }}>
                                                        {empId}
                                                    </span>
                                                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>
                                                        {displayName}
                                                    </span>
                                                </div>
                                            </td>
                                            {dates.map(d => {
                                                const rec = recordLookup.get(`${empId}|${d}`);
                                                let cellClass = "m-wo";
                                                let text = "—";

                                                if (rec) {
                                                    if (rec.status === "FULL DAY PRESENT") { cellClass = "m-p"; text = "P"; }
                                                    else if (rec.status === "PRESENT IN THE MORNING") { cellClass = "m-m"; text = "M"; }
                                                    else if (rec.status === "PRESENT IN THE AFTERNOON") { cellClass = "m-a"; text = "A"; }
                                                    else if (rec.status === "ON LEAVE") { cellClass = "m-l"; text = "L"; }
                                                    else if (rec.status === "HOLIDAY") { cellClass = "m-h"; text = "H"; }
                                                    else if (rec.status === "ABSENT") { cellClass = "m-ab"; text = "AB"; }
                                                    else if (rec.status === "SUNDAY / WEEKLY OFF") { cellClass = "m-wo"; text = "WO"; }
                                                }

                                                return (
                                                    <td key={d}>
                                                        <span className={`m-cell ${cellClass}`} title={`${displayName} — ${d}: ${rec ? rec.status : 'None'}`}>
                                                            {text}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </section>
    );
}
