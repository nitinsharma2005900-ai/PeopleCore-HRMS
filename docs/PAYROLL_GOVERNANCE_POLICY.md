# PeopleCore — Payroll Code Governance & Release Policy
**Document Reference: PC-GOV-2026-v1.0**  
**Assessment 10 Mandatory Deliverable**

---

## 1. Executive Mandate
In an enterprise Human Resource Management System (HRMS), financial calculations, tax withholding formulas, and statutory deduction policies represent legally and operationally critical domain logic. Erroneous rounding or float drift creates compliance liabilities, audit failure, and employee dissatisfaction.

This document establishes the mandatory governance, peer-review standards, migration guidelines, and traceability controls for PeopleCore.

---

## 2. Core Payroll Calculation Rules

1. **Strict Python `Decimal` Mandate**:
   - Floating-point arithmetic (`float`) is strictly prohibited in monetary calculations.
   - All financial amounts must be initialized using `Decimal("XX.YY")`.
   - Explicit rounding must be applied using `ROUND_HALF_UP` to two decimal places.

2. **Idempotency & Reproducibility (Capstone Challenge)**:
   - Every payroll execution cycle must accept a deterministic `idempotencyKey` formatted as:  
     `IDEMP-{YEAR}-{MONTH:02d}-{REVISION}`.
   - Re-running payroll calculation for the same employee, pay period, and revision MUST produce identical results.
   - Re-running payroll MUST NOT duplicate payroll ledger records, duplicate payslips, or generate duplicate banking disbursements.

3. **Immutability of Finalized Financial Records**:
   - Once a payroll period status transitions to `FINALIZED`, the calculation snapshot, payroll entries, and payslips become read-only and immutable.
   - Revisions or corrections to finalized cycles require a formal Adjustment Payroll Run (`RUN_NUMBER > 1`) with an explicit audit ledger justification. Never silently overwrite historical financial records.

4. **Cryptographic Payslip Verification**:
   - Every generated ReportLab PDF payslip must calculate a SHA-256 cryptographic verification hash based on the tuple:  
     `{payslipNumber}:{employeeId}:{month}:{year}:{netSalary}`.
   - The hash is permanently embedded in the PDF footer and stored in the PostgreSQL database for tamper detection.

---

## 3. Git Branching & Peer Review Rules

1. **Protected Branch Policy**:
   - The `main` branch is permanently protected. Direct pushes and force pushes are blocked.
   - Changes to `/services/payroll/` and `/apps/backend/src/services/payroll.service.ts` require:
     - Mandatory review and sign-off by at least two designated Code Owners: Lead Architect and Payroll Specialist.
     - 100% green status on automated CI checks (`.github/workflows/ci.yml`).

2. **Database Migration Governance**:
   - All database schema modifications must be committed as numbered, idempotent SQL migration files under `/database/migrations/`.
   - Dropping historical payroll tables or attendance records is prohibited. Offboarded employees must be archived with `employmentStatus = 'RESIGNED' | 'TERMINATED'`; historical attendance and payslips are retained indefinitely for statutory compliance.

3. **Release Notes & Change Traceability**:
   - Every release affecting payroll policies or statutory thresholds must publish semantically versioned release notes documenting:
     - Policy formula changes.
     - Effective statutory dates.
     - Backward compatibility verification on historical runs.
