import { Router, Request, Response } from 'express';
import { AuditService } from '../services/audit.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/logs', authenticate, requireRole('ADMINISTRATOR', 'HR_OFFICER'), (req: Request, res: Response): void => {
  const result = AuditService.getAuditLogs({
    userId: req.query.userId as string,
    action: req.query.action as string,
    entityName: req.query.entityName as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 25
  });
  res.json({ success: true, data: result.logs, meta: result.meta });
});

export default router;
