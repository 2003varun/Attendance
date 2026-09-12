// Punch Timeline Modal Dialog
import React from 'react';
import { Modal } from '../common/Modal';
import { useAttendance } from '../../context/AttendanceContext';
import { formatDateDisplay } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/timeUtils';

export function PunchTimelineModal() {
    const { timelineModal, closeTimeline } = useAttendance();
    const { open, record } = timelineModal;

    if (!record) return null;

    const punches = record.punches || [];

    return (
        <Modal
            isOpen={open}
            onClose={closeTimeline}
            title={`Employee ${record.employeeId} — ${formatDateDisplay(record.date)}`}
            subtitle={`${record.day} • Status: ${record.status} • Work Duration: ${formatDuration(record.workDurationMinutes)}`}
            footer={
                <button className="btn btn-primary" onClick={closeTimeline}>
                    Close
                </button>
            }
        >
            {punches.length === 0 ? (
                <div style={{ padding: "20px", background: "var(--border-light)", borderRadius: "var(--radius-md)", fontSize: "13px" }}>
                    <div><strong>First Punch:</strong> {record.firstLogin || 'None'}</div>
                    <div style={{ marginTop: "4px" }}><strong>Last Punch:</strong> {record.lastLogout || 'None'}</div>
                    <div style={{ marginTop: "4px" }}><strong>Late Duration:</strong> {record.lateMinutes || 0} minutes</div>
                </div>
            ) : (
                <div className="punch-timeline">
                    {punches.map((p, i) => (
                        <div key={i} className="timeline-item">
                            <div className="timeline-dot"></div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong>Punch #{i + 1}</strong>
                                <span className="mono font-semibold" style={{ color: "var(--primary)", fontSize: "14px" }}>
                                    {p.time}
                                </span>
                            </div>
                            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                                Device Log Line #{p.line || '—'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
