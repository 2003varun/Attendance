# Flask Backend Application for Attendance OS Pro with RBAC & Paid Leave Policy
import os
import sys
import re
import json
import time
import hmac
import hashlib
import base64
from functools import wraps
from datetime import datetime, timezone

# Ensure the server directory is present in sys.path so 'models' is resolved everywhere
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import inspect, text

try:
    from models import db, User, Employee, AttendanceRecord, LeaveRequest, LeaveBalance, Holiday
except ImportError:
    from server.models import db, User, Employee, AttendanceRecord, LeaveRequest, LeaveBalance, Holiday

app = Flask(__name__)

# Configurable CORS
cors_origins_env = os.getenv('CORS_ORIGINS', '*')
if cors_origins_env == '*':
    cors_origins = '*'
else:
    cors_origins = [orig.strip() for orig in cors_origins_env.split(',') if orig.strip()]

CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True)

# Database Configuration (Single Source of Truth)
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle': 300
    }
    print(f"[DB] Using shared database engine configured via DATABASE_URL.")
else:
    DB_DIR = os.path.dirname(os.path.abspath(__file__))
    sqlite_path = os.path.join(DB_DIR, 'attendance_os.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{sqlite_path}"
    print(f"[DB] No DATABASE_URL specified. Defaulting to local SQLite: {sqlite_path}")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

EMAIL_REGEX = r'^[\w\.-]+@[\w\.-]+\.\w+$'
SECRET_KEY = os.getenv('SECRET_KEY', 'attendance-os-pro-super-secret-key-2026').encode('utf-8')

INITIAL_HOLIDAYS = [
    { "id": "h1", "date": "2026-01-01", "name": "New Year's Day", "type": "National Holiday" },
    { "id": "h2", "date": "2026-01-26", "name": "Republic Day", "type": "National Holiday" },
    { "id": "h3", "date": "2026-03-04", "name": "Holi", "type": "Gazetted Holiday" },
    { "id": "h4", "date": "2026-05-01", "name": "Labor Day", "type": "Gazetted Holiday" },
    { "id": "h5", "date": "2026-08-15", "name": "Independence Day", "type": "National Holiday" },
    { "id": "h6", "date": "2026-10-02", "name": "Gandhi Jayanti", "type": "National Holiday" },
    { "id": "h7", "date": "2026-10-20", "name": "Dussehra", "type": "Festival Holiday" },
    { "id": "h8", "date": "2026-11-08", "name": "Diwali", "type": "Festival Holiday" },
    { "id": "h9", "date": "2026-12-25", "name": "Christmas", "type": "Gazetted Holiday" }
]

DEFAULT_LEAVE_TYPES = [
    { "id": "PL", "name": "Paid Leave", "defaultAllocated": 1.0, "description": "1 day monthly accrual with carry-forward" }
]


# ====================================================================
# UTILITY FUNCTIONS & AUTH HELPERS (HMAC-SHA256 JWT)
# ====================================================================

def get_now():
    """Return timezone-aware UTC datetime or fallback to utcnow"""
    try:
        return datetime.now(timezone.utc)
    except Exception:
        return datetime.utcnow()

def safe_int(val, default=0):
    if val is None:
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default

def safe_float(val, default=0.0):
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def find_employee(identifier):
    ident_str = str(identifier).strip()
    if not ident_str:
        return None
    if ident_str.isdigit():
        return Employee.query.filter((Employee.employee_id == ident_str) | (Employee.id == int(ident_str))).first()
    return Employee.query.filter_by(employee_id=ident_str).first()

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def base64url_decode(data: str) -> bytes:
    padding = '=' * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + padding)

def generate_token(user, expires_in=86400 * 7):
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user.id,
        "username": user.username,
        "role": user.role,
        "employee_id": user.employee_id,
        "exp": int(time.time()) + expires_in
    }
    enc_h = base64url_encode(json.dumps(header).encode('utf-8'))
    enc_p = base64url_encode(json.dumps(payload).encode('utf-8'))
    sig = hmac.new(SECRET_KEY, f"{enc_h}.{enc_p}".encode('utf-8'), hashlib.sha256).digest()
    return f"{enc_h}.{enc_p}.{base64url_encode(sig)}"

