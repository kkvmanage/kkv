import { Request, Response } from 'express';
import { adminService } from '../services/admin.service.js';
import { systemWipeService } from '../services/systemWipe.service.js';
import { systemRestoreService } from '../services/systemRestore.service.js';
import { backupPackageService } from '../services/backupPackage.service.js';
import { googleDriveService } from '../services/googleDriveService.js';
import { env } from '../config/env.js';

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

export const getDriveHealth = async (req: Request, res: Response) => {
  try {
    const health = await googleDriveService.getDriveHealth();
    const folderId = health.rootFolderId || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || env.GOOGLE_DRIVE_FOLDER_ID || '1PYqtIQ-Uyz-pgdKUu33r4W9bhSzcZHjv';
    return res.status(200).json({
      enabled: health.configured,
      authMode: health.authMode,
      connected: health.success,
      googleAccount: health.googleAccount,
      folderId,
      folderAccessible: health.folderAccessible,
      canUpload: health.canUpload,
      status: health.status,
      success: health.success,
      configured: health.configured,
      folderName: health.folderName || 'KKV DB',
      errorCode: health.errorCode,
      message: health.message,
      data: {
        ...health,
        folderId,
        enabled: health.configured
      }
    });
  } catch (err: any) {
    console.error('[AdminController] getDriveHealth error:', err?.message || err);
    const folderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID || env.GOOGLE_DRIVE_FOLDER_ID || '1PYqtIQ-Uyz-pgdKUu33r4W9bhSzcZHjv';
    return res.status(200).json({
      enabled: false,
      authMode: 'NONE',
      connected: false,
      googleAccount: '',
      folderId,
      folderAccessible: false,
      canUpload: false,
      status: 'NOT_CONNECTED',
      success: false,
      configured: false,
      folderName: 'KKV DB',
      errorCode: 'GOOGLE_DRIVE_HEALTH_CHECK_FAILED',
      message: err?.message || 'Failed to check Google Drive health',
      data: {
        enabled: false,
        configured: false,
        authMode: 'NONE',
        connected: false,
        canUpload: false,
        folderId
      }
    });
  }
};

// ==========================================
// BACKUP PACKAGE APIs
// ==========================================

export const createBackupPackage = async (req: Request, res: Response) => {
  try {
    const user = {
      userId: (req.headers['x-actor-uid'] as string) || 'ADMIN-001',
      name: (req.headers['x-actor-name'] as string) || 'Administrator',
      role: (req.headers['user-role'] as string) || 'Admin'
    };

    const record = await backupPackageService.createFullBackupPackage(user);
    return res.json({
      success: true,
      message: 'Full backup package created and verified successfully.',
      data: record
    });
  } catch (err: any) {
    console.error('[AdminController] createBackupPackage error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to create backup package.',
      error: { code: 'BACKUP_CREATION_FAILED' }
    });
  }
};

export const getBackupHistory = (req: Request, res: Response) => {
  try {
    const history = backupPackageService.getBackupHistory();
    return res.json({ success: true, data: history });
  } catch (err: any) {
    console.error('[AdminController] getBackupHistory error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve backup history.',
      data: []
    });
  }
};

export const downloadBackupZip = (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    if (!backupId) {
      return res.status(400).json({ success: false, message: 'Backup ID is required.' });
    }

    const zipData = backupPackageService.getBackupZip(backupId);
    if (!zipData) {
      return res.status(404).json({ success: false, message: 'Backup file not found.' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipData.fileName}"`);
    res.setHeader('Content-Length', zipData.fileSize);
    res.setHeader('x-backup-sha256', zipData.sha256);

    return res.send(zipData.buffer);
  } catch (err: any) {
    console.error('[AdminController] downloadBackupZip error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to download backup file.' });
  }
};

export const acknowledgeDownload = (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    const user = {
      userId: (req.headers['x-actor-uid'] as string) || 'ADMIN-001',
      name: (req.headers['x-actor-name'] as string) || 'Administrator'
    };

    const ack = backupPackageService.acknowledgeDownload(backupId, user);
    return res.json({ success: true, message: 'Download acknowledged', data: ack });
  } catch (err: any) {
    console.error('[AdminController] acknowledgeDownload error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to acknowledge download.' });
  }
};

export const uploadBackupToDrive = async (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    const uploadRes = await backupPackageService.uploadBackupToDrive(backupId);
    return res.json({
      success: true,
      message: 'Backup uploaded and verified on Google Drive.',
      data: uploadRes
    });
  } catch (err: any) {
    console.error('[AdminController] uploadBackupToDrive error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to upload backup to Google Drive.'
    });
  }
};

