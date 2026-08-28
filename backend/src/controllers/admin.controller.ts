import { Request, Response } from 'express';
import { adminService } from '../services/admin.service.js';

export const getMasterSettings = (req: Request, res: Response) => {
  const settings = adminService.getMasterSettings();
  return res.json({ success: true, data: settings });
};

export const updateMasterSettings = (req: Request, res: Response) => {
  const updated = adminService.updateMasterSettings(req.body);
  return res.json({ success: true, message: 'Master control settings updated', data: updated });
};

export const getWhatsAppTemplates = (req: Request, res: Response) => {
  const templates = adminService.getWhatsAppTemplates();
  return res.json({ success: true, data: templates });
};

export const updateWhatsAppTemplates = (req: Request, res: Response) => {
  const updated = adminService.updateWhatsAppTemplates(req.body);
  return res.json({ success: true, message: 'WhatsApp templates updated', data: updated });
};

export const unlockMasterControl = (req: Request, res: Response) => {
  const { password } = req.body;
  const unlocked = adminService.unlockMasterControl(password);
  if (!unlocked) {
    return res.status(401).json({ success: false, message: 'Incorrect password! Try: admin123' });
  }
  return res.json({ success: true, message: 'Master Control unlocked' });
};
