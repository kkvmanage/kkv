import { Router } from 'express';
import {
  getLoanTypes,
  getLoanTypeById,
  createLoanType,
  updateLoanType,
  toggleLoanTypeStatus,
  toggleLoanTypeVisibility
} from '../controllers/config.controller.js';

const router = Router();

router.get('/loan-types', getLoanTypes);
router.get('/loan-types/:id', getLoanTypeById);
router.post('/loan-types', createLoanType);
router.put('/loan-types/:id', updateLoanType);
router.patch('/loan-types/:id/status', toggleLoanTypeStatus);
router.patch('/loan-types/:id/visibility', toggleLoanTypeVisibility);

export default router;
