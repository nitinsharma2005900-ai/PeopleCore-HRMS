import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/overview', authenticate, async (req: Request, res: Response): Promise<void> => {
  try { const summary = await AnalyticsService.getWorkforceSummary(); res.json({ success: true, data: summary }); }
  catch (error: any) { res.status(error.statusCode || 503).json({ success: false, error: error.message }); }
});

router.get('/departments', authenticate, (req: Request, res: Response): void => {
  const dist = AnalyticsService.getDepartmentDistribution();
  res.json({ success: true, data: dist });
});

router.get('/attendance', authenticate, (req: Request, res: Response): void => {
  const att = AnalyticsService.getAttendanceAnalytics();
  res.json({ success: true, data: att });
});

router.get('/leaves', authenticate, (req: Request, res: Response): void => {
  const leaves = AnalyticsService.getLeaveUtilization();
  res.json({ success: true, data: leaves });
});

router.get('/trends', authenticate, (req: Request, res: Response): void => {
  const trends = AnalyticsService.getHiringAttritionTrends();
  res.json({ success: true, data: trends });
});

router.get('/payroll', authenticate, (req: Request, res: Response): void => {
  // Returns aggregate summaries only (never leaks personal compensation)
  const payroll = AnalyticsService.getPayrollExpenditureSummary();
  res.json({ success: true, data: payroll });
});

export default router;
