# PeopleCore deployment

GitHub: https://github.com/nitinsharma2005900-ai/PeopleCore-HRMS (private).
Live application: https://peoplecore-hrms-five.vercel.app
API base: https://peoplecore-hrms-five.vercel.app/api/v1
Readiness: https://peoplecore-hrms-five.vercel.app/api/v1/system/ready

The existing Next.js, Express, payroll FastAPI and analytics FastAPI applications deploy together using Vercel Services. The Python services have no public ingress route; Express accesses them through service bindings and an internal authentication secret. The current project uses Node.js 22. PostgreSQL is a separate Neon resource on the Free plan. No paid service was provisioned. Free quotas and provider availability still apply.

The Vercel project is linked to the main branch. The checked-in vercel.json routes /api/v1 to Express and other traffic to Next.js. The Next.js runtime proxy provides the equivalent routing in local/Docker setups, where BACKEND_INTERNAL_URL identifies Express. The browser calls its own origin; private service addresses are not embedded in browser code.

## Required environment

Neon supplies DATABASE_URL and DATABASE_URL_UNPOOLED. Independently generated JWT_SECRET, JWT_REFRESH_SECRET, INTERNAL_SERVICE_TOKEN and DOCUMENT_ENCRYPTION_KEY are stored as Vercel secrets. FRONTEND_URL is the public application origin. Never commit pulled environment files, .vercel metadata, dumps, uploaded documents or generated PDFs. Keep the document encryption key stable across deployments and preserve it separately for recovery.

Apply migrations once before using a new database:

```sh
npm ci
npm run db:generate
npm run db:migrate
```

Use the direct/unpooled connection for migrations. The migration creates the PostgreSQL ApplicationState table used by the compatibility adapter. The first successful API request initializes the existing synthetic demo dataset only if that table has no state. Deployments do not overwrite existing state. Row locks and a transaction serialize operations across API instances. This is a small-demo persistence adapter; the supplied normalized schema remains a design artifact rather than the runtime data model.

## Verification

The live application has been checked for five role logins, denied salary access, database readiness, attendance, leave approval/cancellation, concurrent payroll calculation, immutable finalization, authenticated PDF/calendar downloads, and browser navigation. The real ReportLab PDF contains the correct employee, month and net pay. Demo reset is disabled in production. See README for final CI and browser results.

The public demo accounts contain synthetic information and known passwords. Do not load real employee, identity or banking data. Email delivery, bank payout exports and incident examples remain explicitly simulated. The legacy scheduled worker does not implement a durable Redis job queue; no cloud worker success is claimed.

## Backup and restore

The repaired PowerShell scripts use pg_dump and pg_restore, not the old local JSON file. Put PostgreSQL client tools on PATH and set DATABASE_URL for the intended server. Back up with scripts/backup_database.ps1. Restore into a separately created, explicitly named empty database using scripts/restore_database.ps1 -BackupFile <dump> -TargetDatabase <name>. Dumps are sensitive and gitignored. A disposable local PostgreSQL backup/restore was verified; encrypted off-site retention and a cloud restore rehearsal remain outstanding. The scripts do not claim to encrypt dumps.
