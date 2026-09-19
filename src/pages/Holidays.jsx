// Company Holiday Management Module
import React, { useState } from 'react';
import { useLeave } from '../context/LeaveContext';
import { useAuth } from '../context/AuthContext';
import { formatDateDisplay, getDayOfWeek } from '../utils/dateUtils';
import { Modal } from '../components/common/Modal';

export function Holidays({ onToast }) {
    const { holidays, addHoliday, updateHoliday, deleteHoliday } = useLeave();
    const { isAdmin } = useAuth();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [form, setForm] = useState({
        date: new Date().toISOString().slice(0, 10),
        name: "",
        type: "National Holiday"
    });

    const openAdd = () => {
        setEditingHoliday(null);
        setForm({
            date: new Date().toISOString().slice(0, 10),
            name: "",
            type: "National Holiday"
        });
        setModalOpen(true);
    };

    const openEdit = (h) => {
        setEditingHoliday(h);
        setForm({ ...h });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingHoliday) {
                await updateHoliday(editingHoliday.id, form);
                if (onToast) onToast(`Updated holiday ${form.name}`, "success");
            } else {
                await addHoliday(form);
                if (onToast) onToast(`Added holiday ${form.name}`, "success");
            }
            setModalOpen(false);
        } catch (err) {
            if (onToast) onToast(err.message || "Failed to save holiday", "danger");
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Delete holiday "${name}"?`)) {
            try {
                await deleteHoliday(id);
                if (onToast) onToast("Holiday deleted", "info");
            } catch (err) {
                if (onToast) onToast(err.message || "Failed to delete holiday", "danger");
            }
        }
    };

    return (
        <section className="page-view active">
            <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="section-heading-left">
                    <h2>📅 Official Holiday Calendar & Exceptions</h2>
                    <p>Corporate gazetted holidays, national observances & automated leave exclusion policy</p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={openAdd}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Holiday
                    </button>
                )}
            </div>

            {/* Policy Banner */}
            <div className="panel-card" style={{ marginBottom: "20px", background: "var(--primary-light)", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "24px" }}>ℹ️</div>
                    <div>
                        <strong style={{ color: "var(--primary)", fontSize: "14px" }}>Leave Auto-Deduction Policy</strong>
                        <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                            When an employee requests leave spanning across any listed company holiday or configured weekly off (Sunday), those days are automatically deducted from the requested leave days count.
                        </p>
                    </div>
                </div>
            </div>

            {/* Holiday Table */}
            <div className="table-responsive">
                <div className="table-info-bar">
                    <div>Configured Holidays ({holidays.length} calendar events)</div>
                </div>

                <div className="table-scroll-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Day</th>
                                <th>Holiday Title</th>
                                <th>Holiday Category</th>
                                <th>Leave Deduction Impact</th>
                                {isAdmin && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {holidays.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                                        No holidays configured.
                                    </td>
                                </tr>
                            ) : (
                                holidays.map(h => (
                                    <tr key={h.id}>
                                        <td className="mono font-semibold">{formatDateDisplay(h.date)}</td>
                                        <td className="font-semibold">{getDayOfWeek(h.date)}</td>
                                        <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{h.name}</td>
                                        <td>
                                            <span className="badge badge-holiday">
                                                <span className="badge-dot"></span>
                                                {h.type}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge badge-full">
                                                Excluded From Leave Days
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <button 
                                                        className="btn btn-default" 
                                                        style={{ padding: "4px 8px", fontSize: "11px" }}
                                                        onClick={() => openEdit(h)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        className="btn btn-danger" 
                                                        style={{ padding: "4px 8px", fontSize: "11px" }}
                                                        onClick={() => handleDelete(h.id, h.name)}
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

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingHoliday ? "Edit Holiday" : "Add New Holiday"}
            >
                <form onSubmit={handleSave}>
                    <div className="filter-group" style={{ marginBottom: "14px" }}>
                        <label className="filter-label">Holiday Date *</label>
                        <input 
                            className="input-field" 
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="filter-group" style={{ marginBottom: "14px" }}>
                        <label className="filter-label">Holiday Name *</label>
                        <input 
                            className="input-field" 
                            placeholder="e.g. Independence Day"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="filter-group" style={{ marginBottom: "20px" }}>
                        <label className="filter-label">Holiday Type</label>
                        <select 
                            className="select-field"
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                        >
                            <option value="National Holiday">National Holiday</option>
                            <option value="Gazetted Holiday">Gazetted Holiday</option>
                            <option value="Festival Holiday">Festival Holiday</option>
                            <option value="Restricted / Optional">Restricted / Optional</option>
                        </select>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button type="button" className="btn btn-default" onClick={() => setModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Save Holiday
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
