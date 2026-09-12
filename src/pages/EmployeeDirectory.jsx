// Employee Directory & Management Module
import React, { useState, useEffect } from 'react';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

export function EmployeeDirectory({ onToast }) {
    const { isAdmin } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);

    const [form, setForm] = useState({
        id: "",
        name: "",
        email: "",
        department: "Engineering",
        designation: "",
        joiningDate: new Date().toISOString().slice(0, 10),
        manager: "Varun Sharma",
        status: "Active"
    });

    const refreshList = async () => {
        try {
            const list = await employeeService.getAll();
            setEmployees(list);
        } catch {
            setEmployees(employeeService.getAllSync());
        }
    };

    useEffect(() => {
        setEmployees(employeeService.getAllSync());
        refreshList();
    }, []);

    const departments = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);

    const filtered = employees.filter(e => {
        const s = search.toLowerCase();
        if (s && !e.name.toLowerCase().includes(s) && !String(e.id).includes(s) && !e.designation.toLowerCase().includes(s)) return false;
        if (deptFilter && e.department !== deptFilter) return false;
        return true;
    });

    const openAddModal = () => {
        setEditingEmp(null);
        setForm({
            id: String(Date.now()).slice(-4),
            name: "",
            email: "",
            department: "Engineering",
            designation: "",
            joiningDate: new Date().toISOString().slice(0, 10),
            manager: "Varun Sharma",
            status: "Active"
        });
        setModalOpen(true);
    };

    const openEditModal = (emp) => {
        setEditingEmp(emp);
        setForm({ ...emp });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingEmp) {
                await employeeService.update(editingEmp.id, form);
                if (onToast) onToast(`Updated employee ${form.name}`, "success");
            } else {
                await employeeService.add(form);
                if (onToast) onToast(`Added new employee ${form.name}`, "success");
            }
            await refreshList();
            setModalOpen(false);
        } catch (err) {
            alert(err.message || "Failed to save employee");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this employee?")) {
            await employeeService.delete(id);
            await refreshList();
            if (onToast) onToast("Employee removed", "info");
        }
    };

    return (
        <section className="page-view active">
            <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="section-heading-left">
                    <h2>👥 Employee Directory & Staff Profiles</h2>
                    <p>Manage organizational hierarchy, departments, designations and staff information</p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Employee
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="filters-toolbar" style={{ gridTemplateColumns: "2fr 1.5fr auto" }}>
                <div className="filter-group">
                    <label className="filter-label">Search Name, ID, or Designation</label>
                    <input 
                        className="input-field" 
                        placeholder="Search employee..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label className="filter-label">Department</label>
                    <select 
                        className="select-field"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button className="btn btn-default" onClick={() => { setSearch(""); setDeptFilter(""); }}>
                        Reset
                    </button>
                </div>
            </div>

            {/* Employee Table */}
            <div className="table-responsive">
                <div className="table-info-bar">
                    <div>Active Staff Roster ({filtered.length} employees)</div>
                </div>

                <div className="table-scroll-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Emp ID</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Joining Date</th>
                                <th>Reporting Manager</th>
                                <th>Status</th>
                                {isAdmin && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                                        No employees found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(emp => (
                                    <tr key={emp.id}>
                                        <td className="mono font-semibold">{emp.id}</td>
                                        <td>
                                            <div className="emp-avatar-chip">
                                                <div className="emp-avatar">
                                                    {emp.name.split(" ").map(n => n[0]).join("")}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{emp.name}</span>
                                            </div>
                                        </td>
                                        <td className="mono" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                            {emp.email}
                                        </td>
                                        <td>
                                            <span className="badge badge-off">{emp.department}</span>
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{emp.designation}</td>
                                        <td className="mono" style={{ fontSize: "12px" }}>{emp.joiningDate}</td>
                                        <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{emp.manager}</td>
                                        <td>
                                            <span className={`badge ${emp.status === 'Active' ? 'badge-full' : 'badge-absent'}`}>
                                                <span className="badge-dot"></span>
                                                {emp.status}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <button 
                                                        className="btn btn-default" 
                                                        style={{ padding: "4px 8px", fontSize: "11px" }}
                                                        onClick={() => openEditModal(emp)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        className="btn btn-danger" 
                                                        style={{ padding: "4px 8px", fontSize: "11px" }}
                                                        onClick={() => handleDelete(emp.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingEmp ? `Edit Employee ${form.name}` : "Add New Employee"}
            >
                <form onSubmit={handleSave}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                        <div className="filter-group">
                            <label className="filter-label">Employee ID *</label>
                            <input 
                                className="input-field"
                                value={form.id}
                                onChange={(e) => setForm({ ...form, id: e.target.value })}
                                disabled={Boolean(editingEmp)}
                                required
                            />
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">Full Name *</label>
                            <input 
                                className="input-field"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                        <div className="filter-group">
                            <label className="filter-label">Email Address *</label>
                            <input 
                                className="input-field"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">Department</label>
                            <input 
                                className="input-field"
                                value={form.department}
                                onChange={(e) => setForm({ ...form, department: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                        <div className="filter-group">
                            <label className="filter-label">Designation</label>
                            <input 
                                className="input-field"
                                value={form.designation}
                                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                                required
                            />
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">Joining Date</label>
                            <input 
                                className="input-field"
                                type="date"
                                value={form.joiningDate}
                                onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                        <div className="filter-group">
                            <label className="filter-label">Reporting Manager</label>
                            <input 
                                className="input-field"
                                value={form.manager}
                                onChange={(e) => setForm({ ...form, manager: e.target.value })}
                                required
                            />
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">Employment Status</label>
                            <select 
                                className="select-field"
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                            >
                                <option value="Active">Active</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button type="button" className="btn btn-default" onClick={() => setModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Save Employee
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
