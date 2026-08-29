import { Router } from 'express';
import { getTelegramConfig, updateTelegramConfig, testTelegram, backupTelegram } from '../controllers/telegram.controller.js';

const router = Router();

router.get('/config', getTelegramConfig);
router.put('/config', updateTelegramConfig);
router.post('/test', testTelegram);
router.post('/backup', backupTelegram);

export default router;
