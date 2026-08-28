import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service.js';

export const getDashboardSummary = (req: Request, res: Response) => {
  const summary = dashboardService.getSummary();
  return res.json({
    success: true,
    message: 'Dashboard summary retrieved',
    data: summary,
    timestamp: new Date().toISOString()
  });
};
