# Script to non-destructively export existing SQLite database to JSON
import os
import sys
import json
import sqlite3

SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(SERVER_DIR, 'attendance_os.db')
BACKUP_PATH = os.path.join(SERVER_DIR, 'data_backup.json')

def export_data():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return False

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    backup = {}
    tables = ['employees', 'attendance_records', 'leave_requests', 'leave_balances']

    for tbl in tables:
        try:
            cur.execute(f"SELECT * FROM {tbl}")
            rows = [dict(r) for r in cur.fetchall()]
            backup[tbl] = rows
            print(f"Exported {len(rows)} records from table '{tbl}'.")
        except sqlite3.OperationalError as e:
            print(f"Table '{tbl}' warning: {e}")
            backup[tbl] = []

    conn.close()

    with open(BACKUP_PATH, 'w', encoding='utf-8') as f:
        json.dump(backup, f, indent=2)

    print(f"Successfully exported data to: {BACKUP_PATH}")
    return True

if __name__ == '__main__':
    export_data()
