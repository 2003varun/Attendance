// Paid Leave Balance Card Component with Monthly Accrual & Carry-Forward Tracking
import React from 'react';
import { useLeave } from '../../context/LeaveContext';
import { useAuth } from '../../context/AuthContext';

export function LeaveBalanceWidget({ employeeId }) {
    const { getBalances } = useLeave();
    const { currentUser } = useAuth();

    const empId = employeeId || currentUser?.employeeId || currentUser?.id || "TEMP-001";
    const balances = getBalances(empId) || {};

    const paidLeaveBal = balances["Paid Leave"] || balances["Monthly Leave"] || {
        allocated: 1.0,
        total: 1.0,
        accrued: 1.0,
        used: 0.0,
        pending: 0.0,
        available: 1.0,
        remaining: 1.0
    };

    const accrued = paidLeaveBal.accrued ?? paidLeaveBal.total ?? paidLeaveBal.allocated ?? 1.0;
    const used = paidLeaveBal.used ?? 0.0;
    const pending = paidLeaveBal.pending ?? 0.0;
    const available = Math.max(0, paidLeaveBal.available ?? paidLeaveBal.remaining ?? 0);

    return (
        <div className="leave-balance-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <div className="leave-card type-cl" style={{ borderLeft: '4px solid var(--primary, #3b82f6)' }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                            Paid Leave
                        </span>
                        <span className="badge badge-approved" style={{ fontSize: "11px", fontWeight: 700 }}>
                            Policy: +1 Day / Month (Carry-Forward)
                        </span>
                    </div>
                    <span className="badge badge-off" style={{ fontWeight: 800 }}>PL</span>
                </div>

                <div style={{ marginTop: "14px", display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ fontSize: "36px", fontWeight: 800, color: "var(--primary, #3b82f6)", fontFamily: "var(--font-mono)" }}>
                        {available}
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>
                        day(s) available
                    </span>
                </div>

                <div className="leave-stat-row" style={{
                    marginTop: "16px",
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "8px",
                    borderTop: "1px solid var(--border-light)",
                    paddingTop: "12px"
                }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>Accrued</span>
                        <strong style={{ fontSize: "14px", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                            {accrued} d
                        </strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>Used</span>
                        <strong style={{ fontSize: "14px", color: (used > 0 ? "var(--danger)" : "var(--text-secondary)"), fontFamily: "var(--font-mono)" }}>
                            {used} d
                        </strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>Pending</span>
                        <strong style={{ fontSize: "14px", color: (pending > 0 ? "var(--warning)" : "var(--text-secondary)"), fontFamily: "var(--font-mono)" }}>
                            {pending} d
                        </strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>Available</span>
                        <strong style={{ fontSize: "14px", color: (available > 0 ? "var(--success)" : "var(--danger)"), fontFamily: "var(--font-mono)" }}>
                            {available} d
                        </strong>
                    </div>
                </div>
            </div>
        </div>
    );
}
