// Master Punch Records Page
import React from 'react';
import { AttendanceFilterBar } from '../components/attendance/AttendanceFilterBar';
import { AttendanceTable } from '../components/attendance/AttendanceTable';
import { PunchTimelineModal } from '../components/attendance/PunchTimelineModal';

export function Records() {
    return (
        <section className="page-view active">
            <div className="section-heading">
                <div className="section-heading-left">
                    <h2>📋 Master Attendance Records</h2>
                    <p>All employee punch logs, shift calculations, working hours, late minutes & leave statuses</p>
                </div>
            </div>

            {/* Filters Toolbar */}
            <AttendanceFilterBar />

            {/* Records Data Table */}
            <AttendanceTable />

            {/* Punch Breakdown Modal */}
            <PunchTimelineModal />
        </section>
    );
}
