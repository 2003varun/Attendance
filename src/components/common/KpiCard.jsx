// KPI Summary Card Component
import React from 'react';

export function KpiCard({ title, value, footer, colorClass = "kpi-indigo", icon }) {
    return (
        <div className={`kpi-card ${colorClass}`}>
            <div className="kpi-header">
                <span className="kpi-title">{title}</span>
                {icon && <div className="kpi-icon-badge">{icon}</div>}
            </div>
            <div className="kpi-value">{value}</div>
            {footer && <div className="kpi-footer">{footer}</div>}
        </div>
    );
}
