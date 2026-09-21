// Leave calculations and validation utilities

/**
 * Calculates number of leave days excluding weekends and company holidays
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - YYYY-MM-DD
 * @param {Array} holidays - array of holiday objects { date: 'YYYY-MM-DD', ... }
 * @param {boolean} excludeWeekends - default true (excludes Sundays)
 */
export function calculateLeaveDays(startDateStr, endDateStr, holidays = [], excludeWeekends = true) {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr + "T12:00:00");
    const end = new Date(endDateStr + "T12:00:00");
    if (isNaN(start) || isNaN(end) || end < start) return 0;

    const holidayDates = new Set((holidays || []).map(h => h.date));
    let count = 0;
    const cur = new Date(start);

    while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;

        const dayOfWeek = cur.getDay();
        const isSunday = (dayOfWeek === 0);
        const isHoliday = holidayDates.has(dateStr);

        // If excludeWeekends is true, Sunday is not counted towards leave days
        if (!(excludeWeekends && isSunday) && !isHoliday) {
            count++;
        }

        cur.setDate(cur.getDate() + 1);
    }

    return count;
}

/**
 * Validates a leave request
 */
export function validateLeaveRequest({
    employeeId,
    leaveType,
    startDate,
    endDate,
    reason,
    existingRequests = [],
    leaveBalances = {},
    holidays = []
}) {
    if (!employeeId) return { valid: false, error: "Please select an employee." };
    if (!leaveType) return { valid: false, error: "Please select a valid leave type." };
    if (!startDate || !endDate) return { valid: false, error: "Please specify both start date and end date." };

    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    if (isNaN(start) || isNaN(end)) return { valid: false, error: "Invalid date format." };
    if (end < start) return { valid: false, error: "End date cannot be earlier than start date." };
    if (!reason || !reason.trim()) return { valid: false, error: "Please provide a reason for the leave request." };

    // Overlapping check
    // Check against pending or approved leaves for the same employee
    const reqStart = startDate;
    const reqEnd = endDate;

    const hasOverlap = existingRequests.some(r => {
        if (String(r.employeeId) !== String(employeeId)) return false;
        if (r.status === 'REJECTED' || r.status === 'CANCELLED') return false;
        // Overlap condition: r.startDate <= reqEnd && r.endDate >= reqStart
        return (r.startDate <= reqEnd && r.endDate >= reqStart);
    });

    if (hasOverlap) {
        return { valid: false, error: "You already have a leave request for this date range." };
    }

    // Calculate requested working days
    const requestedDays = calculateLeaveDays(startDate, endDate, holidays, true);
    if (requestedDays <= 0) {
        return { valid: false, error: "Selected dates only contain holidays or weekly off days." };
    }
    // Per company policy: Employees may submit requests regardless of current balance;
    // Manager decides whether to approve or reject.

    return { valid: true };
}
