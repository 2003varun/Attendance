/* =========================================================
   APPLICATION STATE & CONFIGURATION
========================================================= */
let state = {
    rawData: [],
    filteredData: [],
    rawLines: [],
    activePage: 'dashboard',
    currentPage: 1,
    pageSize: 'all',
    sortCol: 'date',
    sortAsc: false,
    charts: {},
    rules: {
        morningStart: 9 * 60 + 30,       // 09:30 AM
        morningGrace: 9 * 60 + 35,       // 09:35 AM
        morningHalfLimit: 10 * 60 + 30,  // 10:30 AM
        lunchCheckout: 13 * 60 + 55,     // 01:55 PM
        lunchCheckin: 14 * 60 + 30,      // 02:30 PM
        fullDayHours: 8
    }
};

/* =========================================================
   TIME & STRING UTILITIES
========================================================= */
function minutesToTime(m) {
    if (m === null || m === undefined || isNaN(m)) return "";
    const h = Math.floor(m / 60);
    const min = m % 60;
    return String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");
}

function timeStringToMinutes(str) {
    if (!str) return null;
    const match = String(str).match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

function formatDuration(mins) {
    if (!mins || isNaN(mins) || mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parts[2]} ${months[Number(parts[1]) - 1]} ${parts[0]}`;
}

function getDayOfWeek(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00");
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-US", { weekday: "long" });
}

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* =========================================================
   ATTENDANCE EVALUATION LOGIC
========================================================= */
function analyzePunches(punchesList, rules = state.rules) {
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

function evaluateAttendanceStatus(analysis, dateStr, rules = state.rules) {
    const { firstMinutes, lastMinutes, afternoonCheckout, afternoonCheckin } = analysis;
    let status = "ABSENT";

    if (firstMinutes === null && lastMinutes === null) {
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
        if (dt.getDay() === 0 && (status === "ABSENT" || firstMinutes === null)) {
            status = "SUNDAY / WEEKLY OFF";
        }
    }

    // Late calculations
    let morningLateMinutes = 0;
    if (firstMinutes !== null && firstMinutes > rules.morningGrace && status !== "SUNDAY / WEEKLY OFF") {
        morningLateMinutes = firstMinutes - rules.morningStart;
    }

    let afternoonLateMinutes = 0;
    if (afternoonCheckin !== null && afternoonCheckin > rules.lunchCheckin && status !== "SUNDAY / WEEKLY OFF") {
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

function generateFullDateRange(minDateStr, maxDateStr) {
    if (!minDateStr || !maxDateStr) return [];
    const dates = [];
    const cur = new Date(minDateStr + "T12:00:00");
    const end = new Date(maxDateStr + "T12:00:00");
    if (isNaN(cur) || isNaN(end)) return [];

    while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

/* =========================================================
   FILE PARSERS (TXT / DAT / CSV / EXCEL)
========================================================= */
function parseBiometricRawText(text) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    state.rawLines = lines;
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
        showToast("No valid biometric punch records found in file.", "warning");
        return;
    }

    // Group existing punches by Employee + Date
    const grouped = new Map();
    punches.forEach(p => {
        const key = `${p.employeeId}|${p.date}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(p);
    });

    // Determine all unique employees and full date range
    const allEmpIds = Array.from(new Set(punches.map(p => p.employeeId))).sort((a, b) => Number(a) - Number(b));
    const rawDates = Array.from(new Set(punches.map(p => p.date))).sort();
    const minDate = rawDates[0];
    const maxDate = rawDates[rawDates.length - 1];
    const allCalendarDates = generateFullDateRange(minDate, maxDate);

    const fullRecords = [];
    let recordIndex = 1;

    allCalendarDates.forEach(date => {
        const dayName = getDayOfWeek(date);
        const isSunday = (new Date(date + "T12:00:00").getDay() === 0);

        allEmpIds.forEach(empId => {
            const key = `${empId}|${date}`;
            const punchesList = grouped.get(key);

            if (punchesList && punchesList.length > 0) {
                const analysis = analyzePunches(punchesList);
                const evalResult = evaluateAttendanceStatus(analysis, date);

                fullRecords.push({
                    _index: recordIndex++,
                    date: date,
                    day: dayName,
                    employeeId: empId,
                    employeeName: `Emp #${empId}`,
                    status: evalResult.status,
                    firstLogin: minutesToTime(analysis.firstMinutes),
                    afternoonCheckout: minutesToTime(analysis.afternoonCheckout),
                    afternoonCheckin: minutesToTime(analysis.afternoonCheckin),
                    lastLogout: minutesToTime(analysis.lastMinutes),
                    workDurationMinutes: analysis.workMinutes,
                    morningLateMinutes: evalResult.morningLateMinutes,
                    afternoonLateMinutes: evalResult.afternoonLateMinutes,
                    lateMinutes: evalResult.lateMinutes,
                    lateCount: evalResult.lateCount,
                    punches: punchesList
                });
            } else {
                // No punch found for this employee on this date -> Mark as ABSENT or SUNDAY
                const status = isSunday ? "SUNDAY / WEEKLY OFF" : "ABSENT";
                fullRecords.push({
                    _index: recordIndex++,
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

    state.rawData = fullRecords.sort((a, b) => a.date.localeCompare(b.date) || Number(a.employeeId) - Number(b.employeeId));
    state.filteredData = [...state.rawData];
    saveStateToStorage();
    refreshUI();
    showToast(`Loaded ${punches.length} punches (${state.rawData.length} full attendance records generated)`, "success");
}

function parseCSVText(text) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim().length > 0);
    if (lines.length < 2) {
        showToast("CSV file is empty or invalid.", "danger");
        return;
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

        const evalResult = evaluateAttendanceStatus(analysis, standardDate);

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

    // Index existing entries
    const existingMap = new Map();
    parsedRows.forEach(r => {
        existingMap.set(`${r.employeeId}|${r.date}`, r);
    });

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
                const status = isSunday ? "SUNDAY / WEEKLY OFF" : "ABSENT";
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

    state.rawData = fullRecords.sort((a, b) => a.date.localeCompare(b.date) || Number(a.employeeId) - Number(b.employeeId));
    state.filteredData = [...state.rawData];
    saveStateToStorage();
    refreshUI();
    showToast(`Loaded CSV (${state.rawData.length} complete attendance records generated)`, "success");
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const reader = new FileReader();

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: "array" });
                const firstSheet = wb.Sheets[wb.SheetNames[0]];
                const csvContent = XLSX.utils.sheet_to_csv(firstSheet);
                parseCSVText(csvContent);
            } catch (err) {
                showToast("Failed to parse Excel spreadsheet.", "danger");
            }
        };
        reader.readAsArrayBuffer(file);
    } else if (name.endsWith(".csv")) {
        reader.onload = function(e) { parseCSVText(e.target.result); };
        reader.readAsText(file);
    } else {
        // Raw TXT / DAT
        reader.onload = function(e) { parseBiometricRawText(e.target.result); };
        reader.readAsText(file);
    }

    const sideStatus = document.getElementById("sideStatusText");
    if (sideStatus) sideStatus.textContent = file.name.slice(0, 18).toUpperCase();
    const dot = document.getElementById("systemStatusDot");
    if (dot) dot.classList.add("active");
    showPage("dashboard");
}

