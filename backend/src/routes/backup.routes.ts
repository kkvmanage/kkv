import { Router } from 'express';
import {
  createBackup,
  exportBackup,
  restoreBackup,
  listBackups,
  backupAndCloseSession,
  checkAutoRestore,
  autoRestoreLatest,
  getSyncStatus,
  retrySyncQueue,
  getSyncEvents
} from '../controllers/backup.controller.js';
import { driveController } from '../controllers/drive.controller.js';

const router = Router();

// Transactional Backup & Close and Startup Auto-Restore
router.post('/close', backupAndCloseSession);
router.post('/backup-and-close', backupAndCloseSession);
router.get('/auto-restore-check', checkAutoRestore);
router.post('/restore-latest', autoRestoreLatest);

// Incremental Sync Queue
router.get('/sync/status', getSyncStatus);
router.post('/sync/retry', retrySyncQueue);
router.get('/sync/events', getSyncEvents);

// Classic Backup operations
router.post('/create', createBackup);
router.get('/export', exportBackup);
router.post('/restore', restoreBackup);
router.get('/list', listBackups);

// Google Drive OAuth specific endpoints under /backup
router.get('/google-drive/status', driveController.getStatus);
router.post('/google-drive/disconnect', driveController.disconnect);
router.get('/google-drive/connect', driveController.connect);
router.get('/google-drive/callback', driveController.callback);

export default router;
