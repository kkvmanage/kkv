import { Router } from 'express';
import {
  getLoanTypes,
  getLoanTypeById,
  createLoanType,
  updateLoanType,
  toggleLoanTypeStatus,
  toggleLoanTypeVisibility
} from '../controllers/config.controller.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateUser);

router.get('/loan-types', authorizeRoles('ADMIN', 'STAFF'), getLoanTypes);
router.get('/loan-types/:id', authorizeRoles('ADMIN', 'STAFF'), getLoanTypeById);
router.post('/loan-types', authorizeRoles('ADMIN'), createLoanType);
router.put('/loan-types/:id', authorizeRoles('ADMIN'), updateLoanType);
router.patch('/loan-types/:id/status', authorizeRoles('ADMIN'), toggleLoanTypeStatus);
router.patch('/loan-types/:id/visibility', authorizeRoles('ADMIN'), toggleLoanTypeVisibility);

export default router;
