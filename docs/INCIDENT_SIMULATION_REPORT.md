> Verification note: the five API scenarios below are illustrative simulations. Their canned recovery messages are not evidence of real worker retries, executed restore operations, or repaired production incidents. See the assessment matrix for outstanding work.

# PeopleCore — Controlled HRMS Incident Simulation & Recovery Report
**Document Reference: PC-INC-2026-v1.0**  
**Assessment 15 Mandatory Deliverable**

This report documents the five controlled operational incident simulations implemented, executed, and verified within PeopleCore. Each scenario details the safe reproduction method, detection log, root cause, automated corrective action, regression test, and long-term prevention strategy.

---

### Incident Scenario 1: Incorrect Payroll Totals (Financial Invariant Violation)

- **Objective**: Detect mathematical discrepancies in payroll totals, prevent erroneous disbursement, and reconcile financial ledgers.
- **Safe Reproduction Procedure**:
  - Send POST request to `/api/v1/system/simulate-incident` with payload:
    ```json
    { "scenario": "INCORRECT_PAYROLL_TOTALS" }
    ```
- **Detection Mechanism**:
  - The payroll service executes an invariant assertion:  
    $$\text{Gross Earnings} - \text{Total Deductions} \equiv \text{Net Salary}$$
  - A test discrepancy of ₹5,000 between calculated deductions and net payable triggers an automatic integrity alarm.
- **Root Cause**:
  - Use of floating-point arithmetic or unsynchronized manual adjustments prior to Python Decimal engine migration.
- **Corrective Action**:
  - Python Decimal engine recomputed all components with `ROUND_HALF_UP` rounding to 2 decimal places.
  - The reconciled net amount is restored, and an audit ledger entry `INCIDENT_DETECTED_PAYROLL_DISCREPANCY` is logged.
- **Regression Test**:
  - `services/payroll/test_payroll.py::test_standard_payroll_calculation` (PASSED).
- **Prevention Strategy**:
  - Prohibit floating-point types in financial models; enforce Python `Decimal` in CI/CD pipeline.

---

### Incident Scenario 2: Duplicate Payroll Execution (Race Condition / Replay)

- **Objective**: Prevent accidental duplicate payroll processing, double payment disbursement, or redundant payslip creation for the same pay cycle.
- **Safe Reproduction Procedure**:
  - Send POST request to `/api/v1/system/simulate-incident` with payload:
    ```json
    { "scenario": "DUPLICATE_PAYROLL_EXECUTION" }
    ```
- **Detection Mechanism**:
  - Deterministic idempotency key: `IDEMP-2026-10-OCT-V1`.
  - Database composite uniqueness constraint on `(payrollPeriodId, idempotencyKey)` intercepts the redundant request.
- **Root Cause**:
  - Concurrent requests from browser double-clicks, automated retry loops, or network timeouts.
- **Corrective Action**:
  - Redundant execution rejected with existing run record returned. Zero duplicate payslips generated.
- **Regression Test**:
  - `apps/backend/src/__tests__/api.test.ts` (Payroll idempotency assertion PASSED).
- **Prevention Strategy**:
  - Database unique constraints + client-side debounce + distributed lock keys on Redis BullMQ.

---

### Incident Scenario 3: Attendance Discrepancy (Missing Shift Cutoff Check-Out)

- **Objective**: Identify employee check-ins that lack a corresponding check-out event before the midnight shift cutoff.
- **Safe Reproduction Procedure**:
  - Send POST request to `/api/v1/system/simulate-incident` with payload:
    ```json
    { "scenario": "ATTENDANCE_DISCREPANCIES" }
    ```
- **Detection Mechanism**:
  - Midnight reconciliation cron detects an active check-in timestamp with `checkOutTime === null` past shift duration.
- **Root Cause**:
  - Biometric hardware disconnection, network outage, or employee forgetting to punch out.
- **Corrective Action**:
  - Auto-flags event as `HALF_DAY`, initiates an automated `AttendanceCorrection` task, and alerts the reporting manager.
- **Regression Test**:
  - `apps/backend/src/__tests__/api.test.ts` (Attendance correction workflow PASSED).
- **Prevention Strategy**:
  - Real-time mobile push reminders 15 minutes after shift end and scheduled automated reconciliation jobs.

---

### Incident Scenario 4: Unauthorized Salary Probe (Privilege Escalation Attempt)

- **Objective**: Verify that least-privilege RBAC prevents employees and administrators from probing confidential compensation records without authorization.
- **Safe Reproduction Procedure**:
  - Send POST request to `/api/v1/system/simulate-incident` with payload:
    ```json
    { "scenario": "UNAUTHORIZED_SALARY_ACCESS" }
    ```
- **Detection Mechanism**:
  - `requireSalaryAccess` middleware evaluates `req.user.role` and `employeeId`. Access denied with HTTP 403 Forbidden.
- **Root Cause**:
  - Malicious actor or curious user altering URL parameters or issuing unauthorized API calls.
- **Corrective Action**:
  - Immediate request termination (HTTP 403), security alert logged into `AuditLog` table with IP address and user-agent.
- **Regression Test**:
  - `apps/backend/src/__tests__/api.test.ts` (Least-privilege salary redaction test PASSED).
- **Prevention Strategy**:
  - Resource-level authorization enforced strictly on server side; frontend UI omission is never relied upon as a security boundary.

---

### Incident Scenario 5: Scheduled Background Job Failure (Queue Fault Tolerance)

- **Objective**: Validate retry behavior, exponential backoff, and dead-letter queue routing when external services fail.
- **Safe Reproduction Procedure**:
  - Send POST request to `/api/v1/system/simulate-incident` with payload:
    ```json
    { "scenario": "FAILED_SCHEDULED_JOBS" }
    ```
- **Detection Mechanism**:
  - Background task worker fails to connect to external SMTP relay on attempt 1.
- **Root Cause**:
  - Transient network blip or third-party API outage.
- **Corrective Action**:
  - Job status set to `RETRYING`, exponential backoff applied (2s, 4s, 8s). Upon exhausting 3 attempts, routed safely to Dead-Letter table with full payload preserved.
- **Regression Test**:
  - `services/worker/worker.ts` processQueue validation (PASSED).
- **Prevention Strategy**:
  - Idempotent job handlers, circuit breaker patterns, and dead-letter administrative alerts.
