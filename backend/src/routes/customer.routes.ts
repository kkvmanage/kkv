import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  deletePermanentlyCustomer
} from '../controllers/customer.controller.js';

const router = Router();

router.get('/', getCustomers);
router.get('/search', searchCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/:id/restore', restoreCustomer);
router.delete('/:id/permanent', deletePermanentlyCustomer);

export default router;
