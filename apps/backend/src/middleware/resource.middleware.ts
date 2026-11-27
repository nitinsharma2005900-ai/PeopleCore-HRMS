import { Request, Response, NextFunction } from 'express';
import { db } from '../db';

export function enforceResourceAccess(req: Request, res: Response, next: NextFunction) {
  const user = req.user!;
  const [resource, section, id] = req.path.split('/').filter(Boolean);
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const privileged = ['HR_OFFICER', 'ADMINISTRATOR'].includes(user.role);
  const owns = (employeeId: string) => employeeId === user.employeeId;
  const manages = (employeeId: string) => db.employees.some(e => e.employeeId === employeeId && e.reportingManagerId === user.employeeId);
  const deny = () => res.status(403).json({ success: false, error: 'Access denied for this employee record', code: resource === 'payroll' && section === 'payslips' && user.role === 'EMPLOYEE' ? 'UNAUTHORIZED_PAYSLIP' : 'FORBIDDEN' });
  if (resource === 'payroll') {
    if ((write || section === 'export-bank-file') && user.role !== 'PAYROLL_SPECIALIST') return deny();
    if (section === 'payslips' && user.role !== 'PAYROLL_SPECIALIST') {
      if (!user.employeeId) return deny();
      req.query.employeeId = user.employeeId;
      if (id) {
        const payslip = db.payslips.find(p => p.id === id || p.payslipNumber === id);
        if (payslip && !owns(payslip.employeeId)) return deny();
      }
    }
  }
  if (resource === 'documents') {
    if (!privileged) {
      if (!user.employeeId || (write && req.method === 'DELETE')) return deny();
      req.query.employeeId = user.employeeId;
      if (req.body?.employeeId && !owns(req.body.employeeId)) return deny();
      const doc = db.employeeDocuments.find(d => d.id === section);
      if (doc && !owns(doc.employeeId)) return deny();
    }
  }
  if (resource === 'leave' || resource === 'attendance') {
    if (!privileged && user.role !== 'MANAGER') req.query.employeeId = user.employeeId;
    if (resource === 'leave' && section === 'balances' && !privileged && req.query.employeeId && !owns(String(req.query.employeeId)) && !(user.role === 'MANAGER' && manages(String(req.query.employeeId)))) return deny();
    const target = resource === 'leave' ? db.leaveRequests.find(r => r.id === id) : db.attendanceCorrections.find(c => c.id === id);
    if (target && req.path.endsWith('/review') && user.role === 'MANAGER' && !manages(target.employeeId)) return deny();
    if (req.path.endsWith('/review') && !['APPROVED', 'REJECTED'].includes(req.body?.action)) return res.status(400).json({ success: false, error: 'Action must be APPROVED or REJECTED' });
  }
  if (resource === 'performance' && section === 'reviews' && write) {
    const review = db.performanceReviews.find(r => r.id === id);
    const employeeId = review?.employeeId || req.body?.employeeId;
    if (!privileged && !(user.role === 'MANAGER' && manages(employeeId)) && !(user.role === 'EMPLOYEE' && review && owns(employeeId))) return deny();
    if (user.role === 'EMPLOYEE' && Object.keys(req.body).some(k => !['employeeFeedback', 'status'].includes(k))) return deny();
    if (user.role === 'EMPLOYEE' && req.body.status && req.body.status !== 'SUBMITTED') return deny();
  }
  if (resource === 'employees' && write && req.body?.role && !['EMPLOYEE', 'MANAGER', 'HR_OFFICER', 'PAYROLL_SPECIALIST', 'ADMINISTRATOR'].includes(req.body.role)) return res.status(400).json({ success: false, error: 'Invalid role' });
  if (resource === 'employees' && write && req.body?.role && req.body.role !== 'EMPLOYEE' && user.role !== 'ADMINISTRATOR') return deny();
  if (req.query.limit && (!/^\d+$/.test(String(req.query.limit)) || Number(req.query.limit) > 100 || Number(req.query.limit) < 1)) return res.status(400).json({ success: false, error: 'Invalid page size' });
  next();
}
