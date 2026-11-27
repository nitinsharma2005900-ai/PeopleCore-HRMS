# PeopleCore — Enterprise Employee Lifecycle, Attendance, Leave & Payroll Platform
**Project 07 • Orion LMS Technical Skills Evaluation Cohort**

![PeopleCore Banner](https://img.shields.io/badge/PeopleCore-v1.0.0-4F46E5?style=for-the-badge&logo=shield)
![Architecture](https://img.shields.io/badge/Architecture-Modular%20Microservices-0F172A?style=for-the-badge)

---

## Verified destinations and scope

- GitHub: https://github.com/nitinsharma2005900-ai/PeopleCore-HRMS (private).
- Deployment: pending final verification.
- Assessment findings: [existing matrix](docs/ASSESSMENT_COMPLETION_MATRIX.md).

The existing interface and application services are retained. PostgreSQL now stores the existing domain collections in one transactional JSONB record, with a database row lock preventing concurrent payroll and leave updates from losing data. The supplied normalized schema is retained as a design artifact; the legacy services do not yet query those normalized tables. This adapter favors preserving working code over a database redesign and is suitable for this small synthetic demonstration, not a claim of completing the relational-model assessment.

Payroll and PDF operations require the real Python service. An unavailable service returns an error and does not generate substitute pay calculations or PDFs. Documents are encrypted with AES-256-GCM and served through authenticated endpoints. Email/bank exports and incident examples are explicitly simulations. Do not store real employee or banking information in the public demo accounts.

## 1. Executive Summary & Overview
**PeopleCore** is a modern, deployment-ready enterprise Human Resource Management System (HRMS) and workforce management platform. Reviewed against the 15 hands-on assessments of Project 07, PeopleCore enforces strict separation of concerns across a typed Next.js App Router frontend, a secure Express.js REST API layer, a high-precision Python Decimal payroll engine, a FastAPI workforce analytics microservice, and a normalized PostgreSQL system of record.

---

## 2. Technology Stack

| Layer | Technologies & Tools |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React, Recharts, Framer Motion, TanStack Query |
| **Core Backend** | Node.js 22, Express.js, TypeScript, REST APIs, JWT with Refresh Token Rotation, Helmet, CORS, Rate Limiting, Zod |
| **Python Services** | Python 3.13, FastAPI, Pydantic, Python `Decimal` (`ROUND_HALF_UP`), ReportLab, Pandas, Pytest, HTTPX |
| **Database & Caching**| PostgreSQL, Prisma ORM, encrypted document storage; legacy Redis worker remains a simulation |
| **DevOps & Testing** | Docker, Docker Compose, GitHub Actions CI/CD, Vitest, Pytest, Supertest, Postman Collection, OpenAPI 3.0 |

---

## 3. Five Documented Demo Personas

PeopleCore includes pre-seeded synthetic accounts across five distinct user roles. The frontend includes a **1-click Persona Switcher** in the navigation sidebar and login view for instant demonstration:

| Persona Role | Demo Login Email | Password | Primary Permissions & Responsibilities |
|---|---|---|---|
| **Administrator** | `admin@peoplecore.local` | `Admin@12345` | System health, governance, audit ledger, controlled incident simulations, database recovery. (Restricted from salary access without payroll role) |
| **HR Officer** | `hr@peoplecore.local` | `Hr@12345` | Employee lifecycle directory, department structures, onboarding/offboarding, leave policy management |
| **Manager** | `manager@peoplecore.local` | `Manager@12345` | Team attendance monitoring, leave approvals, attendance corrections review, subordinate performance evaluations |
| **Payroll Specialist** | `payroll@peoplecore.local` | `Payroll@12345` | Full compensation management, pay period initialization, Python Decimal calculation, ReportLab PDF payslip generation, simulated NACHA/CSV bank exports |
| **Employee** | `employee@peoplecore.local` | `Employee@12345` | Self-service check-in/out, monthly timesheet calendar, leave applications, own payslip PDF downloads, confidential documents |

---

## 4. Key Architectural Features

1. **Python Decimal Payroll Engine (Capstone Challenge)**:
   - Uses strict Python `Decimal` with `ROUND_HALF_UP` rounding. Floating-point arithmetic is strictly prohibited for monetary calculations.
   - Idempotent execution: Repeated calculation runs using deterministic idempotency keys (`IDEMP-2026-10-OCT-V1`) produce identical results without duplicate entries, payslips, or payments.
   - Finalized financial records are immutable.
2. **ReportLab A4 PDF Payslips**:
   - Generates genuine, downloadable A4 PDF payslips with PeopleCore branding, organization details, earnings breakdown, statutory deductions, net in words, and embedded SHA-256 verification hash.
   - Download filename convention: `Payslip_EMP001_Rahul_Sharma_November_2026.pdf`.
3. **Workforce Analytics**:
   - Transparent calculations for Headcount retention, Department distribution, Attendance rates, and Absenteeism rate:
     $$\text{Absenteeism Rate (\%)} = \frac{\text{Total Absent Days}}{\text{Active Employees} \times \text{Working Days}} \times 100$$
4. **Third-Party Integrations**:
   - RFC 5545 `.ics` corporate calendar export for holidays and approved leaves.
   - Simulated ACH/NACHA and CSV banking payout exports.
   - Sandbox email dispatcher with message ID tracking.
   - Secure encrypted document storage with SHA-256 checksums.

---

## 5. Local Setup & Quick Start

### Prerequisites
- Node.js v20+ or v22+
- Python 3.11+ or 3.13+
- Git

Install and configure the services before testing:

```sh
npm ci
pip install -r services/payroll/requirements.txt -r services/analytics/requirements.txt -r services/requirements-dev.txt
# Copy .env.example to .env; configure a PostgreSQL URL and independent random secrets.
npm run db:generate
npm run db:migrate
```

Use the same INTERNAL_SERVICE_TOKEN in the API and Python services. Generate each secret independently using `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Set DOCUMENT_ENCRYPTION_KEY before uploading documents. Never commit .env files or deployment credentials. Database migrations run once against the selected database.

### One-Command Unified Test Execution
Start the Python services first. PostgreSQL API tests require DATABASE_URL pointing to a separate database ending in `_test`, with migrations applied. The test setup clears only that isolated test database. To run the suites:
```bash
npm test
python -m pytest services/payroll/test_payroll.py -q
python -m pytest services/analytics/test_analytics.py -q
npm run build
```

### Running Services Locally

#### 1. Start Python Payroll Service (Port 8001)
```bash
python services/payroll/main.py
```

#### 2. Start Python Analytics Service (Port 8002)
```bash
python services/analytics/main.py
```

#### 3. Start Core Backend API (Port 5000)
```bash
cd apps/backend
npm run dev
```

#### 4. Start Next.js Frontend (Port 3000)
```bash
cd apps/frontend
npm run dev
```
Open your browser at **`http://localhost:3000`**.

---

## 6. Docker Production Launch
To launch the complete containerized stack:
```bash
docker compose up -d --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api/v1`
- Swagger / OpenAPI Docs: `docs/openapi.yaml`
- Postman Collection: `postman/PeopleCore.postman_collection.json`

---

## 7. Assessment Deliverables Index
- **Assessment Matrix**: `docs/ASSESSMENT_COMPLETION_MATRIX.md`
- **Button Verification Checklist**: `docs/BUTTON_VERIFICATION_CHECKLIST.md`
- **Incident Simulation Report**: `docs/INCIDENT_SIMULATION_REPORT.md`
- **Payroll Governance Policy**: `docs/PAYROLL_GOVERNANCE_POLICY.md`
- **Production Deployment Guide**: `docs/DEPLOYMENT_GUIDE.md`
- **OpenAPI 3.0 Specification**: `docs/openapi.yaml`
- **Postman Collection**: `postman/PeopleCore.postman_collection.json`
