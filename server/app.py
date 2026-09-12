# Flask Backend Application for Attendance OS Pro
import os
import sys
import re
import json
from datetime import datetime, timezone

# Ensure the server directory is present in sys.path so 'models' is resolved everywhere
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from models import db, Employee, AttendanceRecord, LeaveRequest, LeaveBalance
except ImportError:
    from server.models import db, Employee, AttendanceRecord, LeaveRequest, LeaveBalance

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# SQLite database configuration
DB_DIR = os.path.dirname(os.path.abspath(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(DB_DIR, 'attendance_os.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

EMAIL_REGEX = r'^[\w\.-]+@[\w\.-]+\.\w+$'

# Baseline Employee seed list
SEED_EMPLOYEES = [
    { "employee_id": "75", "full_name": "Sarah Jenkins", "email": "sarah.j@company.com", "phone": "+1 (555) 234-5678", "department": "Engineering", "designation": "Staff Systems Engineer", "joining_date": "2023-03-15", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" },
    { "employee_id": "363", "full_name": "David Miller", "email": "david.m@company.com", "phone": "+1 (555) 345-6789", "department": "Engineering", "designation": "Frontend Developer", "joining_date": "2023-06-10", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" },
    { "employee_id": "378", "full_name": "Varun Sharma", "email": "varun.s@company.com", "phone": "+1 (555) 456-7890", "department": "Management", "designation": "Engineering Director", "joining_date": "2022-01-01", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" },
    { "employee_id": "396", "full_name": "Elena Rostova", "email": "elena.r@company.com", "phone": "+1 (555) 567-8901", "department": "Operations", "designation": "Operations Lead", "joining_date": "2023-08-01", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" },
    { "employee_id": "397", "full_name": "Rajesh Kumar", "email": "rajesh.k@company.com", "phone": "+1 (555) 678-9012", "department": "DevOps", "designation": "Cloud Architect", "joining_date": "2023-08-15", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" },
    { "employee_id": "405", "full_name": "Amit Patel", "email": "amit.p@company.com", "phone": "+1 (555) 789-0123", "department": "Product", "designation": "Product Manager", "joining_date": "2023-09-01", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" },
    { "employee_id": "411", "full_name": "Priya Nair", "email": "priya.n@company.com", "phone": "+1 (555) 890-1234", "department": "Design", "designation": "Lead UI/UX Designer", "joining_date": "2023-10-12", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" },
    { "employee_id": "418", "full_name": "Michael Chang", "email": "michael.c@company.com", "phone": "+1 (555) 901-2345", "department": "Engineering", "designation": "Backend Engineer", "joining_date": "2023-11-01", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" },
    { "employee_id": "419", "full_name": "Jessica Watson", "email": "jessica.w@company.com", "phone": "+1 (555) 012-3456", "department": "QA", "designation": "Quality Analyst", "joining_date": "2023-11-15", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" },
    { "employee_id": "424", "full_name": "Rohan Gupta", "email": "rohan.g@company.com", "phone": "+1 (555) 123-4567", "department": "Engineering", "designation": "Mobile App Engineer", "joining_date": "2024-01-10", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" },
    { "employee_id": "428", "full_name": "Kavita Rao", "email": "kavita.r@company.com", "phone": "+1 (555) 234-5670", "department": "Human Resources", "designation": "HR Specialist", "joining_date": "2024-02-01", "shift": "Morning General (09:30 - 18:30)", "employment_type": "Full Time", "status": "Active" }
]

def get_now():
    """Return timezone-aware UTC datetime or fallback to utcnow"""
    try:
        return datetime.now(timezone.utc)
    except Exception:
        return datetime.utcnow()

def safe_int(val, default=0):
    """Safely convert any value (string, float, int) to integer without throwing ValueError"""
    if val is None:
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default

def safe_float(val, default=0.0):
    """Safely convert any value to float without throwing ValueError"""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def find_employee(identifier):
    """Lookup employee safely by employee_id string or integer database ID without SQL type mismatch"""
    ident_str = str(identifier).strip()
    if not ident_str:
        return None
    if ident_str.isdigit():
        return Employee.query.filter((Employee.employee_id == ident_str) | (Employee.id == int(ident_str))).first()
    return Employee.query.filter_by(employee_id=ident_str).first()

def init_db():
    with app.app_context():
        db.create_all()
        if Employee.query.count() == 0:
            for item in SEED_EMPLOYEES:
                emp = Employee(**item)
                db.session.add(emp)
                # Seed default leave balances
                for lt, total in [("Casual Leave", 12.0), ("Sick Leave", 10.0), ("Earned Leave", 15.0), ("Unpaid Leave", 30.0)]:
                    bal = LeaveBalance(employee_id=emp.employee_id, leave_type=lt, total=total, used=0.0, pending=0.0, available=total)
                    db.session.add(bal)
            
            # Seed 2 demo leave requests
            db.session.add(LeaveRequest(
                employee_id="428",
                leave_type="Casual Leave",
                start_date="2026-08-10",
                end_date="2026-08-12",
                reason="Family function attendance in hometown",
                status="APPROVED",
                days_count=3.0,
                applied_on="2026-08-01"
            ))
            db.session.add(LeaveRequest(
                employee_id="411",
                leave_type="Sick Leave",
                start_date="2026-08-18",
                end_date="2026-08-19",
                reason="Viral fever recuperation",
                status="PENDING",
                days_count=2.0,
                applied_on="2026-08-17"
            ))
            db.session.commit()
            print("Database initialized and seeded with baseline employees and leave records.")

# Initialize database on app startup
init_db()


# ====================================================================
# EMPLOYEE API ENDPOINTS
# ====================================================================

@app.route('/api/employees', methods=['GET'])
def get_employees():
    query = request.args.get('query', '').strip().lower()
    department = request.args.get('department', '').strip()
    status = request.args.get('status', '').strip()

    q = Employee.query

    if department and department != "All":
        q = q.filter(Employee.department == department)
    if status and status != "All":
        q = q.filter(Employee.status == status)

    employees = q.order_by(Employee.id.asc()).all()

    if query:
        employees = [
            e for e in employees
            if query in (e.full_name or '').lower() or query in (e.employee_id or '').lower() or query in (e.email or '').lower() or query in (e.department or '').lower()
        ]

    return jsonify({
        "success": True,
        "count": len(employees),
        "data": [e.to_dict() for e in employees]
    })


@app.route('/api/employees', methods=['POST'])
def add_employee():
    data = request.get_json() or {}

    # Validation
    emp_id = str(data.get('employee_id', '')).strip()
    full_name = str(data.get('full_name', '')).strip()
    email = str(data.get('email', '')).strip()
    department = str(data.get('department', '')).strip()
    designation = str(data.get('designation', '')).strip()
    joining_date = str(data.get('joining_date', '')).strip()
    phone = str(data.get('phone', '')).strip()
    shift = str(data.get('shift', 'Morning General (09:30 - 18:30)')).strip()
    employment_type = str(data.get('employment_type', 'Full Time')).strip()
    status = str(data.get('status', 'Active')).strip()

    errors = {}
    if not emp_id:
        errors['employee_id'] = "Employee ID is required."
    else:
        existing = Employee.query.filter_by(employee_id=emp_id).first()
        if existing:
            errors['employee_id'] = f"Employee ID '{emp_id}' already exists."

    if not full_name:
        errors['full_name'] = "Full Name is required."

    if not email:
        errors['email'] = "Email is required."
    elif not re.match(EMAIL_REGEX, email):
        errors['email'] = "Please enter a valid email address (e.g. name@company.com)."

    if not department:
        errors['department'] = "Department is required."
    if not designation:
        errors['designation'] = "Designation is required."
    if not joining_date:
        errors['joining_date'] = "Joining Date is required."

    if errors:
        return jsonify({"success": False, "errors": errors, "message": "Validation failed"}), 400

    new_emp = Employee(
        employee_id=emp_id,
        full_name=full_name,
        email=email,
        phone=phone,
        department=department,
        designation=designation,
        joining_date=joining_date,
        shift=shift,
        employment_type=employment_type,
        status=status
    )
    db.session.add(new_emp)

    # Automatically initialize standard leave balances
    for lt, total in [("Casual Leave", 12.0), ("Sick Leave", 10.0), ("Earned Leave", 15.0), ("Unpaid Leave", 30.0)]:
        db.session.add(LeaveBalance(
            employee_id=emp_id,
            leave_type=lt,
            total=total,
            used=0.0,
            pending=0.0,
            available=total
        ))

    db.session.commit()
    return jsonify({"success": True, "message": f"Employee {emp_id} added successfully.", "data": new_emp.to_dict()}), 201


@app.route('/api/employees/<identifier>', methods=['GET'])
def get_employee_details(identifier):
    emp = find_employee(identifier)
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{identifier}' not found."}), 404

    # Calculate Attendance Summary
    records = AttendanceRecord.query.filter_by(employee_id=emp.employee_id).all()
    total_present = sum(1 for r in records if "PRESENT" in (r.status or "").upper())
    full_days = sum(1 for r in records if (r.status or "").strip().upper() == "FULL DAY PRESENT")
    half_days = sum(1 for r in records if "HALF" in (r.status or "").upper() or "MORNING" in (r.status or "").upper() or "AFTERNOON" in (r.status or "").upper())
    total_absent = sum(1 for r in records if (r.status or "").strip().upper() == "ABSENT")
    late_days = sum(1 for r in records if (r.late_minutes or 0) > 0)
    total_work_minutes = sum(r.work_duration_minutes or 0 for r in records)
    total_work_hours = round(total_work_minutes / 60, 1)

    # Calculate Leave Summary
    leaves = LeaveRequest.query.filter_by(employee_id=emp.employee_id).order_by(LeaveRequest.id.desc()).all()
    total_leave = len(leaves)
    approved_leave = sum(1 for l in leaves if l.status == "APPROVED")
    pending_leave = sum(1 for l in leaves if l.status == "PENDING")
    rejected_leave = sum(1 for l in leaves if l.status == "REJECTED")

    balances = LeaveBalance.query.filter_by(employee_id=emp.employee_id).all()
    remaining_balance = sum(b.available for b in balances)

    # Recent Records
    recent_attendance = [
        r.to_dict() for r in AttendanceRecord.query.filter_by(employee_id=emp.employee_id).order_by(AttendanceRecord.date.desc()).limit(8).all()
    ]
    recent_leaves = [l.to_dict() for l in leaves[:5]]

    return jsonify({
        "success": True,
        "data": {
            "employee": emp.to_dict(),
            "attendanceSummary": {
                "totalRecords": len(records),
                "totalPresent": total_present,
                "fullDays": full_days,
                "halfDays": half_days,
                "totalAbsent": total_absent,
                "lateDays": late_days,
                "totalWorkHours": total_work_hours
            },
            "leaveSummary": {
                "totalLeave": total_leave,
                "approvedLeave": approved_leave,
                "pendingLeave": pending_leave,
                "rejectedLeave": rejected_leave,
                "remainingBalance": remaining_balance,
                "balances": [b.to_dict() for b in balances]
            },
            "recentAttendance": recent_attendance,
            "recentLeaves": recent_leaves
        }
    })


@app.route('/api/employees/<identifier>', methods=['PUT'])
def update_employee(identifier):
    emp = find_employee(identifier)
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{identifier}' not found."}), 404

    data = request.get_json() or {}

    if 'full_name' in data:
        emp.full_name = str(data['full_name']).strip()
    if 'email' in data:
        email = str(data['email']).strip()
        if not re.match(EMAIL_REGEX, email):
            return jsonify({"success": False, "errors": {"email": "Invalid email address."}}), 400
        emp.email = email
    if 'phone' in data:
        emp.phone = str(data['phone']).strip()
    if 'department' in data:
        emp.department = str(data['department']).strip()
    if 'designation' in data:
        emp.designation = str(data['designation']).strip()
    if 'joining_date' in data:
        emp.joining_date = str(data['joining_date']).strip()
    if 'shift' in data:
        emp.shift = str(data['shift']).strip()
    if 'employment_type' in data:
        emp.employment_type = str(data['employment_type']).strip()
    if 'status' in data:
        emp.status = str(data['status']).strip()

    emp.updated_at = get_now()
    db.session.commit()
    return jsonify({"success": True, "message": f"Employee {emp.employee_id} updated.", "data": emp.to_dict()})


@app.route('/api/employees/<identifier>/status', methods=['PATCH'])
def toggle_employee_status(identifier):
    emp = find_employee(identifier)
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{identifier}' not found."}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    if not new_status:
        # Toggle current status
        new_status = "Inactive" if emp.status == "Active" else "Active"

    emp.status = new_status
    emp.updated_at = get_now()
    db.session.commit()
    return jsonify({"success": True, "message": f"Status updated to {new_status}.", "status": new_status, "data": emp.to_dict()})


@app.route('/api/employees/<identifier>', methods=['DELETE'])
def delete_employee(identifier):
    emp = find_employee(identifier)
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{identifier}' not found."}), 404

    emp_id = emp.employee_id
    AttendanceRecord.query.filter_by(employee_id=emp_id).delete()
    LeaveRequest.query.filter_by(employee_id=emp_id).delete()
    LeaveBalance.query.filter_by(employee_id=emp_id).delete()
    db.session.delete(emp)
    db.session.commit()
    return jsonify({"success": True, "message": f"Employee {emp_id} and associated records removed."})


# ====================================================================
# ATTENDANCE INGESTION & INTEGRATION ENDPOINTS
# ====================================================================

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    emp_id = request.args.get('employee_id')
    date_filter = request.args.get('date')

    q = AttendanceRecord.query
    if emp_id:
        q = q.filter_by(employee_id=emp_id)
    if date_filter:
        q = q.filter_by(date=date_filter)

    records = q.order_by(AttendanceRecord.date.desc()).all()
    return jsonify({"success": True, "count": len(records), "data": [r.to_dict() for r in records]})


@app.route('/api/attendance/ingest', methods=['POST'])
def ingest_attendance():
    """
    Ingest attendance records with strict validation:
    If an employee ID in the payload does not exist in SQLite, returns:
    'Employee <id> does not exist. Please add the employee before importing attendance.'
    """
    data = request.get_json() or {}
    records = data.get('records', [])

    if not records:
        return jsonify({"success": False, "message": "No attendance records provided."}), 400

    # Collect distinct employee IDs
    incoming_emp_ids = set(str(r.get('employeeId') or r.get('employee_id', '')).strip() for r in records)
    incoming_emp_ids.discard('')

    # Verify all employees exist in SQL
    existing_emps = set(e.employee_id for e in Employee.query.filter(Employee.employee_id.in_(incoming_emp_ids)).all())

    missing_emps = incoming_emp_ids - existing_emps
    if missing_emps:
        first_missing = sorted(list(missing_emps))[0]
        return jsonify({
            "success": False,
            "error_type": "EMPLOYEE_NOT_FOUND",
            "message": f"Employee {first_missing} does not exist. Please add the employee before importing attendance.",
            "missing_employees": list(missing_emps)
        }), 400

    # Clear prior imported records for replace mode, or append
    replace_all = data.get('replace', False)
    if replace_all:
        AttendanceRecord.query.delete()

    created_count = 0
    for r in records:
        emp_id = str(r.get('employeeId') or r.get('employee_id', '')).strip()
        date_str = r.get('date', '')
        if not emp_id or not date_str:
            continue

        work_dur = safe_int(r.get('workDurationMinutes') if r.get('workDurationMinutes') is not None else r.get('work_duration_minutes', 0))
        m_late = safe_int(r.get('morningLateMinutes') if r.get('morningLateMinutes') is not None else r.get('morning_late_minutes', 0))
        a_late = safe_int(r.get('afternoonLateMinutes') if r.get('afternoonLateMinutes') is not None else r.get('afternoon_late_minutes', 0))
        t_late = safe_int(r.get('lateMinutes') if r.get('lateMinutes') is not None else r.get('late_minutes', 0))

        rec = AttendanceRecord(
            employee_id=emp_id,
            date=date_str,
            day=r.get('day', ''),
            status=r.get('status', 'ABSENT'),
            first_login=r.get('firstLogin') or r.get('first_login', '-'),
            lunch_out=r.get('afternoonCheckout') or r.get('lunch_out', '-'),
            lunch_in=r.get('afternoonCheckin') or r.get('lunch_in', '-'),
            last_logout=r.get('lastLogout') or r.get('last_logout', '-'),
            work_duration_minutes=work_dur,
            morning_late_minutes=m_late,
            afternoon_late_minutes=a_late,
            late_minutes=t_late,
            punches=json.dumps(r.get('punches', [])) if isinstance(r.get('punches'), list) else str(r.get('punches', '[]'))
        )
        db.session.add(rec)
        created_count += 1

    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Successfully ingested {created_count} attendance records.",
        "count": created_count
    }), 201


# ====================================================================
# LEAVE MANAGEMENT ENDPOINTS
# ====================================================================

@app.route('/api/leaves', methods=['GET'])
def get_leaves():
    emp_id = request.args.get('employee_id')
    status = request.args.get('status')

    q = LeaveRequest.query
    if emp_id:
        q = q.filter_by(employee_id=emp_id)
    if status and status != "ALL":
        q = q.filter_by(status=status)

    leaves = q.order_by(LeaveRequest.id.desc()).all()
    # Enrich with employee info
    result = []
    for l in leaves:
        d = l.to_dict()
        emp = Employee.query.filter_by(employee_id=l.employee_id).first()
        d['employeeName'] = emp.full_name if emp else "Unknown"
        d['department'] = emp.department if emp else "General"
        result.append(d)

    return jsonify({"success": True, "count": len(result), "data": result})


@app.route('/api/leaves', methods=['POST'])
def apply_leave():
    data = request.get_json() or {}
    emp_id = str(data.get('employeeId') or data.get('employee_id', '')).strip()

    emp = Employee.query.filter_by(employee_id=emp_id).first()
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{emp_id}' does not exist."}), 400

    leave_type = data.get('leaveType') or data.get('leave_type')
    start_date = data.get('startDate') or data.get('start_date')
    end_date = data.get('endDate') or data.get('end_date')
    reason = data.get('reason', '')
    days_count = safe_float(data.get('daysCount') or data.get('days_count'), 1.0)

    if not leave_type or not start_date or not end_date or not reason:
        return jsonify({"success": False, "message": "All leave fields are required."}), 400

    req = LeaveRequest(
        employee_id=emp_id,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status="PENDING",
        days_count=days_count,
        applied_on=get_now().strftime("%Y-%m-%d")
    )
    db.session.add(req)
    db.session.commit()
    return jsonify({"success": True, "message": "Leave request submitted successfully.", "data": req.to_dict()}), 201


@app.route('/api/leaves/<int:leave_id>', methods=['PATCH'])
def update_leave_status(leave_id):
    req = db.session.get(LeaveRequest, leave_id)
    if not req:
        return jsonify({"success": False, "message": "Leave request not found."}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ["APPROVED", "REJECTED", "CANCELLED", "PENDING"]:
        return jsonify({"success": False, "message": "Invalid leave status."}), 400

    req.status = new_status
    db.session.commit()
    return jsonify({"success": True, "message": f"Leave status updated to {new_status}.", "data": req.to_dict()})


# ====================================================================
# DASHBOARD STATS ENDPOINT
# ====================================================================

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    # Active Staff from SQLite is the single source of truth
    active_staff_count = Employee.query.filter_by(status='Active').count()
    total_staff_count = Employee.query.count()

    # Attendance aggregates
    records = AttendanceRecord.query.all()
    full_day_count = sum(1 for r in records if (r.status or "").strip().upper() == "FULL DAY PRESENT")
    morning_half_count = sum(1 for r in records if "MORNING" in (r.status or "").upper())
    afternoon_half_count = sum(1 for r in records if "AFTERNOON" in (r.status or "").upper())
    on_leave_count = sum(1 for r in records if (r.status or "").strip().upper() == "ON LEAVE")
    absent_count = sum(1 for r in records if (r.status or "").strip().upper() == "ABSENT")
    late_list = [r for r in records if (r.late_minutes or 0) > 0]
    total_late_mins = sum(r.late_minutes or 0 for r in late_list)

    # Leave aggregates
    pending_leaves = LeaveRequest.query.filter_by(status="PENDING").count()
    approved_leaves = LeaveRequest.query.filter_by(status="APPROVED").count()

    return jsonify({
        "success": True,
        "totalStaff": active_staff_count,
        "allStaffCount": total_staff_count,
        "fullDayPresent": full_day_count,
        "morningHalf": morning_half_count,
        "afternoonHalf": afternoon_half_count,
        "onLeave": on_leave_count,
        "absentDays": absent_count,
        "lateIncidents": len(late_list),
        "totalLateMinutes": total_late_mins,
        "pendingLeaves": pending_leaves,
        "approvedLeaves": approved_leaves,
        "totalRecords": len(records)
    })


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
