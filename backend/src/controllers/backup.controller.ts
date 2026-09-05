import { Request, Response } from 'express';
import { backupService } from '../services/backup.service.js';
import { googleDriveService } from '../services/googleDriveService.js';

export const createBackup = async (req: Request, res: Response) => {
  try {
    const { backupData, deviceId } = req.body || {};

    // 1. Verify Google Drive Connectivity & Permissions
    const rootCheck = await googleDriveService.testRootFolderAccess();
    if (!rootCheck.accessible) {
      const errorCode = rootCheck.errorCode || 'GOOGLE_DRIVE_NOT_CONNECTED';
      let statusCode = 503;
      if (errorCode === 'GOOGLE_DRIVE_FOLDER_ACCESS_DENIED') statusCode = 403;
      if (errorCode === 'GOOGLE_DRIVE_FOLDER_NOT_FOUND') statusCode = 404;

      return res.status(statusCode).json({
        success: false,
        errorCode,
        stage: 'root-folder-access',
        message: rootCheck.error || 'Google Drive is not connected or accessible. Please connect your Google account in Settings.',
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
    const msg = err?.message || 'Failed to create cloud backup in Google Drive';
    let statusCode = 500;
    let errorCode = 'GOOGLE_DRIVE_BACKUP_FAILED';

    if (msg.includes('GOOGLE_DRIVE_NOT_CONNECTED') || msg.includes('not connected')) {
      statusCode = 503;
      errorCode = 'GOOGLE_DRIVE_NOT_CONNECTED';
    } else if (msg.includes('GOOGLE_DRIVE_REAUTH_REQUIRED') || msg.includes('expired') || msg.includes('revoked')) {
      statusCode = 401;
      errorCode = 'GOOGLE_DRIVE_REAUTH_REQUIRED';
    } else if (msg.includes('GOOGLE_DRIVE_QUOTA_EXCEEDED') || msg.includes('quota')) {
      statusCode = 507;
      errorCode = 'GOOGLE_DRIVE_QUOTA_EXCEEDED';
    } else if (msg.includes('GOOGLE_DRIVE_FOLDER_NOT_FOUND')) {
      statusCode = 404;
      errorCode = 'GOOGLE_DRIVE_FOLDER_NOT_FOUND';
    }

    return res.status(statusCode).json({
      success: false,
      errorCode,
      stage: 'backup-execution',
      message: msg,
      error: { message: msg }
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
