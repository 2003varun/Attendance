// Top 10 Late Employees Horizontal Bar Chart
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export function TopLateChart({ rawData }) {
    const canvasRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !rawData.length) return;

        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const textColor = isDark ? "#94a3b8" : "#475569";
        const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

        const empLateMap = new Map();
        rawData.forEach(r => {
            const cur = empLateMap.get(r.employeeId) || 0;
            empLateMap.set(r.employeeId, cur + (r.lateMinutes || 0));
        });
        const sortedLate = Array.from(empLateMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = canvasRef.current.getContext("2d");
        chartInstance.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels: sortedLate.map(x => `Employee ${x[0]}`),
                datasets: [{
                    label: "Total Late Minutes",
                    data: sortedLate.map(x => x[1]),
                    backgroundColor: "#f59e0b",
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { grid: { display: false }, ticks: { color: textColor } }
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
                    <div className="panel-title">Top 10 Late Employees (Minutes)</div>
                    <div className="panel-subtitle">Cumulative delayed arrival minutes</div>
                </div>
            </div>
            <div className="chart-container">
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
}
