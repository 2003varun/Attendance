// Leave Management Module
import React, { useState } from 'react';
import { useLeave } from '../context/LeaveContext';
import { useAuth } from '../context/AuthContext';
import { KpiCard } from '../components/common/KpiCard';
import { LeaveBalanceWidget } from '../components/leave/LeaveBalanceWidget';
import { ApplyLeaveModal } from '../components/leave/ApplyLeaveModal';
import { LeaveHistoryTable } from '../components/leave/LeaveHistoryTable';
import { LeaveApprovalTable } from '../components/leave/LeaveApprovalTable';

export function LeaveManagement({ onToast }) {
    const { requests, leaveTypes } = useLeave();
    const { isEmployee, isAdmin, isManager, currentUser } = useAuth();

    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(isManager ? "approvals" : "history");

    const pendingCount = requests.filter(r => r.status === "PENDING").length;
    const approvedCount = requests.filter(r => r.status === "APPROVED").length;
    const rejectedCount = requests.filter(r => r.status === "REJECTED").length;

    const totalDaysTaken = requests
        .filter(r => r.status === "APPROVED")
        .reduce((sum, r) => sum + (Number(r.days) || 0), 0);

    return (
        <section className="page-view active">
            <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="section-heading-left">
                    <h2>🏖️ Paid Leave Management</h2>
                    <p>Apply for leaves, track monthly accruals (+1/mo), manage carry-forward balances & approvals</p>
                </div>
                <button className="btn btn-primary" onClick={() => setApplyModalOpen(true)}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Apply Leave
                </button>
            </div>

            {/* Leave Metrics KPI Row */}
            <div className="kpi-grid">
                <KpiCard
                    title="Monthly Entitlement"
                    value="1 day"
                    footer="1 day per employee / month (Carry Forward)"
                    colorClass="kpi-indigo"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                    }
                />

                <KpiCard
                    title="Leave Days Used"
                    value={totalDaysTaken}
                    footer="Approved absences taken"
                    colorClass="kpi-danger"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />

                <KpiCard
                    title="Pending Approvals"
                    value={pendingCount}
                    footer="Awaiting manager signoff"
                    colorClass="kpi-warning"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />

                <KpiCard
                    title="Approved Requests"
                    value={approvedCount}
                    footer={`${rejectedCount} rejected requests`}
                    colorClass="kpi-success"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
            </div>

            {/* Leave Balance Overview for Active User */}
            <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                        🎯 Paid Leave Balance {isEmployee ? `(My Balance — ${currentUser?.name})` : `(Staff Balance)`}
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Policy: 1 day per month entitlement • Unused leave carries forward
                    </span>
                </div>
                <LeaveBalanceWidget employeeId={currentUser?.id} />
            </div>

            {/* Tabs for Views */}
            <div className="tabs-container">
                {isManager && (
                    <button 
                        className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
                        onClick={() => setActiveTab('approvals')}
                    >
                        Pending Approvals {pendingCount > 0 && `(${pendingCount})`}
                    </button>
                )}
                <button 
                    className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    {isEmployee ? "My Leave History" : "All Leave Records"}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'types' ? 'active' : ''}`}
                    onClick={() => setActiveTab('types')}
                >
                    Leave Policy
                </button>
            </div>

            {/* Tab Views */}
            {activeTab === 'approvals' && isManager && (
                <LeaveApprovalTable onToast={onToast} />
            )}

            {activeTab === 'history' && (
                <LeaveHistoryTable onToast={onToast} />
            )}

            {activeTab === 'types' && (
                <div className="table-responsive">
                    <div className="table-info-bar">
                        <div>Supported Company Leave Policies & Allocations</div>
                    </div>
                    <div className="table-scroll-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Leave Type</th>
                                    <th>Annual Allocation</th>
                                    <th>Description</th>
                                    <th>Weekend/Holiday Deduction</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveTypes.map(t => (
                                    <tr key={t.id}>
                                        <td className="mono font-semibold">{t.id}</td>
                                        <td className="font-semibold">{t.name}</td>
                                        <td className="mono font-semibold" style={{ color: "var(--primary)" }}>
                                            {t.defaultAllocated === 0 ? "Unlimited" : `${t.defaultAllocated} Days`}
                                        </td>
                                        <td style={{ color: "var(--text-secondary)", fontSize: "12.5px" }}>{t.description}</td>
                                        <td>
                                            <span className="badge badge-full">
                                                <span className="badge-dot"></span>
                                                Excluded Automatically
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Apply Leave Modal */}
            <ApplyLeaveModal
                isOpen={applyModalOpen}
                onClose={() => setApplyModalOpen(false)}
                onSuccess={(msg) => {
                    if (onToast) onToast(msg, "success");
                }}
            />
        </section>
    );
}
