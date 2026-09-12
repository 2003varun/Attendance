// Leave & Holiday Management Context
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { leaveService } from '../services/leaveService';
import { holidayService } from '../services/holidayService';
import { notificationService } from '../services/notificationService';

const LeaveContext = createContext(null);

export function LeaveProvider({ children }) {
    const [requests, setRequests] = useState(() => leaveService.getAllRequests());
    const [leaveTypes, setLeaveTypes] = useState(() => leaveService.getLeaveTypes());
    const [holidays, setHolidays] = useState(() => holidayService.getAll());
    const [notifications, setNotifications] = useState(() => notificationService.getAll());

    const refreshRequests = useCallback(() => {
        setRequests(leaveService.getAllRequests());
    }, []);

    const refreshHolidays = useCallback(() => {
        setHolidays(holidayService.getAll());
    }, []);

    const refreshNotifications = useCallback(() => {
        setNotifications(notificationService.getAll());
    }, []);

    const applyLeave = (requestData) => {
        const newReq = leaveService.applyLeave(requestData);
        refreshRequests();

        // Trigger notification to Admin/Manager
        notificationService.add({
            title: "New Leave Request",
            message: `${requestData.employeeName} (${requestData.employeeId}) requested ${requestData.days} day(s) of ${requestData.leaveType}.`,
            type: "info",
            recipientRole: "ADMIN",
            recipientId: "all"
        });
        refreshNotifications();
        return newReq;
    };

    const approveLeave = (requestId, approverName = "Admin") => {
        const approved = leaveService.approve(requestId, approverName);
        refreshRequests();

        notificationService.add({
            title: "Leave Approved",
            message: `Your ${approved.leaveType} (${approved.startDate} to ${approved.endDate}) was approved by ${approverName}.`,
            type: "success",
            recipientRole: "EMPLOYEE",
            recipientId: approved.employeeId
        });
        refreshNotifications();
        return approved;
    };

    const rejectLeave = (requestId, reason, rejectorName = "Admin") => {
        const rejected = leaveService.reject(requestId, reason, rejectorName);
        refreshRequests();

        notificationService.add({
            title: "Leave Rejected",
            message: `Your ${rejected.leaveType} request was rejected: "${reason}".`,
            type: "danger",
            recipientRole: "EMPLOYEE",
            recipientId: rejected.employeeId
        });
        refreshNotifications();
        return rejected;
    };

    const cancelLeave = (requestId) => {
        const cancelled = leaveService.cancel(requestId);
        refreshRequests();
        return cancelled;
    };

    const getBalances = useCallback((employeeId) => {
        return leaveService.getBalances(employeeId);
    }, []);

    const addHoliday = (holiday) => {
        const created = holidayService.add(holiday);
        refreshHolidays();
        return created;
    };

    const updateHoliday = (id, updates) => {
        const updated = holidayService.update(id, updates);
        refreshHolidays();
        return updated;
    };

    const deleteHoliday = (id) => {
        const deleted = holidayService.delete(id);
        refreshHolidays();
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
        addHoliday,
        updateHoliday,
        deleteHoliday,
        markNotificationRead,
        markAllNotificationsRead,
        clearAllNotifications,
        refreshRequests,
        refreshHolidays
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
