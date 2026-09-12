// Leave Approval Management Table Component (Admin & Manager)
import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateDisplay } from '../../utils/dateUtils';
import { Modal } from '../common/Modal';

export function LeaveApprovalTable({ onToast }) {
    const { requests, approveLeave, rejectLeave } = useLeave();
    const { currentUser } = useAuth();

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedReq, setSelectedReq] = useState(null);
    const [rejectReason, setRejectReason] = useState("");

    const pendingRequests = requests.filter(r => r.status === "PENDING");

    const handleApprove = (req) => {
        const approver = currentUser ? `${currentUser.name} (${currentUser.designation || 'Manager'})` : "Admin Supervisor";
        approveLeave(req.id, approver);
        if (onToast) onToast(`Approved ${req.leaveType} for ${req.employeeName}`, "success");
    };

    const openRejectModal = (req) => {
        setSelectedReq(req);
        setRejectReason("");
        setRejectModalOpen(true);
    };

    const confirmReject = (e) => {
        e.preventDefault();
        if (!selectedReq) return;
        const rejector = currentUser ? `${currentUser.name}` : "Admin";
        rejectLeave(selectedReq.id, rejectReason.trim() || "Operational workload requirements", rejector);
        setRejectModalOpen(false);
        if (onToast) onToast(`Rejected leave request for ${selectedReq.employeeName}`, "info");
    };

    return (
        <div className="table-responsive">
            <div className="table-info-bar">
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    Pending Leave Requests Awaiting Action ({pendingRequests.length})
                </div>
            </div>

            <div className="table-scroll-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Employee ID</th>
                            <th>Employee Name</th>
                            <th>Department</th>
                            <th>Leave Type</th>
                            <th>Duration</th>
                            <th>Days</th>
                            <th>Reason</th>
                            <th>Applied On</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingRequests.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                                    ✅ No pending leave requests to review.
                                </td>
                            </tr>
                        ) : (
                            pendingRequests.map(req => (
                                <tr key={req.id}>
                                    <td className="mono font-semibold">{req.employeeId}</td>
                                    <td className="font-semibold">{req.employeeName}</td>
                                    <td>
                                        <span className="badge badge-off">{req.department || "General"}</span>
                                    </td>
                                    <td>
                                        <span className="badge badge-pending">
                                            <span className="badge-dot"></span>
                                            {req.leaveType}
                                        </span>
                                    </td>
                                    <td className="mono" style={{ fontSize: "12px" }}>
                                        {formatDateDisplay(req.startDate)} → {formatDateDisplay(req.endDate)}
                                    </td>
                                    <td className="mono font-semibold" style={{ color: "var(--primary)" }}>
                                        {req.days} d
                                    </td>
                                    <td style={{ maxWidth: "240px", whiteSpace: "normal", fontSize: "12.5px" }}>
                                        {req.reason}
                                    </td>
                                    <td className="mono" style={{ fontSize: "12px" }}>
                                        {req.appliedDate}
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                        <div style={{ display: "inline-flex", gap: "8px" }}>
                                            <button 
                                                className="btn btn-success" 
                                                style={{ padding: "5px 12px", fontSize: "12px" }}
                                                onClick={() => handleApprove(req)}
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                className="btn btn-danger" 
                                                style={{ padding: "5px 12px", fontSize: "12px" }}
                                                onClick={() => openRejectModal(req)}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Rejection Modal */}
            <Modal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                title="Reject Leave Request"
                subtitle={selectedReq ? `For ${selectedReq.employeeName} (${selectedReq.leaveType} • ${selectedReq.days} days)` : ""}
            >
                <form onSubmit={confirmReject}>
                    <div className="filter-group" style={{ marginBottom: "20px" }}>
                        <label className="filter-label">Reason for Rejection *</label>
                        <textarea
                            className="input-field"
                            style={{ height: "90px", padding: "10px", resize: "vertical" }}
                            placeholder="State reason for rejecting this leave request..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button type="button" className="btn btn-default" onClick={() => setRejectModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-danger">
                            Confirm Rejection
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