def verify_token(token_str):
    try:
        parts = token_str.split('.')
        if len(parts) != 3:
            return None
        enc_h, enc_p, enc_s = parts
        expected_sig = hmac.new(SECRET_KEY, f"{enc_h}.{enc_p}".encode('utf-8'), hashlib.sha256).digest()
        actual_sig = base64url_decode(enc_s)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(base64url_decode(enc_p).decode('utf-8'))
        if int(payload.get('exp', 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None

def token_required(optional=False):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get('Authorization', '')
            token = None
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ', 1)[1].strip()
            elif 'token' in request.args:
                token = request.args.get('token')

            if not token:
                if optional:
                    request.current_user = None
                    return f(*args, **kwargs)
                return jsonify({"success": False, "message": "Authentication token missing. Please log in."}), 401

            payload = verify_token(token)
            if not payload:
                if optional:
                    request.current_user = None
                    return f(*args, **kwargs)
                return jsonify({"success": False, "message": "Invalid or expired authentication token. Please log in again."}), 401

            user = db.session.get(User, payload['sub'])
            if not user or not user.is_active:
                return jsonify({"success": False, "message": "User account is inactive or not found."}), 401

            request.current_user = user
            return f(*args, **kwargs)
        return decorated
    return decorator

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(request, 'current_user', None)
            if not user:
                return jsonify({"success": False, "message": "Authentication required."}), 401
            if user.role not in allowed_roles:
                return jsonify({
                    "success": False,
                    "message": f"Access denied. Required role: {', '.join(allowed_roles)}. Your role is {user.role}."
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def sync_monthly_accrual(emp_id):
    """
    Ensure employee has single 'Paid Leave' balance and accrues +1 per elapsed calendar month.
    Unused leave carries forward month-over-month.
    """
    now = datetime.now()
    current_month_str = now.strftime("%Y-%m")

    bal = LeaveBalance.query.filter_by(employee_id=emp_id, leave_type="Paid Leave").first()
    if not bal:
        bal = LeaveBalance(
            employee_id=emp_id,
            leave_type="Paid Leave",
            total=1.0,
            used=0.0,
            pending=0.0,
            available=1.0,
            last_accrual_month=current_month_str
        )
        db.session.add(bal)
        db.session.commit()
        return bal

    if not bal.last_accrual_month:
        bal.last_accrual_month = current_month_str
        db.session.commit()
        return bal

    try:
        last_y, last_m = map(int, bal.last_accrual_month.split('-'))
        months_diff = (now.year - last_y) * 12 + (now.month - last_m)
        if months_diff > 0:
            bal.total = (bal.total or 0.0) + (months_diff * 1.0)
            bal.available = max(0.0, (bal.total or 0.0) - (bal.used or 0.0) - (bal.pending or 0.0))
            bal.last_accrual_month = current_month_str
            db.session.commit()
    except Exception as e:
        print(f"[Accrual Sync Error] for {emp_id}: {e}")
        db.session.rollback()

    return bal

def check_schema_upgrades():
    """Safely add any missing columns in existing SQLite tables without wiping data"""
    try:
        inspector = inspect(db.engine)
        if 'leave_requests' in inspector.get_table_names():
            cols = [c['name'] for c in inspector.get_columns('leave_requests')]
            if 'approved_by' not in cols:
                db.session.execute(text("ALTER TABLE leave_requests ADD COLUMN approved_by VARCHAR(128) DEFAULT ''"))
            if 'rejection_reason' not in cols:
                db.session.execute(text("ALTER TABLE leave_requests ADD COLUMN rejection_reason TEXT DEFAULT ''"))
            db.session.commit()
        if 'leave_balances' in inspector.get_table_names():
            lb_cols = [c['name'] for c in inspector.get_columns('leave_balances')]
            if 'last_accrual_month' not in lb_cols:
                db.session.execute(text("ALTER TABLE leave_balances ADD COLUMN last_accrual_month VARCHAR(7)"))
                db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[Schema check note] {e}")

def init_db():
    with app.app_context():
        db.create_all()
        check_schema_upgrades()

        # Seed initial holidays if none exist
        if Holiday.query.count() == 0:
            for h in INITIAL_HOLIDAYS:
                db.session.add(Holiday(**h))
            db.session.commit()
            print("[Init] Seeded official corporate holidays.")

# Initialize database on app startup
init_db()


# ====================================================================
# AUTHENTICATION ENDPOINTS
# ====================================================================

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json() or {}
    ident = str(data.get('username') or data.get('identifier') or data.get('email', '')).strip()
    password = str(data.get('password', '')).strip()

    if not ident or not password:
        return jsonify({"success": False, "message": "Username/Email and Password are required."}), 400

    # Search by username, email, or employee_id
    user = User.query.filter(
        (User.username.ilike(ident)) |
        (User.email.ilike(ident)) |
        (User.employee_id.ilike(ident))
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"success": False, "message": "Invalid username or password."}), 401

    if not user.is_active:
        return jsonify({"success": False, "message": "User account is inactive. Please contact your manager."}), 403

    token = generate_token(user)
    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
            "role": user.role,
            "employeeId": user.employee_id,
            "fullName": user.full_name
        }
    })


