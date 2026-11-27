import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[ERROR] [${req.method}] ${req.url} - ${err.message}`, {
    stack: isProduction ? undefined : err.stack,
    requestId: req.requestId
  });

  res.status(statusCode).json({
    success: false,
    error: isProduction && statusCode >= 500 ? 'Service temporarily unavailable' : err.message || 'Internal server error occurred',
    code: err.code || 'INTERNAL_ERROR',
    requestId: req.requestId,
    ...(isProduction ? {} : { stack: err.stack })
  });
};
