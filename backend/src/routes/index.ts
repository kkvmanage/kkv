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

const router = Router();

router.use('/health', healthRoutes);
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

export default router;