@app.route('/api/auth/me', methods=['GET'])
@token_required()
def auth_me():
    user = request.current_user
    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
            "role": user.role,
            "employeeId": user.employee_id,
            "fullName": user.full_name
        }
    })


@app.route('/api/auth/change-password', methods=['POST'])
@token_required()
def auth_change_password():
    user = request.current_user
    data = request.get_json() or {}
    old_pw = str(data.get('oldPassword', '')).strip()
    new_pw = str(data.get('newPassword', '')).strip()

    if not old_pw or not new_pw:
        return jsonify({"success": False, "message": "Current password and new password are required."}), 400

    if not user.check_password(old_pw):
        return jsonify({"success": False, "message": "Current password is incorrect."}), 400

    if len(new_pw) < 4:
        return jsonify({"success": False, "message": "New password must be at least 4 characters."}), 400

    user.set_password(new_pw)
    user.updated_at = get_now()
    db.session.commit()
    return jsonify({"success": True, "message": "Password changed successfully."})


# ====================================================================
# HEALTH CHECK
# ====================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "database": "connected",
        "time": get_now().isoformat()
    })


# ====================================================================
# EMPLOYEE API ENDPOINTS (RBAC PRIVACY PROTECTED)
# ====================================================================

@app.route('/api/employees', methods=['GET'])
@token_required()
def get_employees():
    current_user = request.current_user
    query = request.args.get('query', '').strip().lower()
    department = request.args.get('department', '').strip()
    status = request.args.get('status', '').strip()

    q = Employee.query

    # Privacy Enforcement: EMPLOYEE can only view their own profile
    if current_user.role == 'EMPLOYEE':
        q = q.filter(Employee.employee_id == current_user.employee_id)
    else:
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
@token_required()
@role_required('MANAGER')
def add_employee():
    data = request.get_json() or {}

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

    if email and not re.match(EMAIL_REGEX, email):
        errors['email'] = "Please enter a valid email address."

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

    # Initialize Paid Leave balance with 1.0 day initial entitlement
    current_month = datetime.now().strftime("%Y-%m")
    db.session.add(LeaveBalance(
        employee_id=emp_id,
        leave_type="Paid Leave",
        total=1.0,
        used=0.0,
        pending=0.0,
        available=1.0,
        last_accrual_month=current_month
    ))

    # Auto-provision corresponding user account for employee login
    emp_user = User(
        username=emp_id,
        email=email if email else None,
        role='EMPLOYEE',
        full_name=full_name,
        employee_id=emp_id,
        is_active=True
    )
    emp_user.set_password(emp_id)
    db.session.add(emp_user)

    db.session.commit()
    return jsonify({"success": True, "message": f"Employee {emp_id} added successfully.", "data": new_emp.to_dict()}), 201


