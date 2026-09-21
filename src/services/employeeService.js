// Centralized Employee Service - Communicating with Flask / SQLite API
// Maintains an active memory cache to support instant synchronous rendering & reactive updates
import { getApiUrl } from '../utils/apiConfig';

const INITIAL_CACHE = [];

let _cachedEmployees = [];

const normalizeEmployee = (emp) => {
    if (!emp) return emp;
    return {
        ...emp,
        id: emp.employee_id || emp.id,
        employee_id: emp.employee_id || emp.id,
        name: emp.full_name || emp.name,
        full_name: emp.full_name || emp.name
    };
};

export const employeeService = {
    // Synchronous access to cached state for instantaneous renders & backward-compatibility
    getAllSync() {
        return _cachedEmployees;
    },

    getByIdSync(id) {
        return _cachedEmployees.find(e => String(e.employee_id) === String(id) || String(e.id) === String(id));
    },

    // Async REST API methods to Flask / SQLite backend
    async getAll(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (params.query) queryParams.append('query', params.query);
            if (params.department && params.department !== 'All') queryParams.append('department', params.department);
            if (params.status && params.status !== 'All') queryParams.append('status', params.status);

            const url = getApiUrl(`/api/employees${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
            const res = await fetch(url);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to fetch employees');
            }
            const json = await res.json();
            const list = (json.data || []).map(normalizeEmployee);
            if (!params.query && (!params.department || params.department === 'All') && (!params.status || params.status === 'All')) {
                _cachedEmployees = list;
            }
            return list;
        } catch (error) {
            console.warn('[employeeService.getAll] Falling back to local cache:', error.message);
            return _cachedEmployees;
        }
    },

    async getById(id) {
        try {
            const res = await fetch(getApiUrl(`/api/employees/${id}`));
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `Failed to fetch employee ${id}`);
            }
            const json = await res.json();
            return normalizeEmployee(json.data);
        } catch (error) {
            console.warn(`[employeeService.getById] Fallback for ${id}:`, error.message);
            return this.getByIdSync(id);
        }
    },

    async add(employee) {
        const res = await fetch(getApiUrl('/api/employees'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employee)
        });
        const json = await res.json();
        if (!res.ok) {
            const err = new Error(json.message || 'Failed to add employee');
            err.errors = json.errors || {};
            throw err;
        }
        const created = normalizeEmployee(json.data);
        _cachedEmployees.unshift(created);
        return created;
    },

    async update(id, updates) {
        const res = await fetch(getApiUrl(`/api/employees/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const json = await res.json();
        if (!res.ok) {
            const err = new Error(json.message || 'Failed to update employee');
            err.errors = json.errors || {};
            throw err;
        }
        const updated = normalizeEmployee(json.data);
        _cachedEmployees = _cachedEmployees.map(e => (String(e.employee_id) === String(id) || String(e.id) === String(id)) ? updated : e);
        return updated;
    },

    async toggleStatus(id, newStatus) {
        const res = await fetch(getApiUrl(`/api/employees/${id}/status`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const json = await res.json();
        if (!res.ok) {
            const err = new Error(json.message || 'Failed to update employee status');
            throw err;
        }
        const updated = normalizeEmployee(json.data);
        _cachedEmployees = _cachedEmployees.map(e => (String(e.employee_id) === String(id) || String(e.id) === String(id)) ? updated : e);
        return updated;
    },

    async delete(id) {
        const res = await fetch(getApiUrl(`/api/employees/${id}`), {
            method: 'DELETE'
        });
        const json = await res.json();
        if (!res.ok) {
            const err = new Error(json.message || 'Failed to delete employee');
            throw err;
        }
        _cachedEmployees = _cachedEmployees.filter(e => String(e.employee_id) !== String(id) && String(e.id) !== String(id));
        return json;
    }
};
