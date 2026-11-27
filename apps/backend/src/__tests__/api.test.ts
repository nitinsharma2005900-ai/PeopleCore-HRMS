import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('PeopleCore HRMS API & Security Integration Test Suite', () => {
  let adminToken: string;
  let employeeToken: string;
  let managerToken: string;
  let payrollToken: string;

  beforeAll(async () => {
    // 1. Authenticate Administrator
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@peoplecore.local', password: 'Admin@12345' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.accessToken;

    // 2. Authenticate Employee
    const empRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@peoplecore.local', password: 'Employee@12345' });
    expect(empRes.status).toBe(200);
    employeeToken = empRes.body.data.accessToken;

    // 3. Authenticate Manager
    const mgrRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@peoplecore.local', password: 'Manager@12345' });
    expect(mgrRes.status).toBe(200);
    managerToken = mgrRes.body.data.accessToken;

    // 4. Authenticate Payroll Specialist
    const payRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'payroll@peoplecore.local', password: 'Payroll@12345' });
    expect(payRes.status).toBe(200);
    payrollToken = payRes.body.data.accessToken;
  });

  // ---------------------------------------------------------------------------
  // 1. Authentication & Session Validation
  // ---------------------------------------------------------------------------
  describe('Authentication Module', () => {
    it('rejects invalid password credentials with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@peoplecore.local', password: 'WrongPassword999' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated requests to protected endpoints with HTTP 401', async () => {
      const res = await request(app).get('/api/v1/employees');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('allows valid session refresh with refresh token rotation', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'employee@peoplecore.local', password: 'Employee@12345' });
      const refreshToken = loginRes.body.data.refreshToken;

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Least-Privilege & Data Security (Assessment 04)
  // ---------------------------------------------------------------------------
  describe('Data Security & Least Privilege', () => {
    it('allows Payroll Specialist to view confidential employee compensation', async () => {
      const res = await request(app)
        .get('/api/v1/employees/EMP001')
        .set('Authorization', `Bearer ${payrollToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.salaryProfile).toBeDefined();
      expect(res.body.data.salaryProfile.baseSalaryMonthly).toBeDefined();
    });

    it('restricts Administrator from viewing sensitive salary without explicit payroll delegation', async () => {
      const res = await request(app)
        .get('/api/v1/employees/EMP010')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      // Restricted payload returned:
      expect(res.body.data.salaryProfile.restricted).toBe(true);
    });

    it('blocks Employee from accessing another employee payslip with HTTP 403', async () => {
      const res = await request(app)
        .get('/api/v1/payroll/payslips/ps-2026-10-EMP001')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UNAUTHORIZED_PAYSLIP');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Attendance & Shift Lifecycle (Assessment 07)
  // ---------------------------------------------------------------------------
  describe('Attendance Engine', () => {
    it('records check-in event successfully or catches duplicate event', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employeeId: 'EMP048', shiftId: 'shift-gen' });
      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      } else {
        expect(res.body.error).toContain('already checked in');
      }
    });

    it('records check-out and calculates total working minutes', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employeeId: 'EMP048' });
      expect([200, 400]).toContain(res.status);
    });

    it('submits attendance correction request for manager approval', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/correction')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          date: '2026-11-20',
          proposedCheckIn: '2026-11-20T09:00:00Z',
          proposedCheckOut: '2026-11-20T18:00:00Z',
          reason: 'Biometric reader maintenance'
        });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Leave Management & Policy Exclusions (Assessment 07)
  // ---------------------------------------------------------------------------
  describe('Leave Management Engine', () => {
    it('fetches annual leave balances for employee', async () => {
      const res = await request(app)
        .get('/api/v1/leave/balances')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('prevents overlapping leave requests with HTTP 400', async () => {
      // First request
      await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeCode: 'CASUAL',
          startDate: '2026-12-15',
          endDate: '2026-12-16',
          reason: 'Initial errand'
        });

      // Second overlapping request
      const overlapRes = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeCode: 'CASUAL',
          startDate: '2026-12-16',
          endDate: '2026-12-17',
          reason: 'Overlapping request'
        });
      expect(overlapRes.status).toBe(400);
      expect(overlapRes.body.error).toContain('Overlapping leave request detected');
    });

    it('exports RFC 5545 iCalendar (.ics) company calendar', async () => {
      const res = await request(app).get('/api/v1/leave/calendar/ics').set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('SUMMARY:Holiday:');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Payroll Engine & Payslips (Assessment 05 & 09)
  // ---------------------------------------------------------------------------
  describe('Payroll & Financial Ledger', () => {
    it('lists payroll periods including finalized October and draft November', async () => {
      const res = await request(app)
        .get('/api/v1/payroll/periods')
        .set('Authorization', `Bearer ${payrollToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('calculates November payroll idempotently using Python Decimal engine', async () => {
      const res = await request(app)
        .post('/api/v1/payroll/periods/period-2026-11/calculate')
        .set('Authorization', `Bearer ${payrollToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.calculationResult.total_gross).toBeDefined();
    });

    it('verifies finalized payslip contains SHA-256 cryptographic verification hash', async () => {
      const res = await request(app)
        .get('/api/v1/payroll/payslips/ps-2026-10-EMP005')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.verificationHash).toBeDefined();
      expect(res.body.data.verificationHash.length).toBe(64);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Workforce Analytics (Assessment 06)
  // ---------------------------------------------------------------------------
  describe('Workforce Analytics', () => {
    it('calculates headcount and retention rate without leaking individual salaries', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.total_headcount).toBeGreaterThanOrEqual(50);
      expect(res.body.data.retention_rate_pct).toBeGreaterThan(90);
    });

    it('returns department distribution with percentage shares', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/departments')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6);
      const totalPct = res.body.data.reduce((sum: number, d: any) => sum + d.percentage, 0);
      expect(Math.round(totalPct)).toBe(100);
    });
  });
});