@app.route('/api/employees/<identifier>', methods=['GET'])
@token_required()
def get_employee_details(identifier):
    current_user = request.current_user
    emp = find_employee(identifier)
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{identifier}' not found."}), 404

    # Privacy Enforcement: EMPLOYEE can only view their own details
    if current_user.role == 'EMPLOYEE' and emp.employee_id != current_user.employee_id:
        return jsonify({"success": False, "message": "Access denied. You can only view your own records."}), 403

    # Sync monthly accrual for this employee
    sync_monthly_accrual(emp.employee_id)

    records = AttendanceRecord.query.filter_by(employee_id=emp.employee_id).all()
    total_present = sum(1 for r in records if "PRESENT" in (r.status or "").upper())
    full_days = sum(1 for r in records if (r.status or "").strip().upper() == "FULL DAY PRESENT")
    half_days = sum(1 for r in records if "HALF" in (r.status or "").upper() or "MORNING" in (r.status or "").upper() or "AFTERNOON" in (r.status or "").upper())
    total_absent = sum(1 for r in records if (r.status or "").strip().upper() == "ABSENT")
    late_days = sum(1 for r in records if (r.late_minutes or 0) > 0)
    total_work_minutes = sum(r.work_duration_minutes or 0 for r in records)
    total_work_hours = round(total_work_minutes / 60, 1)

    leaves = LeaveRequest.query.filter_by(employee_id=emp.employee_id).order_by(LeaveRequest.id.desc()).all()
    total_leave = len(leaves)
    approved_leave = sum(1 for l in leaves if l.status == "APPROVED")
    pending_leave = sum(1 for l in leaves if l.status == "PENDING")
    rejected_leave = sum(1 for l in leaves if l.status == "REJECTED")

    balances = LeaveBalance.query.filter_by(employee_id=emp.employee_id).all()
    remaining_balance = sum(max(0.0, b.available or 0.0) for b in balances)

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
@token_required()
@role_required('MANAGER')
def update_employee(identifier):
    emp = find_employee(identifier)
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{identifier}' not found."}), 404

    data = request.get_json() or {}

    # Support updating employee_id with cascade to related records
    if 'employee_id' in data:
        new_emp_id = str(data['employee_id']).strip()
        if new_emp_id and new_emp_id != emp.employee_id:
            existing = Employee.query.filter(Employee.employee_id == new_emp_id, Employee.id != emp.id).first()
            if existing:
                return jsonify({"success": False, "errors": {"employee_id": f"Employee ID '{new_emp_id}' is already in use."}}), 400
            old_emp_id = emp.employee_id
            AttendanceRecord.query.filter_by(employee_id=old_emp_id).update({"employee_id": new_emp_id})
            LeaveRequest.query.filter_by(employee_id=old_emp_id).update({"employee_id": new_emp_id})
            LeaveBalance.query.filter_by(employee_id=old_emp_id).update({"employee_id": new_emp_id})
            User.query.filter_by(employee_id=old_emp_id).update({"employee_id": new_emp_id, "username": new_emp_id})
            emp.employee_id = new_emp_id

    if 'full_name' in data:
        emp.full_name = str(data['full_name']).strip()
        User.query.filter_by(employee_id=emp.employee_id).update({"full_name": emp.full_name})
    if 'email' in data:
        email = str(data['email']).strip()
        if email and not re.match(EMAIL_REGEX, email):
            return jsonify({"success": False, "errors": {"email": "Invalid email address."}}), 400
        emp.email = email
        User.query.filter_by(employee_id=emp.employee_id).update({"email": email})
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
@token_required()
@role_required('MANAGER')
def toggle_employee_status(identifier):
    emp = find_employee(identifier)
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{identifier}' not found."}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    if not new_status:
        new_status = "Inactive" if emp.status == "Active" else "Active"

    emp.status = new_status
    emp.updated_at = get_now()
    User.query.filter_by(employee_id=emp.employee_id).update({"is_active": (new_status == "Active")})
    db.session.commit()
    return jsonify({"success": True, "message": f"Status updated to {new_status}.", "status": new_status, "data": emp.to_dict()})


@app.route('/api/employees/<identifier>', methods=['DELETE'])
@token_required()
@role_required('MANAGER')
def delete_employee(identifier):
    emp = find_employee(identifier)
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{identifier}' not found."}), 404

    emp_id = emp.employee_id
    AttendanceRecord.query.filter_by(employee_id=emp_id).delete()
    LeaveRequest.query.filter_by(employee_id=emp_id).delete()
    LeaveBalance.query.filter_by(employee_id=emp_id).delete()
    User.query.filter_by(employee_id=emp_id).delete()
    db.session.delete(emp)
    db.session.commit()
    return jsonify({"success": True, "message": f"Employee {emp_id} and associated records removed."})


