// Biometric, DAT, CSV parser and attendance rules evaluator
import { minutesToTime, timeStringToMinutes } from './timeUtils';
import { getDayOfWeek, generateFullDateRange } from './dateUtils';

export const DEFAULT_RULES = {
    morningStart: 9 * 60 + 30,       // 09:30 AM
    morningGrace: 9 * 60 + 35,       // 09:35 AM
    morningHalfLimit: 10 * 60 + 30,  // 10:30 AM
    lunchCheckout: 13 * 60 + 55,     // 01:55 PM
    lunchCheckin: 14 * 60 + 30,      // 02:30 PM
    fullDayHours: 8
};

export function analyzePunches(punchesList, rules = DEFAULT_RULES) {
    const sorted = [...punchesList].sort((a, b) => a.minutes - b.minutes);
    const firstMinutes = sorted.length ? sorted[0].minutes : null;
    const lastMinutes = sorted.length ? sorted[sorted.length - 1].minutes : null;

    const afternoonPunches = sorted.filter(p => p.minutes >= rules.lunchCheckout);
    const afternoonCheckout = afternoonPunches.length > 0 ? afternoonPunches[0].minutes : null;
    const afternoonCheckin = afternoonPunches.length > 1 ? afternoonPunches[1].minutes : null;

    let workMinutes = 0;
    if (firstMinutes !== null && lastMinutes !== null && lastMinutes > firstMinutes) {
        workMinutes = lastMinutes - firstMinutes;
    }

    return {
        firstMinutes,
        lastMinutes,
        afternoonCheckout,
        afternoonCheckin,
        workMinutes,
        allPunches: sorted
    };
}

/**
 * Evaluates attendance status taking into account punches, holidays, and approved leaves.
 * Priority: Holiday -> Approved Leave -> Punched Attendance -> Sunday Off -> Absent
 */
export function evaluateAttendanceStatus(analysis, dateStr, rules = DEFAULT_RULES, hasApprovedLeave = false, isHoliday = false) {
    const { firstMinutes, lastMinutes, afternoonCheckin } = analysis;
    const hasPunches = (firstMinutes !== null || lastMinutes !== null);

    // 1. Holiday Check
    if (isHoliday && !hasPunches) {
        return {
            status: "HOLIDAY",
            morningLateMinutes: 0,
            afternoonLateMinutes: 0,
            lateMinutes: 0,
            lateCount: 0
        };
    }

    // 2. Approved Leave Check
    if (hasApprovedLeave && !hasPunches) {
        return {
            status: "ON LEAVE",
            morningLateMinutes: 0,
            afternoonLateMinutes: 0,
            lateMinutes: 0,
            lateCount: 0
        };
    }

    // 3. Punch Evaluation
    let status = "ABSENT";
    if (!hasPunches) {
        status = "ABSENT";
    } else if (firstMinutes > rules.morningHalfLimit) {
        status = "PRESENT IN THE AFTERNOON";
    } else if (firstMinutes < rules.lunchCheckout && lastMinutes <= rules.lunchCheckout) {
        status = "PRESENT IN THE MORNING";
    } else if (firstMinutes >= rules.lunchCheckin) {
        status = "PRESENT IN THE AFTERNOON";
    } else if (firstMinutes < rules.lunchCheckout && lastMinutes >= rules.lunchCheckin) {
        status = "FULL DAY PRESENT";
    } else {
        status = "FULL DAY PRESENT";
    }

    // Sunday / Weekly Off check
    if (dateStr) {
        const dt = new Date(dateStr + "T12:00:00");
        if (dt.getDay() === 0 && (status === "ABSENT" || !hasPunches)) {
            status = "SUNDAY / WEEKLY OFF";
        }
    }

    // Late calculations
    let morningLateMinutes = 0;
    if (firstMinutes !== null && firstMinutes > rules.morningGrace && status !== "SUNDAY / WEEKLY OFF" && status !== "HOLIDAY" && status !== "ON LEAVE") {
        morningLateMinutes = firstMinutes - rules.morningStart;
    }

    let afternoonLateMinutes = 0;
    if (afternoonCheckin !== null && afternoonCheckin > rules.lunchCheckin && status !== "SUNDAY / WEEKLY OFF" && status !== "HOLIDAY" && status !== "ON LEAVE") {
        afternoonLateMinutes = afternoonCheckin - rules.lunchCheckin;
    }

    const totalLateMinutes = morningLateMinutes + afternoonLateMinutes;
    let lateCount = 0;
    if (morningLateMinutes > 0) lateCount++;
    if (afternoonLateMinutes > 0) lateCount++;

    return {
        status,
        morningLateMinutes,
        afternoonLateMinutes,
        lateMinutes: totalLateMinutes,
        lateCount
    };
}

