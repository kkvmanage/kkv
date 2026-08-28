import { Router } from 'express';
import { getTelegramConfig, updateTelegramConfig } from '../controllers/telegram.controller.js';

const router = Router();

router.get('/config', getTelegramConfig);
router.put('/config', updateTelegramConfig);

export default router;
