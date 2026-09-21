// Apply Leave Request Form Modal
import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useLeave } from '../../context/LeaveContext';
import { useAuth } from '../../context/AuthContext';
import { employeeService } from '../../services/employeeService';
import { calculateLeaveDays, validateLeaveRequest } from '../../utils/leaveUtils';

export function ApplyLeaveModal({ isOpen, onClose, onSuccess }) {
    const { leaveTypes, holidays, requests, applyLeave, getBalances } = useLeave();
    const { currentUser, isEmployee } = useAuth();

    const [employees, setEmployees] = useState([]);
    const [employeeId, setEmployeeId] = useState("");
    const [leaveType, setLeaveType] = useState("Paid Leave");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");
    const [calculatedDays, setCalculatedDays] = useState(0);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;
        employeeService.getAll({ status: "Active" })
            .then(emps => {
                if (isMounted && emps && emps.length > 0) {
                    setEmployees(emps);
                    if (currentUser && currentUser.id) {
                        setEmployeeId(currentUser.id);
                    } else {
                        setEmployeeId(emps[0].employee_id);
                    }
                }
            })
            .catch(err => console.error("Error loading employees for leave modal", err));
        return () => { isMounted = false; };
    }, [currentUser, isOpen]);

    useEffect(() => {
        if (startDate && endDate) {
            const days = calculateLeaveDays(startDate, endDate, holidays, true);
            setCalculatedDays(days);
        } else {
            setCalculatedDays(0);
        }
    }, [startDate, endDate, holidays]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const selectedEmp = employees.find(e => String(e.employee_id || e.id) === String(employeeId));
        const empName = selectedEmp ? (selectedEmp.full_name || selectedEmp.name) : `Employee ${employeeId}`;
        const empDept = selectedEmp ? selectedEmp.department : "General";

        const balances = getBalances(employeeId);
        const validation = validateLeaveRequest({
            employeeId,
            leaveType,
            startDate,
            endDate,
            reason,
            existingRequests: requests,
            leaveBalances: balances,
            holidays
        });

        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        try {
            await applyLeave({
                employeeId,
                employeeName: empName,
                department: empDept,
                leaveType,
                startDate,
                endDate,
                days: calculatedDays,
                reason: reason.trim()
            });

            // Reset
            setReason("");
            setStartDate("");
            setEndDate("");
            setError("");
            onClose();
            if (onSuccess) onSuccess("Leave application submitted successfully!");
        } catch (err) {
            setError(err.message || "Failed to submit leave application.");
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Apply for Leave"
            subtitle="Submit a formal leave request for approval"
        >
            <form onSubmit={handleSubmit}>
                {error && (
                    <div style={{
                        padding: "12px 16px",
                        backgroundColor: "var(--danger-light)",
                        color: "var(--danger-dark)",
                        borderRadius: "var(--radius-md)",
                        marginBottom: "16px",
                        fontSize: "13px",
                        fontWeight: 600,
                        border: "1px solid rgba(239, 68, 68, 0.2)"
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div className="filter-group">
                        <label className="filter-label">Employee</label>
                        <select 
                            className="select-field"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            disabled={isEmployee}
                        >
                            {employees.map(emp => (
                                <option key={emp.employee_id || emp.id} value={emp.employee_id || emp.id}>
                                    {emp.full_name || emp.name} - {emp.employee_id || emp.id}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Leave Policy Type</label>
                        <select 
                            className="select-field"
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value)}
                        >
                            {(leaveTypes && leaveTypes.length > 0 ? leaveTypes : [{ id: 'PL', name: 'Paid Leave' }]).map(lt => (
                                <option key={lt.id || lt.name} value={lt.name}>
                                    {lt.name} (+1 Day / Month Carry-Forward)
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div className="filter-group">
                        <label className="filter-label">Start Date</label>
                        <input 
                            className="input-field" 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">End Date</label>
                        <input 
                            className="input-field" 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {startDate && endDate && (
                    <div style={{
                        padding: "10px 14px",
                        backgroundColor: "var(--border-light)",
                        borderRadius: "var(--radius-md)",
                        marginBottom: "16px",
                        fontSize: "12.5px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <span>Calculated Working Days (Excl. Sundays/Holidays):</span>
                        <strong style={{ fontSize: "15px", color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                            {calculatedDays} day(s)
                        </strong>
                    </div>
                )}

                <div className="filter-group" style={{ marginBottom: "20px" }}>
                    <label className="filter-label">Reason for Leave *</label>
                    <textarea 
                        className="input-field"
                        style={{ height: "90px", padding: "10px", resize: "vertical" }}
                        placeholder="Please provide details for the leave request..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                    />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button type="button" className="btn btn-default" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                        Submit Leave Request
                    </button>
                </div>
            </form>
        </Modal>
    );
}
