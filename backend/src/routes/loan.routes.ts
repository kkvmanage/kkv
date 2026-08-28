import { Router } from 'express';
import {
  getLoans,
  getLoanByNo,
  createLoan,
  updateLoan,
  deleteLoan,
  topUpLoan,
  closeLoan,
  getLoanPayments,
  addLoanPayment
} from '../controllers/loan.controller.js';

const router = Router();

router.get('/', getLoans);
router.get('/:loanNo', getLoanByNo);
router.post('/', createLoan);
router.put('/:id', updateLoan);
router.delete('/:id', deleteLoan);
router.post('/:loanNo/top-up', topUpLoan);
router.post('/:loanNo/close', closeLoan);
router.get('/:id/payments', getLoanPayments);
router.post('/:id/payments', addLoanPayment);

export default router;