# ====================================================================
# ATTENDANCE ENDPOINTS (RBAC PRIVACY PROTECTED)
# ====================================================================

@app.route('/api/attendance', methods=['GET'])
@token_required()
def get_attendance():
    current_user = request.current_user
    emp_id = request.args.get('employee_id')
    date_filter = request.args.get('date')

    # Privacy Enforcement: EMPLOYEE can only view their own attendance
    if current_user.role == 'EMPLOYEE':
        if emp_id and emp_id != current_user.employee_id:
            return jsonify({"success": False, "message": "Access denied. You can only view your own attendance."}), 403
        emp_id = current_user.employee_id

    q = AttendanceRecord.query
    if emp_id:
        q = q.filter_by(employee_id=emp_id)
    if date_filter:
        q = q.filter_by(date=date_filter)

    records = q.order_by(AttendanceRecord.date.desc()).all()
    return jsonify({"success": True, "count": len(records), "data": [r.to_dict() for r in records]})


@app.route('/api/attendance/ingest', methods=['POST'])
@token_required()
@role_required('MANAGER')
def ingest_attendance():
    data = request.get_json() or {}
    records = data.get('records', [])

    if not records:
        return jsonify({"success": False, "message": "No attendance records provided."}), 400

    incoming_emp_ids = set(str(r.get('employeeId') or r.get('employee_id', '')).strip() for r in records)
    incoming_emp_ids.discard('')

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
# LEAVE MANAGEMENT ENDPOINTS (SINGLE "Paid Leave" POLICY)
# ====================================================================

@app.route('/api/leave-types', methods=['GET'])
def get_leave_types():
    return jsonify({
        "success": True,
        "data": DEFAULT_LEAVE_TYPES
    })


@app.route('/api/leave-balances/<employee_id>', methods=['GET'])
@token_required()
def get_employee_leave_balances(employee_id):
    current_user = request.current_user
    emp = find_employee(employee_id)
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{employee_id}' not found."}), 404

    # Privacy Enforcement: EMPLOYEE can only view their own leave balance
    if current_user.role == 'EMPLOYEE' and emp.employee_id != current_user.employee_id:
        return jsonify({"success": False, "message": "Access denied. You can only view your own leave balance."}), 403

    # Sync monthly accrual for employee
    sync_monthly_accrual(emp.employee_id)

    balances = LeaveBalance.query.filter_by(employee_id=emp.employee_id).all()
    balances_dict = {}
    for b in balances:
        facing_avail = max(0.0, float(b.available or 0.0))
        balances_dict[b.leave_type] = {
            "allocated": b.total,
            "total": b.total,
            "accrued": b.total,
            "used": b.used,
            "pending": b.pending,
            "remaining": facing_avail,
            "available": facing_avail,
            "lastAccrualMonth": b.last_accrual_month or ""
        }

    # Ensure Paid Leave is always represented
    if "Paid Leave" not in balances_dict:
        balances_dict["Paid Leave"] = {
            "allocated": 1.0,
            "total": 1.0,
            "accrued": 1.0,
            "used": 0.0,
            "pending": 0.0,
            "remaining": 1.0,
            "available": 1.0,
            "lastAccrualMonth": datetime.now().strftime("%Y-%m")
        }

    return jsonify({
        "success": True,
        "employeeId": emp.employee_id,
        "data": balances_dict,
        "list": [b.to_dict() for b in balances]
    })


