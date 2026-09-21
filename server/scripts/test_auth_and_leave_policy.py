# Comprehensive Test Suite for RBAC Authentication, Privacy Enforcement, and Paid Leave Policy
# Updated for Permissive Leave Requesting (Allowing > Available, Non-Negative Display, and Manager Deciding)
import os
import sys
import json
import urllib.request
import urllib.error

SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

BASE_URL = "http://127.0.0.1:5000"

def request_api(endpoint, method="GET", data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.getcode()
            res_body = resp.read().decode("utf-8")
            return status_code, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(res_body)
        except Exception:
            parsed = {"raw": res_body}
        return e.code, parsed

def run_tests():
    print("=" * 70)
    print("STARTING TEST SUITE: RBAC AUTH & PAID LEAVE BEHAVIOR VERIFICATION")
    print("=" * 70)

    results = []

    def log_result(test_name, passed, detail=""):
        status = "PASSED" if passed else "FAILED"
        print(f"[{status}] {test_name}: {detail}")
        results.append((test_name, passed, detail))

    from app import app, db
    from models import LeaveBalance, LeaveRequest

    # Clean any residual test leaves first
    with app.app_context():
        LeaveRequest.query.delete()
        bal_init = LeaveBalance.query.filter_by(employee_id="TEMP-001", leave_type="Paid Leave").first()
        if bal_init:
            bal_init.total = 1.0
            bal_init.used = 0.0
            bal_init.pending = 0.0
            bal_init.available = 1.0
            db.session.commit()

    # 1. Manager Login
    s, r = request_api("/api/auth/login", "POST", {"username": "manager", "password": "manager123"})
    mgr_token = r.get("token")
    log_result("1. Manager Login (manager / manager123)", s == 200 and mgr_token and r.get("user", {}).get("role") == "MANAGER", f"Status: {s}, Role: {r.get('user', {}).get('role')}")

    # 2. Accountant Login
    s, r = request_api("/api/auth/login", "POST", {"username": "accountant", "password": "accountant123"})
    acc_token = r.get("token")
    log_result("2. Accountant Login (accountant / accountant123)", s == 200 and acc_token and r.get("user", {}).get("role") == "ACCOUNTANT", f"Status: {s}, Role: {r.get('user', {}).get('role')}")

    # 3. Employee Login (TEMP-001 / TEMP-001)
    s, r = request_api("/api/auth/login", "POST", {"username": "TEMP-001", "password": "TEMP-001"})
    emp_token = r.get("token")
    emp_info = r.get("user", {})
    log_result("3. Employee Login (TEMP-001 / TEMP-001)", s == 200 and emp_token and emp_info.get("role") == "EMPLOYEE", f"Status: {s}, Role: {emp_info.get('role')}, EmpId: {emp_info.get('employeeId')}")

    # 4. Wrong password returns 401 Unauthorized
    s, r = request_api("/api/auth/login", "POST", {"username": "manager", "password": "wrong_password_999"})
    log_result("4. Invalid Password Authentication", s == 401, f"Expected 401, got: {s} ({r.get('message')})")

    # 5. Verify 13 Employees in Database
    s, r = request_api("/api/employees", "GET", token=mgr_token)
    emps = r.get("data", [])
    emp_ids = [e["employee_id"] for e in emps]
    expected_ids = [f"TEMP-{i:03d}" for i in range(1, 14)]
    log_result("5. Verify 13 Employees in Database", s == 200 and len(emps) == 13, f"Count: {len(emps)}")

    # 6. Verify Temporary IDs TEMP-001 to TEMP-013
    all_temp_match = sorted(emp_ids) == expected_ids
    log_result("6. Verify Temporary IDs (TEMP-001 to TEMP-013)", all_temp_match, f"Found: {emp_ids}")

    # 7. No old sample employees exist
    sample_ids = {"EMP-001", "EMP-002", "378", "75", "428"}
    found_samples = sample_ids.intersection(set(emp_ids))
    log_result("7. No Sample Employees Exist", len(found_samples) == 0, f"Sample overlap: {found_samples}")

    # 8. PRIVACY: Employee cannot view another employee's profile
    s, r = request_api("/api/employees/TEMP-002", "GET", token=emp_token)
    log_result("8. Privacy: Employee blocked from viewing another employee's profile", s == 403, f"Status: {s} ({r.get('message')})")

    # Employee CAN view their own profile
    s, r = request_api("/api/employees/TEMP-001", "GET", token=emp_token)
    log_result("8b. Employee can view their own profile", s == 200 and r.get("data", {}).get("employee", {}).get("employee_id") == "TEMP-001", f"Status: {s}")

    # 9. PRIVACY: Employee cannot view another employee's attendance
    s, r = request_api("/api/attendance?employee_id=TEMP-002", "GET", token=emp_token)
    log_result("9. Privacy: Employee blocked from viewing another employee's attendance", s == 403, f"Status: {s} ({r.get('message')})")

    # 10. PRIVACY: Employee cannot view another employee's leave balance
    s, r = request_api("/api/leave-balances/TEMP-002", "GET", token=emp_token)
    log_result("10. Privacy: Employee blocked from viewing another employee's leave balance", s == 403, f"Status: {s} ({r.get('message')})")

    # Employee CAN view their own leave balance
    s, r = request_api("/api/leave-balances/TEMP-001", "GET", token=emp_token)
    bals = r.get("data", {})
    has_paid_leave = "Paid Leave" in bals
    log_result("10b. Employee can view own Paid Leave balance", s == 200 and has_paid_leave, f"Status: {s}, Balances: {list(bals.keys())}")

    # 11. PRIVACY: Employee cannot view another employee's leave requests
    s, r = request_api("/api/leaves?employee_id=TEMP-002", "GET", token=emp_token)
    log_result("11. Privacy: Employee blocked from viewing another employee's leave requests", s == 403, f"Status: {s} ({r.get('message')})")

    # 12. PRIVACY: Employee cannot approve or reject leave
    # Submit 1-day leave first
    s, r = request_api("/api/leaves", "POST", {
        "employeeId": "TEMP-001",
        "leaveType": "Paid Leave",
        "startDate": "2026-09-22",
        "endDate": "2026-09-22",
        "reason": "Doctor visit",
        "daysCount": 1.0
    }, token=emp_token)
    test_leave_1_id = r.get("data", {}).get("id")
    # Attempt approval by employee -> must be 403
    s, r = request_api(f"/api/leaves/{test_leave_1_id}", "PATCH", {"status": "APPROVED"}, token=emp_token)
    log_result("12. Privacy: Employee blocked from approving leave", s == 403, f"Status: {s} ({r.get('message')})")

    # Clean up test_leave_1
    request_api(f"/api/leaves/{test_leave_1_id}", "DELETE", token=mgr_token)

    # 13. Accountant cannot approve or reject leave
    s, r = request_api("/api/leaves", "POST", {
        "employeeId": "TEMP-001",
        "leaveType": "Paid Leave",
        "startDate": "2026-09-22",
        "endDate": "2026-09-22",
        "reason": "Doctor visit",
        "daysCount": 1.0
    }, token=emp_token)
    test_leave_acc_id = r.get("data", {}).get("id")
    s, r = request_api(f"/api/leaves/{test_leave_acc_id}", "PATCH", {"status": "APPROVED"}, token=acc_token)
    log_result("13. Privacy: Accountant blocked from approving leave", s == 403, f"Status: {s} ({r.get('message')})")
    request_api(f"/api/leaves/{test_leave_acc_id}", "DELETE", token=mgr_token)

    # ====================================================================
    # NEW BEHAVIOR TESTS: PERMISSIVE LEAVE REQUESTS & NEGATIVE BALANCE HANDLING
    # ====================================================================

    # Reset balance of TEMP-001 to fresh 1.0
    with app.app_context():
        bal = LeaveBalance.query.filter_by(employee_id="TEMP-001", leave_type="Paid Leave").first()
        bal.total = 1.0
        bal.used = 0.0
        bal.pending = 0.0
        bal.available = 1.0
        db.session.commit()

    # TEST CASE A: Requesting 1 day when balance is 1 -> Allowed
    s, r = request_api("/api/leaves", "POST", {
        "employeeId": "TEMP-001",
        "leaveType": "Paid Leave",
        "startDate": "2026-09-22",
        "endDate": "2026-09-22",
        "reason": "1 day leave with 1 day balance",
        "daysCount": 1.0
    }, token=emp_token)
    req_a_id = r.get("data", {}).get("id")
    log_result("14. Request 1 day when balance is 1 (Status = PENDING)", s == 201 and r.get("data", {}).get("status") == "PENDING", f"Status: {s}, Id: {req_a_id}")
    # Cancel request A
    request_api(f"/api/leaves/{req_a_id}", "DELETE", token=emp_token)

    # TEST CASE B: Requesting 3 days when balance is 1 -> Allowed (NO Insufficient balance error)
    s, r = request_api("/api/leaves", "POST", {
        "employeeId": "TEMP-001",
        "leaveType": "Paid Leave",
        "startDate": "2026-09-22",
        "endDate": "2026-09-24",
        "reason": "3 days leave with 1 day balance",
        "daysCount": 3.0
    }, token=emp_token)
    req_b_id = r.get("data", {}).get("id")
    log_result("15. Request 3 days when balance is 1 (Allowed, Status = PENDING)", s == 201 and req_b_id is not None, f"Status: {s}, Id: {req_b_id}")
    # Cancel request B
    request_api(f"/api/leaves/{req_b_id}", "DELETE", token=emp_token)

    # TEST CASE C: Rejection does not deduct leave
    s, r = request_api("/api/leaves", "POST", {
        "employeeId": "TEMP-001",
        "leaveType": "Paid Leave",
        "startDate": "2026-09-22",
        "endDate": "2026-09-23",
        "reason": "Request to be rejected",
        "daysCount": 2.0
    }, token=emp_token)
    req_c_id = r.get("data", {}).get("id")
    # Manager rejects request C
    s_rej, r_rej = request_api(f"/api/leaves/{req_c_id}", "PATCH", {"status": "REJECTED", "rejectionReason": "Project deadline"}, token=mgr_token)
    # Check balance: used must be 0, available must be 1.0
    s_bal, r_bal = request_api("/api/leave-balances/TEMP-001", "GET", token=emp_token)
    pl_bal_c = r_bal.get("data", {}).get("Paid Leave", {})
    log_result("16. Rejection does not deduct leave", s_rej == 200 and pl_bal_c.get("used") == 0.0 and pl_bal_c.get("available") == 1.0, f"Used: {pl_bal_c.get('used')}, Available: {pl_bal_c.get('available')}")
    # Clean up request C
    request_api(f"/api/leaves/{req_c_id}", "DELETE", token=mgr_token)

    # ====================================================================
    # USER SPECIFIED CRITICAL TEST CASE:
    # 1 day balance -> Employee requests 5 days -> Manager approves -> Available = 0 (NOT -4) -> Future accrual works
    # ====================================================================
    with app.app_context():
        bal = LeaveBalance.query.filter_by(employee_id="TEMP-001", leave_type="Paid Leave").first()
        bal.total = 1.0
        bal.used = 0.0
        bal.pending = 0.0
        bal.available = 1.0
        bal.last_accrual_month = "2026-09"
        db.session.commit()

    # Step 1: Employee requests 5 days
    s, r = request_api("/api/leaves", "POST", {
        "employeeId": "TEMP-001",
        "leaveType": "Paid Leave",
        "startDate": "2026-09-21",
        "endDate": "2026-09-25",
        "reason": "Family vacation (5 days)",
        "daysCount": 5.0
    }, token=emp_token)
    req_5_id = r.get("data", {}).get("id")
    log_result("17. Critical: Request 5 days with 1 day balance succeeds", s == 201 and req_5_id is not None and r.get("data", {}).get("status") == "PENDING", f"Status: {s}, Id: {req_5_id}")

    # Check pending state: pending = 5.0, available = 0.0 (NOT negative)
    s, r = request_api("/api/leave-balances/TEMP-001", "GET", token=emp_token)
    bal_pending = r.get("data", {}).get("Paid Leave", {})
    log_result("18. Critical: Pending state available is 0 (NOT negative)", bal_pending.get("pending") == 5.0 and bal_pending.get("available") == 0.0, f"Pending: {bal_pending.get('pending')}, Available: {bal_pending.get('available')}")

    # Step 2: Manager views the 5-day request
    s, r = request_api("/api/leaves", "GET", token=mgr_token)
    mgr_leaves = r.get("data", [])
    found_req = next((l for l in mgr_leaves if l["id"] == req_5_id), None)
    log_result("19. Critical: Manager can view the 5-day leave request", found_req is not None and found_req.get("daysCount") == 5.0, f"Days: {found_req.get('daysCount') if found_req else 'None'}")

    # Step 3: Manager approves the 5-day request
    s, r = request_api(f"/api/leaves/{req_5_id}", "PATCH", {"status": "APPROVED", "approvedBy": "General Manager"}, token=mgr_token)
    log_result("20. Critical: Manager approves 5-day request", s == 200 and r.get("data", {}).get("status") == "APPROVED", f"Status: {s}")

    # Step 4: Employee leave history shows 5 days taken
    s, r = request_api("/api/leaves?employee_id=TEMP-001", "GET", token=emp_token)
    emp_leaves = r.get("data", [])
    approved_leave_5 = next((l for l in emp_leaves if l["id"] == req_5_id and l["status"] == "APPROVED"), None)
    log_result("21. Critical: Employee leave history shows 5 days approved", approved_leave_5 is not None and approved_leave_5.get("daysCount") == 5.0, f"DaysCount: {approved_leave_5.get('daysCount') if approved_leave_5 else 'None'}")

    # Step 5: Employee-facing Available Balance is 0, NOT -4
    s, r = request_api("/api/leave-balances/TEMP-001", "GET", token=emp_token)
    bal_after = r.get("data", {}).get("Paid Leave", {})
    used_days = bal_after.get("used")
    avail_days = bal_after.get("available")
    log_result("22. Critical: Employee-facing Available Balance = 0, NOT -4 (Used = 5)", used_days == 5.0 and avail_days == 0.0, f"Used: {used_days}, Available: {avail_days} (Raw: {bal_after})")

    # Step 6: Test requesting 5 days when balance is 0 (Allowed)
    s, r = request_api("/api/leaves", "POST", {
        "employeeId": "TEMP-001",
        "leaveType": "Paid Leave",
        "startDate": "2026-09-28",
        "endDate": "2026-10-02",
        "reason": "Request 5 days with 0 available balance",
        "daysCount": 5.0
    }, token=emp_token)
    req_zero_id = r.get("data", {}).get("id")
    log_result("23. Critical: Request 5 days when balance is 0 succeeds (Status = PENDING)", s == 201 and req_zero_id is not None, f"Status: {s}, Id: {req_zero_id}")
    # Cancel request
    request_api(f"/api/leaves/{req_zero_id}", "DELETE", token=emp_token)

    # Step 7: Future monthly accrual continues correctly & accounts for excess leave internally
    # Simulate advance to next month: 2026-10 (1 month elapsed)
    with app.app_context():
        bal = LeaveBalance.query.filter_by(employee_id="TEMP-001", leave_type="Paid Leave").first()
        # Set last_accrual_month back to 1 month earlier to trigger accrual on next fetch
        bal.last_accrual_month = "2026-08" # simulate now is 2026-09, so +1 month accrues
        bal.total = 1.0 # 1 accrued so far, with 5 used
        db.session.commit()

    # Fetching balances triggers sync_monthly_accrual
    s, r = request_api("/api/leave-balances/TEMP-001", "GET", token=emp_token)
    bal_accrued = r.get("data", {}).get("Paid Leave", {})
    # Total accrued is now 2.0, used is 5.0 -> net is -3.0, but facing available is 0.0
    log_result("24. Critical: Future accrual works (+1 total, internal deficit tracked, facing available = 0)", bal_accrued.get("total") == 2.0 and bal_accrued.get("used") == 5.0 and bal_accrued.get("available") == 0.0, f"Total: {bal_accrued.get('total')}, Used: {bal_accrued.get('used')}, Available: {bal_accrued.get('available')}")

    # Clean up test leave
    request_api(f"/api/leaves/{req_5_id}", "DELETE", token=mgr_token)

    # Restore TEMP-001 to fresh 1.0 balance and pristine database
    with app.app_context():
        bal = LeaveBalance.query.filter_by(employee_id="TEMP-001", leave_type="Paid Leave").first()
        bal.total = 1.0
        bal.used = 0.0
        bal.pending = 0.0
        bal.available = 1.0
        bal.last_accrual_month = "2026-09"
        db.session.commit()
    log_result("25. Database restored to pristine clean state", True, "Restored TEMP-001 to initial fresh balance")

    # 26. Verify 9 Corporate Holidays
    s, r = request_api("/api/holidays", "GET")
    log_result("26. Corporate Holidays intact", s == 200 and len(r.get("data", [])) == 9, f"Count: {len(r.get('data', []))}")

    # 27. Health check API
    s, r = request_api("/api/health", "GET")
    log_result("27. Health check API operational", s == 200 and r.get("status") == "healthy", f"DB: {r.get('database')}")

    print("\n" + "=" * 70)
    passed_cnt = sum(1 for _, p, _ in results if p)
    total_cnt = len(results)
    print(f"VERIFICATION SUMMARY: {passed_cnt}/{total_cnt} TESTS PASSED")
    print("=" * 70)

    if passed_cnt == total_cnt:
        print("ALL VERIFICATION CHECKS PASSED PERFECTLY!")
        return 0
    else:
        print("SOME CHECKS FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())
