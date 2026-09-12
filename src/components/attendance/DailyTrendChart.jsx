// Daily Attendance Trends Stacked Bar Chart
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { formatDateDisplay } from '../../utils/dateUtils';

export function DailyTrendChart({ rawData }) {
    const canvasRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !rawData.length) return;

        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const textColor = isDark ? "#94a3b8" : "#475569";
        const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

        const dateMap = new Map();
        rawData.forEach(r => {
            if (!dateMap.has(r.date)) {
                dateMap.set(r.date, { full: 0, morn: 0, aft: 0, leave: 0, abs: 0 });
            }
            const cur = dateMap.get(r.date);
            if (r.status === "FULL DAY PRESENT") cur.full++;
            else if (r.status === "PRESENT IN THE MORNING") cur.morn++;
            else if (r.status === "PRESENT IN THE AFTERNOON") cur.aft++;
            else if (r.status === "ON LEAVE") cur.leave++;
            else if (r.status === "ABSENT") cur.abs++;
        });

        const dates = Array.from(dateMap.keys()).sort();
        const fullData = dates.map(d => dateMap.get(d).full);
        const mornData = dates.map(d => dateMap.get(d).morn);
        const aftData = dates.map(d => dateMap.get(d).aft);
        const leaveData = dates.map(d => dateMap.get(d).leave);

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = canvasRef.current.getContext("2d");
        chartInstance.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels: dates.map(d => formatDateDisplay(d)),
                datasets: [
                    { label: "Full Day", data: fullData, backgroundColor: "#10b981", borderRadius: 4 },
                    { label: "Morning", data: mornData, backgroundColor: "#6366f1", borderRadius: 4 },
                    { label: "Afternoon", data: aftData, backgroundColor: "#8b5cf6", borderRadius: 4 },
                    { label: "On Leave", data: leaveData, backgroundColor: "#06b6d4", borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        labels: { color: textColor, font: { family: "Plus Jakarta Sans" } }
                    }
                },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: textColor } },
                    y: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor } }
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
                    <div className="panel-title">Daily Attendance Trends</div>
                    <div className="panel-subtitle">Day-by-day presence distribution breakdown</div>
                </div>
            </div>
            <div className="chart-container">
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
}
