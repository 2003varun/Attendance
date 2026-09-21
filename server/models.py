# SQLAlchemy Models for Centralized Employee Management & RBAC Authentication
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

def get_utc_now():
    try:
        return datetime.now(timezone.utc)
    except Exception:
        return datetime.utcnow()

def get_today_str():
    return get_utc_now().strftime("%Y-%m-%d")


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(128), unique=True, nullable=False, index=True)
    email = db.Column(db.String(128), nullable=True, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(32), nullable=False)  # 'EMPLOYEE', 'MANAGER', 'ACCOUNTANT'
    employee_id = db.Column(db.String(64), db.ForeignKey('employees.employee_id'), nullable=True, index=True)
    full_name = db.Column(db.String(128), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    updated_at = db.Column(db.DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationship to Employee
    employee = db.relationship('Employee', backref=db.backref('user', uselist=False))

    def set_password(self, password):
        self.password_hash = generate_password_hash(str(password))

    def check_password(self, password):
        return check_password_hash(self.password_hash, str(password))

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email or "",
            "role": self.role,
            "employee_id": self.employee_id,
            "full_name": self.full_name,
            "is_active": self.is_active
        }


class Employee(db.Model):
    __tablename__ = 'employees'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(128), nullable=True, default="")
    phone = db.Column(db.String(32), nullable=True, default="")
    department = db.Column(db.String(64), nullable=True, default="")
    designation = db.Column(db.String(64), nullable=True, default="")
    joining_date = db.Column(db.String(32), nullable=True, default="")
    shift = db.Column(db.String(64), default="Morning General (09:30 - 18:30)")
    employment_type = db.Column(db.String(32), default="Full Time")  # Full Time, Part Time, Contract, Intern
    status = db.Column(db.String(32), default="Active")  # Active, Inactive
    created_at = db.Column(db.DateTime, default=get_utc_now)
    updated_at = db.Column(db.DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    attendance_records = db.relationship('AttendanceRecord', backref='employee_rel', lazy='dynamic', cascade="all, delete-orphan")
    leave_requests = db.relationship('LeaveRequest', backref='employee_rel', lazy='dynamic', cascade="all, delete-orphan")
    leave_balances = db.relationship('LeaveBalance', backref='employee_rel', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "full_name": self.full_name,
            "email": self.email or "",
            "phone": self.phone or "",
            "department": self.department or "",
            "designation": self.designation or "",
            "joining_date": self.joining_date or "",
            "shift": self.shift or "Morning General (09:30 - 18:30)",
            "employment_type": self.employment_type or "Full Time",
            "status": self.status or "Active",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(64), db.ForeignKey('employees.employee_id'), nullable=False, index=True)
    date = db.Column(db.String(32), nullable=False, index=True)
    day = db.Column(db.String(16), nullable=True)
    status = db.Column(db.String(64), nullable=False)
    first_login = db.Column(db.String(16), nullable=True)
    lunch_out = db.Column(db.String(16), nullable=True)
    lunch_in = db.Column(db.String(16), nullable=True)
    last_logout = db.Column(db.String(16), nullable=True)
    work_duration_minutes = db.Column(db.Integer, default=0)
    morning_late_minutes = db.Column(db.Integer, default=0)
    afternoon_late_minutes = db.Column(db.Integer, default=0)
    late_minutes = db.Column(db.Integer, default=0)
    punches = db.Column(db.Text, nullable=True)  # JSON formatted punches array

    def to_dict(self):
        return {
            "id": self.id,
            "employeeId": self.employee_id,
            "date": self.date,
            "day": self.day or "",
            "status": self.status,
            "firstLogin": self.first_login or "-",
            "afternoonCheckout": self.lunch_out or "-",
            "afternoonCheckin": self.lunch_in or "-",
            "lastLogout": self.last_logout or "-",
            "workDurationMinutes": self.work_duration_minutes or 0,
            "morningLateMinutes": self.morning_late_minutes or 0,
            "afternoonLateMinutes": self.afternoon_late_minutes or 0,
            "lateMinutes": self.late_minutes or 0,
            "punches": self.punches or "[]"
        }


class LeaveRequest(db.Model):
    __tablename__ = 'leave_requests'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(64), db.ForeignKey('employees.employee_id'), nullable=False, index=True)
    leave_type = db.Column(db.String(64), nullable=False, default="Paid Leave")
    start_date = db.Column(db.String(32), nullable=False)
    end_date = db.Column(db.String(32), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(32), default="PENDING")  # PENDING, APPROVED, REJECTED, CANCELLED
    applied_on = db.Column(db.String(32), default=get_today_str)
    days_count = db.Column(db.Float, default=1.0)
    approved_by = db.Column(db.String(128), default="", nullable=True)
    rejection_reason = db.Column(db.Text, default="", nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "employeeId": self.employee_id,
            "leaveType": self.leave_type,
            "startDate": self.start_date,
            "endDate": self.end_date,
            "reason": self.reason,
            "status": self.status,
            "appliedOn": self.applied_on,
            "appliedDate": self.applied_on,
            "daysCount": self.days_count,
            "days": self.days_count,
            "approvedBy": self.approved_by or "",
            "rejectionReason": self.rejection_reason or ""
        }


class LeaveBalance(db.Model):
    __tablename__ = 'leave_balances'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(64), db.ForeignKey('employees.employee_id'), nullable=False, index=True)
    leave_type = db.Column(db.String(64), nullable=False, default="Paid Leave")
    total = db.Column(db.Float, default=1.0)  # Total accrued to date
    used = db.Column(db.Float, default=0.0)   # Total approved days used
    pending = db.Column(db.Float, default=0.0)  # Total days in pending requests
    available = db.Column(db.Float, default=1.0) # Accrued - used
    last_accrual_month = db.Column(db.String(7), nullable=True)  # YYYY-MM of last monthly accrual increment

    def to_dict(self):
        facing_avail = max(0.0, float(self.available or 0.0))
        return {
            "id": self.id,
            "employeeId": self.employee_id,
            "leaveType": self.leave_type,
            "total": self.total,
            "allocated": self.total,
            "accrued": self.total,
            "used": self.used,
            "pending": self.pending,
            "available": facing_avail,
            "remaining": facing_avail,
            "lastAccrualMonth": self.last_accrual_month or ""
        }


class Holiday(db.Model):
    __tablename__ = 'holidays'

    id = db.Column(db.String(64), primary_key=True)
    date = db.Column(db.String(32), nullable=False, index=True)
    name = db.Column(db.String(128), nullable=False)
    type = db.Column(db.String(64), default="National Holiday")
    created_at = db.Column(db.DateTime, default=get_utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date,
            "name": self.name,
            "type": self.type
        }