function processPastedText() {
    const text = document.getElementById("rawTextPaste").value.trim();
    if (!text) {
        showToast("Please paste raw biometric text lines first.", "warning");
        return;
    }
    parseBiometricRawText(text);
    const sideStatus = document.getElementById("sideStatusText");
    if (sideStatus) sideStatus.textContent = "PASTED DATA LOADED";
    const dot = document.getElementById("systemStatusDot");
    if (dot) dot.classList.add("active");
    showPage("dashboard");
}

/* =========================================================
   SAMPLE DEMO DATASET
========================================================= */
const sampleAugustData = `
378	2026-08-01 09:25:06	1	0	3	0
405	2026-08-01 09:28:50	1	0	1	0
428	2026-08-01 09:29:12	1	0	1	0
424	2026-08-01 09:29:33	1	0	1	0
396	2026-08-01 09:33:59	1	0	1	0
75	2026-08-01 09:50:12	1	0	1	0
428	2026-08-01 18:35:10	1	0	1	0
378	2026-08-01 18:45:00	1	0	3	0
378	2026-08-03 09:17:32	1	0	3	0
363	2026-08-03 09:25:31	1	0	1	0
428	2026-08-03 09:26:04	1	0	1	0
424	2026-08-03 09:26:13	1	0	1	0
428	2026-08-03 18:32:00	1	0	1	0
378	2026-08-03 18:42:15	1	0	3	0
378	2026-08-04 09:22:10	1	0	3	0
363	2026-08-04 09:24:40	1	0	1	0
428	2026-08-04 09:28:15	1	0	1	0
405	2026-08-04 09:42:10	1	0	1	0
428	2026-08-04 18:35:10	1	0	1	0
378	2026-08-04 18:40:00	1	0	3	0
378	2026-08-24 09:25:00	1	0	3	0
363	2026-08-24 09:28:00	1	0	1	0
405	2026-08-24 09:30:00	1	0	1	0
378	2026-08-24 18:35:00	1	0	3	0
378	2026-08-25 09:22:00	1	0	3	0
363	2026-08-25 09:27:00	1	0	1	0
405	2026-08-25 09:32:00	1	0	1	0
378	2026-08-25 18:30:00	1	0	3	0
378	2026-08-26 09:24:00	1	0	3	0
363	2026-08-26 09:29:00	1	0	1	0
405	2026-08-26 09:31:00	1	0	1	0
378	2026-08-26 18:32:00	1	0	3	0
378	2026-08-27 09:20:00	1	0	3	0
428	2026-08-27 09:25:00	1	0	1	0
363	2026-08-27 09:28:00	1	0	1	0
428	2026-08-27 18:35:00	1	0	1	0
378	2026-08-27 18:40:00	1	0	3	0
378	2026-08-31 09:20:00	1	0	3	0
428	2026-08-31 09:26:00	1	0	1	0
428	2026-08-31 18:30:00	1	0	1	0
378	2026-08-31 18:35:00	1	0	3	0
`;

function loadDemoDataset(name) {
    parseBiometricRawText(sampleAugustData.trim());
    const sideStatus = document.getElementById("sideStatusText");
    if (sideStatus) sideStatus.textContent = `DEMO ${name.toUpperCase()} LOADED`;
    const dot = document.getElementById("systemStatusDot");
    if (dot) dot.classList.add("active");
    showPage("dashboard");
    showToast(`Loaded ${name.toUpperCase()} demo dataset successfully!`, "success");
}

