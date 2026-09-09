import { Router } from 'express';
import { syncController } from '../controllers/sync.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Sync status is viewable by authenticated users
router.get('/status', authenticateToken, (req, res) => syncController.getStatus(req, res));

// Admin can trigger manual sync or test connection
router.post('/trigger', authenticateToken, requireRole(['RENTAL_ADMIN']), (req, res) => syncController.triggerManualSync(req, res));
router.get('/test-connection', authenticateToken, requireRole(['RENTAL_ADMIN']), (req, res) => syncController.testConnection(req, res));

export default router;
