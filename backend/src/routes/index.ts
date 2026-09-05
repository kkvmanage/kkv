import { Router } from 'express';
import healthRoutes from './health.routes.js';
import customerRoutes from './customer.routes.js';
import loanRoutes from './loan.routes.js';
import receiptRoutes from './receipt.routes.js';
import fdRoutes from './fd.routes.js';
import accountingRoutes from './accounting.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import adminRoutes from './admin.routes.js';
import backupRoutes from './backup.routes.js';
import telegramRoutes from './telegram.routes.js';
import reminderRoutes from './reminder.routes.js';
import driveRoutes from './drive.routes.js';
import searchRoutes from './search.routes.js';
import locationRoutes from './location.routes.js';
import sessionRoutes from './session.routes.js';
import staffRoutes from './staff.routes.js';
import configRoutes from './config.routes.js';
import rentalRoutes from '../modules/rental/routes/rental.routes.js';
import { driveController } from '../controllers/drive.controller.js';

const router = Router();

// Canonical Google OAuth 2.0 Drive Auth Routes (must precede /auth catch-all routes)
router.get('/auth/google-drive/start', driveController.connect);
router.get('/auth/google-drive/connect', driveController.connect);
router.get('/auth/google-drive/callback', driveController.callback);
router.get('/auth/google-drive', driveController.connect);
router.get('/auth/google', driveController.connect);
router.get('/auth/google/callback', driveController.callback);
router.get('/google-drive/callback', driveController.callback);

router.use('/health', healthRoutes);
router.use('/search', searchRoutes);
router.use('/location', locationRoutes);
router.use('/drive', driveRoutes);
router.use('/google-drive', driveRoutes);
router.use('/customers', customerRoutes);
router.use('/loans', loanRoutes);
router.use('/receipts', receiptRoutes);
router.use('/fd', fdRoutes);
router.use('/fd-customers', fdRoutes);
router.use('/fixed-deposits', fdRoutes);
router.use('/accounting', accountingRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);
router.use('/backup', backupRoutes);
router.use('/telegram', telegramRoutes);
router.use('/reminders', reminderRoutes);
router.use('/sessions', sessionRoutes);
router.use('/staff', staffRoutes);
router.use('/auth', staffRoutes);
router.use('/config', configRoutes);
router.use('/loan-types', configRoutes);
router.use('/rental', rentalRoutes);

export default router;