/* =========================================================
   UI RENDERING & DASHBOARD CHARTS
========================================================= */
function refreshUI() {
    populateEmployeeDropdown();
    renderKPICards();
    renderCharts();
    renderRecordsTable();
    renderEmployeeReport();
    renderDateReport();
    renderMatrixView();
    renderRawTerminal();

    const recBadge = document.getElementById("badgeRecordsCount");
    if (recBadge) recBadge.textContent = state.rawData.length;
    const uniqueEmps = new Set(state.rawData.map(r => r.employeeId));
    const empBadge = document.getElementById("badgeEmpCount");
    if (empBadge) empBadge.textContent = uniqueEmps.size;
}

function renderKPICards() {
    const data = state.filteredData;
    const uniqueEmps = new Set(data.map(r => r.employeeId)).size;
    const fullCount = data.filter(r => r.status === "FULL DAY PRESENT").length;
    const mornCount = data.filter(r => r.status === "PRESENT IN THE MORNING").length;
    const aftCount = data.filter(r => r.status === "PRESENT IN THE AFTERNOON").length;
    const absentCount = data.filter(r => r.status === "ABSENT").length;
    const lateList = data.filter(r => (r.lateMinutes || 0) > 0);
    const totalLateMins = lateList.reduce((acc, r) => acc + (r.lateMinutes || 0), 0);

    const kEmp = document.getElementById("kEmp");
    if (kEmp) kEmp.textContent = uniqueEmps;
    const kFull = document.getElementById("kFull");
    if (kFull) kFull.textContent = fullCount;
    const kMorn = document.getElementById("kMorning");
    if (kMorn) kMorn.textContent = mornCount;
    const kAft = document.getElementById("kAfternoon");
    if (kAft) kAft.textContent = aftCount;
    const kAbs = document.getElementById("kAbsent");
    if (kAbs) kAbs.textContent = absentCount;
    const kLate = document.getElementById("kLateIncidents");
    if (kLate) kLate.textContent = lateList.length;
    const kHint = document.getElementById("kLateMinsHint");
    if (kHint) kHint.textContent = `${totalLateMins} late mins (${formatDuration(totalLateMins)})`;
}

