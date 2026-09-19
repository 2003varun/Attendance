# Automated Test Script for Multi-Device Data Synchronization
# Simulates Client A (Laptop 1) and Client B (Laptop 2) interacting via the Shared REST API & Database
import os
import sys
import json

SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

from app import app, db
from models import Employee, LeaveRequest, LeaveBalance, Holiday

def run_tests():
    print("================================================================")
    print("RUNNING MULTI-DEVICE DATA SYNCHRONIZATION TEST SUITE")
    print("================================================================")

    test_client = app.test_client()

    # Step 0: Verify Health & DB Connectivity
    print("\n[Step 0] Verifying Central API Health & Database Connectivity...")
    res = test_client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    health = res.get_json()
    assert health.get('status') == 'healthy', f"Unexpected health status: {health}"
    print("  PASS: Central Flask API is healthy and connected to database.")

    # Step 1: Client A queries initial leave balances for employee 363 (David Miller)
    print("\n[Step 1] Client A: Fetching initial balances for employee '363'...")
    res = test_client.get('/api/leave-balances/363')
    assert res.status_code == 200, f"Failed to get balances: {res.status_code}"
    initial_balances = res.get_json()['data']
    initial_sick_used = initial_balances.get('Sick Leave', {}).get('used', 0.0)
    initial_sick_remaining = initial_balances.get('Sick Leave', {}).get('remaining', 10.0)
    print(f"  Initial Sick Leave -> Used: {initial_sick_used}, Remaining: {initial_sick_remaining}")

    # Step 2: Client A (Laptop 1) applies for leave
    print("\n[Step 2] Client A (Laptop 1): Submitting leave request for David Miller...")
    apply_payload = {
        "employeeId": "363",
        "leaveType": "Sick Leave",
        "startDate": "2026-09-25",
        "endDate": "2026-09-26",
        "daysCount": 2.0,
        "reason": "Medical appointment and recovery (Sync Test)"
    }
    res = test_client.post('/api/leaves', json=apply_payload)
    assert res.status_code == 201, f"Failed to submit leave: {res.get_json()}"
    created_leave = res.get_json()['data']
    created_id = created_leave['id']
    print(f"  PASS: Leave created on Central Backend. ID: {created_id}, Status: {created_leave['status']}")
    assert created_leave['status'] == 'PENDING'
    assert created_leave['employeeId'] == '363'

    # Step 3: Verify single source of truth in the Database
    print("\n[Step 3] Verifying record persistence in Shared Database...")
    with app.app_context():
        db_leave = db.session.get(LeaveRequest, created_id)
        assert db_leave is not None, "Leave request not found in database!"
        assert db_leave.status == "PENDING"
        db_balance = LeaveBalance.query.filter_by(employee_id="363", leave_type="Sick Leave").first()
        print(f"  DB Check: Record {db_leave.id} verified. Pending days in DB: {db_balance.pending}")

    # Step 4: Client B (Laptop 2) queries all leave requests
    print("\n[Step 4] Client B (Laptop 2): Querying leaves via GET /api/leaves...")
    res = test_client.get('/api/leaves')
    assert res.status_code == 200, f"Failed to get leaves: {res.status_code}"
    client_b_leaves = res.get_json()['data']
    found = next((l for l in client_b_leaves if l['id'] == created_id), None)
    assert found is not None, "Client B could not see the leave created by Client A!"
    print(f"  PASS: Client B retrieved the new leave across network! Found: ID {found['id']} for {found.get('employeeName')}")

    # Step 5: Client B (Laptop 2 / Manager) approves the leave request
    print("\n[Step 5] Client B (Laptop 2): Approving David Miller's leave request...")
    approval_payload = {
        "status": "APPROVED",
        "approvedBy": "Sarah Jenkins (Laptop 2 Approver)"
    }
    res = test_client.patch(f'/api/leaves/{created_id}', json=approval_payload)
    assert res.status_code == 200, f"Failed to approve leave: {res.get_json()}"
    updated_leave = res.get_json()['data']
    assert updated_leave['status'] == 'APPROVED'
    assert updated_leave['approvedBy'] == 'Sarah Jenkins (Laptop 2 Approver)'
    print(f"  PASS: Leave status updated to APPROVED by '{updated_leave['approvedBy']}'.")

    # Step 6: Client A (Laptop 1) fetches updated leave and balances
    print("\n[Step 6] Client A (Laptop 1): Verifying approval and balance deduction...")
    res = test_client.get('/api/leaves?employee_id=363')
    client_a_leaves = res.get_json()['data']
    client_a_updated = next((l for l in client_a_leaves if l['id'] == created_id), None)
    assert client_a_updated['status'] == 'APPROVED'
    assert client_a_updated['approvedBy'] == 'Sarah Jenkins (Laptop 2 Approver)'
    print(f"  PASS: Client A sees updated approval status: {client_a_updated['status']}")

    res = test_client.get('/api/leave-balances/363')
    new_balances = res.get_json()['data']
    new_sick_used = new_balances['Sick Leave']['used']
    new_sick_remaining = new_balances['Sick Leave']['remaining']
    print(f"  Updated Sick Leave -> Used: {new_sick_used} (was {initial_sick_used}), Remaining: {new_sick_remaining} (was {initial_sick_remaining})")
    assert new_sick_used == initial_sick_used + 2.0, f"Expected used to increase by 2, got {new_sick_used}"

    # Step 7: Test Centralized Holiday Synchronization
    print("\n[Step 7] Testing Centralized Holiday Synchronization...")
    res = test_client.get('/api/holidays')
    assert res.status_code == 200
    hols = res.get_json()['data']
    print(f"  PASS: Retrieved {len(hols)} official corporate holidays from shared database.")

    print("\n================================================================")
    print("ALL MULTI-DEVICE DATA SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!")
    print("================================================================")
    return True

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
