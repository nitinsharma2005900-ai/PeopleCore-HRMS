# PeopleCore — Production Deployment & Disaster Recovery Guide
**Document Reference: PC-DEP-2026-v1.0**  
**Assessment 14 Mandatory Deliverable**

---

## 1. Hosting Architecture Overview
PeopleCore employs a modular microservices architecture designed for containerized deployment on Linux VM (Ubuntu 22.04 LTS / AWS EC2 / DigitalOcean Droplet) or managed platforms (Railway, Render, Fly.io).

```text
[Internet / Browser]
         │ (HTTPS / TLS 1.3)
         ▼
[Reverse Proxy: Nginx / Cloudflare]
         ├─── / (Port 3000) ──────► [Next.js App Router Frontend]
         ├─── /api/v1 (Port 5000) ─► [Node.js Express Core Backend]
         │                               │
         │                               ├─► [Python Decimal Payroll Engine :8001]
         │                               ├─► [FastAPI Workforce Analytics :8002]
         │                               ├─► [PostgreSQL 16 System of Record :5432]
         │                               └─► [Redis 7 Cache & BullMQ Queue :6379]
         │
         └─► [Background Worker Task Runner]
```

---

## 2. Environment Variables Configuration
Copy `.env.example` to `.env` on the host:
```bash
cp .env.example .env
```
Ensure strong cryptographic keys (min 32 chars) for `JWT_SECRET` and `JWT_REFRESH_SECRET`:
```bash
openssl rand -base64 32
```

---

## 3. Docker Compose One-Command Production Launch
To launch the full containerized stack:
```bash
docker compose up -d --build
```

Verify service status:
```bash
docker compose ps
```

Health check probes:
- Backend: `curl http://localhost:5000/api/v1/system/health`
- Payroll Engine: `curl http://localhost:8001/health`
- Analytics Service: `curl http://localhost:8002/health`

---

## 4. Backup & Disaster Recovery Policy

### Automated Encrypted Backup
Run `scripts/backup_database.sh` or `scripts/backup_database.ps1` via daily cron at 02:00 UTC:
```bash
# PostgreSQL logical dump with timestamp and SHA-256 verification
docker exec -t peoplecore-postgres pg_dumpall -c -U postgres | gzip > ./backups/peoplecore_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Retention Schedule
- Daily backups: Retained for 30 days.
- Weekly snapshots: Retained for 12 weeks.
- Monthly statutory archives: Retained for 7 years (statutory payroll compliance).

### Restore Verification Procedure
```bash
# Test restore into isolated staging instance
gunzip < ./backups/peoplecore_20261127.sql.gz | docker exec -i peoplecore-postgres-staging psql -U postgres -d peoplecore
```
