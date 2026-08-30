import { Request, Response } from 'express';
import { backupService } from '../services/backup.service.js';
import { googleDriveService } from '../services/googleDriveService.js';
import { env } from '../config/env.js';

export const createBackup = async (req: Request, res: Response) => {
  try {
    const { backupData, deviceId } = req.body || {};

    // 1. Verify Root Folder Access first
    const rootCheck = await googleDriveService.testRootFolderAccess();
    if (!rootCheck.accessible) {
      return res.status(403).json({
        success: false,
        errorCode: 'GOOGLE_DRIVE_ROOT_FOLDER_NOT_ACCESSIBLE',
        stage: 'root-folder-access',
        message: `The Google Drive root folder (${googleDriveService.getRootFolderId()}) is not accessible. Share this folder with ${env.GOOGLE_SERVICE_ACCOUNT_EMAIL} as Editor.`,
        details: rootCheck.error
      });
    }

    // 2. Perform Cloud Backup
    const result = await backupService.createCloudBackup(backupData, deviceId);

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Cloud backup created and verified successfully in Google Drive',
      data: result
    });
  } catch (err: any) {
    console.error('[BackupController] Error creating backup:', err?.message || err);
    return res.status(400).json({
      success: false,
      errorCode: 'GOOGLE_DRIVE_BACKUP_FAILED',
      stage: 'backup-execution',
      message: err.message || 'Failed to create cloud backup in Google Drive',
      error: { message: err.message }
    });
  }
};

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
