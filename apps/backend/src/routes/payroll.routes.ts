import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { PayrollService } from '../services/payroll.service';
import { authenticate, requireRole, requireSalaryAccess } from '../middleware/auth.middleware';
import { db } from '../db';
import axios from 'axios';
import { PythonServiceClient } from '../services/pythonClient.service';
import { config } from '../config/env';

const router = Router();

router.get('/periods', authenticate, (req: Request, res: Response): void => {
  const periods = PayrollService.getPayrollPeriods();
  res.json({ success: true, data: periods });
});

router.post('/periods', authenticate, requireRole('PAYROLL_SPECIALIST'), (req: Request, res: Response): void => {
  try {
    const { month, year, totalWorkingDays } = req.body;
    const period = PayrollService.createPayrollPeriod(
      parseInt(month, 10),
      parseInt(year, 10),
      totalWorkingDays ? parseInt(totalWorkingDays, 10) : 22
    );
    res.status(201).json({ success: true, message: 'Payroll period initialized', data: period });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

router.post('/periods/:id/calculate', authenticate, requireRole('PAYROLL_SPECIALIST'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await PayrollService.calculatePayrollForPeriod(
      req.params.id,
      `${req.user!.firstName} ${req.user!.lastName} (${req.user!.role})`
    );
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

router.post('/periods/:id/finalize', authenticate, requireRole('PAYROLL_SPECIALIST'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await PayrollService.finalizePayroll(
      req.params.id,
      `${req.user!.firstName} ${req.user!.lastName} (${req.user!.role})`
    );
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

router.get('/payslips', authenticate, (req: Request, res: Response): void => {
  // Least privilege: Employee sees ONLY own payslips!
  let empId: string | undefined = undefined;
  if (req.user!.role === 'EMPLOYEE') {
    empId = req.user!.employeeId;
  } else if (req.query.employeeId) {
    empId = req.query.employeeId as string;
  }

  const list = PayrollService.getPayslips(empId);
  res.json({ success: true, data: list });
});

router.get('/payslips/:id', authenticate, (req: Request, res: Response): void => {
  try {
    const ps = PayrollService.getPayslipById(req.params.id);
    // Security check: Employee cannot access another employee's payslip
    if (req.user!.role === 'EMPLOYEE' && ps.employeeId !== req.user!.employeeId) {
      res.status(403).json({ success: false, error: 'Forbidden: You cannot access another employee payslip', code: 'UNAUTHORIZED_PAYSLIP' });
      return;
    }
    const { pdfBase64, ...safe } = ps; res.json({ success: true, data: safe });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

for (const mode of ['download', 'preview']) {
  router.get(`/payslips/:id/${mode}`, authenticate, async (req, res) => {
    try {
      const file = await PayrollService.downloadPayslip(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Content-Disposition', `${mode === 'preview' ? 'inline' : 'attachment'}; filename="${path.basename(file.filename)}"`);
      res.send(file.bytes);
    } catch (error: any) { res.status(error.statusCode || 404).json({ success: false, error: error.message }); }
  });
}

router.post('/export-bank-file', authenticate, requireRole('PAYROLL_SPECIALIST'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { periodLabel, format, entries } = req.body;
    const label = String(periodLabel || '').split('_');
    const period = db.payrollPeriods.find(p => p.month === Number(label[0]) && p.year === Number(label[1]));
    if (!period || period.status !== 'FINALIZED') { res.status(400).json({ success: false, error: 'Select a finalized payroll period for bank export' }); return; }
    const run = db.payrollRuns.find(r => r.payrollPeriodId === period.id);
    const fileEntries = db.payrollEntries.filter(e => e.payrollRunId === run?.id).map(e => {
      const emp = db.employees.find(em => em.employeeId === e.employeeId);
      const user = emp ? db.users.find(u => u.id === emp.userId) : null;
      return {
        employee_id: e.employeeId,
        employee_name: user ? `${user.firstName} ${user.lastName}` : e.employeeId,
        bank_name: emp?.bankName || 'HDFC Bank Ltd',
        bank_account_number: emp?.bankAccountNumber || '98765432001',
        bank_ifsc_code: emp?.bankIfscCode || 'HDFC0001234',
        net_salary: e.netSalary
      };
    });

    const endpoint = format === 'nacha' ? 'nacha' : 'csv';
    const fileContent = await PythonServiceClient.call('payroll', `payroll/bank-file/${endpoint}`, { payroll_period_label: periodLabel, entries: fileEntries, currency: 'INR' });

    res.setHeader('Content-Type', format === 'nacha' ? 'text/plain' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Simulated_Bank_Payout_${(periodLabel || 'Nov_2026').replace(/\s+/g, '_')}.${format === 'nacha' ? 'ach' : 'csv'}"`);
    res.send(fileContent);
  } catch (err: any) {
    res.status(500).json({ success: false, error: `Failed to export simulated bank file: ${err.message}` });
  }
});

export default router;
