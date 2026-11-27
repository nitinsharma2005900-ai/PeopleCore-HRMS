import { Router, Request, Response } from 'express';
import { PerformanceService } from '../services/performance.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/reviews', authenticate, (req: Request, res: Response): void => {
  let empId: string | undefined = undefined;
  let revId: string | undefined = undefined;

  if (req.user!.role === 'EMPLOYEE') {
    empId = req.user!.employeeId;
  } else if (req.user!.role === 'MANAGER') {
    revId = req.user!.employeeId;
  } else if (req.query.employeeId) {
    empId = req.query.employeeId as string;
  }

  const reviews = PerformanceService.getReviews({ employeeId: empId, reviewerId: revId });
  res.json({ success: true, data: reviews });
});

router.post('/reviews', authenticate, requireRole('MANAGER', 'HR_OFFICER', 'ADMINISTRATOR'), (req: Request, res: Response): void => {
  try {
    const rev = PerformanceService.createReview({
      employeeId: req.body.employeeId,
      reviewerId: req.user!.employeeId || req.body.reviewerId || 'EMP003',
      periodTitle: req.body.periodTitle || 'Q4 2026 Performance Review',
      periodYear: req.body.periodYear ? parseInt(req.body.periodYear, 10) : 2026,
      goals: req.body.goals
    });
    res.status(201).json({ success: true, message: 'Review cycle initiated', data: rev });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/reviews/:id', authenticate, (req: Request, res: Response): void => {
  try {
    const updated = PerformanceService.updateReview(req.params.id, req.body);
    res.json({ success: true, message: 'Review updated successfully', data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
