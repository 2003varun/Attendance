// Centralized Employee Management Module
import React, { useState, useEffect, useMemo } from 'react';
import { employeeService } from '../services/employeeService';

const DEPARTMENTS = [
    "All",
    "Engineering",
    "Management",
    "Operations",
    "DevOps",
    "Product",
    "Design",
    "QA",
    "Human Resources"
];

const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Contract", "Intern"];
const SHIFTS = [
    "Morning General (09:30 - 18:30)",
    "Early Morning (08:00 - 17:00)",
    "Evening Shift (14:00 - 23:00)",
    "Night Shift (22:00 - 07:00)"
];

export function EmployeeManagement({ onToast }) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDept, setSelectedDept] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("All");

    // Modals state
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null); // null for Add, employee object for Edit
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // Form inputs state
    const [formData, setFormData] = useState({
        employee_id: "",
        full_name: "",
        email: "",
        phone: "",
        department: "Engineering",
        designation: "",
        joining_date: new Date().toISOString().slice(0, 10),
        shift: "Morning General (09:30 - 18:30)",
        employment_type: "Full Time",
        status: "Active"
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const data = await employeeService.getAll({
                query: searchQuery,
                department: selectedDept,
                status: selectedStatus
            });
            setEmployees(data);
        } catch (err) {
            console.error("Failed to load employees", err);
            if (onToast) onToast(err.message || "Failed to load employees from server", "danger");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
    }, [searchQuery, selectedDept, selectedStatus]);

    // Open Add Modal
    const handleOpenAddModal = () => {
        setEditingEmp(null);
        setFormData({
            employee_id: "",
            full_name: "",
            email: "",
            phone: "",
            department: "Engineering",
            designation: "",
            joining_date: new Date().toISOString().slice(0, 10),
            shift: "Morning General (09:30 - 18:30)",
            employment_type: "Full Time",
            status: "Active"
        });
        setFormErrors({});
        setFormModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEditModal = (emp) => {
        setEditingEmp(emp);
        setFormData({
            employee_id: emp.employee_id,
            full_name: emp.full_name,
            email: emp.email,
            phone: emp.phone || "",
            department: emp.department,
            designation: emp.designation,
            joining_date: emp.joining_date || "",
            shift: emp.shift || "Morning General (09:30 - 18:30)",
            employment_type: emp.employment_type || "Full Time",
            status: emp.status || "Active"
        });
        setFormErrors({});
        setFormModalOpen(true);
    };

    // Open Profile View Modal
    const handleViewProfile = async (emp) => {
        setProfileLoading(true);
        setProfileModalOpen(true);
        try {
            const data = await employeeService.getById(emp.employee_id);
            setProfileData(data);
        } catch (err) {
            console.error("Failed to fetch profile", err);
            if (onToast) onToast(err.message || "Failed to load profile", "danger");
            setProfileModalOpen(false);
        } finally {
            setProfileLoading(false);
        }
    };

    // Toggle Active/Inactive status
    const handleToggleStatus = async (emp) => {
        const nextStatus = emp.status === "Active" ? "Inactive" : "Active";
        try {
            await employeeService.toggleStatus(emp.employee_id, nextStatus);
            if (onToast) onToast(`Employee ${emp.employee_id} status changed to ${nextStatus}`, "success");
            loadEmployees();
        } catch (err) {
            if (onToast) onToast(err.message || "Failed to change status", "danger");
        }
    };

    // Delete Employee
    const handleDeleteEmployee = async (emp) => {
        if (window.confirm(`Are you sure you want to permanently remove ${emp.full_name} (${emp.employee_id})? Historical records linked to this employee will also be deleted.`)) {
            try {
                await employeeService.delete(emp.employee_id);
                if (onToast) onToast(`Employee ${emp.employee_id} removed successfully`, "info");
                loadEmployees();
            } catch (err) {
                if (onToast) onToast(err.message || "Failed to delete employee", "danger");
            }
        }
    };

    // Client-side validate form
    const validateForm = () => {
        const errors = {};
        if (!formData.employee_id.trim()) {
            errors.employee_id = "Employee ID is required.";
        }
        if (!formData.full_name.trim()) {
            errors.full_name = "Full Name is required.";
        }
        if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            errors.email = "Please enter a valid email format (e.g. name@company.com).";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Submit form (Add or Edit)
    const handleSaveEmployee = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            if (editingEmp) {
                await employeeService.update(editingEmp.employee_id, formData);
                if (onToast) onToast(`Employee ${editingEmp.employee_id} updated successfully`, "success");
            } else {
                await employeeService.add(formData);
                if (onToast) onToast(`Employee ${formData.employee_id} added successfully to SQLite database`, "success");
            }
            setFormModalOpen(false);
            loadEmployees();
        } catch (err) {
            if (err.errors) {
                setFormErrors(err.errors);
            } else {
                if (onToast) onToast(err.message || "Error saving employee", "danger");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Summary counts
    const activeCount = useMemo(() => employees.filter(e => e.status === "Active").length, [employees]);
    const inactiveCount = useMemo(() => employees.filter(e => e.status === "Inactive").length, [employees]);
    const deptCount = useMemo(() => new Set(employees.map(e => e.department)).size, [employees]);

    return (
        <section className="page-view active">
            {/* Section Header */}
            <div className="section-heading" style={{ marginBottom: '18px' }}>
                <div className="section-heading-left">
                    <h2>👥 Employee Directory & Staff Management</h2>
                    <p>Centralized SQL database of all staff members, designations, shifts & employment profiles</p>
                </div>
                <button className="btn btn-primary" onClick={handleOpenAddModal}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Add Employee</span>
                </button>
            </div>

            {/* Quick Metrics Header */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div className="status-pill" style={{ padding: '8px 16px', fontSize: '12.5px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Employees:</span>
                    <strong style={{ color: 'var(--text-primary)', marginLeft: '6px' }}>{employees.length}</strong>
                </div>
                <div className="status-pill" style={{ padding: '8px 16px', fontSize: '12.5px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div className="status-dot active"></div>
                    <span style={{ color: 'var(--text-muted)' }}>Active Staff:</span>
                    <strong style={{ color: 'var(--success)', marginLeft: '6px' }}>{activeCount}</strong>
                </div>
                <div className="status-pill" style={{ padding: '8px 16px', fontSize: '12.5px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div className="status-dot" style={{ backgroundColor: 'var(--danger)' }}></div>
                    <span style={{ color: 'var(--text-muted)' }}>Inactive / Resigned:</span>
                    <strong style={{ color: 'var(--danger)', marginLeft: '6px' }}>{inactiveCount}</strong>
                </div>
                <div className="status-pill" style={{ padding: '8px 16px', fontSize: '12.5px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Departments:</span>
                    <strong style={{ color: 'var(--cyan)', marginLeft: '6px' }}>{deptCount}</strong>
                </div>
            </div>

            {/* Filtering & Search Toolbar */}
            <div className="filters-toolbar" style={{ gridTemplateColumns: '2fr 1.2fr 1fr auto', marginBottom: '20px' }}>
                <div className="filter-group">
                    <label className="filter-label">Search Employees</label>
                    <input 
                        type="text"
                        className="input-field"
                        placeholder="Search by name, ID, email, or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label className="filter-label">Filter Department</label>
                    <select 
                        className="select-field"
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                    >
                        {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Status</label>
                    <select 
                        className="select-field"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active Only</option>
                        <option value="Inactive">Inactive Only</option>
                    </select>
                </div>

                <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
                    <button 
                        className="btn btn-default" 
                        onClick={() => { setSearchQuery(""); setSelectedDept("All"); setSelectedStatus("All"); }}
                        style={{ height: '38px', marginTop: 'auto' }}
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* Employees List Table */}
            <div className="table-responsive">
                <div className="table-info-bar">
                    <div>
                        <strong>Staff List</strong> ({employees.length} employees found in SQL database)
                    </div>
                </div>

                <div className="table-scroll-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Emp ID</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Joining Date</th>
                                <th>Shift</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                                        Loading employees from SQL database...
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                                        No employees found matching your search and filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                employees.map(emp => (
                                    <tr key={emp.employee_id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '34px',
                                                    height: '34px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: '700',
                                                    fontSize: '12px',
                                                    flexShrink: 0
                                                }}>
                                                    {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '13px' }}>
                                                        {emp.full_name}
                                                    </strong>
                                                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                                        {emp.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="mono" style={{
                                                padding: '2px 8px',
                                                background: 'rgba(59, 130, 246, 0.12)',
                                                borderRadius: '6px',
                                                color: '#60a5fa',
                                                fontWeight: '700'
                                            }}>
                                                {emp.employee_id}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {emp.department}
                                            </span>
                                        </td>
                                        <td>{emp.designation}</td>
                                        <td className="mono">{emp.joining_date || '-'}</td>
                                        <td>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {emp.shift ? emp.shift.split('(')[0].trim() : 'General'}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                borderRadius: '9999px',
                                                background: 'var(--border-light)',
                                                fontWeight: '600'
                                            }}>
                                                {emp.employment_type || 'Full Time'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${emp.status === 'Active' ? 'badge-present' : 'badge-absent'}`} style={{
                                                background: emp.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: emp.status === 'Active' ? 'var(--success)' : 'var(--danger)',
                                                padding: '3px 10px',
                                                borderRadius: '9999px',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                <span style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    backgroundColor: emp.status === 'Active' ? 'var(--success)' : 'var(--danger)'
                                                }}></span>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                {/* View Profile */}
                                                <button 
                                                    className="btn btn-default"
                                                    style={{ padding: '5px 9px', fontSize: '11.5px' }}
                                                    onClick={() => handleViewProfile(emp)}
                                                    title="View Detailed Profile"
                                                >
                                                    View
                                                </button>

                                                {/* Edit */}
                                                <button 
                                                    className="btn btn-default"
                                                    style={{ padding: '5px 9px', fontSize: '11.5px' }}
                                                    onClick={() => handleOpenEditModal(emp)}
                                                    title="Edit Details"
                                                >
                                                    Edit
                                                </button>

                                                {/* Deactivate/Activate */}
                                                <button 
                                                    className={`btn ${emp.status === 'Active' ? 'btn-danger-subtle' : 'btn-default'}`}
                                                    style={{ padding: '5px 9px', fontSize: '11.5px' }}
                                                    onClick={() => handleToggleStatus(emp)}
                                                    title={emp.status === 'Active' ? 'Deactivate Employee' : 'Activate Employee'}
                                                >
                                                    {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                                                </button>

                                                {/* Delete */}
                                                <button 
                                                    className="btn btn-danger-subtle"
                                                    style={{ padding: '5px 8px', fontSize: '11.5px' }}
                                                    onClick={() => handleDeleteEmployee(emp)}
                                                    title="Permanently Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ================================================================= */}
            {/* ADD / EDIT EMPLOYEE MODAL */}
            {/* ================================================================= */}
            {formModalOpen && (
                <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" style={{ width: '640px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '17px', fontWeight: '800' }}>
                                    {editingEmp ? `Edit Employee (${editingEmp.employee_id})` : 'Add New Employee'}
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {editingEmp ? 'Update employee profile and employment details in database' : 'Register a new employee into the centralized SQLite database'}
                                </p>
                            </div>
                            <button className="btn btn-default" style={{ padding: '4px 8px' }} onClick={() => setFormModalOpen(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSaveEmployee}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {/* Employee ID */}
                                    <div className="filter-group">
                                        <label className="filter-label">
                                            Employee ID <span style={{ color: 'var(--danger)' }}>*</span>
                                        </label>
                                        <input 
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g. EMP101, TEMP-001 or 429"
                                            value={formData.employee_id}
                                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                            style={{ borderColor: formErrors.employee_id ? 'var(--danger)' : undefined }}
                                        />
                                        {formErrors.employee_id && (
                                            <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                                                {formErrors.employee_id}
                                            </span>
                                        )}
                                        {editingEmp && (
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                                                Note: Changing Employee ID will safely update all linked attendance and leave records.
                                            </span>
                                        )}
                                    </div>

                                    {/* Full Name */}
                                    <div className="filter-group">
                                        <label className="filter-label">
                                            Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                                        </label>
                                        <input 
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g. Rahul Kumar"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            style={{ borderColor: formErrors.full_name ? 'var(--danger)' : undefined }}
                                        />
                                        {formErrors.full_name && (
                                            <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                                                {formErrors.full_name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {/* Email */}
                                    <div className="filter-group">
                                        <label className="filter-label">Email Address (Optional)</label>
                                        <input 
                                            type="email"
                                            className="input-field"
                                            placeholder="name@company.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            style={{ borderColor: formErrors.email ? 'var(--danger)' : undefined }}
                                        />
                                        {formErrors.email && (
                                            <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                                                {formErrors.email}
                                            </span>
                                        )}
                                    </div>

                                    {/* Phone Number */}
                                    <div className="filter-group">
                                        <label className="filter-label">Phone Number (Optional)</label>
                                        <input 
                                            type="text"
                                            className="input-field"
                                            placeholder="+1 (555) 000-0000"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {/* Department */}
                                    <div className="filter-group">
                                        <label className="filter-label">Department (Optional)</label>
                                        <select 
                                            className="select-field"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        >
                                            <option value="">(Not Specified)</option>
                                            {DEPARTMENTS.filter(d => d !== 'All').map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Designation */}
                                    <div className="filter-group">
                                        <label className="filter-label">Designation (Optional)</label>
                                        <input 
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g. Senior Software Engineer"
                                            value={formData.designation}
                                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                            style={{ borderColor: formErrors.designation ? 'var(--danger)' : undefined }}
                                        />
                                        {formErrors.designation && (
                                            <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                                                {formErrors.designation}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {/* Joining Date */}
                                    <div className="filter-group">
                                        <label className="filter-label">Joining Date (Optional)</label>
                                        <input 
                                            type="date"
                                            className="input-field"
                                            value={formData.joining_date}
                                            onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                                            style={{ borderColor: formErrors.joining_date ? 'var(--danger)' : undefined }}
                                        />
                                    </div>

                                    {/* Shift */}
                                    <div className="filter-group">
                                        <label className="filter-label">Assigned Shift</label>
                                        <select 
                                            className="select-field"
                                            value={formData.shift}
                                            onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                                        >
                                            {SHIFTS.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {/* Employment Type */}
                                    <div className="filter-group">
                                        <label className="filter-label">Employment Type</label>
                                        <select 
                                            className="select-field"
                                            value={formData.employment_type}
                                            onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                                        >
                                            {EMPLOYMENT_TYPES.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div className="filter-group">
                                        <label className="filter-label">Status</label>
                                        <select 
                                            className="select-field"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-default" 
                                    onClick={() => setFormModalOpen(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Saving...' : editingEmp ? 'Update Employee' : 'Add Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* EMPLOYEE DETAILS VIEW MODAL */}
            {/* ================================================================= */}
            {profileModalOpen && (
                <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" style={{ width: '760px', maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>
                                    Employee Profile & Integrated Intelligence
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Unified profile from SQLite database with attendance and leave summaries
                                </p>
                            </div>
                            <button className="btn btn-default" style={{ padding: '4px 8px' }} onClick={() => setProfileModalOpen(false)}>✕</button>
                        </div>

                        <div className="modal-body" style={{ padding: '20px 24px' }}>
                            {profileLoading || !profileData ? (
                                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                    Loading profile and metrics from SQLite...
                                </div>
                            ) : (
                                <>
                                    {/* Profile Hero Card */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '18px',
                                        padding: '16px 20px',
                                        background: 'var(--border-light)',
                                        borderRadius: '12px',
                                        marginBottom: '20px'
                                    }}>
                                        <div style={{
                                            width: '54px',
                                            height: '54px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            fontWeight: '800',
                                            flexShrink: 0
                                        }}>
                                            {profileData.employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h4 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                    {profileData.employee.full_name}
                                                </h4>
                                                <span className="mono" style={{ padding: '2px 7px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                                    {profileData.employee.employee_id}
                                                </span>
                                                <span className={`badge ${profileData.employee.status === 'Active' ? 'badge-present' : 'badge-absent'}`} style={{
                                                    background: profileData.employee.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                    color: profileData.employee.status === 'Active' ? 'var(--success)' : 'var(--danger)',
                                                    padding: '2px 8px',
                                                    borderRadius: '9999px',
                                                    fontSize: '10.5px',
                                                    fontWeight: '700'
                                                }}>
                                                    {profileData.employee.status}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                {profileData.employee.designation} • {profileData.employee.department}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                ✉️ {profileData.employee.email} • 📞 {profileData.employee.phone || 'N/A'} • 📅 Joined {profileData.employee.joining_date || 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Attendance Summary */}
                                    <div style={{ marginBottom: '22px' }}>
                                        <h5 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                            📊 Attendance Summary
                                        </h5>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                                            <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Present</span>
                                                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
                                                    {profileData.attendanceSummary.totalPresent}
                                                </div>
                                            </div>
                                            <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Days</span>
                                                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
                                                    {profileData.attendanceSummary.fullDays}
                                                </div>
                                            </div>
                                            <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Half Days</span>
                                                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--cyan)', marginTop: '4px' }}>
                                                    {profileData.attendanceSummary.halfDays}
                                                </div>
                                            </div>
                                            <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Late Days</span>
                                                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--warning)', marginTop: '4px' }}>
                                                    {profileData.attendanceSummary.lateDays}
                                                </div>
                                            </div>
                                            <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Work Hours</span>
                                                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                                                    {profileData.attendanceSummary.totalWorkHours}h
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Leave Summary */}
                                    <div style={{ marginBottom: '22px' }}>
                                        <h5 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                            🏖️ Leave Summary & Balances
                                        </h5>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                                            <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Applied</span>
                                                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                                                    {profileData.leaveSummary.totalLeave}
                                                </div>
                                            </div>
                                            <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Approved</span>
                                                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
                                                    {profileData.leaveSummary.approvedLeave}
                                                </div>
                                            </div>
                                            <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending</span>
                                                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--warning)', marginTop: '4px' }}>
                                                    {profileData.leaveSummary.pendingLeave}
                                                </div>
                                            </div>
                                            <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rejected</span>
                                                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>
                                                    {profileData.leaveSummary.rejectedLeave}
                                                </div>
                                            </div>
                                            <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Available Days</span>
                                                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--cyan)', marginTop: '4px' }}>
                                                    {profileData.leaveSummary.remainingBalance}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Attendance Records */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <h5 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                            Recent Attendance Punches
                                        </h5>
                                        {profileData.recentAttendance.length === 0 ? (
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                No attendance punches logged yet for this employee.
                                            </div>
                                        ) : (
                                            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                                                <table className="data-table" style={{ fontSize: '12px' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Status</th>
                                                            <th>First In</th>
                                                            <th>Last Out</th>
                                                            <th>Late (Mins)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {profileData.recentAttendance.map((rec, i) => (
                                                            <tr key={i}>
                                                                <td className="mono">{rec.date}</td>
                                                                <td>
                                                                    <span style={{ fontWeight: '700', fontSize: '11px' }}>
                                                                        {rec.status}
                                                                    </span>
                                                                </td>
                                                                <td className="mono">{rec.firstLogin}</td>
                                                                <td className="mono">{rec.lastLogout}</td>
                                                                <td className="mono" style={{ color: rec.lateMinutes > 0 ? 'var(--warning)' : undefined }}>
                                                                    {rec.lateMinutes || 0}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Recent Leave Requests */}
                                    <div>
                                        <h5 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                            Recent Leave Requests
                                        </h5>
                                        {profileData.recentLeaves.length === 0 ? (
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                No leave requests submitted yet.
                                            </div>
                                        ) : (
                                            <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
                                                <table className="data-table" style={{ fontSize: '12px' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Type</th>
                                                            <th>Start</th>
                                                            <th>End</th>
                                                            <th>Reason</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {profileData.recentLeaves.map((l, i) => (
                                                            <tr key={i}>
                                                                <td><strong>{l.leaveType}</strong></td>
                                                                <td className="mono">{l.startDate}</td>
                                                                <td className="mono">{l.endDate}</td>
                                                                <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {l.reason}
                                                                </td>
                                                                <td>
                                                                    <span style={{
                                                                        fontSize: '10.5px',
                                                                        fontWeight: '700',
                                                                        padding: '2px 7px',
                                                                        borderRadius: '9999px',
                                                                        background: l.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.2)' : l.status === 'PENDING' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                                        color: l.status === 'APPROVED' ? 'var(--success)' : l.status === 'PENDING' ? 'var(--warning)' : 'var(--danger)'
                                                                    }}>
                                                                        {l.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-default" onClick={() => setProfileModalOpen(false)}>
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