@app.route('/api/leaves', methods=['GET'])
@token_required()
def get_leaves():
    current_user = request.current_user
    emp_id = request.args.get('employee_id')
    status = request.args.get('status')

    # Privacy Enforcement: EMPLOYEE can only see their own leave requests
    if current_user.role == 'EMPLOYEE':
        if emp_id and emp_id != current_user.employee_id:
            return jsonify({"success": False, "message": "Access denied. You can only view your own leave requests."}), 403
        emp_id = current_user.employee_id

    q = LeaveRequest.query
    if emp_id:
        q = q.filter_by(employee_id=emp_id)
    if status and status != "ALL":
        q = q.filter_by(status=status)

    leaves = q.order_by(LeaveRequest.id.desc()).all()
    result = []
    for l in leaves:
        d = l.to_dict()
        emp = Employee.query.filter_by(employee_id=l.employee_id).first()
        d['employeeName'] = emp.full_name if emp else "Unknown"
        d['department'] = emp.department if emp else "General"
        result.append(d)

    return jsonify({"success": True, "count": len(result), "data": result})


@app.route('/api/leaves', methods=['POST'])
@token_required()
def apply_leave():
    current_user = request.current_user
    data = request.get_json() or {}
    emp_id = str(data.get('employeeId') or data.get('employee_id', '')).strip()

    # Privacy Enforcement: EMPLOYEE can only apply for themselves
    if current_user.role == 'EMPLOYEE':
        emp_id = current_user.employee_id
    elif not emp_id:
        emp_id = current_user.employee_id or ""

    emp = find_employee(emp_id)
    if not emp:
        return jsonify({"success": False, "message": f"Employee '{emp_id}' does not exist."}), 400

    # Ensure monthly accrual is up to date
    bal = sync_monthly_accrual(emp.employee_id)

    # In our company leave policy, leave type is always Paid Leave
    leave_type = data.get('leaveType') or data.get('leave_type') or "Paid Leave"
    if leave_type != "Paid Leave":
        leave_type = "Paid Leave"

    start_date = data.get('startDate') or data.get('start_date')
    end_date = data.get('endDate') or data.get('end_date')
    reason = data.get('reason', '')
    days_count = safe_float(data.get('daysCount') or data.get('days') or data.get('days_count'), 1.0)

    if not start_date or not end_date or not reason:
        return jsonify({"success": False, "message": "Start date, end date, and reason are required."}), 400

    if days_count <= 0:
        return jsonify({"success": False, "message": "Days requested must be greater than 0."}), 400

    # Note: Per company policy, employees may request leave exceeding available balance;
    # The request is placed in PENDING status for Manager decision.
    req = LeaveRequest(
        employee_id=emp.employee_id,
        leave_type="Paid Leave",
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status="PENDING",
        days_count=days_count,
        applied_on=datetime.now().strftime("%Y-%m-%d"),
        approved_by="",
        rejection_reason=""
    )
    db.session.add(req)

    # Adjust pending balance
    bal.pending = (bal.pending or 0.0) + days_count
    bal.available = max(0.0, (bal.total or 0.0) - (bal.used or 0.0) - bal.pending)

    db.session.commit()

    resp_data = req.to_dict()
    resp_data['employeeName'] = emp.full_name
    resp_data['department'] = emp.department

    return jsonify({"success": True, "message": "Leave request submitted successfully.", "data": resp_data}), 201


