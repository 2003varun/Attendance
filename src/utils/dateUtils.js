// Date formatting and range helpers

export function formatDateDisplay(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parts[2]} ${months[Number(parts[1]) - 1]} ${parts[0]}`;
}

export function getDayOfWeek(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00");
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-US", { weekday: "long" });
}

export function generateFullDateRange(minDateStr, maxDateStr) {
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

export function isWeekend(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr + "T12:00:00");
    const day = d.getDay();
    return day === 0; // Sunday (can be extended to Saturday)
}
