import { Router } from 'express';
import { getReceipts, getReceiptByNo, createReceipt } from '../controllers/receipt.controller.js';

const router = Router();

router.get('/', getReceipts);
router.get('/:receiptNo', getReceiptByNo);
router.post('/', createReceipt);

export default router;
