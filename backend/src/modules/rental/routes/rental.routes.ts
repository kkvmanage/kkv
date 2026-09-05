import { Router } from 'express';
import { rentalController } from '../controllers/rental.controller.js';

const router = Router();

// Dashboard
router.get('/dashboard', rentalController.getDashboard.bind(rentalController));

// Complexes
router.get('/complexes', rentalController.getComplexes.bind(rentalController));
router.post('/complexes', rentalController.createComplex.bind(rentalController));
router.get('/complexes/:id', rentalController.getComplexById.bind(rentalController));
router.put('/complexes/:id', rentalController.updateComplex.bind(rentalController));

// Shops
router.get('/shops', rentalController.getShops.bind(rentalController));
router.post('/shops', rentalController.createShop.bind(rentalController));
router.get('/shops/:id', rentalController.getShopById.bind(rentalController));
router.get('/shops/:id/status', rentalController.getShopMonthlyStatus.bind(rentalController));
router.put('/shops/:id', rentalController.updateShop.bind(rentalController));

// Rent Payments
router.get('/payments', rentalController.getPayments.bind(rentalController));
router.post('/payments', rentalController.createPayment.bind(rentalController));

// Expenses
router.get('/expenses', rentalController.getExpenses.bind(rentalController));
router.post('/expenses', rentalController.createExpense.bind(rentalController));
router.put('/expenses/:id', rentalController.updateExpense.bind(rentalController));
router.delete('/expenses/:id', rentalController.deleteExpense.bind(rentalController));

// Reports
router.get('/reports/monthly', rentalController.getMonthlyReport.bind(rentalController));
router.get('/reports/expenses', rentalController.getExpenseReport.bind(rentalController));
router.get('/reports/payment-modes', rentalController.getPaymentModeReport.bind(rentalController));

// Existing Finance Admin Integration Summary
router.get('/admin/summary', rentalController.getAdminSummary.bind(rentalController));

// Google Drive / Sheets Sync Control
router.get('/sync/status', rentalController.getSyncStatus.bind(rentalController));
router.post('/sync/retry', rentalController.retrySync.bind(rentalController));

export default router;