export function parseBiometricRawText(text, rules = DEFAULT_RULES, approvedLeaves = [], holidays = []) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const punches = [];

    lines.forEach((line, index) => {
        const clean = line.trim();
        if (!clean) return;

        // Format: EmployeeID Date Time
        const match = clean.match(/^\s*(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)/);
        if (match) {
            const empId = match[1];
            const date = match[2];
            const time = match[3];
            const minutes = timeStringToMinutes(time);
            if (minutes !== null) {
                punches.push({
                    employeeId: empId,
                    date: date,
                    time: time,
                    minutes: minutes,
                    line: index + 1
                });
            }
        }
    });

    if (punches.length === 0) {
        return { records: [], rawLines: lines, punchCount: 0 };
    }

    // Group punches by Employee + Date
    const grouped = new Map();
    punches.forEach(p => {
        const key = `${p.employeeId}|${p.date}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(p);
    });

    const allEmpIds = Array.from(new Set(punches.map(p => p.employeeId))).sort((a, b) => Number(a) - Number(b));
    const rawDates = Array.from(new Set(punches.map(p => p.date))).sort();
    const minDate = rawDates[0];
    const maxDate = rawDates[rawDates.length - 1];
    const allCalendarDates = generateFullDateRange(minDate, maxDate);

    const holidaySet = new Set((holidays || []).map(h => h.date));
    const fullRecords = [];
    let recordIndex = 1;

    allCalendarDates.forEach(date => {
        const dayName = getDayOfWeek(date);
        const isSunday = (new Date(date + "T12:00:00").getDay() === 0);
        const isHoliday = holidaySet.has(date);

        allEmpIds.forEach(empId => {
            const key = `${empId}|${date}`;
            const punchesList = grouped.get(key) || [];
            const hasApprovedLeave = approvedLeaves.some(l => 
                String(l.employeeId) === String(empId) &&
                l.status === 'APPROVED' &&
                l.startDate <= date && l.endDate >= date
            );

            const analysis = analyzePunches(punchesList, rules);
            const evalResult = evaluateAttendanceStatus(analysis, date, rules, hasApprovedLeave, isHoliday);

            let firstLogin = "";
            let afternoonCheckout = "";
            let afternoonCheckin = "";
            let lastLogout = "";

            if (punchesList.length > 0) {
                firstLogin = minutesToTime(analysis.firstMinutes);
                afternoonCheckout = minutesToTime(analysis.afternoonCheckout);
                afternoonCheckin = minutesToTime(analysis.afternoonCheckin);
                lastLogout = minutesToTime(analysis.lastMinutes);
            }

            fullRecords.push({
                _index: recordIndex++,
                date: date,
                day: dayName,
                employeeId: empId,
                employeeName: `Emp #${empId}`,
                status: evalResult.status,
                firstLogin: firstLogin,
                afternoonCheckout: afternoonCheckout,
                afternoonCheckin: afternoonCheckin,
                lastLogout: lastLogout,
                workDurationMinutes: analysis.workMinutes,
                morningLateMinutes: evalResult.morningLateMinutes,
                afternoonLateMinutes: evalResult.afternoonLateMinutes,
                lateMinutes: evalResult.lateMinutes,
                lateCount: evalResult.lateCount,
                punches: punchesList
            });
        });
    });

    return {
        records: fullRecords.sort((a, b) => a.date.localeCompare(b.date) || Number(a.employeeId) - Number(b.employeeId)),
        rawLines: lines,
        punchCount: punches.length
    };
}