// ==========================================
// WIPE ALL DATA APIs
// ==========================================

export const getWipePreview = (req: Request, res: Response) => {
  try {
    const preview = systemWipeService.getWipePreview();
    return res.json({ success: true, data: preview });
  } catch (err: any) {
    console.error('[AdminController] getWipePreview error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to load wipe preview data.' });
  }
};

export const initiateWipeBackup = async (req: Request, res: Response) => {
  try {
    const { confirmationText } = req.body || {};
    const cleanConfirm = (confirmationText || '').trim();
    if (cleanConfirm !== 'WIPE ALL DATA') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation text. You must type "WIPE ALL DATA" exactly.',
        error: { code: 'INVALID_CONFIRMATION' }
      });
    }

    const user = {
      userId: (req.headers['x-actor-uid'] as string) || 'ADMIN-001',
      name: (req.headers['x-actor-name'] as string) || 'Administrator',
      role: (req.headers['user-role'] as string) || 'Admin'
    };

    const verificationRecord = await systemWipeService.initiateFullBackupAndVerify(cleanConfirm, user);
    return res.json({
      success: true,
      message: 'Complete backup created and verified in Google Drive & Local server successfully.',
      data: verificationRecord
    });
  } catch (err: any) {
    console.error('[AdminController] initiateWipeBackup error:', err?.message || err);
    const msg: string = err?.message || 'Backup verification failed. No application data was deleted.';

    let statusCode = 503;
    let errorCode = 'BACKUP_VERIFICATION_FAILED';
    if (msg.includes('Invalid confirmation text')) {
      statusCode = 400;
      errorCode = 'INVALID_CONFIRMATION';
    } else if (msg.includes('folder cannot be accessed') || msg.includes('root folder')) {
      statusCode = 503;
      errorCode = 'GOOGLE_DRIVE_FOLDER_ACCESS_DENIED';
    } else if (msg.includes('not connected') || msg.includes('credentials')) {
      statusCode = 503;
      errorCode = 'GOOGLE_DRIVE_NOT_CONNECTED';
    } else if (msg.includes('Checksum verification failed') || msg.includes('integrity check failed')) {
      statusCode = 500;
      errorCode = 'BACKUP_INTEGRITY_MISMATCH';
    }

    return res.status(statusCode).json({
      success: false,
      message: msg,
      error: { code: errorCode }
    });
  }
};

export const confirmSystemWipe = async (req: Request, res: Response) => {
  try {
    const { token, confirmationText } = req.body || {};
    const cleanConfirm = (confirmationText || '').trim();
    if (!token || cleanConfirm !== 'WIPE ALL DATA') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token or confirmation text.',
        error: { code: 'INVALID_REQUEST' }
      });
    }

    const user = {
      userId: (req.headers['x-actor-uid'] as string) || 'ADMIN-001',
      name: (req.headers['x-actor-name'] as string) || 'Administrator',
      role: (req.headers['user-role'] as string) || 'Admin'
    };

    const wipeResult = systemWipeService.confirmAndWipeData(token, cleanConfirm, user);
    return res.json({
      success: true,
      message: 'All application operational data has been permanently removed.',
      data: wipeResult
    });
  } catch (err: any) {
    console.error('[AdminController] confirmSystemWipe error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Data wipe failed.',
      error: { code: 'WIPE_FAILED' }
    });
  }
};

// ==========================================
// SYSTEM RESTORE APIs
// ==========================================

export const getAvailableRestoreBackups = async (req: Request, res: Response) => {
  try {
    const backups = await systemRestoreService.getAvailableBackups();
    return res.json({ success: true, data: backups });
  } catch (err: any) {
    console.error('[AdminController] getAvailableRestoreBackups error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to list Google Drive backups.',
      error: { code: 'BACKUP_LISTING_FAILED' }
    });
  }
};

export const validateRestoreBackup = async (req: Request, res: Response) => {
  try {
    let zipBuffer: Buffer | undefined;
    let jsonString: string | undefined;

    if (req.file) {
      if (req.file.originalname.endsWith('.zip')) {
        zipBuffer = req.file.buffer;
      } else {
        jsonString = req.file.buffer.toString('utf-8');
      }
    } else if (req.body.jsonString) {
      jsonString = req.body.jsonString;
    }

    const { fileId, backupId } = req.body || {};

    const validationResult = await systemRestoreService.validateBackupForRestore({
      zipBuffer,
      jsonString,
      fileId,
      backupId
    });

    return res.json({
      success: true,
      message: 'Backup package validated successfully.',
      data: validationResult
    });
  } catch (err: any) {
    console.error('[AdminController] validateRestoreBackup error:', err?.message || err);
    return res.status(400).json({
      success: false,
      message: err?.message || 'Backup validation failed.',
      error: { code: 'BACKUP_VALIDATION_FAILED' }
    });
  }
};

