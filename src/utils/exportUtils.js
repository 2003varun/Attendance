// CSV, Excel (SheetJS), and Print export helpers
import * as XLSX from 'xlsx';

export function exportToCSV(filename, headers, rows) {
    const allRows = [headers, ...rows];
    const csvStr = allRows.map(row => 
        row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export function exportToExcel(filename, sheetName, jsonData) {
    try {
        const ws = XLSX.utils.json_to_sheet(jsonData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName || "Report");
        XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
    } catch (err) {
        console.error("Failed to export Excel", err);
    }
}

export function printCurrentView() {
    window.print();
}
