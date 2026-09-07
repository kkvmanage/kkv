import { Request, Response } from 'express';
import { backupService } from '../services/backup.service.js';
import { backupCloseService } from '../services/backupClose.service.js';
import { systemRestoreService } from '../services/systemRestore.service.js';
import { syncQueueService } from '../services/syncQueue.service.js';
import { googleDriveService } from '../services/googleDriveService.js';

export const createBackup = async (req: Request, res: Response) => {
  try {
    const { backupData, deviceId } = req.body || {};

    // 1. Verify Google Drive Connectivity & Permissions
    const rootCheck = await googleDriveService.testRootFolderAccess();
    if (!rootCheck.accessible) {
      const errorCode = rootCheck.errorCode || 'GOOGLE_DRIVE_FOLDER_NOT_ACCESSIBLE';
      let statusCode = 503;
      if (errorCode === 'GOOGLE_DRIVE_FOLDER_ACCESS_DENIED') statusCode = 403;
      if (errorCode === 'GOOGLE_DRIVE_FOLDER_NOT_FOUND') statusCode = 404;

      return res.status(statusCode).json({
        success: false,
        error: errorCode,
        errorCode,
        stage: 'root-folder-access',
        message: rootCheck.error || 'The configured Google Drive folder could not be accessed.'
      });
    }

    // 2. Perform Cloud Backup
    const result = await backupService.createCloudBackup(backupData, deviceId);
    const targetFolderId = googleDriveService.getRootFolderId();

    return res.status(200).json({
      success: true,
      message: 'Backup uploaded successfully',
      fileId: result.driveFileId,
      folderId: targetFolderId,
      verified: true,
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
    } else if (msg.includes('GOOGLE_DRIVE_FOLDER_ACCESS_DENIED') || msg.includes('not accessible')) {
      statusCode = 403;
      errorCode = 'GOOGLE_DRIVE_FOLDER_NOT_ACCESSIBLE';
    }

    return res.status(statusCode).json({
      success: false,
      error: errorCode,
      errorCode,
      stage: 'backup-execution',
      message: msg
    });
  }
};

/**
 * Executes the complete transactional Backup & Close workflow.
 */
export const backupAndCloseSession = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {
      userId: req.headers['user-id'] as string || 'STAFF-001',
      name: req.headers['user-name'] as string || 'Staff User',
      role: req.headers['user-role'] as string || 'STAFF'
    };

    const result = await backupCloseService.backupAndClose(user);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        localDataSafe: true,
        message: result.message || 'Cloud backup could not be verified. Your local data is safe.',
        error: result.error,
        errorCode: result.errorCode
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err: any) {
    console.error('[BackupController] backupAndCloseSession error:', err);
    return res.status(500).json({
      success: false,
      localDataSafe: true,
      message: 'Cloud backup could not be verified. Your local data is safe.',
      error: err?.message || 'Backup & Close process failed'
    });
  }
};

/**
 * On App Startup: checks if local DB is empty and auto-restores latest verified Drive backup.
 */
export const checkAutoRestore = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {
      userId: req.headers['user-id'] as string || 'SYSTEM',
      name: 'System Auto-Restore',
      role: 'ADMIN'
    };

    const result = await systemRestoreService.checkAndAutoRestoreIfEmpty(user);
    return res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    console.error('[BackupController] checkAutoRestore error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify auto-restore state.',
      error: err?.message || err
    });
  }
};

/**
 * Explicitly triggers restore from the latest verified cloud backup.
 */
export const autoRestoreLatest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {
      userId: req.headers['user-id'] as string || 'STAFF-001',
      name: req.headers['user-name'] as string || 'Staff User',
      role: req.headers['user-role'] as string || 'STAFF'
    };

    const result = await systemRestoreService.autoRestoreFromLatestDriveBackup(user);
    return res.json({
      success: true,
      message: 'System restored successfully from latest cloud backup.',
      data: result
    });
  } catch (err: any) {
    console.error('[BackupController] autoRestoreLatest error:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to restore latest cloud backup.',
      error: err?.message || err
    });
  }
};

/**
 * Sync Queue Endpoints
 */
export const getSyncStatus = (req: Request, res: Response) => {
  const status = syncQueueService.getSyncStatus();
  return res.json({ success: true, data: status });
};

export const retrySyncQueue = async (req: Request, res: Response) => {
  const result = await syncQueueService.retryPendingEvents();
  return res.json({ success: true, ...result });
};

export const getSyncEvents = (req: Request, res: Response) => {
  const events = syncQueueService.getOutboxEvents();
  return res.json({ success: true, data: events });
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
