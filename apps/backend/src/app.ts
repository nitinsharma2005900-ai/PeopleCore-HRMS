import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';

import { db } from './db';
import { authenticate } from './middleware/auth.middleware';
import { enforceResourceAccess } from './middleware/resource.middleware';
import { config } from './config/env';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import departmentRoutes from './routes/department.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';
import payrollRoutes from './routes/payroll.routes';
import performanceRoutes from './routes/performance.routes';
import documentRoutes from './routes/document.routes';
import analyticsRoutes from './routes/analytics.routes';
import notificationRoutes from './routes/notification.routes';
import auditRoutes from './routes/audit.routes';
import systemRoutes from './routes/system.routes';

const app: Application = express();
app.set('trust proxy', 1);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false // Allow inline scripts/previews in dev
}));

// CORS Configuration
app.use(cors({
  origin: config.frontendUrl.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Internal-Token']
}));

// Rate Limiting (1,000 requests per 15 min window)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Request ID and Logging
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms [req: :req[x-request-id]]'));
}

// Body Parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    platform: 'PeopleCore Enterprise HRMS',
    version: '1.0.0',
    status: 'ONLINE',
    docs: '/api/v1/docs',
    health: '/api/v1/system/health'
  });
});

// API Routes
const apiPrefix = `/api/${config.apiVersion}`;
app.use(apiPrefix, db.transaction);
app.use(apiPrefix, (req, res, next) => {
  if (['/auth/login', '/auth/refresh', '/system/health', '/system/ready'].includes(req.path)) return next();
  authenticate(req, res, () => enforceResourceAccess(req, res, next));
});
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/employees`, employeeRoutes);
app.use(`${apiPrefix}/departments`, departmentRoutes);
app.use(`${apiPrefix}/attendance`, attendanceRoutes);
app.use(`${apiPrefix}/leave`, leaveRoutes);
app.use(`${apiPrefix}/payroll`, payrollRoutes);
app.use(`${apiPrefix}/performance`, performanceRoutes);
app.use(`${apiPrefix}/documents`, documentRoutes);
app.use(`${apiPrefix}/analytics`, analyticsRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);
app.use(`${apiPrefix}/audit`, auditRoutes);
app.use(`${apiPrefix}/system`, systemRoutes);

// Catch-all 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.url} - Endpoint not found`,
    code: 'NOT_FOUND'
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;

export { app };
