import { Router, Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { db } from '../db';

const router = Router();

router.post('/check-in', authenticate, (req: Request, res: Response): void => {
  try {
    const empId = req.user!.employeeId || req.body.employeeId;
    if (!empId) {
      res.status(400).json({ success: false, error: 'Employee ID is required to record check-in' });
      return;
    }
    const result = AttendanceService.checkIn(empId, req.body.shiftId || 'shift-gen');
    res.json({ success: true, message: 'Check-in recorded successfully', data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/check-out', authenticate, (req: Request, res: Response): void => {
  try {
    const empId = req.user!.employeeId || req.body.employeeId;
    if (!empId) {
      res.status(400).json({ success: false, error: 'Employee ID is required to record check-out' });
      return;
    }
    const result = AttendanceService.checkOut(empId);
    res.json({ success: true, message: 'Check-out recorded successfully', data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/my', authenticate, (req: Request, res: Response): void => {
  const empId = req.user!.employeeId || (req.query.employeeId as string) || 'EMP005';
  const month = req.query.month ? parseInt(req.query.month as string, 10) : 11;
  const year = req.query.year ? parseInt(req.query.year as string, 10) : 2026;
  const result = AttendanceService.getMonthlyAttendance(empId, month, year);
  res.json({ success: true, data: result });
});

router.get('/team', authenticate, requireRole('MANAGER', 'HR_OFFICER', 'ADMINISTRATOR'), (req: Request, res: Response): void => {
  const managerId = req.user!.employeeId || (req.query.managerId as string) || 'EMP003';
  const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const result = AttendanceService.getTeamAttendance(managerId, dateStr);
  res.json({ success: true, data: result });
});

router.post('/correction', authenticate, (req: Request, res: Response): void => {
  try {
    const empId = req.user!.employeeId || req.body.employeeId;
    const result = AttendanceService.requestCorrection({
      employeeId: empId,
      date: req.body.date,
      proposedCheckIn: req.body.proposedCheckIn,
      proposedCheckOut: req.body.proposedCheckOut,
      reason: req.body.reason
    });
    res.status(201).json({ success: true, message: 'Correction request submitted to manager', data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/correction/:id/review', authenticate, requireRole('MANAGER', 'HR_OFFICER', 'ADMINISTRATOR'), (req: Request, res: Response): void => {
  try {
    const result = AttendanceService.reviewCorrection(
      req.params.id,
      req.body.action,
      req.body.comments,
      req.user!.employeeId || req.user!.id
    );
    res.json({ success: true, message: `Correction request ${req.body.action.toLowerCase()}`, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/corrections', authenticate, (req: Request, res: Response): void => {
  const empId = req.user!.role === 'EMPLOYEE' ? req.user!.employeeId : (req.query.employeeId as string | undefined);
  let corrections = db.attendanceCorrections;
  if (empId) {
    corrections = corrections.filter(c => c.employeeId === empId);
  }
  if (req.user!.role === 'MANAGER') corrections = corrections.filter(c => db.employees.some(e => e.employeeId === c.employeeId && e.reportingManagerId === req.user!.employeeId));
  res.json({ success: true, data: corrections });
});

router.get('/shifts', authenticate, (req: Request, res: Response): void => {
  res.json({ success: true, data: db.shifts });
});

export default router;
