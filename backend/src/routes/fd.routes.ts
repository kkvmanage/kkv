import { Router } from 'express';
import {
  getFDCustomers,
  createFDCustomer,
  getFixedDeposits,
  createFixedDeposit,
  payFDInterest,
  withdrawFD
} from '../controllers/fd.controller.js';

const router = Router();

router.get('/customers', getFDCustomers);
router.post('/customers', createFDCustomer);

router.get('/deposits', getFixedDeposits);
router.post('/deposits', createFixedDeposit);

router.post('/deposits/:fdNo/payout', payFDInterest);
router.post('/deposits/:fdNo/withdraw', withdrawFD);

export default router;
