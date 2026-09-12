// Leave Balance Cards Widget Component
import React from 'react';
import { useLeave } from '../../context/LeaveContext';
import { useAuth } from '../../context/AuthContext';

export function LeaveBalanceWidget({ employeeId }) {
    const { getBalances } = useLeave();
    const { currentUser } = useAuth();

    const empId = employeeId || currentUser?.id || "378";
    const balances = getBalances(empId);

    const typeConfig = {
        "Casual Leave": { code: "CL", class: "type-cl" },
        "Sick Leave": { code: "SL", class: "type-sl" },
        "Earned Leave": { code: "EL", class: "type-el" },
        "Unpaid Leave": { code: "UL", class: "type-ul" }
    };

    return (
        <div className="leave-balance-grid">
            {Object.entries(balances).map(([typeName, bal]) => {
                const conf = typeConfig[typeName] || { code: "LV", class: "type-cl" };
                const isUnpaid = typeName === "Unpaid Leave";

                return (
                    <div key={typeName} className={`leave-card ${conf.class}`}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                                {typeName}
                            </span>
                            <span className="badge badge-off" style={{ fontWeight: 800 }}>{conf.code}</span>
                        </div>

                        <div style={{ marginTop: "12px", display: "flex", alignItems: "baseline", gap: "6px" }}>
                            <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                                {isUnpaid ? bal.used : bal.remaining}
                            </span>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                                {isUnpaid ? "days taken" : "days left"}
                            </span>
                        </div>

                        {!isUnpaid && (
                            <div className="leave-stat-row">
                                <span style={{ color: "var(--text-muted)" }}>
                                    Allocated: <strong style={{ color: "var(--text-primary)" }}>{bal.allocated}</strong>
                                </span>
                                <span style={{ color: "var(--text-muted)" }}>
                                    Used: <strong style={{ color: "var(--danger)" }}>{bal.used}</strong>
                                </span>
                                <span style={{ color: "var(--text-muted)" }}>
                                    Remaining: <strong style={{ color: "var(--success)" }}>{bal.remaining}</strong>
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
