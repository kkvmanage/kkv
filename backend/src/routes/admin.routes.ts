import { Router } from 'express';
import multer from 'multer';
import {
  getMasterSettings,
  updateMasterSettings,
  getWhatsAppTemplates,
  updateWhatsAppTemplates,
  unlockMasterControl,
  getDriveHealth,
  createBackupPackage,
  getBackupHistory,
  downloadBackupZip,
  acknowledgeDownload,
  uploadBackupToDrive,
  getWipePreview,
  initiateWipeBackup,
  confirmSystemWipe,
  getAvailableRestoreBackups,
  validateRestoreBackup,
  executeSystemRestore,
  getRestoreHistory,
  retryDriveSync,
  downloadDriveBackupFile,
  getRentalSummary,
  getRentalComplexes,
  getRentalShops,
  getRentalComplexDetails,
  getRentalShopDetails,
  getRentalPayments,
  getRentalExpenses,
  getRentalSyncStatus
} from '../controllers/admin.controller.js';
import { driveController } from '../controllers/drive.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max
});

const router = Router();

router.get('/settings', getMasterSettings);
router.put('/settings', updateMasterSettings);

// Rental Admin Integration Endpoints (Read-Only)
router.get('/rental-summary', getRentalSummary);
router.get('/rental/summary', getRentalSummary);
router.get('/rental/complexes', getRentalComplexes);
router.get('/rental/complexes/:id', getRentalComplexDetails);
router.get('/rental/shops', getRentalShops);
router.get('/rental/shops/:id', getRentalShopDetails);
router.get('/rental/payments', getRentalPayments);
router.get('/rental/expenses', getRentalExpenses);
router.get('/rental/sync-status', getRentalSyncStatus);

router.get('/whatsapp-templates', getWhatsAppTemplates);
router.put('/whatsapp-templates', updateWhatsAppTemplates);

router.post('/unlock', unlockMasterControl);

// Google Drive Health Check & Auth Flow
router.get('/backup/drive-health', getDriveHealth);
router.get('/drive-health', getDriveHealth);
router.get('/backup/google-drive/status', driveController.getStatus);
router.get('/backup/google-drive/oauth-config', driveController.getOAuthConfig);
router.get('/backup/google-drive/connect', driveController.connect);
router.get('/backup/google-drive/callback', driveController.callback);
router.post('/backup/google-drive/disconnect', driveController.disconnect);

// Production Backup Package APIs
router.post('/backup/create', createBackupPackage);
router.get('/backup/history', getBackupHistory);
router.get('/backup/:backupId/download', downloadBackupZip);
router.post('/backup/:backupId/acknowledge-download', acknowledgeDownload);
router.post('/backup/:backupId/upload-to-drive', uploadBackupToDrive);
router.post('/backup/:backupId/sync-drive', uploadBackupToDrive);
router.get('/backup/google-drive/files', getAvailableRestoreBackups);
router.get('/backup/google-drive/files/:fileId/download', downloadDriveBackupFile);

// Wipe All Data Workflow
router.get('/wipe-all-data/preview', getWipePreview);
router.post('/wipe-all-data/initiate', initiateWipeBackup);
router.post('/wipe-all-data/confirm', confirmSystemWipe);

// System Restore Workflow
router.get('/system/backups', getAvailableRestoreBackups);
router.post('/system/restore/validate', upload.single('backupFile'), validateRestoreBackup);
router.post('/system/restore', executeSystemRestore);
router.get('/system/restore/history', getRestoreHistory);
router.post('/system/restore/:restoreId/sync-drive', retryDriveSync);

// Aliases for compatibility
router.post('/restore/upload', upload.single('backupFile'), validateRestoreBackup);
router.post('/restore/validate', upload.single('backupFile'), validateRestoreBackup);
router.post('/restore/execute', executeSystemRestore);
router.get('/restore/history', getRestoreHistory);
router.post('/restore/:restoreId/sync-drive', retryDriveSync);

export default router;
