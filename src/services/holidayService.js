// Holiday Management Service - Synchronized with Central Flask API
import { getApiUrl } from '../utils/apiConfig';

const INITIAL_FALLBACK_HOLIDAYS = [
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

let _cachedHolidays = [...INITIAL_FALLBACK_HOLIDAYS];

export const holidayService = {
    getAllSync() {
        return _cachedHolidays;
    },

    async getAll() {
        try {
            const res = await fetch(getApiUrl('/api/holidays'));
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    _cachedHolidays = json.data;
                    return json.data;
                }
            }
        } catch (e) {
            console.warn('[holidayService.getAll] Using cached holidays:', e.message);
        }
        return _cachedHolidays;
    },

    async add(holiday) {
        const res = await fetch(getApiUrl('/api/holidays'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(holiday)
        });
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.message || 'Failed to add holiday');
        }
        const created = json.data;
        _cachedHolidays = [..._cachedHolidays, created].sort((a, b) => a.date.localeCompare(b.date));
        return created;
    },

    async update(id, updates) {
        const res = await fetch(getApiUrl(`/api/holidays/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.message || 'Failed to update holiday');
        }
        const updated = json.data;
        _cachedHolidays = _cachedHolidays.map(h => h.id === id ? updated : h).sort((a, b) => a.date.localeCompare(b.date));
        return updated;
    },

    async delete(id) {
        const res = await fetch(getApiUrl(`/api/holidays/${id}`), {
            method: 'DELETE'
        });
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.message || 'Failed to delete holiday');
        }
        _cachedHolidays = _cachedHolidays.filter(h => h.id !== id);
        return true;
    },

    isHoliday(dateStr) {
        return _cachedHolidays.some(h => h.date === dateStr);
    },

    getHolidayForDate(dateStr) {
        return _cachedHolidays.find(h => h.date === dateStr) || null;
    }
};
