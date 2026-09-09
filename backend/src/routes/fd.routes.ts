import { Router } from 'express';
import {
  getFDCustomers,
  createFDCustomer,
  getFixedDeposits,
  createFixedDeposit,
  payFDInterest,
  withdrawFD,
  bulkUpdateFDDates,
  getFDConfiguration,
  updateFDConfiguration
} from '../controllers/fd.controller.js';
import { authenticateUser, authorizePermission, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateUser);

// Operational Endpoints: Fine-grained permissions
router.get('/config', authorizePermission('fd', 'view'), getFDConfiguration);
router.get('/customers', authorizePermission('fd', 'view'), getFDCustomers);
router.post('/customers', authorizePermission('fd', 'create'), createFDCustomer);
router.get('/deposits', authorizePermission('fd', 'view'), getFixedDeposits);
router.post('/deposits', authorizePermission('fd', 'create'), createFixedDeposit);
router.post('/deposits/:fdNo/payout', authorizePermission('fd', 'update'), payFDInterest);
router.post('/deposits/:fdNo/withdraw', authorizePermission('fd', 'update'), withdrawFD);

// Administrative Endpoints: ADMIN ONLY
router.put('/config', authorizeRoles('ADMIN'), updateFDConfiguration);
router.post('/deposits/bulk-date-change', authorizeRoles('ADMIN'), bulkUpdateFDDates);

export default router;