export const executeSystemRestore = async (req: Request, res: Response) => {
  try {
    const { token, confirmationText } = req.body || {};
    const cleanConfirm = (confirmationText || '').trim();
    if (!token || (cleanConfirm !== 'RESTORE BACKUP' && cleanConfirm !== 'RESTORE SYSTEM')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token or confirmation text. You must type "RESTORE BACKUP" exactly.',
        error: { code: 'INVALID_CONFIRMATION' }
      });
    }

    const user = {
      userId: (req.headers['x-actor-uid'] as string) || 'ADMIN-001',
      name: (req.headers['x-actor-name'] as string) || 'Administrator',
      role: (req.headers['user-role'] as string) || 'Admin'
    };

    const result = await systemRestoreService.executeRestore(token, cleanConfirm, user);
    return res.json({
      success: true,
      message: result.googleDriveSync === 'VERIFIED'
        ? 'Database restored and Google Drive synchronized successfully.'
        : 'System operational database restored and verified.',
      data: result,
      restore: {
        status: 'VERIFIED',
        restoreId: result.restoreId
      },
      googleDrive: {
        status: result.googleDriveSync,
        errorCode: result.googleDriveErrorCode,
        errorMessage: result.googleDriveError
      },
      recordCounts: result.restoredCounts
    });
  } catch (err: any) {
    console.error('[AdminController] executeSystemRestore error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'System restore failed.',
      error: { code: 'RESTORE_FAILED' }
    });
  }
};

export const getRestoreHistory = async (req: Request, res: Response) => {
  try {
    const history = systemRestoreService.getRestoreHistory();
    return res.json({ success: true, data: history });
  } catch (err: any) {
    console.error('[AdminController] getRestoreHistory error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to fetch restore history.',
      error: { code: 'HISTORY_FETCH_FAILED' }
    });
  }
};

export const retryDriveSync = async (req: Request, res: Response) => {
  try {
    const { restoreId } = req.params;
    if (!restoreId) {
      return res.status(400).json({ success: false, message: 'Restore ID is required.' });
    }

    const user = {
      userId: (req.headers['x-actor-uid'] as string) || 'ADMIN-001',
      name: (req.headers['x-actor-name'] as string) || 'Administrator',
      role: (req.headers['user-role'] as string) || 'Admin'
    };

    const updated = await systemRestoreService.retryDriveSync(restoreId, user);
    
    if (updated.googleDriveSync === 'VERIFIED') {
      return res.json({
        success: true,
        message: 'Google Drive synchronization completed and verified.',
        data: updated,
        restore: {
          status: 'VERIFIED',
          restoreId: updated.restoreId
        },
        googleDrive: {
          status: 'VERIFIED'
        },
        recordCounts: updated.restoredCounts
      });
    } else {
      return res.json({
        success: false,
        message: updated.googleDriveError || 'Google Drive synchronization could not be completed.',
        errorCode: updated.googleDriveErrorCode || 'GOOGLE_DRIVE_UPLOAD_FAILED',
        error: {
          code: updated.googleDriveErrorCode || 'GOOGLE_DRIVE_UPLOAD_FAILED',
          message: updated.googleDriveError || 'Google Drive synchronization could not be completed.'
        },
        data: updated,
        restore: {
          status: 'VERIFIED',
          restoreId: updated.restoreId
        },
        googleDrive: {
          status: 'FAILED',
          errorCode: updated.googleDriveErrorCode,
          errorMessage: updated.googleDriveError
        },
        recordCounts: updated.restoredCounts
      });
    }
  } catch (err: any) {
    console.error('[AdminController] retryDriveSync error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Unexpected error during Google Drive synchronization retry.',
      error: { code: 'DRIVE_SYNC_FAILED' }
    });
  }
};

export const getRentalSummary = async (req: Request, res: Response) => {
  try {
    const { rentalAdminSummaryService } = await import('../services/rentalAdminSummary.service.js');
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const complexId = typeof req.query.complexId === 'string' ? req.query.complexId : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const summary = rentalAdminSummaryService.getSummary({ month, complexId, search });
    return res.json({
      success: true,
      data: summary
    });
  } catch (err: any) {
    console.error('[AdminController] getRentalSummary error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve rental admin summary'
    });
  }
};

