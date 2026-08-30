import { Router } from 'express';
import { createBackup, exportBackup, restoreBackup, listBackups } from '../controllers/backup.controller.js';

const router = Router();

router.post('/create', createBackup);
router.get('/export', exportBackup);
router.post('/restore', restoreBackup);
router.get('/list', listBackups);

export default router;
