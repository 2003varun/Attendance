// Centralized Leave Management Service - Synchronized with Flask REST API
import { getApiUrl } from '../utils/apiConfig';

export const DEFAULT_LEAVE_TYPES = [
    { id: "PL", name: "Paid Leave", defaultAllocated: 1.0, description: "1 day monthly accrual with carry-forward" }
];

let _cachedRequests = [];
let _cachedLeaveTypes = [...DEFAULT_LEAVE_TYPES];
let _cachedBalancesByEmp = {};

export const leaveService = {
    // Synchronous helpers for instant renders
    getAllRequestsSync() {
        return _cachedRequests;
    },

    getLeaveTypesSync() {
        return _cachedLeaveTypes.length > 0 ? _cachedLeaveTypes : DEFAULT_LEAVE_TYPES;
    },

    getBalancesSync(employeeId) {
        if (_cachedBalancesByEmp[employeeId]) {
            return _cachedBalancesByEmp[employeeId];
        }
        // Return default structure if not yet cached
        const defaults = {};
        _cachedLeaveTypes.forEach(t => {
            defaults[t.name] = {
                allocated: t.defaultAllocated,
                used: 0,
                pending: 0,
                remaining: t.defaultAllocated
            };
        });
        return defaults;
    },

    // Asynchronous API calls (Single Source of Truth)
    async getLeaveTypes() {
        try {
            const res = await fetch(getApiUrl('/api/leave-types'));
            if (res.ok) {
                const json = await res.json();
                if (json.data && json.data.length > 0) {
                    _cachedLeaveTypes = json.data;
                    return json.data;
                }
            }
        } catch (e) {
            console.warn('[leaveService.getLeaveTypes] Using fallback:', e.message);
        }
        return _cachedLeaveTypes;
    },

    async getAllRequests(params = {}) {
        try {
            const query = new URLSearchParams();
            if (params.employee_id) query.append('employee_id', params.employee_id);
            if (params.status && params.status !== 'ALL') query.append('status', params.status);

            const url = getApiUrl(`/api/leaves${query.toString() ? '?' + query.toString() : ''}`);
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch leaves: ${res.statusText}`);
            }
            const json = await res.json();
            const list = json.data || [];
            _cachedRequests = list;
            return list;
        } catch (error) {
            console.warn('[leaveService.getAllRequests] Fallback to cache:', error.message);
            return _cachedRequests;
        }
    },

    async getBalances(employeeId) {
        if (!employeeId) return this.getBalancesSync(employeeId);
        try {
            const res = await fetch(getApiUrl(`/api/leave-balances/${employeeId}`));
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    _cachedBalancesByEmp[employeeId] = json.data;
                    return json.data;
                }
            }
        } catch (e) {
            console.warn(`[leaveService.getBalances] Error for ${employeeId}:`, e.message);
        }
        return this.getBalancesSync(employeeId);
    },

    async applyLeave(requestData) {
        const payload = {
            employeeId: requestData.employeeId,
            leaveType: requestData.leaveType,
            startDate: requestData.startDate,
            endDate: requestData.endDate,
            reason: requestData.reason,
            daysCount: Number(requestData.days) || Number(requestData.daysCount) || 1
        };

        const res = await fetch(getApiUrl('/api/leaves'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.message || 'Failed to submit leave application');
        }

        const created = json.data;
        // Prepend to cached list
        _cachedRequests = [created, ..._cachedRequests.filter(r => r.id !== created.id)];

        // Refresh employee balances in background
        if (requestData.employeeId) {
            this.getBalances(requestData.employeeId).catch(() => {});
        }

        return created;
    },

    async approve(requestId, approverName = "Admin") {
        const res = await fetch(getApiUrl(`/api/leaves/${requestId}`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: "APPROVED",
                approvedBy: approverName
            })
        });

        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.message || 'Failed to approve leave request');
        }

        const updated = json.data;
        _cachedRequests = _cachedRequests.map(r => r.id === updated.id ? updated : r);

        if (updated.employeeId) {
            this.getBalances(updated.employeeId).catch(() => {});
        }

        return updated;
    },

    async reject(requestId, reason, rejectorName = "Admin") {
        const res = await fetch(getApiUrl(`/api/leaves/${requestId}`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: "REJECTED",
                reason: reason || "Request rejected by supervisor",
                approvedBy: rejectorName
            })
        });

        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.message || 'Failed to reject leave request');
        }

        const updated = json.data;
        _cachedRequests = _cachedRequests.map(r => r.id === updated.id ? updated : r);

        if (updated.employeeId) {
            this.getBalances(updated.employeeId).catch(() => {});
        }

        return updated;
    },

    async cancel(requestId) {
        const res = await fetch(getApiUrl(`/api/leaves/${requestId}`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: "CANCELLED"
            })
        });

        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.message || 'Failed to cancel leave request');
        }

        const updated = json.data;
        _cachedRequests = _cachedRequests.map(r => r.id === updated.id ? updated : r);

        if (updated.employeeId) {
            this.getBalances(updated.employeeId).catch(() => {});
        }

        return updated;
    }
};
