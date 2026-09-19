# Migration utility to load exported data into any shared database engine (PostgreSQL, MySQL, SQLite)
import os
import sys
import json

SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

from app import app, db
from models import Employee, AttendanceRecord, LeaveRequest, LeaveBalance, Holiday

BACKUP_PATH = os.path.join(SERVER_DIR, 'data_backup.json')

def migrate(target_url=None):
    if target_url:
        if target_url.startswith('postgres://'):
            target_url = target_url.replace('postgres://', 'postgresql://', 1)
        app.config['SQLALCHEMY_DATABASE_URI'] = target_url

    print(f"Connecting to database: {app.config['SQLALCHEMY_DATABASE_URI']}")

    if not os.path.exists(BACKUP_PATH):
        print(f"Backup file {BACKUP_PATH} not found. Run export_sqlite.py first.")
        return False

    with open(BACKUP_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with app.app_context():
        db.create_all()

        # 1. Migrate Employees
        emps = data.get('employees', [])
        emp_count = 0
        for item in emps:
            existing = Employee.query.filter_by(employee_id=item['employee_id']).first()
            if not existing:
                emp = Employee(
                    employee_id=item['employee_id'],
                    full_name=item['full_name'],
                    email=item['email'],
                    phone=item.get('phone', ''),
                    department=item['department'],
                    designation=item['designation'],
                    joining_date=item.get('joining_date', ''),
                    shift=item.get('shift', 'Morning General (09:30 - 18:30)'),
                    employment_type=item.get('employment_type', 'Full Time'),
                    status=item.get('status', 'Active')
                )
                db.session.add(emp)
                emp_count += 1
        db.session.commit()
        print(f"Migrated {emp_count} new employees (Total: {Employee.query.count()}).")

        # 2. Migrate Leave Balances
        bals = data.get('leave_balances', [])
        bal_count = 0
        for item in bals:
            existing = LeaveBalance.query.filter_by(employee_id=item['employee_id'], leave_type=item['leave_type']).first()
            if not existing:
                bal = LeaveBalance(
                    employee_id=item['employee_id'],
                    leave_type=item['leave_type'],
                    total=item.get('total', 12.0),
                    used=item.get('used', 0.0),
                    pending=item.get('pending', 0.0),
                    available=item.get('available', 12.0)
                )
                db.session.add(bal)
                bal_count += 1
        db.session.commit()
        print(f"Migrated {bal_count} new leave balances (Total: {LeaveBalance.query.count()}).")

        # 3. Migrate Leave Requests
        leaves = data.get('leave_requests', [])
        leave_count = 0
        for item in leaves:
            existing = LeaveRequest.query.filter_by(
                employee_id=item['employee_id'],
                start_date=item['start_date'],
                leave_type=item['leave_type']
            ).first()
            if not existing:
                lr = LeaveRequest(
                    employee_id=item['employee_id'],
                    leave_type=item['leave_type'],
                    start_date=item['start_date'],
                    end_date=item['end_date'],
                    reason=item['reason'],
                    status=item.get('status', 'PENDING'),
                    applied_on=item.get('applied_on', '2026-08-01'),
                    days_count=item.get('days_count', 1.0),
                    approved_by=item.get('approved_by', ''),
                    rejection_reason=item.get('rejection_reason', '')
                )
                db.session.add(lr)
                leave_count += 1
        db.session.commit()
        print(f"Migrated {leave_count} new leave requests (Total: {LeaveRequest.query.count()}).")

        # 4. Migrate Attendance Records
        records = data.get('attendance_records', [])
        att_count = 0
        for item in records:
            existing = AttendanceRecord.query.filter_by(employee_id=item['employee_id'], date=item['date']).first()
            if not existing:
                rec = AttendanceRecord(
                    employee_id=item['employee_id'],
                    date=item['date'],
                    day=item.get('day', ''),
                    status=item.get('status', 'ABSENT'),
                    first_login=item.get('first_login', '-'),
                    lunch_out=item.get('lunch_out', '-'),
                    lunch_in=item.get('lunch_in', '-'),
                    last_logout=item.get('last_logout', '-'),
                    work_duration_minutes=item.get('work_duration_minutes', 0),
                    morning_late_minutes=item.get('morning_late_minutes', 0),
                    afternoon_late_minutes=item.get('afternoon_late_minutes', 0),
                    late_minutes=item.get('late_minutes', 0),
                    punches=item.get('punches', '[]')
                )
                db.session.add(rec)
                att_count += 1
        db.session.commit()
        print(f"Migrated {att_count} new attendance records (Total: {AttendanceRecord.query.count()}).")

    print("Migration completed successfully!")
    return True

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else os.getenv('DATABASE_URL')
    migrate(target)
