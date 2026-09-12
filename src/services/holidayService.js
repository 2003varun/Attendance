// Holiday Management Service

const INITIAL_HOLIDAYS = [
    { id: "h1", date: "2026-01-01", name: "New Year's Day", type: "National Holiday" },
    { id: "h2", date: "2026-01-26", name: "Republic Day", type: "National Holiday" },
    { id: "h3", date: "2026-03-04", name: "Holi", type: "Gazetted Holiday" },
    { id: "h4", date: "2026-05-01", name: "Labor Day", type: "Gazetted Holiday" },
    { id: "h5", date: "2026-08-15", name: "Independence Day", type: "National Holiday" },
    { id: "h6", date: "2026-10-02", name: "Gandhi Jayanti", type: "National Holiday" },
    { id: "h7", date: "2026-10-20", name: "Dussehra", type: "Festival Holiday" },
    { id: "h8", date: "2026-11-08", name: "Diwali", type: "Festival Holiday" },
    { id: "h9", date: "2026-12-25", name: "Christmas", type: "Gazetted Holiday" }
];

const STORAGE_KEY = "attendance_os_holidays";

export const holidayService = {
    getAll() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to load holidays from storage", e);
        }
        this.save(INITIAL_HOLIDAYS);
        return INITIAL_HOLIDAYS;
    },

    save(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            console.error("Failed to save holidays to storage", e);
        }
    },

    add(holiday) {
        const list = this.getAll();
        const id = holiday.id || `h_${Date.now()}`;
        const newHoliday = { ...holiday, id };
        list.push(newHoliday);
        list.sort((a, b) => a.date.localeCompare(b.date));
        this.save(list);
        return newHoliday;
    },

    update(id, updates) {
        const list = this.getAll();
        const idx = list.findIndex(h => h.id === id);
        if (idx === -1) throw new Error("Holiday not found");
        list[idx] = { ...list[idx], ...updates };
        list.sort((a, b) => a.date.localeCompare(b.date));
        this.save(list);
        return list[idx];
    },

    delete(id) {
        const list = this.getAll().filter(h => h.id !== id);
        this.save(list);
        return true;
    },

    isHoliday(dateStr) {
        return this.getAll().some(h => h.date === dateStr);
    },

    getHolidayForDate(dateStr) {
        return this.getAll().find(h => h.date === dateStr) || null;
    }
};