export function parseCSVText(text, rules = DEFAULT_RULES, approvedLeaves = [], holidays = []) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim().length > 0);
    if (lines.length < 2) {
        return { records: [], rawLines: lines, punchCount: 0 };
    }

    const headerRow = lines[0].toLowerCase().split(",").map(h => h.replace(/["']/g, "").trim());
    const parsedRows = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map(c => c.replace(/["']/g, "").trim());
        if (row.length < 3) continue;

        const obj = {};
        headerRow.forEach((h, idx) => { obj[h] = row[idx] || ""; });

        const dateVal = obj["date"] || "";
        let standardDate = dateVal;
        const dMatch = dateVal.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
        if (dMatch) {
            const months = { jan:"01", feb:"02", mar:"03", apr:"04", may:"05", jun:"06", jul:"07", aug:"08", sep:"09", oct:"10", nov:"11", dec:"12" };
            const mNum = months[dMatch[2].toLowerCase()] || "01";
            standardDate = `${dMatch[3]}-${mNum}-${String(dMatch[1]).padStart(2, "0")}`;
        }

        const empId = obj["employee id"] || obj["empid"] || obj["id"] || `EMP-${i}`;
        const empName = obj["employee name"] || obj["name"] || `Emp #${empId}`;
        const firstIn = obj["first login"] || obj["login"] || "";
        const lastOut = obj["last logout"] || obj["logout"] || "";

        const firstMins = timeStringToMinutes(firstIn);
        const lastMins = timeStringToMinutes(lastOut);
        const analysis = {
            firstMinutes: firstMins,
            lastMinutes: lastMins,
            afternoonCheckout: timeStringToMinutes(obj["afternoon check-out"] || obj["lunch out"]),
            afternoonCheckin: timeStringToMinutes(obj["afternoon check-in"] || obj["lunch in"]),
            workMinutes: (firstMins && lastMins && lastMins > firstMins) ? (lastMins - firstMins) : 0,
            allPunches: []
        };

        const hasApprovedLeave = approvedLeaves.some(l => 
            String(l.employeeId) === String(empId) &&
            l.status === 'APPROVED' &&
            l.startDate <= standardDate && l.endDate >= standardDate
        );

        const holidaySet = new Set((holidays || []).map(h => h.date));
        const isHoliday = holidaySet.has(standardDate);
        const evalResult = evaluateAttendanceStatus(analysis, standardDate, rules, hasApprovedLeave, isHoliday);

        parsedRows.push({
            date: standardDate,
            day: getDayOfWeek(standardDate),
            employeeId: empId,
            employeeName: empName,
            status: obj["attendance status"] || evalResult.status,
            firstLogin: firstIn,
            afternoonCheckout: obj["afternoon check-out"] || "",
            afternoonCheckin: obj["afternoon check-in"] || "",
            lastLogout: lastOut,
            workDurationMinutes: analysis.workMinutes,
            morningLateMinutes: Number(obj["morning late minutes"]) || evalResult.morningLateMinutes,
            afternoonLateMinutes: Number(obj["afternoon late minutes"]) || evalResult.afternoonLateMinutes,
            lateMinutes: Number(obj["late minutes"]) || evalResult.lateMinutes,
            lateCount: evalResult.lateCount,
            punches: []
        });
    }

    const existingMap = new Map();
    parsedRows.forEach(r => existingMap.set(`${r.employeeId}|${r.date}`, r));

    const allEmpIds = Array.from(new Set(parsedRows.map(p => p.employeeId))).sort((a, b) => Number(a) - Number(b));
    const allDates = Array.from(new Set(parsedRows.map(p => p.date))).sort();
    const minDate = allDates[0];
    const maxDate = allDates[allDates.length - 1];
    const allCalendarDates = generateFullDateRange(minDate, maxDate);

    const fullRecords = [];
    let idx = 1;

    allCalendarDates.forEach(date => {
        const dayName = getDayOfWeek(date);
        const isSunday = (new Date(date + "T12:00:00").getDay() === 0);

        allEmpIds.forEach(empId => {
            const key = `${empId}|${date}`;
            const existing = existingMap.get(key);

            if (existing) {
                fullRecords.push({ ...existing, _index: idx++ });
            } else {
                const hasApprovedLeave = approvedLeaves.some(l => 
                    String(l.employeeId) === String(empId) &&
                    l.status === 'APPROVED' &&
                    l.startDate <= date && l.endDate >= date
                );

                let status = isSunday ? "SUNDAY / WEEKLY OFF" : "ABSENT";
                if (hasApprovedLeave) status = "ON LEAVE";

                fullRecords.push({
                    _index: idx++,
                    date: date,
                    day: dayName,
                    employeeId: empId,
                    employeeName: `Emp #${empId}`,
                    status: status,
                    firstLogin: "",
                    afternoonCheckout: "",
                    afternoonCheckin: "",
                    lastLogout: "",
                    workDurationMinutes: 0,
                    morningLateMinutes: 0,
                    afternoonLateMinutes: 0,
                    lateMinutes: 0,
                    lateCount: 0,
                    punches: []
                });
            }
        });
    });

    return {
        records: fullRecords.sort((a, b) => a.date.localeCompare(b.date) || Number(a.employeeId) - Number(b.employeeId)),
        rawLines: lines,
        punchCount: parsedRows.length
    };
}
