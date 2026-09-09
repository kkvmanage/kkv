import { Router } from 'express';
import { rentalController } from '../controllers/rental.controller.js';
import { syncController } from '../controllers/sync.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import {
  validateCreateComplex,
  validateCreateShop,
  validateCreateRentPayment,
  validateCreateExpense,
} from '../validators/rental.validators.js';

const router = Router();

// Protect all rental routes with JWT authentication
router.use(authenticateToken);

// Complexes
router.get('/complexes', (req, res) => rentalController.getAllComplexes(req, res));
router.get('/complexes/:id', (req, res) => rentalController.getComplexById(req, res));
router.post('/complexes', validateCreateComplex, (req, res) => rentalController.createComplex(req, res));
router.put('/complexes/:id', (req, res) => rentalController.updateComplex(req, res));

// Shops
router.get('/shops', (req, res) => rentalController.getAllShops(req, res));
router.get('/shops/:id', (req, res) => rentalController.getShopById(req, res));
router.get('/shops/:id/monthly-status', (req, res) => rentalController.getShopMonthlyStatus(req, res));
router.post('/shops', validateCreateShop, (req, res) => rentalController.createShop(req, res));
router.put('/shops/:id', (req, res) => rentalController.updateShop(req, res));

// Rent Payments
router.get('/payments', (req, res) => rentalController.getAllPayments(req, res));
router.post('/payments', validateCreateRentPayment, (req, res) => rentalController.createPayment(req, res));

// Expenses
router.get('/expenses', (req, res) => rentalController.getAllExpenses(req, res));
router.post('/expenses', validateCreateExpense, (req, res) => rentalController.createExpense(req, res));
router.put('/expenses/:id', (req, res) => rentalController.updateExpense(req, res));
router.delete('/expenses/:id', requireRole(['RENTAL_ADMIN']), (req, res) => rentalController.deleteExpense(req, res));

// Dashboard & Analytics
router.get('/dashboard', (req, res) => rentalController.getDashboardMetrics(req, res));
router.get('/reports/monthly', (req, res) => rentalController.getMonthlyRentReport(req, res));
router.get('/reports/payment-modes', (req, res) => rentalController.getPaymentModeReport(req, res));
router.get('/admin-summary', (req, res) => rentalController.getAdminSummary(req, res));
router.get('/sync-status', (req, res) => syncController.getStatus(req, res));
router.post('/sync-now', (req, res) => syncController.triggerManualSync(req, res));
router.get('/audit-logs', requireRole(['RENTAL_ADMIN']), (req, res) => rentalController.getAuditLogs(req, res));

export default router;
