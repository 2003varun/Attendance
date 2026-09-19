// Leave & Holiday Management Context - Centralized REST API Synchronized
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { leaveService, DEFAULT_LEAVE_TYPES } from '../services/leaveService';
import { holidayService } from '../services/holidayService';
import { notificationService } from '../services/notificationService';

const LeaveContext = createContext(null);

export function LeaveProvider({ children }) {
    const [requests, setRequests] = useState(() => leaveService.getAllRequestsSync());
    const [leaveTypes, setLeaveTypes] = useState(() => leaveService.getLeaveTypesSync());
    const [holidays, setHolidays] = useState(() => holidayService.getAllSync());
    const [notifications, setNotifications] = useState(() => notificationService.getAll());
    const [balancesMap, setBalancesMap] = useState({});

    const refreshRequests = useCallback(async () => {
        try {
            const list = await leaveService.getAllRequests();
            setRequests([...list]);
        } catch (e) {
            console.warn("Failed to refresh leave requests:", e);
        }
    }, []);

    const refreshHolidays = useCallback(async () => {
        try {
            const list = await holidayService.getAll();
            setHolidays([...list]);
        } catch (e) {
            console.warn("Failed to refresh holidays:", e);
        }
    }, []);

    const refreshLeaveTypes = useCallback(async () => {
        try {
            const list = await leaveService.getLeaveTypes();
            setLeaveTypes([...list]);
        } catch (e) {
            console.warn("Failed to refresh leave types:", e);
        }
    }, []);

    const refreshNotifications = useCallback(() => {
        setNotifications(notificationService.getAll());
    }, []);

    // Initial data fetch from shared API on mount
    useEffect(() => {
        let isMounted = true;
        Promise.all([
            leaveService.getAllRequests(),
            holidayService.getAll(),
            leaveService.getLeaveTypes()
        ]).then(([reqs, hols, types]) => {
            if (isMounted) {
                if (reqs) setRequests([...reqs]);
                if (hols) setHolidays([...hols]);
                if (types) setLeaveTypes([...types]);
            }
        }).catch(err => console.error("Initial LeaveProvider sync error:", err));

        return () => { isMounted = false; };
    }, []);

    const applyLeave = async (requestData) => {
        const newReq = await leaveService.applyLeave(requestData);
        await refreshRequests();

        // Trigger notification to Admin/Manager
        notificationService.add({
            title: "New Leave Request",
            message: `${requestData.employeeName} (${requestData.employeeId}) requested ${requestData.days || requestData.daysCount} day(s) of ${requestData.leaveType}.`,
            type: "info",
            recipientRole: "ADMIN",
            recipientId: "all"
        });
        refreshNotifications();

        if (requestData.employeeId) {
            fetchBalances(requestData.employeeId);
        }

        return newReq;
    };

    const approveLeave = async (requestId, approverName = "Admin") => {
        const approved = await leaveService.approve(requestId, approverName);
        await refreshRequests();

        notificationService.add({
            title: "Leave Approved",
            message: `Your ${approved.leaveType} (${approved.startDate} to ${approved.endDate}) was approved by ${approverName}.`,
            type: "success",
            recipientRole: "EMPLOYEE",
            recipientId: approved.employeeId
        });
        refreshNotifications();

        if (approved.employeeId) {
            fetchBalances(approved.employeeId);
        }

        return approved;
    };

    const rejectLeave = async (requestId, reason, rejectorName = "Admin") => {
        const rejected = await leaveService.reject(requestId, reason, rejectorName);
        await refreshRequests();

        notificationService.add({
            title: "Leave Rejected",
            message: `Your ${rejected.leaveType} request was rejected: "${reason}".`,
            type: "danger",
            recipientRole: "EMPLOYEE",
            recipientId: rejected.employeeId
        });
        refreshNotifications();

        if (rejected.employeeId) {
            fetchBalances(rejected.employeeId);
        }

        return rejected;
    };

    const cancelLeave = async (requestId) => {
        const cancelled = await leaveService.cancel(requestId);
        await refreshRequests();

        if (cancelled.employeeId) {
            fetchBalances(cancelled.employeeId);
        }

        return cancelled;
    };

    const fetchBalances = useCallback(async (employeeId) => {
        if (!employeeId) return;
        try {
            const data = await leaveService.getBalances(employeeId);
            setBalancesMap(prev => ({ ...prev, [employeeId]: data }));
            return data;
        } catch (e) {
            console.error(`Failed to fetch balances for ${employeeId}:`, e);
        }
    }, []);

    const getBalances = useCallback((employeeId) => {
        if (balancesMap[employeeId]) {
            return balancesMap[employeeId];
        }
        // If not in React state map, return synchronous fallback and fetch in background
        fetchBalances(employeeId);
        return leaveService.getBalancesSync(employeeId);
    }, [balancesMap, fetchBalances]);

    const addHoliday = async (holiday) => {
        const created = await holidayService.add(holiday);
        await refreshHolidays();
        return created;
    };

    const updateHoliday = async (id, updates) => {
        const updated = await holidayService.update(id, updates);
        await refreshHolidays();
        return updated;
    };

    const deleteHoliday = async (id) => {
        const deleted = await holidayService.delete(id);
        await refreshHolidays();
        return deleted;
    };

    const markNotificationRead = (id) => {
        const updated = notificationService.markAsRead(id);
        setNotifications([...updated]);
    };

    const markAllNotificationsRead = () => {
        const updated = notificationService.markAllAsRead();
        setNotifications([...updated]);
    };

    const clearAllNotifications = () => {
        const updated = notificationService.clearAll();
        setNotifications([...updated]);
    };

    const value = {
        requests,
        leaveTypes,
        holidays,
        notifications,
        applyLeave,
        approveLeave,
        rejectLeave,
        cancelLeave,
        getBalances,
        fetchBalances,
        addHoliday,
        updateHoliday,
        deleteHoliday,
        markNotificationRead,
        markAllNotificationsRead,
        clearAllNotifications,
        refreshRequests,
        refreshHolidays,
        refreshLeaveTypes
    };

    return (
        <LeaveContext.Provider value={value}>
            {children}
        </LeaveContext.Provider>
    );
}

export function useLeave() {
    const context = useContext(LeaveContext);
    if (!context) {
        throw new Error("useLeave must be used within a LeaveProvider");
    }
    return context;
}
