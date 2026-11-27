import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import {
  DEPARTMENTS,
  SHIFTS,
  HOLIDAYS,
  LEAVE_TYPES,
  DEMO_USERS,
  generate50Employees
} from './seedData';
import { Role, EmploymentStatus, AttendanceStatus, LeaveStatus, PayrollStatus, ReviewStatus } from '../types';

export interface DatabaseState {
  users: any[];
  refreshTokens: any[];
  departments: any[];
  employees: any[];
  shifts: any[];
  shiftAssignments: any[];
  attendanceEvents: any[];
  attendanceCorrections: any[];
  holidays: any[];
  leaveTypes: any[];
  leaveBalances: any[];
  leaveRequests: any[];
  leaveApprovals: any[];
  salaryProfiles: any[];
  payrollPeriods: any[];
  payrollRuns: any[];
  payrollEntries: any[];
  payslips: any[];
  performanceReviews: any[];
  performanceGoals: any[];
  employeeDocuments: any[];
  notifications: any[];
  auditLogs: any[];
}

class PeopleCoreDatabase {
  private fallback: DatabaseState | undefined;
  private context = new AsyncLocalStorage<{ state: DatabaseState; dirty: boolean }>();
  public prisma = new PrismaClient();

  private get state(): DatabaseState {
    const current = this.context.getStore();
    if (current) return current.state;
    if (process.env.NODE_ENV !== 'test') throw new Error('Database access requires a request transaction');
    return this.fallback ||= this.seedFreshData();
  }
  private set state(value: DatabaseState) {
    const current = this.context.getStore();
    if (current) { current.state = value; current.dirty = true; }
    else if (process.env.NODE_ENV === 'test') this.fallback = value;
    else throw new Error('Database access requires a request transaction');
  }

  public save(): void {
    const current = this.context.getStore();
    if (current) current.dirty = true;
    else if (process.env.NODE_ENV !== 'test') throw new Error('Database access requires a request transaction');
  }