export const getRentalComplexes = async (_req: Request, res: Response) => {
  try {
    const { rentalAdminSummaryService } = await import('../services/rentalAdminSummary.service.js');
    const complexes = rentalAdminSummaryService.getComplexesList();
    return res.json({
      success: true,
      data: complexes
    });
  } catch (err: any) {
    console.error('[AdminController] getRentalComplexes error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complexes list'
    });
  }
};

export const getRentalShops = async (req: Request, res: Response) => {
  try {
    const { rentalAdminSummaryService } = await import('../services/rentalAdminSummary.service.js');
    const complexId = typeof req.query.complexId === 'string' ? req.query.complexId : undefined;
    const shops = rentalAdminSummaryService.getShopsList(complexId);
    return res.json({
      success: true,
      data: shops
    });
  } catch (err: any) {
    console.error('[AdminController] getRentalShops error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shops list'
    });
  }
};

export const getRentalComplexDetails = async (req: Request, res: Response) => {
  try {
    const { rentalAdminSummaryService } = await import('../services/rentalAdminSummary.service.js');
    const complexId = req.params.id;
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;

    const details = rentalAdminSummaryService.getComplexDetails(complexId, month);
    if (!details) {
      return res.status(404).json({ success: false, message: 'Complex not found' });
    }
    return res.json({
      success: true,
      data: details
    });
  } catch (err: any) {
    console.error('[AdminController] getRentalComplexDetails error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complex details'
    });
  }
};

export const getRentalShopDetails = async (req: Request, res: Response) => {
  try {
    const { rentalAdminSummaryService } = await import('../services/rentalAdminSummary.service.js');
    const shopId = req.params.id;
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;

    const details = rentalAdminSummaryService.getShopDetails(shopId, month);
    if (!details) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    return res.json({
      success: true,
      data: details
    });
  } catch (err: any) {
    console.error('[AdminController] getRentalShopDetails error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shop details'
    });
  }
};

export const getRentalPayments = async (req: Request, res: Response) => {
  try {
    const { rentalAdminSummaryService } = await import('../services/rentalAdminSummary.service.js');
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const complexId = typeof req.query.complexId === 'string' ? req.query.complexId : undefined;
    const shopId = typeof req.query.shopId === 'string' ? req.query.shopId : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;

    const payments = rentalAdminSummaryService.getPayments({ month, complexId, shopId, search, status, mode });
    return res.json({
      success: true,
      data: payments
    });
  } catch (err: any) {
    console.error('[AdminController] getRentalPayments error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve rental payments'
    });
  }
};

export const getRentalExpenses = async (req: Request, res: Response) => {
  try {
    const { rentalAdminSummaryService } = await import('../services/rentalAdminSummary.service.js');
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const complexId = typeof req.query.complexId === 'string' ? req.query.complexId : undefined;
    const shopId = typeof req.query.shopId === 'string' ? req.query.shopId : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    const expenses = rentalAdminSummaryService.getExpenses({ month, complexId, shopId, search, category });
    return res.json({
      success: true,
      data: expenses
    });
  } catch (err: any) {
    console.error('[AdminController] getRentalExpenses error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve rental expenses'
    });
  }
};

export const getRentalSyncStatus = async (_req: Request, res: Response) => {
  try {
    const { rentalAdminSummaryService } = await import('../services/rentalAdminSummary.service.js');
    const status = rentalAdminSummaryService.getSyncStatus();
    return res.json({
      success: true,
      data: status
    });
  } catch (err: any) {
    console.error('[AdminController] getRentalSyncStatus error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve rental sync status'
    });
  }
};

export const downloadDriveBackupFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'File ID is required.' });
    }

    const { buffer, name: fileName, mimeType } = await googleDriveService.downloadDriveFileBuffer(fileId);
    
    res.setHeader('Content-Type', mimeType || 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName || 'drive_backup.zip'}"`);
    res.setHeader('Content-Length', buffer.length);
    
    return res.send(buffer);
  } catch (err: any) {
    console.error('[AdminController] downloadDriveBackupFile error:', err?.message || err);
    return res.status(404).json({
      success: false,
      message: err?.message || 'Failed to download file from Google Drive.',
      error: { code: 'DRIVE_DOWNLOAD_FAILED' }
    });
  }
};


