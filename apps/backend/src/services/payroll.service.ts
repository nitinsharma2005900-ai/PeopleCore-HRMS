import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { PythonServiceClient } from './pythonClient.service';
import { PayrollStatus } from '../types';

export class PayrollService {
  public static getPayrollPeriods() {
    return db.payrollPeriods.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
  }

  public static createPayrollPeriod(month: number, year: number, totalWorkingDays: number = 22) {
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(totalWorkingDays) || totalWorkingDays < 1 || totalWorkingDays > new Date(year, month, 0).getDate()) throw new Error('Invalid payroll period');
    const existing = db.payrollPeriods.find(p => p.month === month && p.year === year);
    if (existing) {
      throw new Error(`Payroll period for ${month}/${year} already exists.`);
    }

    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    const newPeriod = {
      id: `period-${year}-${month.toString().padStart(2, '0')}`,
      month,
      year,
      startDate,
      endDate,
      totalWorkingDays,
      status: 'DRAFT' as PayrollStatus,
      finalizedAt: null,
      finalizedBy: null,
      createdAt: new Date().toISOString()
    };

    db.payrollPeriods.push(newPeriod);
    db.save();
    return newPeriod;
  }

  public static async calculatePayrollForPeriod(periodId: string, executedBy: string) {
    const period = db.payrollPeriods.find(p => p.id === periodId);
    if (!period) {
      throw new Error(`Payroll period ${periodId} not found`);
    }
    if (period.status === 'FINALIZED') {
      throw new Error(`Payroll period ${period.month}/${period.year} is already finalized and cannot be recalculated.`);
    }

    if (period.status === 'CALCULATING') throw new Error('Payroll calculation already in progress');

    // Collect payroll calculation items for all active employees
    const activeEmployees = db.employees.filter(e => e.employmentStatus === 'ACTIVE' || e.employmentStatus === 'NOTICE_PERIOD' || e.employmentStatus === 'ONBOARDING');
    const items: any[] = [];

    const monthPrefix = `${period.year}-${period.month.toString().padStart(2, '0')}`;

    for (const emp of activeEmployees) {
      const user = db.users.find(u => u.id === emp.userId);
      const sal = db.salaryProfiles.find(s => s.employeeId === emp.employeeId);
      if (!sal) continue;

      // Calculate attendance days, LOP, and overtime for this month
      const events = db.attendanceEvents.filter(a => a.employeeId === emp.employeeId && a.date.startsWith(monthPrefix));
      const presentDays = events.filter(e => e.status === 'PRESENT' || e.status === 'LATE').length;
      const halfDays = events.filter(e => e.status === 'HALF_DAY').length;
      const paidLeaveDays = events.filter(e => e.status === 'ON_LEAVE').length;
      const attDays = presentDays + (halfDays * 0.5);

      const totalOtMins = events.reduce((sum, e) => sum + (e.overtimeMinutes || 0), 0);
      const otHours = Math.round((totalOtMins / 60) * 100) / 100;

      // LOP days = max(0, workingDays - (attDays + paidLeaveDays))
      const lopDays = Math.max(0, period.totalWorkingDays - (attDays + paidLeaveDays));

      items.push({
        employee_id: emp.employeeId,
        employee_name: user ? `${user.firstName} ${user.lastName}` : emp.employeeId,
        department: emp.departmentId,
        designation: emp.designation,
        base_salary_monthly: sal.baseSalaryMonthly,
        hra_monthly: sal.hraMonthly,
        special_allowance_monthly: sal.specialAllowance,
        bonus: '0.00',
        overtime_hours: otHours.toString(),
        total_working_days: period.totalWorkingDays,
        attendance_days: attDays.toString(),
        paid_leave_days: paidLeaveDays.toString(),
        lop_days: lopDays.toString(),
        pf_opt_in: sal.pfOptIn,
        tds_percentage: sal.tdsPercentage,
        other_deductions: '0.00',
        month: period.month,
        year: period.year,
        currency: 'INR'
      });
    }

    // Call Python Decimal Engine
    const calculationResult = await PythonServiceClient.calculateBatchPayroll(items);

    // Idempotency Key check: if payroll run exists for this period, update it safely
    const idempotencyKey = `IDEMP-${period.year}-${period.month.toString().padStart(2, '0')}-RUN1`;
    let run = db.payrollRuns.find(r => r.payrollPeriodId === period.id && r.idempotencyKey === idempotencyKey);

    if (!run) {
      run = {
        id: `run-${period.year}-${period.month.toString().padStart(2, '0')}`,
        payrollPeriodId: period.id,
        runNumber: 1,
        status: 'REVIEW_PENDING' as PayrollStatus,
        idempotencyKey,
        totalGross: calculationResult.total_gross,
        totalDeductions: calculationResult.total_deductions,
        totalNet: calculationResult.total_net,
        executedBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.payrollRuns.push(run);
    } else {
      run.totalGross = calculationResult.total_gross;
      run.totalDeductions = calculationResult.total_deductions;
      run.totalNet = calculationResult.total_net;
      run.status = 'REVIEW_PENDING' as PayrollStatus;
      run.updatedAt = new Date().toISOString();
      // Remove old entries
      const oldIdxs = db.payrollEntries.filter(e => e.payrollRunId === run?.id).map(e => e.id);
      db.payrollEntries = db.payrollEntries.filter(e => !oldIdxs.includes(e.id));
    }

    // Store Payroll Entries
    for (const res of calculationResult.results) {
      db.payrollEntries.push({
        id: `entry-${period.year}-${period.month}-${res.employee_id}`,
        payrollRunId: run.id,
        employeeId: res.employee_id,
        basicSalary: res.earned_basic,
        hra: res.earned_hra,
        specialAllowance: res.earned_special_allowance,
        bonus: res.bonus,
        overtimePay: res.overtime_pay,
        grossEarnings: res.gross_earnings,
        pfDeduction: res.pf_employee_deduction,
        taxDeduction: res.tax_tds_deduction,
        unpaidLeaveDeduction: res.unpaid_leave_deduction,
        otherDeductions: res.other_deductions,
        totalDeductions: res.total_deductions,
        netSalary: res.net_salary,
        attendanceDays: parseFloat(res.attendance_days),
        paidDays: parseFloat(res.attendance_days) + parseFloat(res.paid_leave_days),
        lopDays: parseFloat(res.lop_days),
        overtimeHours: parseFloat(res.overtime_hours),
        currency: res.currency,
        createdAt: new Date().toISOString()
      });
    }

    period.status = 'REVIEW_PENDING';
    db.save();

    return {
      success: true,
      period,
      run,
      totalEmployees: items.length,
      calculationResult
    };
  }

  public static async finalizePayroll(periodId: string, finalizedBy: string) {
    const period = db.payrollPeriods.find(p => p.id === periodId);
    if (!period) throw new Error(`Period ${periodId} not found`);

    const run = db.payrollRuns.find(r => r.payrollPeriodId === periodId);
    if (!run) throw new Error(`No calculation run found for period ${periodId}. Please calculate payroll first.`);

    if (period.status === 'FINALIZED') return { success: true, period, run, totalPayslipsGenerated: db.payslips.filter(p => p.month === period.month && p.year === period.year).length };
    if (period.status !== 'REVIEW_PENDING') throw new Error('Payroll must be calculated before finalization');

    const entries = db.payrollEntries.filter(e => e.payrollRunId === run.id);

    const payloads = entries.map(entry => this.payslipPayload(entry, period));
    const generated = await PythonServiceClient.generatePayslipsPDF(payloads);
    // Publish only after every genuine ReportLab PDF has been generated.
    for (const entry of entries) {
      const emp = db.employees.find(e => e.employeeId === entry.employeeId);
      const user = emp ? db.users.find(u => u.id === emp.userId) : null;
      const psNumber = `PC-PS-${period.year}${period.month.toString().padStart(2, '0')}-${entry.employeeId}`;

      // Check if payslip already exists (idempotent safeguard)
      let ps = db.payslips.find(p => p.payrollEntryId === entry.id);

      const pdfRes = generated.results[entries.indexOf(entry)];
      if (!pdfRes?.pdf_base64) throw new Error('Payslip service returned no PDF');

      if (!ps) {
        ps = {
          id: uuidv4(),
          payrollEntryId: entry.id,
          employeeId: entry.employeeId,
          payslipNumber: psNumber,
          month: period.month,
          year: period.year,
          grossPay: entry.grossEarnings,
          totalDeductions: entry.totalDeductions,
          netPay: entry.netSalary,
          pdfFilePath: pdfRes.filename,
          pdfBase64: pdfRes.pdf_base64,
          verificationHash: pdfRes.verification_hash,
          isPublished: true,
          generatedAt: new Date().toISOString()
        };
        db.payslips.push(ps);
      } else {
        ps.pdfFilePath = pdfRes.filename;
        ps.pdfBase64 = pdfRes.pdf_base64;
        ps.verificationHash = pdfRes.verification_hash;
        ps.isPublished = true;
      }
    }

    period.status = 'FINALIZED';
    period.finalizedAt = new Date().toISOString();
    period.finalizedBy = finalizedBy;
    run.status = 'FINALIZED';
    run.updatedAt = new Date().toISOString();
    db.save();

    return {
      success: true,
      period,
      run,
      totalPayslipsGenerated: entries.length
    };
  }

  public static payslipPayload(entry: any, period: any) {
    const emp = db.employees.find(e => e.employeeId === entry.employeeId);
    const user = db.users.find(u => u.id === emp?.userId);
    return {
      employee_id: entry.employeeId, employee_name: user ? `${user.firstName} ${user.lastName}` : entry.employeeId,
      department: db.departments.find(d => d.id === emp?.departmentId)?.name || emp?.departmentId,
      designation: emp?.designation, month: period.month, year: period.year,
      total_working_days: period.totalWorkingDays, attendance_days: entry.attendanceDays,
      paid_leave_days: entry.paidDays - entry.attendanceDays, lop_days: entry.lopDays, overtime_hours: entry.overtimeHours,
      earned_basic: entry.basicSalary, earned_hra: entry.hra, earned_special_allowance: entry.specialAllowance,
      bonus: entry.bonus, overtime_pay: entry.overtimePay, gross_earnings: entry.grossEarnings,
      pf_employee_deduction: entry.pfDeduction, tax_tds_deduction: entry.taxDeduction,
      unpaid_leave_deduction: entry.unpaidLeaveDeduction, other_deductions: entry.otherDeductions,
      total_deductions: entry.totalDeductions, net_salary: entry.netSalary, currency: entry.currency,
      payslip_number: `PC-PS-${period.year}${String(period.month).padStart(2, '0')}-${entry.employeeId}`
    };
  }

  public static async downloadPayslip(id: string) {
    const ps = db.payslips.find(p => p.id === id || p.payslipNumber === id);
    if (!ps) throw new Error('Payslip not found');
    if (!ps.pdfBase64) {
      const entry = db.payrollEntries.find(e => e.id === ps.payrollEntryId);
      const run = db.payrollRuns.find(r => r.id === entry?.payrollRunId);
      const period = db.payrollPeriods.find(p => p.id === run?.payrollPeriodId);
      if (!entry || !period || period.status !== 'FINALIZED') throw new Error('Finalized payroll entry unavailable');
      const result = await PythonServiceClient.generatePayslipPDF(this.payslipPayload(entry, period));
      ps.pdfBase64 = result.pdf_base64; ps.pdfFilePath = result.filename; ps.verificationHash = result.verification_hash;
      db.save();
    }
    return { bytes: Buffer.from(ps.pdfBase64, 'base64'), filename: ps.pdfFilePath };
  }

  public static getPayslips(employeeId?: string) {
    let list = [...db.payslips];
    if (employeeId) {
      list = list.filter(p => p.employeeId === employeeId);
    }
    return list.map(p => {
      const emp = db.employees.find(e => e.employeeId === p.employeeId);
      const user = emp ? db.users.find(u => u.id === emp.userId) : null;
      return {
        ...Object.fromEntries(Object.entries(p).filter(([key]) => key !== 'pdfBase64')),
        employeeName: user ? `${user.firstName} ${user.lastName}` : p.employeeId,
        department: emp?.departmentId,
        designation: emp?.designation
      };
    });
  }

  public static getPayslipById(idOrNumber: string) {
    const ps = db.payslips.find(p => p.id === idOrNumber || p.payslipNumber === idOrNumber);
    if (!ps) throw new Error(`Payslip ${idOrNumber} not found`);

    const entry = db.payrollEntries.find(e => e.id === ps.payrollEntryId);
    const emp = db.employees.find(e => e.employeeId === ps.employeeId);
    const user = emp ? db.users.find(u => u.id === emp.userId) : null;

    return {
      ...ps,
      entry,
      employeeName: user ? `${user.firstName} ${user.lastName}` : ps.employeeId,
      department: emp?.departmentId,
      designation: emp?.designation
    };
  }
}
