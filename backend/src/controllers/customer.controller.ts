import { Request, Response } from 'express';
import { customerService } from '../services/customer.service.js';

export const getCustomers = (req: Request, res: Response) => {
  const customers = customerService.getAll();
  return res.json({
    success: true,
    message: 'Customers retrieved successfully',
    data: customers,
    timestamp: new Date().toISOString()
  });
};

export const getCustomerById = (req: Request, res: Response) => {
  const customer = customerService.getById(req.params.id);
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: `Customer ${req.params.id} not found`,
      error: { code: 'CUSTOMER_NOT_FOUND' }
    });
  }
  return res.json({
    success: true,
    message: 'Customer retrieved',
    data: customer
  });
};

export const searchCustomers = (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const results = customerService.search(query);
  return res.json({
    success: true,
    data: results
  });
};

export const createCustomer = async (req: Request, res: Response) => {
  const newCustomer = await customerService.create(req.body);
  return res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: newCustomer
  });
};

export const updateCustomer = (req: Request, res: Response) => {
  const updated = customerService.update(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({
      success: false,
      message: 'Customer not found'
    });
  }
  return res.json({
    success: true,
    message: 'Customer updated',
    data: updated
  });
};

export const deleteCustomer = (req: Request, res: Response) => {
  const deleted = customerService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Customer not found'
    });
  }
  return res.json({
    success: true,
    message: 'Customer deleted'
  });
};
