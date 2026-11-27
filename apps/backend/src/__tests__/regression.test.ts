import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { db } from '../db';
import { PythonServiceClient } from '../services/pythonClient.service';
const tokens: Record<string, string> = {};
beforeAll(async () => {
  for (const [role, password] of Object.entries({ admin: 'Admin@12345', hr: 'Hr@12345', manager: 'Manager@12345', payroll: 'Payroll@12345', employee: 'Employee@12345' })) {
    const result = await request(app).post('/api/v1/auth/login').send({ email: `${role}@peoplecore.local`, password });
    expect(result.status).toBe(200); tokens[role] = result.body.data.accessToken;
  }
});
const get = (path: string, role: string) => request(app).get(`/api/v1${path}`).set('Authorization', `Bearer ${tokens[role]}`);
describe('Security and data integrity regressions', () => {
  it('protects files and calendars', async () => {
    expect((await request(app).get('/api/v1/leave/calendar/ics')).status).toBe(401);
    expect((await request(app).get('/storage/uploads/example.pdf')).status).toBe(404);
  });
  it('restricts non-payroll staff to their own payslips', async () => {
    for (const role of ['admin', 'hr', 'manager']) {
      expect((await get('/payroll/payslips/ps-2026-10-EMP005', role)).status).toBe(403);
      const own = await get('/payroll/payslips', role);
      expect(own.body.data.every((p: any) => p.employeeId !== 'EMP005')).toBe(true);
    }
  });
  it('requires payroll permission for execution', async () => {
    expect((await request(app).post('/api/v1/payroll/periods/period-2026-11/calculate').set('Authorization', `Bearer ${tokens.admin}`)).status).toBe(403);
  });
  it('rotates distinct refresh tokens within one second', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'employee@peoplecore.local', password: 'Employee@12345' });
    const first = login.body.data.refreshToken;
    const refresh = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: first });
    expect(refresh.status).toBe(200); expect(refresh.body.data.refreshToken).not.toBe(first);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: first })).status).toBe(401);
  });
  it('downloads exact authenticated document bytes without exposing ciphertext', async () => {
    const payload = Buffer.from('Verified document bytes');
    const upload = await request(app).post('/api/v1/documents/upload').set('Authorization', `Bearer ${tokens.employee}`).field('employeeId', 'EMP005').attach('file', payload, 'proof.txt');
    expect(upload.status).toBe(201); expect(upload.body.data.encryptedData).toBeUndefined();
    const file = await get(`/documents/${upload.body.data.id}/download`, 'employee');
    expect(file.status).toBe(200); expect(file.text).toBe(payload.toString());
    expect((await request(app).delete(`/api/v1/documents/${upload.body.data.id}`).set('Authorization', `Bearer ${tokens.employee}`)).status).toBe(403);
  });
  it('rejects impossible dates and unsupported cross-year leave', async () => {
    for (const dates of [{ startDate: '2027-02-30', endDate: '2027-03-02' }, { startDate: '2026-12-31', endDate: '2027-01-02' }]) {
      expect((await request(app).post('/api/v1/leave/apply').set('Authorization', `Bearer ${tokens.employee}`).send({ ...dates, leaveTypeCode: 'CASUAL', reason: 'Boundary test' })).status).toBe(400);
    }
  });
  it('does not replace unavailable Python payroll with JavaScript', async () => {
    const mock = vi.spyOn(PythonServiceClient, 'calculateBatchPayroll').mockRejectedValueOnce(Object.assign(new Error('payroll service unavailable'), { statusCode: 503 }));
    const result = await request(app).post('/api/v1/payroll/periods/period-2026-11/calculate').set('Authorization', `Bearer ${tokens.payroll}`);
    expect(result.status).toBe(503); mock.mockRestore();
    const periods = await get('/payroll/periods', 'payroll');
    expect(periods.body.data.find((p: any) => p.id === 'period-2026-11').status).toBe('DRAFT');
  });
  it('persists state in PostgreSQL when a dedicated test database is supplied', async () => {
    if (!process.env.DATABASE_URL) return;
    const rows = await db.prisma.$queryRaw<Array<{ revision: number; payload: any }>>`SELECT revision, payload FROM "ApplicationState" WHERE id = 'peoplecore'`;
    expect(rows[0].revision).toBeGreaterThan(1);
    expect(rows[0].payload.users.length).toBe(50);
    expect(rows[0].payload.refreshTokens.every((t: any) => !t.rawToken)).toBe(true);
  });
  it('prevents offboarded employees from signing in', async () => {
    const created = await request(app).post('/api/v1/employees').set('Authorization', `Bearer ${tokens.hr}`).send({ firstName: 'Offboarding', lastName: 'Regression', email: 'offboarding-regression@peoplecore.local' });
    expect(created.status).toBe(201);
    const updated = await request(app).put(`/api/v1/employees/${created.body.data.employeeId}`).set('Authorization', `Bearer ${tokens.hr}`).send({ employmentStatus: 'TERMINATED' });
    expect(updated.status).toBe(200);
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'offboarding-regression@peoplecore.local', password: 'Employee@12345' });
    expect(login.status).toBe(401);
  });
});
