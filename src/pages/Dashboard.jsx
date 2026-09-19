import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { useLeave } from '../context/LeaveContext';
import { KpiCard } from '../components/common/KpiCard';
import { DailyTrendChart } from '../components/attendance/DailyTrendChart';
import { StatusDoughnutChart } from '../components/attendance/StatusDoughnutChart';
import { TopLateChart } from '../components/attendance/TopLateChart';
import { ArrivalCurveChart } from '../components/attendance/ArrivalCurveChart';
import { formatDuration, minutesToTime } from '../utils/timeUtils';
import { getApiUrl } from '../utils/apiConfig';

export function Dashboard() {
    const { rawData, filteredData, rules } = useAttendance();
    const { requests } = useLeave();
    const [dbStats, setDbStats] = useState(null);

    useEffect(() => {
        let isMounted = true;
        fetch(getApiUrl('/api/dashboard/stats'))
            .then(res => res.json())
            .then(json => {
                if (isMounted && json.success) {
                    setDbStats(json);
                }
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, [filteredData.length]);

    const activeStaff = dbStats ? dbStats.totalStaff : new Set(filteredData.map(r => r.employeeId)).size;
    const fullCount = filteredData.filter(r => r.status === "FULL DAY PRESENT").length;
    const mornCount = filteredData.filter(r => r.status === "PRESENT IN THE MORNING").length;
    const aftCount = filteredData.filter(r => r.status === "PRESENT IN THE AFTERNOON").length;
    const onLeaveCount = filteredData.filter(r => r.status === "ON LEAVE").length;
    const absentCount = filteredData.filter(r => r.status === "ABSENT").length;
    const lateList = filteredData.filter(r => (r.lateMinutes || 0) > 0);
    const totalLateMins = lateList.reduce((acc, r) => acc + (r.lateMinutes || 0), 0);

    const pendingLeaves = requests.filter(r => r.status === "PENDING").length;
    const approvedLeaves = requests.filter(r => r.status === "APPROVED").length;

    return (
        <section className="page-view active">
            <div className="section-heading">
                <div className="section-heading-left">
                    <h2>📊 Executive Analytics & Metrics</h2>
                    <p>Real-time attendance KPIs, visual presence distributions & integrated leave intelligence</p>
                </div>
            </div>

            {/* Attendance & Leave KPI Metric Summary Row */}
            <div className="kpi-grid">
                <KpiCard
                    title="Total Staff"
                    value={activeStaff}
                    footer="Active SQL employees"
                    colorClass="kpi-indigo"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                    }
                />

                <KpiCard
                    title="Full Day Present"
                    value={fullCount}
                    footer="Complete shifts logged"
                    colorClass="kpi-success"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />

                <KpiCard
                    title="Morning Half"
                    value={mornCount}
                    footer="Morning half-days"
                    colorClass="kpi-cyan"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    }
                />

                <KpiCard
                    title="Afternoon Half"
                    value={aftCount}
                    footer="Afternoon half-days"
                    colorClass="kpi-purple"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    }
                />

                <KpiCard
                    title="On Leave"
                    value={onLeaveCount}
                    footer="Approved leave days"
                    colorClass="kpi-cyan"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                    }
                />

                <KpiCard
                    title="Absent Days"
                    value={absentCount}
                    footer="Zero punch & no leave"
                    colorClass="kpi-danger"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />

                <KpiCard
                    title="Late Incidents"
                    value={lateList.length}
                    footer={`${totalLateMins} late mins (${formatDuration(totalLateMins)})`}
                    colorClass="kpi-warning"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />

                <KpiCard
                    title="Pending Leaves"
                    value={pendingLeaves}
                    footer={`${approvedLeaves} approved leaves`}
                    colorClass="kpi-indigo"
                    icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
            </div>

            {/* Shift Rules Summary Bar */}
            <div className="timing-rules-panel" style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div className="panel-title" style={{ fontSize: "14px" }}>
                            🕒 Active Shift Configuration & Timing Thresholds
                        </div>
                        <div className="panel-subtitle">Grace periods, lunch punch limits & required shift length</div>
                    </div>
                </div>

                <div className="rules-grid">
                    <div className="rule-card">
                        <span className="rule-card-label">Shift Start Time</span>
                        <span className="rule-card-value">{minutesToTime(rules.morningStart)} AM</span>
                    </div>
                    <div className="rule-card">
                        <span className="rule-card-label">Morning Grace Cutoff</span>
                        <span className="rule-card-value">{minutesToTime(rules.morningGrace)} AM</span>
                    </div>
                    <div className="rule-card">
                        <span className="rule-card-label">Half Day Limit</span>
                        <span className="rule-card-value">{minutesToTime(rules.morningHalfLimit)} AM</span>
                    </div>
                    <div className="rule-card">
                        <span className="rule-card-label">Lunch Checkout</span>
                        <span className="rule-card-value">{minutesToTime(rules.lunchCheckout)} PM</span>
                    </div>
                    <div className="rule-card">
                        <span className="rule-card-label">Lunch Checkin</span>
                        <span className="rule-card-value">{minutesToTime(rules.lunchCheckin)} PM</span>
                    </div>
                    <div className="rule-card">
                        <span className="rule-card-label">Required Full Shift</span>
                        <span className="rule-card-value">{rules.fullDayHours} Hours</span>
                    </div>
                </div>
            </div>

            {/* Charts Grid Row 1 */}
            <div className="dash-grid">
                <DailyTrendChart rawData={rawData} />
                <StatusDoughnutChart rawData={rawData} />
            </div>

            {/* Charts Grid Row 2 */}
            <div className="dash-grid">
                <TopLateChart rawData={rawData} />
                <ArrivalCurveChart rawData={rawData} />
            </div>
        </section>
    );
}
