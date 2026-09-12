// Leave History Table Component
import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateDisplay } from '../../utils/dateUtils';

export function LeaveHistoryTable({ onToast }) {
    const { requests, cancelLeave } = useLeave();
    const { isEmployee, currentUser } = useAuth();
    const [statusTab, setStatusTab] = useState("ALL");

    const displayedRequests = requests.filter(r => {
        if (isEmployee && String(r.employeeId) !== String(currentUser?.id)) return false;
        if (statusTab !== "ALL" && r.status !== statusTab) return false;
        return true;
    });

    const handleCancel = (id) => {
        if (window.confirm("Are you sure you want to cancel this pending leave request?")) {
            cancelLeave(id);
            if (onToast) onToast("Leave request cancelled", "info");
        }
    };

    const getStatusBadge = (status) => {
        if (status === "APPROVED") return "badge-approved";
        if (status === "REJECTED") return "badge-rejected";
        if (status === "PENDING") return "badge-pending";
        return "badge-cancelled";
    };

    return (
        <div className="table-responsive">
            <div className="table-info-bar" style={{ flexWrap: "wrap", gap: "10px" }}>
                <div className="tabs-container" style={{ margin: 0, border: "none", padding: 0 }}>
                    {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map(tab => (
                        <button
                            key={tab}
                            className={`tab-btn ${statusTab === tab ? 'active' : ''}`}
                            onClick={() => setStatusTab(tab)}
                            style={{ padding: "4px 12px", fontSize: "12px" }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Total {displayedRequests.length} applications
                </div>
            </div>

            <div className="table-scroll-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            {!isEmployee && <th>Employee</th>}
                            <th>Leave Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Days</th>
                            <th>Reason</th>
                            <th>Applied On</th>
                            <th>Status</th>
                            <th>Decision / Remarks</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedRequests.length === 0 ? (
                            <tr>
                                <td colSpan={isEmployee ? 9 : 10} style={{ textAlign: "center", padding: "36px", color: "var(--text-muted)" }}>
                                    No leave requests found.
                                </td>
                            </tr>
                        ) : (
                            displayedRequests.map(req => (
                                <tr key={req.id}>
                                    {!isEmployee && (
                                        <td>
                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                <span className="mono font-semibold" style={{ color: "var(--text-primary)" }}>{req.employeeId}</span>
                                                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{req.employeeName}</span>
                                            </div>
                                        </td>
                                    )}
                                    <td className="font-semibold">{req.leaveType}</td>
                                    <td className="mono">{formatDateDisplay(req.startDate)}</td>
                                    <td className="mono">{formatDateDisplay(req.endDate)}</td>
                                    <td className="mono font-semibold" style={{ color: "var(--primary)" }}>{req.days} d</td>
                                    <td style={{ maxWidth: "220px", whiteSpace: "normal", fontSize: "12px", color: "var(--text-secondary)" }}>
                                        {req.reason}
                                    </td>
                                    <td className="mono" style={{ fontSize: "12px" }}>{req.appliedDate}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(req.status)}`}>
                                            <span className="badge-dot"></span>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                        {req.status === "APPROVED" && (req.approvedBy ? `Approved by ${req.approvedBy}` : "Approved")}
                                        {req.status === "REJECTED" && (
                                            <span style={{ color: "var(--danger)" }}>
                                                Rejected: {req.rejectionReason || "No reason given"}
                                            </span>
                                        )}
                                        {req.status === "PENDING" && "Awaiting supervisor review"}
                                        {req.status === "CANCELLED" && "Cancelled by employee"}
                                    </td>
                                    <td>
                                        {req.status === "PENDING" && (
                                            <button 
                                                className="btn btn-danger" 
                                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                                onClick={() => handleCancel(req.id)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
