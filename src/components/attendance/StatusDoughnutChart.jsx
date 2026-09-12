// Overall Attendance Status Breakdown Donut Chart
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export function StatusDoughnutChart({ rawData }) {
    const canvasRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !rawData.length) return;

        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const textColor = isDark ? "#94a3b8" : "#475569";

        const fullTotal = rawData.filter(r => r.status === "FULL DAY PRESENT").length;
        const mornTotal = rawData.filter(r => r.status === "PRESENT IN THE MORNING").length;
        const aftTotal = rawData.filter(r => r.status === "PRESENT IN THE AFTERNOON").length;
        const leaveTotal = rawData.filter(r => r.status === "ON LEAVE").length;
        const absTotal = rawData.filter(r => r.status === "ABSENT").length;
        const offTotal = rawData.filter(r => r.status === "SUNDAY / WEEKLY OFF").length;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = canvasRef.current.getContext("2d");
        chartInstance.current = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Full Day", "Morning Half", "Afternoon Half", "On Leave", "Absent", "Weekly Off"],
                datasets: [{
                    data: [fullTotal, mornTotal, aftTotal, leaveTotal, absTotal, offTotal],
                    backgroundColor: ["#10b981", "#6366f1", "#8b5cf6", "#06b6d4", "#ef4444", "#94a3b8"],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right",
                        labels: { color: textColor, font: { family: "Plus Jakarta Sans" } }
                    }
                },
                cutout: "68%"
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
                    <div className="panel-title">Status Breakdown</div>
                    <div className="panel-subtitle">Overall attendance and leave share %</div>
                </div>
            </div>
            <div className="chart-container">
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
}
