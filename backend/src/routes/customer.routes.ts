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
} from '../controllers/customerController.js';
import { handleUploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = Router();

// Customer CRUD & Search Endpoints
router.get('/', getCustomers);
router.get('/search', searchCustomers);
router.get('/:id', getCustomerById);
router.post('/', handleUploadMiddleware, createCustomer);
router.put('/:id', handleUploadMiddleware, updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/:id/restore', restoreCustomer);
router.delete('/:id/permanent', deletePermanentlyCustomer);

export default router;
