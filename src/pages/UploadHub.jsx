// Biometric Data Ingestion & Configuration Hub Page
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAttendance } from '../context/AttendanceContext';
import { employeeService } from '../services/employeeService';
import { timeStringToMinutes, minutesToTime } from '../utils/timeUtils';

export function UploadHub({ onToast }) {
    const navigate = useNavigate();
    const { ingestRawText, ingestCSV, loadDemo, rules, updateRules } = useAttendance();

    const [pasteText, setPasteText] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    // Shift rules local state for the form
    const [ruleForm, setRuleForm] = useState({
        morningStart: minutesToTime(rules.morningStart),
        morningGrace: minutesToTime(rules.morningGrace),
        morningHalfLimit: minutesToTime(rules.morningHalfLimit),
        lunchCheckout: minutesToTime(rules.lunchCheckout),
        lunchCheckin: minutesToTime(rules.lunchCheckin),
        fullDayHours: rules.fullDayHours || 8
    });

    const validateEmployeeExistence = async (records) => {
        try {
            const emps = await employeeService.getAll();
            const validIds = new Set(emps.map(e => String(e.employee_id || e.id)));
            for (const r of records) {
                const eid = String(r.employeeId || r.employee_id || '').trim();
                if (eid && !validIds.has(eid)) {
                    return {
                        valid: false,
                        missingId: eid,
                        message: `Employee ${eid} does not exist. Please add the employee before importing attendance.`
                    };
                }
            }
        } catch (err) {
            console.error("Could not validate against employee database", err);
        }
        return { valid: true };
    };

    const handleFileProcess = (file) => {
        if (!file) return;
        const name = file.name.toLowerCase();
        const reader = new FileReader();

        if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
            reader.onload = async function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: "array" });
                    const firstSheet = wb.Sheets[wb.SheetNames[0]];
                    const csvContent = XLSX.utils.sheet_to_csv(firstSheet);
                    const result = ingestCSV(csvContent, file.name);

                    const check = await validateEmployeeExistence(result.records);
                    if (!check.valid) {
                        if (onToast) onToast(check.message, "danger");
                        alert(check.message);
                        return;
                    }

                    if (onToast) onToast(`Loaded Excel file (${result.records.length} records generated)`, "success");
                    navigate("/records");
                } catch (err) {
                    if (onToast) onToast("Failed to parse Excel spreadsheet.", "danger");
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (name.endsWith(".csv")) {
            reader.onload = async function(e) {
                const result = ingestCSV(e.target.result, file.name);
                const check = await validateEmployeeExistence(result.records);
                if (!check.valid) {
                    if (onToast) onToast(check.message, "danger");
                    alert(check.message);
                    return;
                }

                if (onToast) onToast(`Loaded CSV (${result.records.length} records generated)`, "success");
                navigate("/records");
            };
            reader.readAsText(file);
        } else {
            // Raw TXT / DAT
            reader.onload = async function(e) {
                const result = ingestRawText(e.target.result, file.name);
                const check = await validateEmployeeExistence(result.records);
                if (!check.valid) {
                    if (onToast) onToast(check.message, "danger");
                    alert(check.message);
                    return;
                }

                if (onToast) onToast(`Loaded ${result.punchCount} punches (${result.records.length} records generated)`, "success");
                navigate("/records");
            };
            reader.readAsText(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileProcess(files[0]);
        }
    };

    const handlePasteProcess = async () => {
        if (!pasteText.trim()) {
            if (onToast) onToast("Please paste raw biometric text lines first.", "warning");
            return;
        }
        const result = ingestRawText(pasteText, "Pasted Raw Data");
        const check = await validateEmployeeExistence(result.records);
        if (!check.valid) {
            if (onToast) onToast(check.message, "danger");
            alert(check.message);
            return;
        }

        if (onToast) onToast(`Processed pasted text: ${result.records.length} records`, "success");
        navigate("/records");
    };

    const handleDemoLoad = (datasetKey) => {
        loadDemo(datasetKey);
        if (onToast) onToast(`Loaded ${datasetKey.toUpperCase()} sample dataset`, "success");
        navigate("/");
    };

    const handleSaveRules = (e) => {
        e.preventDefault();
        const updated = {
            morningStart: timeStringToMinutes(ruleForm.morningStart),
            morningGrace: timeStringToMinutes(ruleForm.morningGrace),
            morningHalfLimit: timeStringToMinutes(ruleForm.morningHalfLimit),
            lunchCheckout: timeStringToMinutes(ruleForm.lunchCheckout),
            lunchCheckin: timeStringToMinutes(ruleForm.lunchCheckin),
            fullDayHours: Number(ruleForm.fullDayHours) || 8
        };
        updateRules(updated);
        if (onToast) onToast("Shift timing rules saved & records recalculated!", "success");
    };

    return (
        <section className="page-view active">
            <div className="section-heading">
                <div className="section-heading-left">
                    <h2>📥 Biometric Data Ingestion Hub</h2>
                    <p>Upload new biometric logs (.DAT, .TXT, .CSV, .XLSX), test sample datasets & configure shift timings</p>
                </div>
            </div>

            <div className="upload-container">
                {/* Drag & Drop Zone */}
                <div 
                    className={`drop-zone ${isDragOver ? 'dragover' : ''}`}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                >
                    <div className="drop-zone-icon">
                        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <h3>Click or Drag & Drop Attendance Logs</h3>
                    <p>Upload Biometric device dumps (.dat, .txt), CSV files or Excel spreadsheets (.xlsx, .xls)</p>

                    <div className="file-badges-row">
                        <span className="file-ext-tag">.DAT (ZKTeco/Essl)</span>
                        <span className="file-ext-tag">.TXT (Biometric RAW)</span>
                        <span className="file-ext-tag">.CSV (Processed)</span>
                        <span className="file-ext-tag">.XLSX / .XLS (Excel)</span>
                    </div>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: "none" }}
                        accept=".txt,.dat,.csv,.xlsx,.xls,text/plain,text/csv"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleFileProcess(e.target.files[0]);
                            }
                        }}
                    />
                </div>

                {/* Direct Paste Box */}
                <div style={{ marginTop: "24px" }}>
                    <div className="panel-header" style={{ marginBottom: "8px" }}>
                        <div className="panel-title" style={{ fontSize: "14px" }}>Or Quick Paste Raw Punch Text</div>
                    </div>
                    <textarea 
                        className="input-field" 
                        style={{ height: "110px", fontFamily: "var(--font-mono)", fontSize: "12px", padding: "10px", resize: "vertical" }}
                        placeholder={"Paste raw biometric lines here, e.g.:\n378   2026-08-01 09:25:06   1   0   3   0\n405   2026-08-01 09:28:50   1   0   1   0"}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                    />
                    <button className="btn btn-default" style={{ marginTop: "8px" }} onClick={handlePasteProcess}>
                        Process Pasted Text
                    </button>
                </div>

                {/* Demo Data Quick Launcher */}
                <div className="demo-box">
                    <div>
                        <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>Test with built-in Sample Datasets</strong>
                        <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                            Instantly populate the system with biometric punches including Employee 428 absent records and shifts.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button className="btn btn-default" onClick={() => handleDemoLoad("august")}>
                            Load August Data
                        </button>
                        <button className="btn btn-default" onClick={() => handleDemoLoad("july")}>
                            Load July Data
                        </button>
                    </div>
                </div>

                {/* Shift Timing Rules Config Form */}
                <div style={{ marginTop: "32px", borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
                    <div className="panel-title" style={{ marginBottom: "4px" }}>
                        ⚙️ Configure Shift Timing Rules & Grace Cutoffs
                    </div>
                    <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                        Changes immediately re-evaluate late calculations and presence statuses across all loaded records.
                    </p>

                    <form onSubmit={handleSaveRules}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                            <div className="filter-group">
                                <label className="filter-label">Morning Start (HH:MM)</label>
                                <input 
                                    className="input-field" 
                                    type="time" 
                                    value={ruleForm.morningStart} 
                                    onChange={(e) => setRuleForm({ ...ruleForm, morningStart: e.target.value })} 
                                />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Morning Grace Time</label>
                                <input 
                                    className="input-field" 
                                    type="time" 
                                    value={ruleForm.morningGrace} 
                                    onChange={(e) => setRuleForm({ ...ruleForm, morningGrace: e.target.value })} 
                                />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Morning Half Cutoff</label>
                                <input 
                                    className="input-field" 
                                    type="time" 
                                    value={ruleForm.morningHalfLimit} 
                                    onChange={(e) => setRuleForm({ ...ruleForm, morningHalfLimit: e.target.value })} 
                                />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Lunch Checkout</label>
                                <input 
                                    className="input-field" 
                                    type="time" 
                                    value={ruleForm.lunchCheckout} 
                                    onChange={(e) => setRuleForm({ ...ruleForm, lunchCheckout: e.target.value })} 
                                />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Lunch Checkin Limit</label>
                                <input 
                                    className="input-field" 
                                    type="time" 
                                    value={ruleForm.lunchCheckin} 
                                    onChange={(e) => setRuleForm({ ...ruleForm, lunchCheckin: e.target.value })} 
                                />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Full Shift Hours</label>
                                <input 
                                    className="input-field" 
                                    type="number" 
                                    value={ruleForm.fullDayHours} 
                                    onChange={(e) => setRuleForm({ ...ruleForm, fullDayHours: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button 
                                type="button" 
                                className="btn btn-default" 
                                onClick={() => setRuleForm({
                                    morningStart: "09:30",
                                    morningGrace: "09:35",
                                    morningHalfLimit: "10:30",
                                    lunchCheckout: "13:55",
                                    lunchCheckin: "14:30",
                                    fullDayHours: 8
                                })}
                            >
                                Reset Defaults
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Save Rules & Recalculate
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
}
