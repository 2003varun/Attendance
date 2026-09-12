// Raw Device Biometric Terminal View Page
import React from 'react';
import { useAttendance } from '../context/AttendanceContext';

export function RawLogs({ onToast }) {
    const { rawLines } = useAttendance();

    const handleCopy = () => {
        if (!rawLines || rawLines.length === 0) {
            if (onToast) onToast("No raw logs available to copy.", "warning");
            return;
        }
        navigator.clipboard.writeText(rawLines.join("\n"));
        if (onToast) onToast("Raw log text copied to clipboard!", "success");
    };

    return (
        <section className="page-view active">
            <div className="section-heading">
                <div className="section-heading-left">
                    <h2>⚙️ Raw Biometric Device Stream</h2>
                    <p>Live terminal preview of biometric device dumps, parsed lines & raw telemetry</p>
                </div>
            </div>

            <div className="panel-card">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">Raw Device Stream</div>
                        <div className="panel-subtitle">
                            {rawLines && rawLines.length > 0 ? `${rawLines.length} total raw device punch lines loaded` : "0 lines"}
                        </div>
                    </div>
                    <button className="btn btn-default" onClick={handleCopy} style={{ padding: "6px 12px", fontSize: "12px" }}>
                        Copy Raw Logs
                    </button>
                </div>

                <div className="raw-terminal">
                    {rawLines && rawLines.length > 0 ? rawLines.slice(0, 500).join("\n") : "No raw device dump loaded."}
                </div>
            </div>
        </section>
    );
}
