// Filters Toolbar Component for Attendance Records
import React from 'react';
import { useAttendance } from '../../context/AttendanceContext';

export function AttendanceFilterBar() {
    const {
        rawData,
        search,
        setSearch,
        dateFilter,
        setDateFilter,
        statusFilter,
        setStatusFilter,
        employeeFilter,
        setEmployeeFilter,
        lateOnly,
        setLateOnly,
        resetFilters,
        setCurrentPage
    } = useAttendance();

    const uniqueEmps = Array.from(new Set(rawData.map(r => r.employeeId))).sort((a, b) => Number(a) - Number(b));

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
    };

    const handleDateChange = (e) => {
        setDateFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleEmployeeChange = (e) => {
        setEmployeeFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleLateOnlyChange = (e) => {
        setLateOnly(e.target.checked);
        setCurrentPage(1);
    };

    return (
        <div className="filters-toolbar">
            <div className="filter-group">
                <label className="filter-label">Search Employee ID or Name</label>
                <input 
                    className="input-field" 
                    id="searchInput" 
                    placeholder="Search by ID or Name..." 
                    value={search}
                    onChange={handleSearchChange}
                />
            </div>

            <div className="filter-group">
                <label className="filter-label">Filter by Date</label>
                <input 
                    className="input-field" 
                    id="dateFilter" 
                    type="date" 
                    value={dateFilter}
                    onChange={handleDateChange}
                />
            </div>

            <div className="filter-group">
                <label className="filter-label">Attendance Status</label>
                <select 
                    className="select-field" 
                    id="statusFilter" 
                    value={statusFilter}
                    onChange={handleStatusChange}
                >
                    <option value="">All Statuses</option>
                    <option>FULL DAY PRESENT</option>
                    <option>PRESENT IN THE MORNING</option>
                    <option>PRESENT IN THE AFTERNOON</option>
                    <option>ON LEAVE</option>
                    <option>ABSENT</option>
                    <option>SUNDAY / WEEKLY OFF</option>
                    <option>HOLIDAY</option>
                </select>
            </div>

            <div className="filter-group">
                <label className="filter-label">Select Employee</label>
                <select 
                    className="select-field" 
                    id="employeeFilter" 
                    value={employeeFilter}
                    onChange={handleEmployeeChange}
                >
                    <option value="">All Employees ({uniqueEmps.length})</option>
                    {uniqueEmps.map(emp => (
                        <option key={emp} value={emp}>Employee {emp}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group" style={{ display: "flex", justifyContent: "flex-end" }}>
                <label className="checkbox-group" style={{ marginTop: "20px" }}>
                    <input 
                        type="checkbox" 
                        id="lateOnlyFilter" 
                        checked={lateOnly}
                        onChange={handleLateOnlyChange}
                    />
                    Late Only
                </label>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <button className="btn btn-default" onClick={resetFilters}>
                    Reset
                </button>
            </div>
        </div>
    );
}
