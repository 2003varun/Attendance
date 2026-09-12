// Date-wise Daily Roll Call & Headcount Page
import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { formatDateDisplay } from '../utils/dateUtils';

export function DateRoster() {
    const { rawData } = useAttendance();

    const dateMap = new Map();
    rawData.forEach(r => {
        if (!dateMap.has(r.date)) {
            dateMap.set(r.date, {
                date: r.date,
                day: r.day,
                totalEmps: 0,
                full: 0,
                morn: 0,
                aft: 0,
                leave: 0,
                abs: 0,
                off: 0,
                lateCount: 0,
                lateMins: 0
            });
        }
        const cur = dateMap.get(r.date);
        cur.totalEmps++;
        if (r.status === "FULL DAY PRESENT") cur.full++;
        else if (r.status === "PRESENT IN THE MORNING") cur.morn++;
        else if (r.status === "PRESENT IN THE AFTERNOON") cur.aft++;
        else if (r.status === "ON LEAVE") cur.leave++;
        else if (r.status === "ABSENT") cur.abs++;
        else if (r.status === "SUNDAY / WEEKLY OFF") cur.off++;

        if ((r.lateMinutes || 0) > 0) {
            cur.lateCount++;
            cur.lateMins += r.lateMinutes;
        }
    });

    const dateList = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return (
        <section className="page-view active">
            <div className="section-heading">
                <div className="section-heading-left">
                    <h2>📅 Date-wise Daily Roll Call & Headcount</h2>
                    <p>Daily roll-call breakdown with presence rate, on-leave counts and absenteeism</p>
                </div>
            </div>

            <div className="table-responsive">
                <div className="table-info-bar">
                    <div>Date-wise Attendance Roll Call Summary ({dateList.length} dates recorded)</div>
                </div>

                <div className="table-scroll-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Day</th>
                                <th>Total Staff</th>
                                <th>Full Day</th>
                                <th>Morning Half</th>
                                <th>Afternoon Half</th>
                                <th>On Leave</th>
                                <th>Absent</th>
                                <th>Weekly Off</th>
                                <th>Late Count</th>
                                <th>Total Late Mins</th>
                                <th>Presence %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dateList.length === 0 ? (
                                <tr>
                                    <td colSpan="12" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                                        No attendance data loaded.
                                    </td>
                                </tr>
                            ) : (
                                dateList.map(d => {
                                    const presentCount = d.full + d.morn + d.aft;
                                    const rate = d.totalEmps > 0 ? Math.round((presentCount / d.totalEmps) * 100) : 0;
                                    const isWeekendDay = d.day === "Sunday" || d.day === "Saturday";

                                    return (
                                        <tr key={d.date}>
                                            <td className="mono font-semibold">{formatDateDisplay(d.date)}</td>
                                            <td style={{ 
                                                color: isWeekendDay ? 'var(--warning-dark)' : 'inherit', 
                                                fontWeight: isWeekendDay ? '700' : '500' 
                                            }}>
                                                {d.day}
                                            </td>
                                            <td className="mono">{d.totalEmps}</td>
                                            <td className="mono font-semibold" style={{ color: "var(--success)" }}>{d.full}</td>
                                            <td className="mono">{d.morn}</td>
                                            <td className="mono">{d.aft}</td>
                                            <td className="mono font-semibold" style={{ color: "var(--cyan)" }}>{d.leave}</td>
                                            <td className="mono" style={{ color: "var(--danger)" }}>{d.abs}</td>
                                            <td className="mono" style={{ color: "var(--text-muted)" }}>{d.off}</td>
                                            <td className="mono font-semibold" style={{ color: d.lateCount > 0 ? 'var(--warning-dark)' : 'inherit' }}>
                                                {d.lateCount}
                                            </td>
                                            <td className="mono font-semibold" style={{ color: d.lateMins > 0 ? 'var(--danger)' : 'inherit' }}>
                                                {d.lateMins}m
                                            </td>
                                            <td>
                                                <span className={`badge ${rate >= 75 ? 'badge-full' : rate >= 50 ? 'badge-late' : 'badge-absent'}`}>
                                                    {rate}% Present
                                                </span>
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
