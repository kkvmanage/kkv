import { Router } from 'express';
import {
  getMasterSettings,
  updateMasterSettings,
  getWhatsAppTemplates,
  updateWhatsAppTemplates,
  unlockMasterControl
} from '../controllers/admin.controller.js';

const router = Router();

router.get('/settings', getMasterSettings);
router.put('/settings', updateMasterSettings);

router.get('/whatsapp-templates', getWhatsAppTemplates);
router.put('/whatsapp-templates', updateWhatsAppTemplates);

router.post('/unlock', unlockMasterControl);

export default router;
