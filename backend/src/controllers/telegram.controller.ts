import { Request, Response } from 'express';
import { adminService } from '../services/admin.service.js';

export const getTelegramConfig = (req: Request, res: Response) => {
  const config = adminService.getTelegramConfig();
  return res.json({ success: true, data: config });
};

export const updateTelegramConfig = (req: Request, res: Response) => {
  const updated = adminService.updateTelegramConfig(req.body);
  return res.json({ success: true, message: 'Telegram configuration updated', data: updated });
};
