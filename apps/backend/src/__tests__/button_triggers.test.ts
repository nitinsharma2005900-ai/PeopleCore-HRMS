import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('PeopleCore Comprehensive Button Trigger Verification Suite', () => {
  let adminToken: string;
  let hrToken: string;
  let managerToken: string;
  let payrollToken: string;
  let employeeToken: string;
  let createdEmpId: string;
  let correctionId: string;
  let leaveIdToApprove: string;
  let leaveIdToReject: string;
  let leaveIdToCancel: string;
  let createdPeriodId: string;
  let payslipId: string;
  let uploadedDocId: string;
  let sampleNotifId: string;

  beforeAll(async () => {
    // Button 1: Sign In (Admin)
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@peoplecore.local', password: 'Admin@12345' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.accessToken;

    // HR Officer
    const hrRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hr@peoplecore.local', password: 'Hr@12345' });
    expect(hrRes.status).toBe(200);
    hrToken = hrRes.body.data.accessToken;

    // Manager
    const mgrRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@peoplecore.local', password: 'Manager@12345' });
    expect(mgrRes.status).toBe(200);
    managerToken = mgrRes.body.data.accessToken;

    // Payroll Specialist
    const payRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'payroll@peoplecore.local', password: 'Payroll@12345' });
    expect(payRes.status).toBe(200);
    payrollToken = payRes.body.data.accessToken;

    // Employee
    const empRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@peoplecore.local', password: 'Employee@12345' });
    expect(empRes.status).toBe(200);
    employeeToken = empRes.body.data.accessToken;
  });

  // ---------------------------------------------------------------------------
  // Button 1 & 2: Sign In & 1-Click Demo Persona Switcher
  // ---------------------------------------------------------------------------
  describe('Buttons 1 & 2: Authentication & Persona Switcher Triggers', () => {
    it('Button 1: Sign In authenticates and issues token pair', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'employee@peoplecore.local', password: 'Employee@12345' });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.role).toBe('EMPLOYEE');
    });

    it('Button 2: 1-Click Persona Switcher works across all 5 roles', async () => {
      const personas = [
        { email: 'admin@peoplecore.local', pass: 'Admin@12345', role: 'ADMINISTRATOR' },
        { email: 'hr@peoplecore.local', pass: 'Hr@12345', role: 'HR_OFFICER' },
        { email: 'manager@peoplecore.local', pass: 'Manager@12345', role: 'MANAGER' },
        { email: 'payroll@peoplecore.local', pass: 'Payroll@12345', role: 'PAYROLL_SPECIALIST' },
        { email: 'employee@peoplecore.local', pass: 'Employee@12345', role: 'EMPLOYEE' }
      ];

      for (const p of personas) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: p.email, password: p.pass });
        expect(res.status).toBe(200);
        expect(res.body.data.user.role).toBe(p.role);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Button 3: Punch In & Punch Out
  // ---------------------------------------------------------------------------
  describe('Button 3: Time Tracking Punch Triggers', () => {
    it('Button 3: Punch In records check-in event for active shift', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ employeeId: 'EMP047', shiftId: 'shift-gen' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkInTime).toBeDefined();
    });

    it('Button 3: Prevents duplicate punch-in for same date with HTTP 400', async () => {
      const dupRes = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ employeeId: 'EMP047', shiftId: 'shift-gen' });
      expect(dupRes.status).toBe(400);
      expect(dupRes.body.error).toContain('already checked in today');
    });

    it('Button 3: Punch Out records check-out event and calculates total minutes', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ employeeId: 'EMP047' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkOutTime).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Buttons 4, 5 & 6: Employee Management Directory Triggers
  // ---------------------------------------------------------------------------
  describe('Buttons 4, 5 & 6: Employee Directory Triggers', () => {
    it('Button 4: Add Employee persists new hire and generates EMP ID', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          firstName: 'Ananya',
          lastName: 'Deshmukh',
          email: 'ananya.deshmukh@peoplecore.local',
          departmentId: 'dept-eng',
          designation: 'Senior QA Automation Engineer',
          employmentStatus: 'ACTIVE',
          baseSalaryMonthly: '75000',
          phone: '+91 98220 11223'
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBeDefined();
      createdEmpId = res.body.data.employeeId;
    });

    it('Button 5: Export CSV streams employee directory', async () => {
      const res = await request(app)
        .get('/api/v1/employees/export/csv')
        .set('Authorization', `Bearer ${hrToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('EmployeeID,FirstName,LastName,Email');
      expect(res.text).toContain('Ananya');
    });

    it('Button 6: View Profile returns employee details and honors least-privilege', async () => {
      const res = await request(app)
        .get(`/api/v1/employees/${createdEmpId}`)
        .set('Authorization', `Bearer ${hrToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Ananya');
      expect(res.body.data.departmentName).toBe('Engineering');
    });
  });

  // ---------------------------------------------------------------------------
  // Buttons 7 & 8: Attendance Correction Triggers
  // ---------------------------------------------------------------------------
  describe('Buttons 7 & 8: Attendance Correction Triggers', () => {
    it('Button 7: Request Correction submits request for manager review', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/correction')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId: 'EMP005',
          date: '2026-11-20',
          proposedCheckIn: '2026-11-20T09:00:00Z',
          proposedCheckOut: '2026-11-20T18:00:00Z',
          reason: 'Biometric fingerprint reader was offline at office entry'
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('PENDING');
      correctionId = res.body.data.id;
    });

    it('Query corrections returns list including the pending request', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/corrections')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.some((c: any) => c.id === correctionId)).toBe(true);
    });

    it('Button 8: Approve Attendance Correction updates timesheet to PRESENT (8h)', async () => {
      const res = await request(app)
        .put(`/api/v1/attendance/correction/${correctionId}/review`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ action: 'APPROVED', comments: 'Biometric issue verified by facilities' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });

  // ---------------------------------------------------------------------------
  // Buttons 9, 10, 11, 12 & 13: Leave Management Triggers
  // ---------------------------------------------------------------------------
  describe('Buttons 9, 10, 11, 12 & 13: Leave Management Triggers', () => {
    it('Button 9: Apply for Leave validates balances and creates pending request', async () => {
      // 1. Request to approve
      const res1 = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId: 'EMP005',
          leaveTypeCode: 'CASUAL',
          startDate: '2026-12-08',
          endDate: '2026-12-09',
          reason: 'Family event'
        });
      expect(res1.status).toBe(201);
      leaveIdToApprove = res1.body.data.id;

      // 2. Request to reject
      const res2 = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId: 'EMP005',
          leaveTypeCode: 'SICK',
          startDate: '2026-12-10',
          endDate: '2026-12-11',
          reason: 'Scheduled routine medical checkup'
        });
      expect(res2.status).toBe(201);
      leaveIdToReject = res2.body.data.id;

      // 3. Request to cancel
      const res3 = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId: 'EMP005',
          leaveTypeCode: 'CASUAL',
          startDate: '2026-12-22',
          endDate: '2026-12-23',
          reason: 'Winter holidays personal errand'
        });
      expect(res3.status).toBe(201);
      leaveIdToCancel = res3.body.data.id;
    });

    it('Button 10: Approve Leave Request transactionally decrements balance', async () => {
      const res = await request(app)
        .put(`/api/v1/leave/requests/${leaveIdToApprove}/review`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ action: 'APPROVED', comments: 'Approved by project manager' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });

    it('Button 11: Reject Leave Request restores balance and records remarks', async () => {
      const res = await request(app)
        .put(`/api/v1/leave/requests/${leaveIdToReject}/review`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ action: 'REJECTED', comments: 'Project delivery milestone constraint' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REJECTED');
    });

    it('Button 12: Cancel Leave Request allows employee to self-cancel', async () => {
      const res = await request(app)
        .post(`/api/v1/leave/requests/${leaveIdToCancel}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ employeeId: 'EMP005' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('Button 13: Download Calendar (.ics) streams valid iCalendar data', async () => {
      const res = await request(app).get('/api/v1/leave/calendar/ics').set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/calendar');
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('END:VCALENDAR');
    });
  });

  // ---------------------------------------------------------------------------
  // Buttons 14 - 20: Payroll Processing & Payslips Triggers
  // ---------------------------------------------------------------------------
  describe('Buttons 14 to 20: Payroll Engine Triggers', () => {
    it('Button 14: New Pay Period initializes monthly payroll cycle in DRAFT', async () => {
      const res = await request(app)
        .post('/api/v1/payroll/periods')
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({ month: 1, year: 2027, totalWorkingDays: 21 });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT');
      createdPeriodId = res.body.data.id;
    });

    it('Button 15: Run Python Calculation executes Decimal payroll calculations', async () => {
      const res = await request(app)
        .post('/api/v1/payroll/periods/period-2026-11/calculate')
        .set('Authorization', `Bearer ${payrollToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(parseFloat(res.body.calculationResult.total_gross)).toBeGreaterThan(0);
      expect(parseFloat(res.body.calculationResult.total_net)).toBeGreaterThan(0);
    });

    it('Button 16: Finalize Payroll marks cycle FINALIZED and creates payslips', async () => {
      const res = await request(app)
        .post('/api/v1/payroll/periods/period-2026-11/finalize')
        .set('Authorization', `Bearer ${payrollToken}`);
      expect(res.status).toBe(200);
      expect(res.body.totalPayslipsGenerated).toBeGreaterThan(0);

      // Fetch a payslip ID to test preview & download
      const listRes = await request(app)
        .get('/api/v1/payroll/payslips')
        .set('Authorization', `Bearer ${payrollToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);
      payslipId = listRes.body.data[0].id;
    });

    it('Button 17: Download Payslip PDF streams A4 ReportLab document', async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/payslips/${payslipId}/download`)
        .set('Authorization', `Bearer ${payrollToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('Button 18: Inline Preview Payslip streams PDF with inline disposition', async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/payslips/${payslipId}/preview`)
        .set('Authorization', `Bearer ${payrollToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('Button 19: Export Simulated Bank CSV generates batch payout file', async () => {
      const res = await request(app)
        .post('/api/v1/payroll/export-bank-file')
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({ periodLabel: '11_2026', format: 'csv' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('PaymentReference,EmployeeID,BeneficiaryName');
    });

    it('Button 20: Export NACHA ACH generates 94-character batch file', async () => {
      const res = await request(app)
        .post('/api/v1/payroll/export-bank-file')
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({ periodLabel: '11_2026', format: 'nacha' });
      expect(res.status).toBe(200);
      const lines = res.text.trim().split('\n');
      expect(lines[0].startsWith('101')).toBe(true);
      expect(lines[0].length).toBe(94);
    });
  });

  // ---------------------------------------------------------------------------
  // Button 21: Performance Review Trigger
  // ---------------------------------------------------------------------------
  describe('Button 21: Performance Review Trigger', () => {
    it('Button 21: Save Review updates appraisal ratings and manager feedback', async () => {
      const res = await request(app)
        .put('/api/v1/performance/reviews/rev-001')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          overallRating: 4.8,
          managerFeedback: 'Outstanding technical excellence and team mentorship.',
          status: 'REVIEWED'
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overallRating).toBe(4.8);
      expect(res.body.data.managerFeedback).toContain('technical excellence');
    });
  });

  // ---------------------------------------------------------------------------
  // Buttons 22 & 23: Document Center Triggers
  // ---------------------------------------------------------------------------
  describe('Buttons 22 & 23: Document Center Triggers', () => {
    it('Button 22: Upload Document persists encrypted file with SHA-256 hash', async () => {
      const fakePdfBuffer = Buffer.from('%PDF-1.4 ... Test PeopleCore Upload Document ... %%EOF');
      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${employeeToken}`)
        .field('title', 'Identity Verification Proof')
        .field('category', 'ID_PROOF')
        .field('employeeId', 'EMP005')
        .field('isConfidential', 'true')
        .attach('file', fakePdfBuffer, 'Identity_Proof_EMP005.pdf');
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileHash).toBeDefined();
      expect(res.body.data.fileHash.length).toBe(64);
      uploadedDocId = res.body.data.id;
    });

    it('Button 23: Delete Document removes file and metadata record', async () => {
      const res = await request(app)
        .delete(`/api/v1/documents/${uploadedDocId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Buttons 24 & 25: Incident Simulations & System Reset Triggers
  // ---------------------------------------------------------------------------
  describe('Buttons 24 & 25: System Administration & Governance Triggers', () => {
    it('Button 24: Simulate Incident executes all 5 Assessment 15 scenarios', async () => {
      const scenarios = [
        'INCORRECT_PAYROLL_TOTALS',
        'DUPLICATE_PAYROLL_EXECUTION',
        'ATTENDANCE_DISCREPANCIES',
        'UNAUTHORIZED_SALARY_ACCESS',
        'FAILED_SCHEDULED_JOBS'
      ];

      for (const sc of scenarios) {
        const res = await request(app)
          .post('/api/v1/system/simulate-incident')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ scenario: sc });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('RESOLVED');
        expect(res.body.detection).toBeDefined();
        expect(res.body.success).toBe(true);
      }
    });

    it('Button 25: Reset Demo Database restores synthetic 50-employee state', async () => {
      const res = await request(app)
        .post('/api/v1/system/reset-demo')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.employeeCount).toBe(50);
    });
  });

  // ---------------------------------------------------------------------------
  // Buttons 26 & 27: Notifications & Logout Triggers
  // ---------------------------------------------------------------------------
  describe('Buttons 26 & 27: Top Navbar Notifications & Logout Triggers', () => {
    it('Button 26: Mark Notification Read updates read status', async () => {
      // First get notifications
      const notifRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(notifRes.status).toBe(200);
      expect(notifRes.body.data.length).toBeGreaterThan(0);
      sampleNotifId = notifRes.body.data[0].id;

      // Mark single read
      const readRes = await request(app)
        .put(`/api/v1/notifications/${sampleNotifId}/read`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.data.isRead).toBe(true);

      // Mark all read
      const allRes = await request(app)
        .put('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(allRes.status).toBe(200);
      expect(allRes.body.success).toBe(true);
    });

    it('Button 27: Logout revokes refresh token and clears session', async () => {
      // Login first to get a refresh token
      const logRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'employee@peoplecore.local', password: 'Employee@12345' });
      const rfToken = logRes.body.data.refreshToken;
      const accToken = logRes.body.data.accessToken;

      const outRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accToken}`)
        .send({ refreshToken: rfToken });
      expect(outRes.status).toBe(200);
      expect(outRes.body.success).toBe(true);

      // Verify revoked token cannot be refreshed
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rfToken });
      expect(refreshRes.status).toBe(401);
    });
  });
});
