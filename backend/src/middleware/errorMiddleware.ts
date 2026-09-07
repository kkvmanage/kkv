import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  errors?: any;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error Middleware]:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed on submitted customer data',
      errors: err.errors || err.message
    });
  }

  // Handle Mongoose Duplicate Key Error
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
      error: 'DUPLICATE_KEY_ERROR'
    });
  }

  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: err.code || 'SERVER_ERROR'
    }
  });
};
