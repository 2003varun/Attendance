// Master Attendance Records Data Grid
import React from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { formatDateDisplay } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/timeUtils';

export function AttendanceTable() {
    const {
        filteredData,
        sortCol,
        sortAsc,
        handleSort,
        pageSize,
        setPageSize,
        currentPage,
        setCurrentPage,
        openTimeline
    } = useAttendance();

    const totalPages = pageSize === "all" ? 1 : Math.ceil(filteredData.length / Number(pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages || 1);

    const startIdx = pageSize === "all" ? 0 : (safePage - 1) * Number(pageSize);
    const endIdx = pageSize === "all" ? filteredData.length : Math.min(startIdx + Number(pageSize), filteredData.length);
    const pageRows = filteredData.slice(startIdx, endIdx);

    const getBadgeClass = (status) => {
        if (status === "FULL DAY PRESENT") return "badge-full";
        if (status === "PRESENT IN THE MORNING") return "badge-morning";
        if (status === "PRESENT IN THE AFTERNOON") return "badge-afternoon";
        if (status === "ON LEAVE") return "badge-leave";
        if (status === "HOLIDAY") return "badge-holiday";
        if (status === "ABSENT") return "badge-absent";
        if (status === "SUNDAY / WEEKLY OFF") return "badge-off";
        return "badge-off";
    };

    return (
        <div className="table-responsive">
            <div className="table-info-bar">
                <div id="filterInfoText">
                    Showing {filteredData.length} records {pageSize !== "all" && `(Page ${safePage} of ${totalPages})`}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span>Rows display:</span>
                    <select 
                        className="select-field" 
                        id="pageSizeSelect" 
                        style={{ width: "85px", height: "30px", fontSize: "12px" }}
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(e.target.value === "all" ? "all" : Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        <option value="all">All</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>

            <div className="table-scroll-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('date')}>Date {sortCol === 'date' ? (sortAsc ? '↑' : '↓') : '⇅'}</th>
                            <th onClick={() => handleSort('day')}>Day {sortCol === 'day' ? (sortAsc ? '↑' : '↓') : '⇅'}</th>
                            <th onClick={() => handleSort('employeeId')}>Employee {sortCol === 'employeeId' ? (sortAsc ? '↑' : '↓') : '⇅'}</th>
                            <th onClick={() => handleSort('status')}>Status {sortCol === 'status' ? (sortAsc ? '↑' : '↓') : '⇅'}</th>
                            <th onClick={() => handleSort('firstLogin')}>First In {sortCol === 'firstLogin' ? (sortAsc ? '↑' : '↓') : '⇅'}</th>
                            <th>Lunch Out</th>
                            <th>Lunch In</th>
                            <th onClick={() => handleSort('lastLogout')}>Last Out {sortCol === 'lastLogout' ? (sortAsc ? '↑' : '↓') : '⇅'}</th>
                            <th>Work Duration</th>
                            <th onClick={() => handleSort('morningLateMinutes')}>Morn Late</th>
                            <th onClick={() => handleSort('afternoonLateMinutes')}>Aft Late</th>
                            <th onClick={() => handleSort('lateMinutes')}>Total Late {sortCol === 'lateMinutes' ? (sortAsc ? '↑' : '↓') : '⇅'}</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="recordsTableBody">
                        {pageRows.length === 0 ? (
                            <tr>
                                <td colSpan="13" style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                                    No records match your filters.
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((row) => {
                                const badgeClass = getBadgeClass(row.status);
                                const isWeekendDay = row.day === "Sunday" || row.day === "Saturday";

                                return (
                                    <tr key={`${row.employeeId}-${row.date}-${row._index}`}>
                                        <td className="mono font-semibold">{formatDateDisplay(row.date)}</td>
                                        <td style={{ 
                                            color: isWeekendDay ? 'var(--warning-dark)' : 'inherit', 
                                            fontWeight: isWeekendDay ? '700' : '500' 
                                        }}>
                                            {row.day}
                                        </td>
                                        <td>
                                            <span className="mono font-semibold" style={{ fontSize: "13.5px", color: "var(--text-primary)" }}>
                                                {row.employeeId}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${badgeClass}`}>
                                                <span className="badge-dot"></span>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="mono font-semibold" style={{ color: row.morningLateMinutes > 0 ? 'var(--danger)' : 'inherit' }}>
                                            {row.firstLogin || '—'}
                                        </td>
                                        <td className="mono">{row.afternoonCheckout || '—'}</td>
                                        <td className="mono" style={{ color: row.afternoonLateMinutes > 0 ? 'var(--danger)' : 'inherit' }}>
                                            {row.afternoonCheckin || '—'}
                                        </td>
                                        <td className="mono">{row.lastLogout || '—'}</td>
                                        <td className="mono font-semibold">{formatDuration(row.workDurationMinutes)}</td>
                                        <td className="mono" style={{ color: row.morningLateMinutes > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                            {row.morningLateMinutes > 0 ? `${row.morningLateMinutes}m` : '0'}
                                        </td>
                                        <td className="mono" style={{ color: row.afternoonLateMinutes > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                            {row.afternoonLateMinutes > 0 ? `${row.afternoonLateMinutes}m` : '0'}
                                        </td>
                                        <td>
                                            {row.lateMinutes > 0 ? (
                                                <span className="badge badge-late">+{row.lateMinutes} mins</span>
                                            ) : (
                                                <span style={{ color: "var(--success)", fontSize: "11px", fontWeight: 700 }}>On Time</span>
                                            )}
                                        </td>
                                        <td>
                                            <button 
                                                className="btn btn-default" 
                                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                                onClick={() => openTimeline(row.employeeId, row.date)}
                                            >
                                                Punches ({row.punches ? row.punches.length : 0})
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {pageSize !== "all" && (
                <div className="table-info-bar" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Showing {startIdx + 1} to {endIdx} of {filteredData.length} items</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                        <button 
                            className="btn btn-default" 
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                            disabled={safePage <= 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                            Previous
                        </button>
                        <button 
                            className="btn btn-default" 
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                            disabled={safePage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