@app.route('/api/leaves/<int:leave_id>', methods=['PATCH'])
@token_required()
@role_required('MANAGER')
def update_leave_status(leave_id):
    current_user = request.current_user
    req = db.session.get(LeaveRequest, leave_id)
    if not req:
        return jsonify({"success": False, "message": "Leave request not found."}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ["APPROVED", "REJECTED", "CANCELLED", "PENDING"]:
        return jsonify({"success": False, "message": "Invalid leave status."}), 400

    old_status = req.status
    req.status = new_status

    approver_name = current_user.full_name or current_user.username
    if new_status == "APPROVED":
        req.approved_by = data.get('approvedBy') or data.get('approved_by') or approver_name
        req.rejection_reason = ""
    elif new_status == "REJECTED":
        req.approved_by = data.get('approvedBy') or data.get('approved_by') or approver_name
        req.rejection_reason = data.get('rejectionReason') or data.get('reason') or "Operational requirements"

    # Maintain single source of truth for LeaveBalance
    bal = LeaveBalance.query.filter_by(employee_id=req.employee_id, leave_type=req.leave_type).first()
    if bal:
        days = req.days_count or 1.0
        if old_status == "PENDING" and new_status == "APPROVED":
            bal.pending = max(0.0, (bal.pending or 0.0) - days)
            bal.used = (bal.used or 0.0) + days
            bal.available = max(0.0, (bal.total or 0.0) - (bal.used or 0.0) - (bal.pending or 0.0))
        elif old_status == "PENDING" and new_status in ["REJECTED", "CANCELLED"]:
            bal.pending = max(0.0, (bal.pending or 0.0) - days)
            bal.available = max(0.0, (bal.total or 0.0) - (bal.used or 0.0) - (bal.pending or 0.0))
        elif old_status == "APPROVED" and new_status in ["REJECTED", "CANCELLED"]:
            bal.used = max(0.0, (bal.used or 0.0) - days)
            bal.available = max(0.0, (bal.total or 0.0) - (bal.used or 0.0) - (bal.pending or 0.0))

    db.session.commit()

    emp = Employee.query.filter_by(employee_id=req.employee_id).first()
    resp_data = req.to_dict()
    resp_data['employeeName'] = emp.full_name if emp else "Unknown"
    resp_data['department'] = emp.department if emp else "General"

    return jsonify({"success": True, "message": f"Leave status updated to {new_status}.", "data": resp_data})


@app.route('/api/leaves/<int:leave_id>', methods=['DELETE'])
@token_required()
def delete_or_cancel_leave(leave_id):
    current_user = request.current_user
    req = db.session.get(LeaveRequest, leave_id)
    if not req:
        return jsonify({"success": False, "message": "Leave request not found."}), 404

    # Permission check:
    # EMPLOYEE can only cancel their own PENDING request.
    # MANAGER can delete any leave.
    # ACCOUNTANT cannot delete or modify leave requests.
    if current_user.role == 'EMPLOYEE':
        if req.employee_id != current_user.employee_id:
            return jsonify({"success": False, "message": "Access denied. You can only cancel your own leave requests."}), 403
        if req.status != "PENDING":
            return jsonify({"success": False, "message": "You can only cancel leaves that are in PENDING status."}), 400
    elif current_user.role == 'ACCOUNTANT':
        return jsonify({"success": False, "message": "Access denied. Accountants cannot delete leave requests."}), 403

    # Release pending balance if pending
    if req.status == "PENDING":
        bal = LeaveBalance.query.filter_by(employee_id=req.employee_id, leave_type=req.leave_type).first()
        if bal:
            bal.pending = max(0.0, (bal.pending or 0.0) - (req.days_count or 1.0))
            bal.available = max(0.0, (bal.total or 0.0) - (bal.used or 0.0) - bal.pending)
    elif req.status == "APPROVED":
        bal = LeaveBalance.query.filter_by(employee_id=req.employee_id, leave_type=req.leave_type).first()
        if bal:
            bal.used = max(0.0, (bal.used or 0.0) - (req.days_count or 1.0))
            bal.available = max(0.0, (bal.total or 0.0) - bal.used)

    db.session.delete(req)
    db.session.commit()
    return jsonify({"success": True, "message": f"Leave request {leave_id} cancelled/deleted."})


# ====================================================================
# HOLIDAYS API ENDPOINTS
# ====================================================================

@app.route('/api/holidays', methods=['GET'])
def get_holidays():
    holidays = Holiday.query.order_by(Holiday.date.asc()).all()
    return jsonify({
        "success": True,
        "count": len(holidays),
        "data": [h.to_dict() for h in holidays]
    })


@app.route('/api/holidays', methods=['POST'])
@token_required()
@role_required('MANAGER')
def add_holiday():
    data = request.get_json() or {}
    name = str(data.get('name', '')).strip()
    date_str = str(data.get('date', '')).strip()
    h_type = str(data.get('type', 'National Holiday')).strip()

    if not name or not date_str:
        return jsonify({"success": False, "message": "Holiday name and date are required."}), 400

    h_id = str(data.get('id') or f"h_{int(get_now().timestamp()*1000)}")
    existing = db.session.get(Holiday, h_id)
    if existing:
        h_id = f"h_{int(get_now().timestamp()*1000)}"

    holiday = Holiday(id=h_id, date=date_str, name=name, type=h_type)
    db.session.add(holiday)
    db.session.commit()
    return jsonify({"success": True, "message": f"Holiday '{name}' created.", "data": holiday.to_dict()}), 201


@app.route('/api/holidays/<holiday_id>', methods=['PUT'])
@token_required()
@role_required('MANAGER')
def update_holiday(holiday_id):
    holiday = db.session.get(Holiday, holiday_id)
    if not holiday:
        return jsonify({"success": False, "message": f"Holiday '{holiday_id}' not found."}), 404

    data = request.get_json() or {}
    if 'name' in data:
        holiday.name = str(data['name']).strip()
    if 'date' in data:
        holiday.date = str(data['date']).strip()
    if 'type' in data:
        holiday.type = str(data['type']).strip()

    db.session.commit()
    return jsonify({"success": True, "message": "Holiday updated.", "data": holiday.to_dict()})


@app.route('/api/holidays/<holiday_id>', methods=['DELETE'])
@token_required()
@role_required('MANAGER')
def delete_holiday(holiday_id):
    holiday = db.session.get(Holiday, holiday_id)
    if not holiday:
        return jsonify({"success": False, "message": f"Holiday '{holiday_id}' not found."}), 404

    db.session.delete(holiday)
    db.session.commit()
    return jsonify({"success": True, "message": f"Holiday '{holiday_id}' deleted."})


# ====================================================================
# DASHBOARD STATS ENDPOINT (ROLE AWARE)
# ====================================================================

@app.route('/api/dashboard/stats', methods=['GET'])
@token_required()
def get_dashboard_stats():
    current_user = request.current_user

    if current_user.role == 'EMPLOYEE':
        # Employee sees only their own metrics
        records = AttendanceRecord.query.filter_by(employee_id=current_user.employee_id).all()
        full_day_count = sum(1 for r in records if (r.status or "").strip().upper() == "FULL DAY PRESENT")
        morning_half_count = sum(1 for r in records if "MORNING" in (r.status or "").upper())
        afternoon_half_count = sum(1 for r in records if "AFTERNOON" in (r.status or "").upper())
        on_leave_count = sum(1 for r in records if (r.status or "").strip().upper() == "ON LEAVE")
        absent_count = sum(1 for r in records if (r.status or "").strip().upper() == "ABSENT")
        late_list = [r for r in records if (r.late_minutes or 0) > 0]
        total_late_mins = sum(r.late_minutes or 0 for r in late_list)

        pending_leaves = LeaveRequest.query.filter_by(employee_id=current_user.employee_id, status="PENDING").count()
        approved_leaves = LeaveRequest.query.filter_by(employee_id=current_user.employee_id, status="APPROVED").count()

        bal = sync_monthly_accrual(current_user.employee_id)

        return jsonify({
            "success": True,
            "totalStaff": 1,
            "allStaffCount": 1,
            "fullDayPresent": full_day_count,
            "morningHalf": morning_half_count,
            "afternoonHalf": afternoon_half_count,
            "onLeave": on_leave_count,
            "absentDays": absent_count,
            "lateIncidents": len(late_list),
            "totalLateMinutes": total_late_mins,
            "pendingLeaves": pending_leaves,
            "approvedLeaves": approved_leaves,
            "leaveBalance": bal.available if bal else 1.0,
            "totalRecords": len(records)
        })

    # MANAGER or ACCOUNTANT: Company-wide metrics
    active_staff_count = Employee.query.filter_by(status='Active').count()
    total_staff_count = Employee.query.count()

    records = AttendanceRecord.query.all()
    full_day_count = sum(1 for r in records if (r.status or "").strip().upper() == "FULL DAY PRESENT")
    morning_half_count = sum(1 for r in records if "MORNING" in (r.status or "").upper())
    afternoon_half_count = sum(1 for r in records if "AFTERNOON" in (r.status or "").upper())
    on_leave_count = sum(1 for r in records if (r.status or "").strip().upper() == "ON LEAVE")
    absent_count = sum(1 for r in records if (r.status or "").strip().upper() == "ABSENT")
    late_list = [r for r in records if (r.late_minutes or 0) > 0]
    total_late_mins = sum(r.late_minutes or 0 for r in late_list)

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
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    print(f"[Server] Attendance OS Pro API listening on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