function renderCharts() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#94a3b8" : "#475569";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    // 1. Daily Attendance Trend Chart
    const dateMap = new Map();
    state.rawData.forEach(r => {
        if (!dateMap.has(r.date)) {
            dateMap.set(r.date, { full: 0, morn: 0, aft: 0, abs: 0 });
        }
        const cur = dateMap.get(r.date);
        if (r.status === "FULL DAY PRESENT") cur.full++;
        else if (r.status === "PRESENT IN THE MORNING") cur.morn++;
        else if (r.status === "PRESENT IN THE AFTERNOON") cur.aft++;
        else if (r.status === "ABSENT") cur.abs++;
    });

    const dates = Array.from(dateMap.keys()).sort();
    const fullData = dates.map(d => dateMap.get(d).full);
    const mornData = dates.map(d => dateMap.get(d).morn);
    const aftData = dates.map(d => dateMap.get(d).aft);

    if (state.charts.daily) state.charts.daily.destroy();
    const dailyCanvas = document.getElementById("dailyChart");
    if (dailyCanvas) {
        state.charts.daily = new Chart(dailyCanvas.getContext("2d"), {
            type: "bar",
            data: {
                labels: dates.map(d => formatDateDisplay(d)),
                datasets: [
                    { label: "Full Day", data: fullData, backgroundColor: "#10b981", borderRadius: 4 },
                    { label: "Morning", data: mornData, backgroundColor: "#6366f1", borderRadius: 4 },
                    { label: "Afternoon", data: aftData, backgroundColor: "#8b5cf6", borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "top", labels: { color: textColor, font: { family: "Plus Jakarta Sans" } } }
                },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: textColor } },
                    y: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor } }
                }
            }
        });
    }

    // 2. Status Breakdown Donut
    const fullTotal = state.rawData.filter(r => r.status === "FULL DAY PRESENT").length;
    const mornTotal = state.rawData.filter(r => r.status === "PRESENT IN THE MORNING").length;
    const aftTotal = state.rawData.filter(r => r.status === "PRESENT IN THE AFTERNOON").length;
    const absTotal = state.rawData.filter(r => r.status === "ABSENT").length;
    const offTotal = state.rawData.filter(r => r.status === "SUNDAY / WEEKLY OFF").length;

    if (state.charts.status) state.charts.status.destroy();
    const statusCanvas = document.getElementById("statusChart");
    if (statusCanvas) {
        state.charts.status = new Chart(statusCanvas.getContext("2d"), {
            type: "doughnut",
            data: {
                labels: ["Full Day", "Morning Half", "Afternoon Half", "Absent", "Weekly Off"],
                datasets: [{
                    data: [fullTotal, mornTotal, aftTotal, absTotal, offTotal],
                    backgroundColor: ["#10b981", "#6366f1", "#8b5cf6", "#ef4444", "#94a3b8"],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "right", labels: { color: textColor, font: { family: "Plus Jakarta Sans" } } }
                },
                cutout: "68%"
            }
        });
    }

    // 3. Top Late Employees Horizontal Bar
    const empLateMap = new Map();
    state.rawData.forEach(r => {
        const cur = empLateMap.get(r.employeeId) || 0;
        empLateMap.set(r.employeeId, cur + (r.lateMinutes || 0));
    });
    const sortedLate = Array.from(empLateMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (state.charts.late) state.charts.late.destroy();
    const lateCanvas = document.getElementById("lateChart");
    if (lateCanvas) {
        state.charts.late = new Chart(lateCanvas.getContext("2d"), {
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
    }

    // 4. Arrival Curve / Density
    const arrivalBins = { "Before 09:15": 0, "09:15 - 09:30": 0, "09:30 - 09:45": 0, "09:45 - 10:00": 0, "After 10:00": 0 };
    state.rawData.forEach(r => {
        const mins = timeStringToMinutes(r.firstLogin);
        if (mins === null) return;
        if (mins < 9 * 60 + 15) arrivalBins["Before 09:15"]++;
        else if (mins <= 9 * 60 + 30) arrivalBins["09:15 - 09:30"]++;
        else if (mins <= 9 * 60 + 45) arrivalBins["09:30 - 09:45"]++;
        else if (mins <= 10 * 60) arrivalBins["09:45 - 10:00"]++;
        else arrivalBins["After 10:00"]++;
    });

    if (state.charts.arrival) state.charts.arrival.destroy();
    const arrCanvas = document.getElementById("arrivalCurveChart");
    if (arrCanvas) {
        state.charts.arrival = new Chart(arrCanvas.getContext("2d"), {
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
    }
}

/* =========================================================
   RECORDS TABLE & PAGINATION
========================================================= */
function renderRecordsTable() {
    const tbody = document.getElementById("recordsTableBody");
    if (!tbody) return;
    const data = state.filteredData;
    const filterInfo = document.getElementById("filterInfoText");
    if (filterInfo) filterInfo.textContent = `Showing ${data.length} filtered records`;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:48px; color:var(--text-muted);">No records match your filters.</td></tr>`;
        const range = document.getElementById("pageRangeText");
        if (range) range.textContent = "Page 0 of 0";
        return;
    }

    const totalPages = state.pageSize === "all" ? 1 : Math.ceil(data.length / state.pageSize);
    state.currentPage = Math.min(Math.max(1, state.currentPage), totalPages);

    const startIdx = state.pageSize === "all" ? 0 : (state.currentPage - 1) * state.pageSize;
    const endIdx = state.pageSize === "all" ? data.length : Math.min(startIdx + state.pageSize, data.length);
    const pageData = data.slice(startIdx, endIdx);

    const range = document.getElementById("pageRangeText");
    if (range) range.textContent = `Page ${state.currentPage} of ${totalPages} (${data.length} items)`;
    const prevBtn = document.getElementById("prevPageBtn");
    if (prevBtn) prevBtn.disabled = state.currentPage <= 1;
    const nextBtn = document.getElementById("nextPageBtn");
    if (nextBtn) nextBtn.disabled = state.currentPage >= totalPages;

    tbody.innerHTML = pageData.map((row, idx) => {
        let badgeClass = "badge-full";
        if (row.status === "PRESENT IN THE MORNING") badgeClass = "badge-morning";
        else if (row.status === "PRESENT IN THE AFTERNOON") badgeClass = "badge-afternoon";
        else if (row.status === "ABSENT") badgeClass = "badge-absent";
        else if (row.status === "SUNDAY / WEEKLY OFF") badgeClass = "badge-off";

        const isWeekend = row.day === "Sunday" || row.day === "Saturday";

        return `
            <tr>
                <td class="mono font-semibold">${formatDateDisplay(row.date)}</td>
                <td style="color:${isWeekend ? 'var(--warning-dark)' : 'inherit'}; font-weight:${isWeekend ? '700' : '500'}">${row.day}</td>
                <td>
                    <span class="mono font-semibold" style="font-size:13.5px; color:var(--text-primary);">${row.employeeId}</span>
                </td>
                <td>
                    <span class="badge ${badgeClass}">
                        <span class="badge-dot"></span>
                        ${row.status}
                    </span>
                </td>
                <td class="mono font-semibold" style="color:${row.morningLateMinutes > 0 ? 'var(--danger)' : 'inherit'};">
                    ${row.firstLogin || '—'}
                </td>
                <td class="mono">${row.afternoonCheckout || '—'}</td>
                <td class="mono" style="color:${row.afternoonLateMinutes > 0 ? 'var(--danger)' : 'inherit'};">
                    ${row.afternoonCheckin || '—'}
                </td>
                <td class="mono">${row.lastLogout || '—'}</td>
                <td class="mono font-semibold">${formatDuration(row.workDurationMinutes)}</td>
                <td class="mono" style="color:${row.morningLateMinutes > 0 ? 'var(--danger)' : 'var(--text-muted)'};">
                    ${row.morningLateMinutes > 0 ? `${row.morningLateMinutes}m` : '0'}
                </td>
                <td class="mono" style="color:${row.afternoonLateMinutes > 0 ? 'var(--danger)' : 'var(--text-muted)'};">
                    ${row.afternoonLateMinutes > 0 ? `${row.afternoonLateMinutes}m` : '0'}
                </td>
                <td>
                    ${row.lateMinutes > 0 ? `<span class="badge badge-late">+${row.lateMinutes} mins</span>` : `<span style="color:var(--success); font-size:11px; font-weight:700;">On Time</span>`}
                </td>
                <td>
                    <button class="btn btn-default" style="padding:4px 8px; font-size:11px;" onclick="openTimelineModal('${row.employeeId}', '${row.date}')">
                        Punches (${row.punches ? row.punches.length : 0})
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
   EMPLOYEE REPORT VIEW
========================================================= */
function renderEmployeeReport() {
    const tbody = document.getElementById("employeeTableBody");
    if (!tbody) return;
    const empMap = new Map();

    state.rawData.forEach(r => {
        if (!empMap.has(r.employeeId)) {
            empMap.set(r.employeeId, {
                id: r.employeeId,
                name: r.employeeName,
                totalDays: 0,
                fullDays: 0,
                morningDays: 0,
                afternoonDays: 0,
                absentDays: 0,
                lateDays: 0,
                lateMinutes: 0
            });
        }
        const cur = empMap.get(r.employeeId);
        cur.totalDays++;
        if (r.status === "FULL DAY PRESENT") cur.fullDays++;
        else if (r.status === "PRESENT IN THE MORNING") cur.morningDays++;
        else if (r.status === "PRESENT IN THE AFTERNOON") cur.afternoonDays++;
        else if (r.status === "ABSENT") cur.absentDays++;

        if (r.lateMinutes > 0) {
            cur.lateDays++;
            cur.lateMinutes += r.lateMinutes;
        }
    });

    const list = Array.from(empMap.values()).sort((a, b) => Number(a.id) - Number(b.id));

    tbody.innerHTML = list.map(emp => {
        const equivPresent = emp.fullDays + (emp.morningDays * 0.5) + (emp.afternoonDays * 0.5);
        const attPercent = emp.totalDays > 0 ? Math.round((equivPresent / emp.totalDays) * 100) : 0;

        return `
            <tr>
                <td>
                    <span class="mono font-semibold" style="font-size:13.5px; color:var(--text-primary);">${emp.id}</span>
                </td>
                <td class="mono font-semibold" style="color:var(--success);">${emp.fullDays}</td>
                <td class="mono">${emp.morningDays}</td>
                <td class="mono">${emp.afternoonDays}</td>
                <td class="mono" style="color:var(--danger);">${emp.absentDays}</td>
                <td class="mono font-semibold">${equivPresent.toFixed(1)}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="flex:1; height:6px; background:var(--border-light); border-radius:99px; overflow:hidden; min-width:60px;">
                            <div style="width:${attPercent}%; height:100%; background:${attPercent > 80 ? 'var(--success)' : attPercent > 50 ? 'var(--warning)' : 'var(--danger)'}; border-radius:99px;"></div>
                        </div>
                        <span class="mono font-semibold" style="font-size:12px;">${attPercent}%</span>
                    </div>
                </td>
                <td class="mono font-semibold" style="color:${emp.lateDays > 0 ? 'var(--warning-dark)' : 'inherit'};">${emp.lateDays}</td>
                <td class="mono font-semibold" style="color:${emp.lateMinutes > 0 ? 'var(--danger)' : 'inherit'};">${emp.lateMinutes}m</td>
                <td>
                    <button class="btn btn-default" style="padding:4px 8px; font-size:11px;" onclick="filterByEmployee('${emp.id}')">
                        Filter Records
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
   DATE-WISE REPORT VIEW
========================================================= */
function renderDateReport() {
    const tbody = document.getElementById("dateTableBody");
    if (!tbody) return;
    const dateMap = new Map();

    state.rawData.forEach(r => {
        if (!dateMap.has(r.date)) {
            dateMap.set(r.date, {
                date: r.date,
                day: r.day,
                totalEmps: 0,
                full: 0,
                morn: 0,
                aft: 0,
                abs: 0,
                off: 0,
                lateCount: 0,
                lateMins: 0
            });
        }
        const cur = dateMap.get(r.date);
        cur.totalEmps++;
        if (r.status === "FULL DAY PRESENT") cur.full++;
        else if (r.status === "PRESENT IN THE MORNING") cur.morn++;
        else if (r.status === "PRESENT IN THE AFTERNOON") cur.aft++;
        else if (r.status === "ABSENT") cur.abs++;
        else if (r.status === "SUNDAY / WEEKLY OFF") cur.off++;

        if (r.lateMinutes > 0) {
            cur.lateCount++;
            cur.lateMins += r.lateMinutes;
        }
    });

    const list = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    tbody.innerHTML = list.map(d => {
        const presentCount = d.full + d.morn + d.aft;
        const rate = d.totalEmps > 0 ? Math.round((presentCount / d.totalEmps) * 100) : 0;
        const isWeekend = d.day === "Sunday" || d.day === "Saturday";

        return `
            <tr>
                <td class="mono font-semibold">${formatDateDisplay(d.date)}</td>
                <td style="color:${isWeekend ? 'var(--warning-dark)' : 'inherit'}; font-weight:${isWeekend ? '700' : '500'}">${d.day}</td>
                <td class="mono">${d.totalEmps}</td>
                <td class="mono font-semibold" style="color:var(--success);">${d.full}</td>
                <td class="mono">${d.morn}</td>
                <td class="mono">${d.aft}</td>
                <td class="mono" style="color:var(--danger);">${d.abs}</td>
                <td class="mono" style="color:var(--text-muted);">${d.off}</td>
                <td class="mono font-semibold" style="color:${d.lateCount > 0 ? 'var(--warning-dark)' : 'inherit'};">${d.lateCount}</td>
                <td class="mono font-semibold" style="color:${d.lateMins > 0 ? 'var(--danger)' : 'inherit'};">${d.lateMins}m</td>
                <td>
                    <span class="badge ${rate >= 75 ? 'badge-full' : rate >= 50 ? 'badge-late' : 'badge-absent'}">
                        ${rate}% Present
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
   MONTHLY MATRIX VIEW
========================================================= */
function renderMatrixView() {
    const container = document.getElementById("matrixContainer");
    if (!container) return;
    if (state.rawData.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:48px; color:var(--text-muted);">Load attendance data to view matrix grid.</div>`;
        return;
    }

    const dates = Array.from(new Set(state.rawData.map(r => r.date))).sort();
    const emps = Array.from(new Set(state.rawData.map(r => r.employeeId))).sort((a, b) => Number(a) - Number(b));

    const recordLookup = new Map();
    const empNameMap = new Map();

    state.rawData.forEach(r => {
        recordLookup.set(`${r.employeeId}|${r.date}`, r);
        if (!empNameMap.has(r.employeeId) && r.employeeName) {
            empNameMap.set(r.employeeId, r.employeeName);
        }
    });

    let html = `
        <table class="matrix-table">
            <thead>
                <tr>
                    <th class="emp-name-col">Employee (ID & Name)</th>
                    ${dates.map(d => `<th>${d.split("-")[2]}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
    `;

    emps.forEach(empId => {
        const rawName = empNameMap.get(empId);
        const displayName = (rawName && rawName !== empId && !rawName.startsWith("Emp #"))
            ? rawName
            : `Employee ${empId}`;

        html += `<tr>
            <td class="emp-name-col">
                <div style="display:flex; flex-direction:column; line-height:1.25; gap:1px;">
                    <span class="mono font-semibold" style="color:var(--text-primary); font-size:12.5px;">${empId}</span>
                    <span style="font-size:11px; color:var(--text-secondary); font-weight:500;">${displayName}</span>
                </div>
            </td>`;
        dates.forEach(d => {
            const rec = recordLookup.get(`${empId}|${d}`);
            let cellClass = "m-wo";
            let text = "—";
            if (rec) {
                if (rec.status === "FULL DAY PRESENT") { cellClass = "m-p"; text = "P"; }
                else if (rec.status === "PRESENT IN THE MORNING") { cellClass = "m-m"; text = "M"; }
                else if (rec.status === "PRESENT IN THE AFTERNOON") { cellClass = "m-a"; text = "A"; }
                else if (rec.status === "ABSENT") { cellClass = "m-ab"; text = "AB"; }
                else if (rec.status === "SUNDAY / WEEKLY OFF") { cellClass = "m-wo"; text = "WO"; }
            }
            html += `<td><span class="m-cell ${cellClass}">${text}</span></td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/* =========================================================
   RAW TERMINAL LOGS
========================================================= */
function renderRawTerminal() {
    const terminal = document.getElementById("rawPreviewTerminal");
    const meta = document.getElementById("rawMetaText");
    if (!terminal) return;
    if (state.rawLines && state.rawLines.length > 0) {
        terminal.textContent = state.rawLines.slice(0, 500).join("\n");
        if (meta) meta.textContent = `${state.rawLines.length} total raw device punch lines loaded`;
    } else {
        terminal.textContent = "No raw device dump loaded.";
        if (meta) meta.textContent = "0 lines";
    }
}

function copyRawLogs() {
    if (!state.rawLines.length) {
        showToast("No raw logs available to copy.", "warning");
        return;
    }
    navigator.clipboard.writeText(state.rawLines.join("\n"));
    showToast("Raw log text copied to clipboard!", "success");
}

/* =========================================================
   FILTERING & SORTING LOGIC
========================================================= */
function populateEmployeeDropdown() {
    const select = document.getElementById("employeeFilter");
    if (!select) return;
    const emps = Array.from(new Set(state.rawData.map(r => r.employeeId))).sort((a, b) => Number(a) - Number(b));
    const currentVal = select.value;

    select.innerHTML = `<option value="">All Employees (${emps.length})</option>` +
        emps.map(e => `<option value="${e}">${e}</option>`).join("");
    select.value = currentVal;
}

function applyFilters() {
    const search = document.getElementById("searchInput").value.toLowerCase().trim();
    const dateVal = document.getElementById("dateFilter").value;
    const statusVal = document.getElementById("statusFilter").value;
    const empVal = document.getElementById("employeeFilter").value;
    const lateOnly = document.getElementById("lateOnlyFilter").checked;

    state.filteredData = state.rawData.filter(r => {
        if (search && !r.employeeId.toLowerCase().includes(search) && !(r.employeeName || '').toLowerCase().includes(search)) return false;
        if (dateVal && r.date !== dateVal) return false;
        if (statusVal && r.status !== statusVal) return false;
        if (empVal && r.employeeId !== empVal) return false;
        if (lateOnly && (r.lateMinutes || 0) <= 0) return false;
        return true;
    });

    state.currentPage = 1;
    renderKPICards();
    renderRecordsTable();
}

function resetFilters() {
    document.getElementById("searchInput").value = "";
    document.getElementById("dateFilter").value = "";
    document.getElementById("statusFilter").value = "";
    document.getElementById("employeeFilter").value = "";
    document.getElementById("lateOnlyFilter").checked = false;
    state.filteredData = [...state.rawData];
    state.currentPage = 1;
    renderKPICards();
    renderRecordsTable();
    showToast("Filters reset to default", "info");
}

function filterByEmployee(empId) {
    const empSelect = document.getElementById("employeeFilter");
    if (empSelect) empSelect.value = empId;
    showPage("records");
    applyFilters();
}

function sortTable(col) {
    if (state.sortCol === col) {
        state.sortAsc = !state.sortAsc;
    } else {
        state.sortCol = col;
        state.sortAsc = true;
    }

    state.filteredData.sort((a, b) => {
        let vA = a[col] ?? "";
        let vB = b[col] ?? "";
        if (typeof vA === "number" && typeof vB === "number") {
            return state.sortAsc ? vA - vB : vB - vA;
        }
        return state.sortAsc ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
    });

    renderRecordsTable();
}

function changePageSize() {
    const val = document.getElementById("pageSizeSelect").value;
    state.pageSize = val === "all" ? "all" : Number(val);
    state.currentPage = 1;
    renderRecordsTable();
}

function prevPage() {
    if (state.currentPage > 1) {
        state.currentPage--;
        renderRecordsTable();
    }
}

function nextPage() {
    state.currentPage++;
    renderRecordsTable();
}

/* =========================================================
   TIMELINE MODAL
========================================================= */
function openTimelineModal(empId, dateStr) {
    const rec = state.rawData.find(r => r.employeeId === empId && r.date === dateStr);
    if (!rec) return;

    document.getElementById("modalEmpTitle").textContent = `Employee ${empId} — ${formatDateDisplay(dateStr)}`;
    document.getElementById("modalEmpSub").textContent = `${rec.day} • Status: ${rec.status} • Work Duration: ${formatDuration(rec.workDurationMinutes)}`;

    const body = document.getElementById("modalTimelineBody");
    if (!rec.punches || rec.punches.length === 0) {
        body.innerHTML = `
            <div style="padding:20px; background:var(--border-light); border-radius:var(--radius-md); font-size:13px;">
                <div><strong>First Punch:</strong> ${rec.firstLogin || 'None'}</div>
                <div style="margin-top:4px;"><strong>Last Punch:</strong> ${rec.lastLogout || 'None'}</div>
                <div style="margin-top:4px;"><strong>Late Duration:</strong> ${rec.lateMinutes || 0} minutes</div>
            </div>
        `;
    } else {
        body.innerHTML = `
            <div class="punch-timeline">
                ${rec.punches.map((p, i) => `
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong>Punch #${i + 1}</strong>
                            <span class="mono font-semibold" style="color:var(--primary); font-size:14px;">${p.time}</span>
                        </div>
                        <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">
                            Device Log Line #${p.line || '—'}
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    document.getElementById("timelineModal").classList.add("open");
}

function closeModal() {
    document.getElementById("timelineModal").classList.remove("open");
}

/* =========================================================
   SHIFT RULES CONFIGURATION
========================================================= */
function saveShiftRules(e) {
    e.preventDefault();
    const morningStart = timeStringToMinutes(document.getElementById("cfgMorningStart").value);
    const morningGrace = timeStringToMinutes(document.getElementById("cfgMorningGrace").value);
    const morningHalfLimit = timeStringToMinutes(document.getElementById("cfgMorningHalfLimit").value);
    const lunchCheckout = timeStringToMinutes(document.getElementById("cfgLunchCheckout").value);
    const lunchCheckin = timeStringToMinutes(document.getElementById("cfgLunchCheckin").value);
    const fullDayHours = Number(document.getElementById("cfgFullDayHours").value) || 8;

    state.rules = {
        morningStart,
        morningGrace,
        morningHalfLimit,
        lunchCheckout,
        lunchCheckin,
        fullDayHours
    };

    // Update display cards
    const dispMorn = document.getElementById("dispMorningStart");
    if (dispMorn) dispMorn.textContent = minutesToTime(morningStart);
    const dispGrace = document.getElementById("dispMorningGrace");
    if (dispGrace) dispGrace.textContent = minutesToTime(morningGrace);
    const dispLOut = document.getElementById("dispLunchCheckout");
    if (dispLOut) dispLOut.textContent = minutesToTime(lunchCheckout);
    const dispLIn = document.getElementById("dispLunchCheckin");
    if (dispLIn) dispLIn.textContent = minutesToTime(lunchCheckin);

    // Re-evaluate all loaded records
    if (state.rawData.length > 0) {
        state.rawData = state.rawData.map(r => {
            const analysis = analyzePunches(r.punches || [
                { time: r.firstLogin, minutes: timeStringToMinutes(r.firstLogin) },
                { time: r.lastLogout, minutes: timeStringToMinutes(r.lastLogout) }
            ].filter(x => x.minutes !== null), state.rules);

            const evalResult = evaluateAttendanceStatus(analysis, r.date, state.rules);
            return {
                ...r,
                status: evalResult.status,
                morningLateMinutes: evalResult.morningLateMinutes,
                afternoonLateMinutes: evalResult.afternoonLateMinutes,
                lateMinutes: evalResult.lateMinutes,
                lateCount: evalResult.lateCount
            };
        });
        state.filteredData = [...state.rawData];
    }

    saveStateToStorage();
    refreshUI();
    showPage("dashboard");
    showToast("Shift timing rules updated & all records recalculated!", "success");
}

function resetDefaultRules() {
    document.getElementById("cfgMorningStart").value = "09:30";
    document.getElementById("cfgMorningGrace").value = "09:35";
    document.getElementById("cfgMorningHalfLimit").value = "10:30";
    document.getElementById("cfgLunchCheckout").value = "13:55";
    document.getElementById("cfgLunchCheckin").value = "14:30";
    document.getElementById("cfgFullDayHours").value = "8";
}

/* =========================================================
   CSV & EXCEL EXPORTS
========================================================= */
function exportFilteredCSV() {
    if (!state.filteredData.length) {
        showToast("No data available to export.", "warning");
        return;
    }

    const headers = ["Date", "Day", "Employee ID", "Employee Name", "Status", "First In", "Lunch Out", "Lunch In", "Last Out", "Work Duration (Mins)", "Morning Late Mins", "Afternoon Late Mins", "Total Late Mins"];
    const rows = [headers, ...state.filteredData.map(r => [
        r.date, r.day, r.employeeId, r.employeeName || "", r.status, r.firstLogin, r.afternoonCheckout, r.afternoonCheckin, r.lastLogout, r.workDurationMinutes, r.morningLateMinutes, r.afternoonLateMinutes, r.lateMinutes
    ])];

    const csvStr = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported filtered CSV file", "success");
}

function exportEmployeeSummaryCSV() {
    if (!state.rawData.length) {
        showToast("No data available to export.", "warning");
        return;
    }

    const empMap = new Map();
    state.rawData.forEach(r => {
        if (!empMap.has(r.employeeId)) {
            empMap.set(r.employeeId, { id: r.employeeId, name: r.employeeName, total: 0, full: 0, morn: 0, aft: 0, abs: 0, lateMins: 0 });
        }
        const cur = empMap.get(r.employeeId);
        cur.total++;
        if (r.status === "FULL DAY PRESENT") cur.full++;
        else if (r.status === "PRESENT IN THE MORNING") cur.morn++;
        else if (r.status === "PRESENT IN THE AFTERNOON") cur.aft++;
        else if (r.status === "ABSENT") cur.abs++;
        cur.lateMins += (r.lateMinutes || 0);
    });

    const headers = ["Employee ID", "Employee Name", "Total Days", "Full Days", "Morning Half", "Afternoon Half", "Absent Days", "Equivalent Present", "Attendance %", "Total Late Mins"];
    const rows = [headers, ...Array.from(empMap.values()).map(e => {
        const equiv = e.full + (e.morn * 0.5) + (e.aft * 0.5);
        const pct = e.total > 0 ? Math.round((equiv / e.total) * 100) : 0;
        return [e.id, e.name || "", e.total, e.full, e.morn, e.aft, e.abs, equiv.toFixed(1), `${pct}%`, e.lateMins];
    })];

    const csvStr = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported employee summary CSV", "success");
}

/* =========================================================
   NAVIGATION & STATE STORAGE
========================================================= */
function showPage(pageId) {
    state.activePage = pageId;
    document.querySelectorAll(".page-view").forEach(p => p.classList.remove("active"));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add("active");

    document.querySelectorAll(".nav-menu button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.page === pageId);
    });

    const titles = {
        dashboard: "Attendance Analytics Dashboard",
        records: "Master Punch Records",
        employees: "Employee Performance & Timesheets",
        dates: "Daily Roll Call & Roster",
        matrix: "Monthly Attendance Matrix Grid",
        raw: "Raw Device Biometric Stream",
        upload: "Biometric Data Ingestion Hub"
    };
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = titles[pageId] || "Attendance OS";
}

function clearData() {
    if (!confirm("Are you sure you want to clear all loaded attendance records?")) return;
    state.rawData = [];
    state.filteredData = [];
    state.rawLines = [];
    localStorage.removeItem("attendance_os_v2_data");
    const sideStatus = document.getElementById("sideStatusText");
    if (sideStatus) sideStatus.textContent = "NO DATA LOADED";
    const dot = document.getElementById("systemStatusDot");
    if (dot) dot.classList.remove("active");
    refreshUI();
    showToast("Attendance workspace cleared", "info");
}

function saveStateToStorage() {
    try {
        localStorage.setItem("attendance_os_v2_data", JSON.stringify({
            rawData: state.rawData,
            rules: state.rules
        }));
    } catch (e) {
        console.error("Failed to save to localStorage", e);
    }
}

function restoreStateFromStorage() {
    try {
        const saved = JSON.parse(localStorage.getItem("attendance_os_v2_data"));
        if (saved && saved.rawData && saved.rawData.length > 0) {
            state.rawData = saved.rawData;
            state.filteredData = [...state.rawData];
            if (saved.rules) state.rules = { ...state.rules, ...saved.rules };
            const sideStatus = document.getElementById("sideStatusText");
            if (sideStatus) sideStatus.textContent = "SAVED DATA RESTORED";
            const dot = document.getElementById("systemStatusDot");
            if (dot) dot.classList.add("active");
            refreshUI();
        }
    } catch (e) {
        console.error("Failed to restore state", e);
    }
}

/* =========================================================
   THEME SWITCHER
========================================================= */
function initTheme() {
    const savedTheme = localStorage.getItem("attendance_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);

    const toggleBtn = document.getElementById("themeToggleBtn");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const current = document.documentElement.getAttribute("data-theme");
            const next = current === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem("attendance_theme", next);
            updateThemeIcon(next);
            renderCharts();
        });
    }
}

function updateThemeIcon(theme) {
    const icon = document.getElementById("themeIcon");
    if (!icon) return;
    if (theme === "dark") {
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />`;
    } else {
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />`;
    }
}

/* =========================================================
   INITIALIZATION & EVENT LISTENERS
========================================================= */
window.addEventListener("DOMContentLoaded", () => {
    initTheme();

    document.querySelectorAll(".nav-menu button").forEach(button => {
        button.addEventListener("click", () => showPage(button.dataset.page));
    });

    // Drag & Drop
    const dropZone = document.getElementById("dropZone");
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
            document.body.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length) {
                handleFileUpload({ target: { files: files } });
            }
        });
    }

    restoreStateFromStorage();
    if (state.rawData.length === 0) {
        loadDemoDataset('august');
    }
});
