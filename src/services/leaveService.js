// Leave Management Service

export const DEFAULT_LEAVE_TYPES = [
    { id: "CL", name: "Casual Leave", defaultAllocated: 7, description: "Standard personal or casual days off" },
    { id: "SL", name: "Sick Leave", defaultAllocated: 5, description: "Medical reasons and sick rest" },
    { id: "EL", name: "Earned Leave", defaultAllocated: 12, description: "Privilege/annual accrued leave" },
    { id: "UL", name: "Unpaid Leave", defaultAllocated: 0, description: "Leave without pay (unrestricted)" }
];

const INITIAL_REQUESTS = [
    {
        id: "leave_101",
        employeeId: "428",
        employeeName: "Kavita Rao",
        department: "Human Resources",
        leaveType: "Casual Leave",
        startDate: "2026-08-10",
        endDate: "2026-08-12",
        days: 3,
        reason: "Family event and personal matters",
        status: "APPROVED",
        appliedDate: "2026-08-01",
        approvedBy: "Varun Sharma (Admin)",
        rejectionReason: "",
        createdAt: "2026-08-01T10:00:00Z"
    },
    {
        id: "leave_102",
        employeeId: "363",
        employeeName: "David Miller",
        department: "Engineering",
        leaveType: "Sick Leave",
        startDate: "2026-08-18",
        endDate: "2026-08-19",
        days: 2,
        reason: "Severe fever and flu recovery",
        status: "APPROVED",
        appliedDate: "2026-08-17",
        approvedBy: "Sarah Jenkins (Manager)",
        rejectionReason: "",
        createdAt: "2026-08-17T08:30:00Z"
    },
    {
        id: "leave_103",
        employeeId: "405",
        employeeName: "Amit Patel",
        department: "Product",
        leaveType: "Earned Leave",
        startDate: "2026-08-28",
        endDate: "2026-08-31",
        days: 3, // excluding Sunday Aug 30
        reason: "Annual vacation trip",
        status: "PENDING",
        appliedDate: "2026-08-20",
        approvedBy: "",
        rejectionReason: "",
        createdAt: "2026-08-20T14:15:00Z"
    },
    {
        id: "leave_104",
        employeeId: "75",
        employeeName: "Sarah Jenkins",
        department: "Engineering",
        leaveType: "Casual Leave",
        startDate: "2026-09-02",
        endDate: "2026-09-03",
        days: 2,
        reason: "Personal appointment",
        status: "PENDING",
        appliedDate: "2026-08-25",
        approvedBy: "",
        rejectionReason: "",
        createdAt: "2026-08-25T11:00:00Z"
    }
];

const REQUESTS_STORAGE_KEY = "attendance_os_leave_requests";
const BALANCES_STORAGE_KEY = "attendance_os_leave_balances";
const TYPES_STORAGE_KEY = "attendance_os_leave_types";

export const leaveService = {
    getLeaveTypes() {
        try {
            const stored = localStorage.getItem(TYPES_STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to load leave types", e);
        }
        this.saveLeaveTypes(DEFAULT_LEAVE_TYPES);
        return DEFAULT_LEAVE_TYPES;
    },

    saveLeaveTypes(types) {
        try {
            localStorage.setItem(TYPES_STORAGE_KEY, JSON.stringify(types));
        } catch (e) {
            console.error("Failed to save leave types", e);
        }
    },

    getAllRequests() {
        try {
            const stored = localStorage.getItem(REQUESTS_STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to load leave requests", e);
        }
        this.saveRequests(INITIAL_REQUESTS);
        return INITIAL_REQUESTS;
    },

    saveRequests(list) {
        try {
            localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            console.error("Failed to save leave requests", e);
        }
    },

    /**
     * Compute or fetch leave balances for a given employee
     */
    getBalances(employeeId) {
        const types = this.getLeaveTypes();
        const allRequests = this.getAllRequests();
        const approvedLeaves = allRequests.filter(r => 
            String(r.employeeId) === String(employeeId) && r.status === "APPROVED"
        );

        // Load custom allocated balances if present, otherwise defaults
        let customBalances = {};
        try {
            const stored = localStorage.getItem(`${BALANCES_STORAGE_KEY}_${employeeId}`);
            if (stored) customBalances = JSON.parse(stored);
        } catch (e) {}

        const balances = {};
        types.forEach(t => {
            const allocated = customBalances[t.name]?.allocated ?? t.defaultAllocated;
            const used = approvedLeaves
                .filter(r => r.leaveType === t.name)
                .reduce((acc, r) => acc + (Number(r.days) || 0), 0);
            
            balances[t.name] = {
                allocated,
                used,
                remaining: Math.max(0, allocated - used)
            };
        });

        return balances;
    },

    applyLeave(requestData) {
        const requests = this.getAllRequests();
        const newReq = {
            id: `leave_${Date.now()}`,
            status: "PENDING",
            appliedDate: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
            approvedBy: "",
            rejectionReason: "",
            ...requestData
        };

        requests.unshift(newReq);
        this.saveRequests(requests);
        return newReq;
    },

    approve(requestId, approverName = "Admin") {
        const requests = this.getAllRequests();
        const idx = requests.findIndex(r => r.id === requestId);
        if (idx === -1) throw new Error("Leave request not found");

        requests[idx].status = "APPROVED";
        requests[idx].approvedBy = approverName;
        requests[idx].rejectionReason = "";
        this.saveRequests(requests);
        return requests[idx];
    },

    reject(requestId, reason, rejectorName = "Admin") {
        const requests = this.getAllRequests();
        const idx = requests.findIndex(r => r.id === requestId);
        if (idx === -1) throw new Error("Leave request not found");

        requests[idx].status = "REJECTED";
        requests[idx].approvedBy = rejectorName;
        requests[idx].rejectionReason = reason || "Request rejected by supervisor";
        this.saveRequests(requests);
        return requests[idx];
    },

    cancel(requestId) {
        const requests = this.getAllRequests();
        const idx = requests.findIndex(r => r.id === requestId);
        if (idx === -1) throw new Error("Leave request not found");

        if (requests[idx].status !== "PENDING") {
            throw new Error("Only pending leave requests can be cancelled");
        }

        requests[idx].status = "CANCELLED";
        this.saveRequests(requests);
        return requests[idx];
    }
};
