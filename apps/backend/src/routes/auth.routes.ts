import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { config } from '../config/env';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

router.post('/login', validateBody(loginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await AuthService.login(email, password, ip, userAgent);
    res.json({ success: true, message: 'Login successful', data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message, code: 'AUTH_FAILED' });
  }
});

router.post('/refresh', validateBody(refreshSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshSession(refreshToken);
    res.json({ success: true, message: 'Session refreshed successfully', data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message, code: 'REFRESH_FAILED' });
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.body.refreshToken;
    let userId = 'system';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded: any = jwt.verify(authHeader.split(' ')[1], config.jwt.secret);
        userId = decoded.id;
      } catch (e) {}
    }
    const result = await AuthService.logout(userId, token);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: req.user });
});

export default router;
