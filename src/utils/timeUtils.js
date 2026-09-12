// Time & String formatting utilities

export function minutesToTime(m) {
    if (m === null || m === undefined || isNaN(m)) return "";
    const h = Math.floor(m / 60);
    const min = m % 60;
    return String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");
}

export function timeStringToMinutes(str) {
    if (!str) return null;
    const match = String(str).match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

export function formatDuration(mins) {
    if (!mins || isNaN(mins) || mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}