  // Retain the existing domain services, with PostgreSQL as the durable store.
  // A row lock serializes transactions across API instances, including payroll/leave.
  public transaction = async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL) return next();
    const originalEnd = res.end.bind(res);
    const originalWrite = res.write.bind(res);
    const chunks: Buffer[] = [];
    let endArgs: any[] = [];
    let ended = false;
    try {
      await this.prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(70707)`;
        const rows = await tx.$queryRaw<Array<{ payload: DatabaseState }>>`SELECT payload FROM "ApplicationState" WHERE id = 'peoplecore' FOR UPDATE`;
        const current = { state: rows[0]?.payload || this.seedFreshData(), dirty: !rows.length };
        const before = JSON.stringify(current.state);
        await this.context.run(current, () => new Promise<void>((resolve, reject) => {
          const disconnected = () => { if (!ended) reject(new Error('Request disconnected')); };
          res.once('close', disconnected);
          res.write = ((chunk: any, encoding?: any, callback?: any) => {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding as BufferEncoding : undefined));
            if (typeof encoding === 'function') encoding(); else if (callback) callback();
            return true;
          }) as any;
          res.end = ((...args: any[]) => { ended = true; endArgs = args; res.removeListener('close', disconnected); resolve(); return res; }) as any;
          next();
        }));
        // Failed operations never persist partially mutated in-memory objects.
        if ((res.statusCode < 400 || (req.path === '/auth/refresh' && current.dirty)) && (current.dirty || JSON.stringify(current.state) !== before)) {
          const payload = JSON.stringify(current.state);
          await tx.$executeRaw`INSERT INTO "ApplicationState" (id, payload, revision) VALUES ('peoplecore', ${payload}::jsonb, 1) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, revision = "ApplicationState".revision + 1`;
        }
      }, { maxWait: 20000, timeout: 120000 });
      res.end = originalEnd as any; res.write = originalWrite as any;
      for (const chunk of chunks) originalWrite(chunk);
      originalEnd(...endArgs as [any]);
    } catch (error) {
      res.end = originalEnd as any; res.write = originalWrite as any;
      if (!res.headersSent) { res.removeHeader('Content-Length'); res.status(503).json({ success: false, error: 'Database transaction unavailable. Please retry.' }); }
      else res.destroy();
      console.error('Database transaction failed', (error as Error).message);
    }
  };

  public seedFreshData(): DatabaseState {
    const employeesRaw = generate50Employees();
    const users: any[] = [...DEMO_USERS.map(u => ({ ...u, isActive: true, createdAt: new Date().toISOString() }))];
    
    // Add user accounts for the other 45 employees
    for (let i = 5; i < employeesRaw.length; i++) {
      const emp = employeesRaw[i];
      users.push({
        id: emp.userId,
        email: emp.userEmail,
        passwordHash: DEMO_USERS[4].passwordHash, // standard password Employee@12345
        role: 'EMPLOYEE' as Role,
        firstName: emp.firstName,
        lastName: emp.lastName,
        phone: emp.phone,
        isActive: emp.employmentStatus !== 'RESIGNED',
        createdAt: emp.joiningDate
      });
    }

    const employees: any[] = [];
    const salaryProfiles: any[] = [];
    const leaveBalances: any[] = [];
    const attendanceEvents: any[] = [];

    // Today is Nov 2026 as per time metadata
    const currentYear = 2026;
    const currentMonth = 11; // November

    for (const emp of employeesRaw) {
      const { salaryProfile, firstName, lastName, userEmail, ...empCore } = emp;
      employees.push({
        ...empCore,
        createdAt: emp.joiningDate,
        updatedAt: new Date().toISOString()
      });

      // Salary Profile
      salaryProfiles.push({
        id: `sal-${empCore.employeeId.toLowerCase()}`,
        employeeId: empCore.employeeId,
        ...salaryProfile,
        effectiveFrom: empCore.joiningDate,
        createdAt: empCore.joiningDate
      });

      // Leave Balances for 2026
      for (const lt of LEAVE_TYPES) {
        const used = lt.code === 'CASUAL' ? 2.0 : lt.code === 'SICK' ? 1.0 : 0.0;
        leaveBalances.push({
          id: `bal-${empCore.employeeId}-${lt.code}`,
          employeeId: empCore.employeeId,
          leaveTypeId: lt.id,
          leaveTypeCode: lt.code,
          year: currentYear,
          allocated: lt.annualQuota,
          used: used,
          pending: 0.0,
          remaining: lt.annualQuota - used,
          carriedForward: 0.0
        });
      }

      // Generate realistic attendance history for November 2026 (days 1 to 26)
      for (let day = 1; day <= 26; day++) {
        const d = new Date(currentYear, currentMonth - 1, day);
        const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
        const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekend
          attendanceEvents.push({
            id: `att-${empCore.employeeId}-${dateStr}`,
            employeeId: empCore.employeeId,
            shiftId: 'shift-gen',
            date: dateStr,
            checkInTime: null,
            checkOutTime: null,
            totalWorkMinutes: 0,
            overtimeMinutes: 0,
            lateMinutes: 0,
            status: 'WEEKLY_OFF',
            isOvernight: false,
            source: 'SYSTEM'
          });
        } else {
          // Weekday - 90% Present, 5% Late, 3% Leave, 2% Absent
          const rand = (parseInt(empCore.employeeId.replace('EMP', ''), 10) + day) % 20;
          let attStatus: AttendanceStatus = 'PRESENT';
          let checkIn = `${dateStr}T09:00:00Z`;
          let checkOut = `${dateStr}T18:00:00Z`;
          let workMins = 480;
          let lateMins = 0;
          let otMins = 0;

          if (rand === 1) {
            attStatus = 'LATE';
            checkIn = `${dateStr}T09:45:00Z`;
            workMins = 435;
            lateMins = 45;
          } else if (rand === 2) {
            attStatus = 'ON_LEAVE';
            checkIn = null as any;
            checkOut = null as any;
            workMins = 0;
          } else if (rand === 3) {
            attStatus = 'HALF_DAY';
            checkOut = `${dateStr}T13:30:00Z`;
            workMins = 240;
          } else if (rand === 4 && empCore.employeeId === 'EMP005') {
            // Overtime for employee 5
            otMins = 120;
            checkOut = `${dateStr}T20:00:00Z`;
            workMins = 600;
          }

          attendanceEvents.push({
            id: `att-${empCore.employeeId}-${dateStr}`,
            employeeId: empCore.employeeId,
            shiftId: 'shift-gen',
            date: dateStr,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            totalWorkMinutes: workMins,
            overtimeMinutes: otMins,
            lateMinutes: lateMins,
            status: attStatus,
            isOvernight: false,
            source: 'WEB'
          });
        }
      }
    }

    // Pending Leave Requests for manager and HR demonstration
    const leaveRequests = [
      {
        id: 'leave-req-001',
        employeeId: 'EMP005',
        leaveTypeId: 'lt-casual',
        leaveTypeCode: 'CASUAL',
        startDate: '2026-11-28',
        endDate: '2026-11-29',
        totalDays: 2.0,
        reason: 'Attending family wedding reception out of town.',
        status: 'PENDING' as LeaveStatus,
        createdAt: '2026-11-25T10:00:00Z',
        updatedAt: '2026-11-25T10:00:00Z'
      },
      {
        id: 'leave-req-002',
        employeeId: 'EMP006',
        leaveTypeId: 'lt-sick',
        leaveTypeCode: 'SICK',
        startDate: '2026-11-27',
        endDate: '2026-11-27',
        totalDays: 1.0,
        reason: 'Viral fever rest as advised by physician.',
        status: 'PENDING' as LeaveStatus,
        createdAt: '2026-11-26T08:30:00Z',
        updatedAt: '2026-11-26T08:30:00Z'
      },
      {
        id: 'leave-req-003',
        employeeId: 'EMP007',
        leaveTypeId: 'lt-earned',
        leaveTypeCode: 'EARNED',
        startDate: '2026-12-10',
        endDate: '2026-12-15',
        totalDays: 4.0,
        reason: 'Annual family holiday trip to Himachal Pradesh.',
        status: 'APPROVED' as LeaveStatus,
        createdAt: '2026-11-15T12:00:00Z',
        updatedAt: '2026-11-16T09:00:00Z'
      }
    ];

    // Attendance Corrections for Manager Approval
    const attendanceCorrections = [
      {
        id: 'corr-001',
        attendanceEventId: 'att-EMP005-2026-11-24',
        employeeId: 'EMP005',
        proposedCheckIn: '2026-11-24T09:00:00Z',
        proposedCheckOut: '2026-11-24T18:00:00Z',
        reason: 'Biometric reader on 3rd floor was undergoing firmware maintenance.',
        status: 'PENDING',
        reviewedBy: null,
        reviewComments: null,
        createdAt: '2026-11-25T09:15:00Z'
      }
    ];

    // Historical Payroll Periods: October 2026 (FINALIZED) and November 2026 (DRAFT)
    const payrollPeriods = [
      {
        id: 'period-2026-10',
        month: 10,
        year: 2026,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        totalWorkingDays: 22,
        status: 'FINALIZED' as PayrollStatus,
        finalizedAt: '2026-10-31T18:00:00Z',
        finalizedBy: 'Siddharth Nambiar (PAYROLL_SPECIALIST)'
      },
      {
        id: 'period-2026-11',
        month: 11,
        year: 2026,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        totalWorkingDays: 21,
        status: 'DRAFT' as PayrollStatus,
        finalizedAt: null,
        finalizedBy: null
      }
    ];

    // October Finalized Payroll Run with Entries & Payslips
    const octRun = {
      id: 'run-2026-10',
      payrollPeriodId: 'period-2026-10',
      runNumber: 1,
      status: 'FINALIZED' as PayrollStatus,
      idempotencyKey: 'IDEMP-2026-10-OCT-V1',
      totalGross: '3485000.00',
      totalDeductions: '462000.00',
      totalNet: '3023000.00',
      executedBy: 'Siddharth Nambiar',
      createdAt: '2026-10-30T15:00:00Z',
      updatedAt: '2026-10-31T18:00:00Z'
    };

    const payrollRuns = [octRun];
    const payrollEntries: any[] = [];
    const payslips: any[] = [];

    // Pre-seed October payslips for employees 1-10
    for (let i = 1; i <= 10; i++) {
      const empId = `EMP${i.toString().padStart(3, '0')}`;
      const emp = employees.find(e => e.employeeId === empId);
      const sal = salaryProfiles.find(s => s.employeeId === empId);
      if (emp && sal) {
        const base = parseFloat(sal.baseSalaryMonthly);
        const hra = parseFloat(sal.hraMonthly);
        const special = parseFloat(sal.specialAllowance);
        const gross = base + hra + special;
        const pf = Math.min(base, 15000) * 0.12;
        const tax = gross * (parseFloat(sal.tdsPercentage) / 100);
        const totalDed = pf + tax;
        const net = gross - totalDed;

        const entryId = `entry-2026-10-${empId}`;
        const psNumber = `PC-PS-202610-${empId}`;

        payrollEntries.push({
          id: entryId,
          payrollRunId: octRun.id,
          employeeId: empId,
          basicSalary: base.toFixed(2),
          hra: hra.toFixed(2),
          specialAllowance: special.toFixed(2),
          bonus: '0.00',
          overtimePay: '0.00',
          grossEarnings: gross.toFixed(2),
          pfDeduction: pf.toFixed(2),
          taxDeduction: tax.toFixed(2),
          unpaidLeaveDeduction: '0.00',
          otherDeductions: '0.00',
          totalDeductions: totalDed.toFixed(2),
          netSalary: net.toFixed(2),
          attendanceDays: 22,
          paidDays: 22,
          lopDays: 0,
          overtimeHours: 0,
          currency: 'INR',
          createdAt: '2026-10-31T18:00:00Z'
        });

        payslips.push({
          id: `ps-2026-10-${empId}`,
          payrollEntryId: entryId,
          employeeId: empId,
          payslipNumber: psNumber,
          month: 10,
          year: 2026,
          grossPay: gross.toFixed(2),
          totalDeductions: totalDed.toFixed(2),
          netPay: net.toFixed(2),
          pdfFilePath: `storage/payslips/Payslip_${empId}_${emp.personalEmail.split('@')[0]}_October_2026.pdf`,
          verificationHash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`,
          isPublished: true,
          generatedAt: '2026-10-31T18:00:00Z'
        });
      }
    }

    // Performance Reviews
    const performanceReviews = [
      {
        id: 'rev-001',
        employeeId: 'EMP005',
        reviewerId: 'EMP003',
        periodTitle: 'Q3 2026 Performance Evaluation',
        periodYear: 2026,
        status: 'REVIEWED' as ReviewStatus,
        overallRating: 4.8,
        managerFeedback: 'Aarav demonstrated exemplary technical ownership in modernizing our service deployment pipelines. Highly dependable team member.',
        employeeFeedback: 'Grateful for the leadership opportunities and mentorship provided this quarter.',
        submittedAt: '2026-10-15T14:00:00Z',
        reviewedAt: '2026-10-20T16:00:00Z',
        goals: [
          { id: 'goal-1', title: 'Zero-Downtime Migration Architecture', weightage: 40, status: 'ACHIEVED', rating: 5.0 },
          { id: 'goal-2', title: 'Code Review Response Time SLA < 4 hrs', weightage: 30, status: 'ACHIEVED', rating: 4.8 },
          { id: 'goal-3', title: 'Engineering Mentorship and Knowledge Sharing', weightage: 30, status: 'ACHIEVED', rating: 4.5 }
        ]
      }
    ];

    // Documents
    const employeeDocuments = [
      {
        id: 'doc-001',
        employeeId: 'EMP005',
        title: 'Employment Offer Letter & Contract',
        category: 'OFFER_LETTER',
        fileName: 'EMP005_Offer_Letter_Signed.pdf',
        fileMimeType: 'application/pdf',
        fileSize: 452819,
        filePath: 'storage/uploads/EMP005_Offer_Letter_Signed.pdf',
        fileHash: 'sha256-a8f59d4c22b109e87f654b9821c3498e72fa129',
        uploadedBy: 'Pooja Kashyap (HR)',
        isConfidential: true,
        createdAt: '2023-01-10T10:00:00Z'
      },
      {
        id: 'doc-002',
        employeeId: 'EMP005',
        title: 'Government Identity Proof (PAN Card)',
        category: 'ID_PROOF',
        fileName: 'EMP005_PAN_Verification.pdf',
        fileMimeType: 'application/pdf',
        fileSize: 245100,
        filePath: 'storage/uploads/EMP005_PAN_Verification.pdf',
        fileHash: 'sha256-78b12f4590c432a198de76c54321bafedc98765',
        uploadedBy: 'Aarav Gupta',
        isConfidential: true,
        createdAt: '2023-01-11T11:30:00Z'
      }
    ];

    // Notifications
    const notifications = [
      {
        id: 'notif-001',
        userId: 'user-manager',
        title: 'Pending Leave Approval',
        message: 'Aarav Gupta (EMP005) requested 2 days Casual Leave.',
        type: 'ACTION_REQUIRED',
        link: '/leave/approvals',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'notif-002',
        userId: 'user-payroll',
        title: 'November Payroll Cycle Open',
        message: 'November 2026 payroll period is in DRAFT. Review attendance and calculate.',
        type: 'INFO',
        link: '/payroll',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'notif-003',
        userId: 'user-admin',
        title: 'System Health Check Scheduled',
        message: 'Scheduled backup and incident monitoring active.',
        type: 'SYSTEM',
        link: '/admin',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'notif-004',
        userId: 'user-employee',
        title: 'Monthly Timesheet Submitted',
        message: 'Your November 2026 timesheet has been recorded.',
        type: 'INFO',
        link: '/attendance',
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ];

    // Audit Logs
    const auditLogs = [
      {
        id: 'audit-001',
        userId: 'user-admin',
        action: 'SYSTEM_INITIALIZED',
        entityName: 'System',
        entityId: 'SYS01',
        previousStateJson: null,
        newStateJson: { version: '1.0.0', status: 'ONLINE', modules: 12 },
        ipAddress: '127.0.0.1',
        userAgent: 'PeopleCore Initializer Agent',
        createdAt: new Date().toISOString()
      }
    ];

    const newState: DatabaseState = {
      users,
      refreshTokens: [],
      departments: DEPARTMENTS,
      employees,
      shifts: SHIFTS,
      shiftAssignments: [],
      attendanceEvents,
      attendanceCorrections,
      holidays: HOLIDAYS,
      leaveTypes: LEAVE_TYPES,
      leaveBalances,
      leaveRequests,
      leaveApprovals: [],
      salaryProfiles,
      payrollPeriods,
      payrollRuns,
      payrollEntries,
      payslips,
      performanceReviews,
      performanceGoals: [],
      employeeDocuments,
      notifications,
      auditLogs
    };

    return newState;
  }

  // Database Accessors
  public get users() { return this.state.users; }
  public get refreshTokens() { return this.state.refreshTokens; }
  public get departments() { return this.state.departments; }
  public get employees() { return this.state.employees; }
  public get shifts() { return this.state.shifts; }
  public get attendanceEvents() { return this.state.attendanceEvents; }
  public get attendanceCorrections() { return this.state.attendanceCorrections; }
  public get holidays() { return this.state.holidays; }
  public get leaveTypes() { return this.state.leaveTypes; }
  public get leaveBalances() { return this.state.leaveBalances; }
  public get leaveRequests() { return this.state.leaveRequests; }
  public get salaryProfiles() { return this.state.salaryProfiles; }
  public get payrollPeriods() { return this.state.payrollPeriods; }
  public get payrollRuns() { return this.state.payrollRuns; }
  public get payrollEntries() { return this.state.payrollEntries; }
  public set payrollEntries(val: any[]) { this.state.payrollEntries = val; }
  public get payslips() { return this.state.payslips; }
  public get performanceReviews() { return this.state.performanceReviews; }
  public get employeeDocuments() { return this.state.employeeDocuments; }
  public get notifications() { return this.state.notifications; }
  public get auditLogs() { return this.state.auditLogs; }

  public resetToDefault(): void {
    this.state = this.seedFreshData();
    this.save();
  }
}

export const db = new PeopleCoreDatabase();
