// Attendance Storage & Recalculation Service
import { DEFAULT_RULES, analyzePunches, evaluateAttendanceStatus } from '../utils/attendanceParser';

const STORAGE_KEY = "attendance_os_v2_data";

export const attendanceService = {
    load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && saved.rawData && saved.rawData.length > 0) {
                return {
                    rawData: saved.rawData,
                    rules: saved.rules ? { ...DEFAULT_RULES, ...saved.rules } : DEFAULT_RULES
                };
            }
        } catch (e) {
            console.error("Failed to restore attendance from localStorage", e);
        }
        return { rawData: [], rules: DEFAULT_RULES };
    },

    save(rawData, rules) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ rawData, rules }));
        } catch (e) {
            console.error("Failed to save attendance state", e);
        }
    },

    clear() {
        localStorage.removeItem(STORAGE_KEY);
    },

    /**
     * Re-evaluates all raw records against current shift rules, holidays, and approved leaves
     */
    recalculateRecords(records, rules, approvedLeaves = [], holidays = []) {
        if (!records || records.length === 0) return [];
        const holidaySet = new Set((holidays || []).map(h => h.date));

        return records.map(r => {
            const hasApprovedLeave = approvedLeaves.some(l => 
                String(l.employeeId) === String(r.employeeId) &&
                l.status === 'APPROVED' &&
                l.startDate <= r.date && l.endDate >= r.date
            );
            const isHoliday = holidaySet.has(r.date);

            const analysis = analyzePunches(r.punches || [
                { time: r.firstLogin, minutes: r.firstLogin ? Number(r.firstLogin.split(":")[0])*60 + Number(r.firstLogin.split(":")[1]) : null },
                { time: r.lastLogout, minutes: r.lastLogout ? Number(r.lastLogout.split(":")[0])*60 + Number(r.lastLogout.split(":")[1]) : null }
            ].filter(x => x.minutes !== null), rules);

            const evalResult = evaluateAttendanceStatus(analysis, r.date, rules, hasApprovedLeave, isHoliday);

            return {
                ...r,
                status: evalResult.status,
                morningLateMinutes: evalResult.morningLateMinutes,
                afternoonLateMinutes: evalResult.afternoonLateMinutes,
                lateMinutes: evalResult.lateMinutes,
                lateCount: evalResult.lateCount
            };
        });
    }
};
