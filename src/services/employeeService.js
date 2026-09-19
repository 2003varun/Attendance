// Centralized Employee Service - Communicating with Flask / SQLite API
// Maintains an active memory cache to support instant synchronous rendering & reactive updates
import { getApiUrl } from '../utils/apiConfig';

const INITIAL_CACHE = [
    { id: "75", employee_id: "75", name: "Aarav Sharma", full_name: "Aarav Sharma", email: "aarav.sharma@company.com", phone: "+91 98765 43210", department: "Engineering", designation: "Software Engineer", shift: "Morning Shift (09:00 - 18:00)", status: "Active", employment_type: "Full Time", joining_date: "2023-01-15" },
    { id: "363", employee_id: "363", name: "Priya Patel", full_name: "Priya Patel", email: "priya.patel@company.com", phone: "+91 98765 43211", department: "Operations", designation: "Operations Lead", shift: "Morning Shift (09:00 - 18:00)", status: "Active", employment_type: "Full Time", joining_date: "2022-11-01" },
    { id: "378", employee_id: "378", name: "Rohan Verma", full_name: "Rohan Verma", email: "rohan.verma@company.com", phone: "+91 98765 43212", department: "Management", designation: "Director of Tech", shift: "Morning Shift (09:00 - 18:00)", status: "Active", employment_type: "Full Time", joining_date: "2021-06-10" },
    { id: "396", employee_id: "396", name: "Ananya Iyer", full_name: "Ananya Iyer", email: "ananya.iyer@company.com", phone: "+91 98765 43213", department: "HR", designation: "HR Specialist", shift: "Morning Shift (09:00 - 18:00)", status: "Active", employment_type: "Full Time", joining_date: "2023-04-01" },
    { id: "397", employee_id: "397", name: "Vikram Malhotra", full_name: "Vikram Malhotra", email: "vikram.m@company.com", phone: "+91 98765 43214", department: "Finance", designation: "Financial Analyst", shift: "Morning Shift (09:00 - 18:00)", status: "Active", employment_type: "Full Time", joining_date: "2022-08-20" },
    { id: "405", employee_id: "405", name: "Neha Gupta", full_name: "Neha Gupta", email: "neha.gupta@company.com", phone: "+91 98765 43215", department: "Marketing", designation: "Brand Lead", shift: "Morning Shift (09:00 - 18:00)", status: "Active", employment_type: "Full Time", joining_date: "2023-09-12" },
    { id: "411", employee_id: "411", name: "Karan Johar", full_name: "Karan Johar", email: "karan.j@company.com", phone: "+91 98765 43216", department: "Sales", designation: "Account Executive", shift: "Morning Shift (09:00 - 18:00)", status: "Active", employment_type: "Full Time", joining_date: "2023-02-18" },
    { id: "418", employee_id: "418", name: "Sneha Reddy", full_name: "Sneha Reddy", email: "sneha.reddy@company.com", phone: "+91 98765 43217", department: "Engineering", designation: "Frontend Developer", shift: "Morning Shift (09:00 - 18:00)", status: "Active", employment_type: "Full Time", joining_date: "2023-07-01" },
    { id: "419", employee_id: "419", name: "Devansh Nair", full_name: "Devansh Nair", email: "devansh.nair@company.com", phone: "+91 98765 43218", department: "Support", designation: "Support Specialist", shift: "Evening Shift (14:00 - 23:00)", status: "Active", employment_type: "Full Time", joining_date: "2023-10-05" },
    { id: "424", employee_id: "424", name: "Meera Joshi", full_name: "Meera Joshi", email: "meera.joshi@company.com", phone: "+91 98765 43219", department: "Operations", designation: "Logistics Coordinator", shift: "Morning Shift (09:00 - 18:00)", status: "Active", employment_type: "Full Time", joining_date: "2022-03-14" },
    { id: "428", employee_id: "428", name: "Rahul Kumar", full_name: "Rahul Kumar", email: "rahul.kumar@company.com", phone: "+91 98765 43220", department: "Engineering", designation: "DevOps Engineer", shift: "Morning Shift (09:00 - 18:00)", status: "Active", employment_type: "Full Time", joining_date: "2023-05-19" }
];

let _cachedEmployees = [...INITIAL_CACHE];

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
