import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, (req: Request, res: Response): void => {
  const notifs = NotificationService.getNotifications(req.user!.id);
  res.json({ success: true, data: notifs });
});

router.put('/:id/read', authenticate, (req: Request, res: Response): void => {
  const result = NotificationService.markAsRead(req.params.id, req.user!.id);
  res.json({ success: true, data: result });
});

router.put('/read-all', authenticate, (req: Request, res: Response): void => {
  const result = NotificationService.markAllAsRead(req.user!.id);
  res.json(result);
});

export default router;
