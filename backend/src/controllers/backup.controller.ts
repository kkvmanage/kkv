import { Request, Response } from 'express';
import { backupService } from '../services/backup.service.js';

export const exportBackup = (req: Request, res: Response) => {
  const result = backupService.exportBackup();
  return res.json({
    success: true,
    message: 'Backup exported to Google Drive backups folder',
    data: result
  });
};

export const restoreBackup = (req: Request, res: Response) => {
  const restored = backupService.restoreBackup(req.body);
  if (!restored) {
    return res.status(400).json({ success: false, message: 'Failed to restore backup. Invalid JSON schema.' });
  }
  return res.json({ success: true, message: 'System state restored successfully from backup.' });
};

export const listBackups = (req: Request, res: Response) => {
  const backups = backupService.listBackups();
  return res.json({ success: true, data: backups });
};
