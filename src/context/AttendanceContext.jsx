// Attendance Engine & State Context
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { attendanceService } from '../services/attendanceService';
import { DEFAULT_RULES, parseBiometricRawText, parseCSVText } from '../utils/attendanceParser';
import { sampleAugustData, sampleJulyData } from '../utils/demoData';
import { useLeave } from './LeaveContext';

const AttendanceContext = createContext(null);

export function AttendanceProvider({ children }) {
    const { requests, holidays } = useLeave();

    const [state, setState] = useState(() => {
        const loaded = attendanceService.load();
        return {
            rawData: loaded.rawData,
            rules: loaded.rules,
            rawLines: [],
            datasetName: loaded.rawData.length > 0 ? "Saved Workspace" : "No Data"
        };
    });

    // Filters & Pagination State
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [lateOnly, setLateOnly] = useState(false);

    const [pageSize, setPageSize] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortCol, setSortCol] = useState("date");
    const [sortAsc, setSortAsc] = useState(false);

    // Punch Timeline Modal State
    const [timelineModal, setTimelineModal] = useState({ open: false, record: null });

    // Re-evaluate attendance whenever approved leaves or holidays change
    useEffect(() => {
        if (state.rawData.length > 0) {
            const approved = requests.filter(r => r.status === "APPROVED");
            const updated = attendanceService.recalculateRecords(state.rawData, state.rules, approved, holidays);
            setState(prev => ({ ...prev, rawData: updated }));
            attendanceService.save(updated, state.rules);
        }
    }, [requests, holidays, state.rules]);

    // Initial demo load if empty
    useEffect(() => {
        if (state.rawData.length === 0) {
            loadDemo("august");
        }
    }, []);

    const loadDemo = useCallback((name) => {
        const text = (name === "july") ? sampleJulyData.trim() : sampleAugustData.trim();
        const approved = requests.filter(r => r.status === "APPROVED");
        const parsed = parseBiometricRawText(text, state.rules, approved, holidays);

        setState(prev => ({
            ...prev,
            rawData: parsed.records,
            rawLines: parsed.rawLines,
            datasetName: `DEMO ${name.toUpperCase()} LOADED`
        }));
        attendanceService.save(parsed.records, state.rules);
    }, [requests, holidays, state.rules]);

    const ingestRawText = useCallback((text, sourceName = "Raw Biometric Stream") => {
        const approved = requests.filter(r => r.status === "APPROVED");
        const parsed = parseBiometricRawText(text, state.rules, approved, holidays);
        if (parsed.records.length > 0) {
            setState(prev => ({
                ...prev,
                rawData: parsed.records,
                rawLines: parsed.rawLines,
                datasetName: sourceName.toUpperCase()
            }));
            attendanceService.save(parsed.records, state.rules);
        }
        return parsed;
    }, [requests, holidays, state.rules]);

    const ingestCSV = useCallback((text, sourceName = "CSV Ingestion") => {
        const approved = requests.filter(r => r.status === "APPROVED");
        const parsed = parseCSVText(text, state.rules, approved, holidays);
        if (parsed.records.length > 0) {
            setState(prev => ({
                ...prev,
                rawData: parsed.records,
                rawLines: parsed.rawLines,
                datasetName: sourceName.toUpperCase()
            }));
            attendanceService.save(parsed.records, state.rules);
        }
        return parsed;
    }, [requests, holidays, state.rules]);

    const updateRules = useCallback((newRules) => {
        setState(prev => {
            const merged = { ...prev.rules, ...newRules };
            const approved = requests.filter(r => r.status === "APPROVED");
            const recalculated = attendanceService.recalculateRecords(prev.rawData, merged, approved, holidays);
            attendanceService.save(recalculated, merged);
            return {
                ...prev,
                rules: merged,
                rawData: recalculated
            };
        });
    }, [requests, holidays]);

    const clearAttendance = useCallback(() => {
        attendanceService.clear();
        setState({
            rawData: [],
            rules: DEFAULT_RULES,
            rawLines: [],
            datasetName: "No Data Loaded"
        });
    }, []);

    // Filter and Sort Logic
    const filteredData = useMemo(() => {
        const s = search.toLowerCase().trim();
        return state.rawData.filter(r => {
            if (s && !String(r.employeeId).toLowerCase().includes(s) && !String(r.employeeName || '').toLowerCase().includes(s)) return false;
            if (dateFilter && r.date !== dateFilter) return false;
            if (statusFilter && r.status !== statusFilter) return false;
            if (employeeFilter && String(r.employeeId) !== String(employeeFilter)) return false;
            if (lateOnly && (r.lateMinutes || 0) <= 0) return false;
            return true;
        }).sort((a, b) => {
            let vA = a[sortCol] ?? "";
            let vB = b[sortCol] ?? "";
            if (typeof vA === "number" && typeof vB === "number") {
                return sortAsc ? vA - vB : vB - vA;
            }
            return sortAsc ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
        });
    }, [state.rawData, search, dateFilter, statusFilter, employeeFilter, lateOnly, sortCol, sortAsc]);

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortAsc(!sortAsc);
        } else {
            setSortCol(col);
            setSortAsc(true);
        }
    };

    const resetFilters = () => {
        setSearch("");
        setDateFilter("");
        setStatusFilter("");
        setEmployeeFilter("");
        setLateOnly(false);
        setCurrentPage(1);
    };

    const openTimeline = (empId, date) => {
        const rec = state.rawData.find(r => String(r.employeeId) === String(empId) && r.date === date);
        if (rec) setTimelineModal({ open: true, record: rec });
    };

    const closeTimeline = () => {
        setTimelineModal({ open: false, record: null });
    };

    const value = {
        rawData: state.rawData,
        filteredData,
        rawLines: state.rawLines,
        rules: state.rules,
        datasetName: state.datasetName,
        loadDemo,
        ingestRawText,
        ingestCSV,
        updateRules,
        clearAttendance,
        // Filter states
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
        // Sort & Pagination
        sortCol,
        sortAsc,
        handleSort,
        pageSize,
        setPageSize,
        currentPage,
        setCurrentPage,
        // Timeline Modal
        timelineModal,
        openTimeline,
        closeTimeline
    };

    return (
        <AttendanceContext.Provider value={value}>
            {children}
        </AttendanceContext.Provider>
    );
}

export function useAttendance() {
    const context = useContext(AttendanceContext);
    if (!context) {
        throw new Error("useAttendance must be used within an AttendanceProvider");
    }
    return context;
}
