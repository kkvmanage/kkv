import { Router } from 'express';
import {
  getMasterSettings,
  updateMasterSettings,
  getWhatsAppTemplates,
  updateWhatsAppTemplates,
  unlockMasterControl,
  initiateWipeBackup,
  confirmSystemWipe,
  getAvailableRestoreBackups,
  validateRestoreBackup,
  executeSystemRestore
} from '../controllers/admin.controller.js';

const router = Router();

router.get('/settings', getMasterSettings);
router.put('/settings', updateMasterSettings);

router.get('/whatsapp-templates', getWhatsAppTemplates);
router.put('/whatsapp-templates', updateWhatsAppTemplates);

router.post('/unlock', unlockMasterControl);

// Wipe All Data Workflow
router.post('/wipe-all-data/initiate', initiateWipeBackup);
router.post('/wipe-all-data/confirm', confirmSystemWipe);

// Hidden System Restore Workflow
router.get('/system/backups', getAvailableRestoreBackups);
router.post('/system/restore/validate', validateRestoreBackup);
router.post('/system/restore', executeSystemRestore);

export default router;
