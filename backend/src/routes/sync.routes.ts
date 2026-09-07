import { Router } from 'express';
import {
  getSyncStatus,
  retrySyncQueue,
  getSyncEvents
} from '../controllers/backup.controller.js';

const router = Router();

router.get('/status', getSyncStatus);
router.post('/retry', retrySyncQueue);
router.get('/events', getSyncEvents);

export default router;
