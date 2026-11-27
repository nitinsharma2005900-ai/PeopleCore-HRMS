import { Router, Request, Response } from 'express';
import { LeaveService } from '../services/leave.service';
import { IntegrationService } from '../services/integration.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { db } from '../db';

const router = Router();

router.get('/balances', authenticate, (req: Request, res: Response): void => {
  const empId = (req.query.employeeId as string) || req.user!.employeeId || 'EMP005';
  const year = req.query.year ? parseInt(req.query.year as string, 10) : 2026;
  const balances = LeaveService.getBalances(empId, year);
  res.json({ success: true, data: balances });
});

router.get('/requests', authenticate, (req: Request, res: Response): void => {
  // If employee role, only show own requests. If manager, HR, or admin, show all or filtered.
  let empId: string | undefined = undefined;
  if (req.user!.role === 'EMPLOYEE') {
    empId = req.user!.employeeId;
  } else if (req.query.employeeId) {
    empId = req.query.employeeId as string;
  }

  let requests = LeaveService.getLeaveRequests({
    employeeId: empId,
    status: req.query.status as any
  });
  if (req.user!.role === 'MANAGER') requests = requests.filter(r => db.employees.some(e => e.employeeId === r.employeeId && (e.reportingManagerId === req.user!.employeeId || e.employeeId === req.user!.employeeId)));
  res.json({ success: true, data: requests });
});

router.post('/apply', authenticate, (req: Request, res: Response): void => {
  try {
    const empId = req.user!.employeeId || req.body.employeeId;
    if (!empId) {
      res.status(400).json({ success: false, error: 'Employee ID required to submit leave request' });
      return;
    }
    const result = LeaveService.applyLeave({
      employeeId: empId,
      leaveTypeCode: req.body.leaveTypeCode,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      reason: req.body.reason
    });
    res.status(201).json({ success: true, message: 'Leave request submitted successfully', data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/requests/:id/review', authenticate, requireRole('MANAGER', 'HR_OFFICER', 'ADMINISTRATOR'), (req: Request, res: Response): void => {
  try {
    const result = LeaveService.reviewLeave(
      req.params.id,
      req.body.action,
      req.user!.employeeId || req.user!.id,
      req.body.comments
    );
    res.json({ success: true, message: `Leave request ${req.body.action.toLowerCase()}`, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/requests/:id/cancel', authenticate, (req: Request, res: Response): void => {
  try {
    const empId = req.user!.employeeId || req.body.employeeId;
    const result = LeaveService.cancelLeave(req.params.id, empId);
    res.json({ success: true, message: 'Leave request cancelled successfully', data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/types', authenticate, (req: Request, res: Response): void => {
  res.json({ success: true, data: db.leaveTypes });
});

router.get('/holidays', authenticate, (req: Request, res: Response): void => {
  res.json({ success: true, data: db.holidays });
});

router.get('/calendar/ics', authenticate, (req: Request, res: Response): void => {
  const ics = IntegrationService.generateCalendarICS((['ADMINISTRATOR', 'HR_OFFICER'].includes(req.user!.role) ? req.query.employeeId : req.user!.employeeId) as string);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="peoplecore_holidays_leaves.ics"');
  res.send(ics);
});

export default router;
