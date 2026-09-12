// Morning Arrival Distribution Line Curve
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { timeStringToMinutes } from '../../utils/timeUtils';

export function ArrivalCurveChart({ rawData }) {
    const canvasRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !rawData.length) return;

        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const textColor = isDark ? "#94a3b8" : "#475569";
        const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

        const arrivalBins = { "Before 09:15": 0, "09:15 - 09:30": 0, "09:30 - 09:45": 0, "09:45 - 10:00": 0, "After 10:00": 0 };
        rawData.forEach(r => {
            const mins = timeStringToMinutes(r.firstLogin);
            if (mins === null) return;
            if (mins < 9 * 60 + 15) arrivalBins["Before 09:15"]++;
            else if (mins <= 9 * 60 + 30) arrivalBins["09:15 - 09:30"]++;
            else if (mins <= 9 * 60 + 45) arrivalBins["09:30 - 09:45"]++;
            else if (mins <= 10 * 60) arrivalBins["09:45 - 10:00"]++;
            else arrivalBins["After 10:00"]++;
        });

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = canvasRef.current.getContext("2d");
        chartInstance.current = new Chart(ctx, {
            type: "line",
            data: {
                labels: Object.keys(arrivalBins),
                datasets: [{
                    label: "Logins",
                    data: Object.values(arrivalBins),
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor } }
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [rawData]);

    return (
        <div className="panel-card">
            <div className="panel-header">
                <div>
                    <div className="panel-title">Morning Arrival Distribution</div>
                    <div className="panel-subtitle">Employee punch-in time curve</div>
                </div>
            </div>
            <div className="chart-container">
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
}
