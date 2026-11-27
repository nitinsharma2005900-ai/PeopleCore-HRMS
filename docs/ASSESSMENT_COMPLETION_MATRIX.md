# Assessment review against project7.pdf

This is a verification matrix, not an awarded score or a claim that all 15 assessments are complete. The existing application and UI are preserved.

| # | Assessment | Finding |
|---|---|---|
| 01 | HRMS frontend | Ten existing pages retained. Explicit login, same-origin APIs, authenticated document/PDF downloads and payroll role controls repaired. Browser verification pending. |
| 02 | HRMS backend | Existing lifecycle, organization, attendance, leave, payroll, performance, documents and audit APIs reviewed; API/regression tests cover the main actions. |
| 03 | HR database model | Partial: normalized Prisma design retained; runtime collections now persist through a locked PostgreSQL JSONB adapter. Normalized table queries and per-entity relational constraints remain outstanding. |
| 04 | HR data security | Salary/payslip access restricted to payroll or employee owner; document ownership, manager approvals, password hash redaction, refresh rotation and production secrets repaired. |
| 05 | Python payroll | Genuine Decimal engine is mandatory. Removed floating-point fallback and fabricated PDFs. Finalization publishes only after all ReportLab PDFs succeed. |
| 06 | Workforce analytics | Existing FastAPI summary verified; local aggregate calculations use persisted records. Removed fabricated attrition and excluded weekly off days from attendance denominator. |
| 07 | Attendance/leave | Pending leave holds, approval actions, business-day attendance, cancellation, correction durations, local timezone and overnight checkout repaired. Cross-year leave is explicitly rejected; multi-level approval chains remain incomplete. |
| 08 | Integrations | Authenticated calendar, encrypted durable document bytes, and period-scoped simulated bank exports. Email delivery remains a sandbox. |
| 09 | Docker stack | Root-lockfile Node builds and Python requirement files repaired; secrets moved to environment. Legacy worker is a simulation, not a durable Redis queue. Container verification is recorded by CI. |
| 10 | Git governance | GitHub repository and traceable commits provided. Independent peer review and enforced branch protection are not claimed. |
| 11 | CI/CD | GitHub Actions runs real PostgreSQL/API/Python tests, builds, dependency audit and container builds. Approval-controlled release/staging rehearsal remains outstanding. |
| 12 | Testing | Existing 47 API/button checks plus eight targeted regressions and ten Python tests. Only completed passing runs count as evidence; final status appears in README. |
| 13 | API documentation | Existing OpenAPI and Postman retained. Added authenticated document download and confidential route requirements. |
| 14 | Deployment | Vercel services and separate free Neon database provisioned; final deployed verification pending. Encrypted backups, verified restore and production monitoring remain outstanding. |
| 15 | Incident simulation | Existing five educational scenarios retained. They are illustrative simulations, not evidence of operational recovery or real durable scheduled jobs. |

The capstone uses a PostgreSQL transaction/row lock around payroll operations, deterministic run identifiers, replacement of draft entries and immutable finalized periods. Repeated finalization returns the existing payslips; failed processing does not commit partial financial state.
