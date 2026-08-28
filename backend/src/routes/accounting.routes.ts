import { Router } from 'express';
import {
  getDayBook,
  addVoucher,
  getBalances,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet
} from '../controllers/accounting.controller.js';

const router = Router();

router.get('/day-book', getDayBook);
router.post('/vouchers', addVoucher);
router.get('/balances', getBalances);
router.get('/trial-balance', getTrialBalance);
router.get('/profit-loss', getProfitAndLoss);
router.get('/balance-sheet', getBalanceSheet);

export default router;
