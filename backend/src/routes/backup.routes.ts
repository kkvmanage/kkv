import { Router } from 'express';
import { createBackup, exportBackup, restoreBackup, listBackups } from '../controllers/backup.controller.js';
import { driveController } from '../controllers/drive.controller.js';

const router = Router();

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
