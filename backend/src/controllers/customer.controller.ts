import { Request, Response } from 'express';
import { customerService } from '../services/customer.service.js';
import { validatePhone, validateIDProof } from '../utils/kycValidation.js';

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
  const { name, phone, idProof, idNumber, currentAddress } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Customer Full Name is required.',
      error: { code: 'INVALID_NAME' }
    });
  }

  const phoneVal = validatePhone(phone);
  if (!phoneVal.isValid) {
    return res.status(400).json({
      success: false,
      message: phoneVal.error || 'Please enter a valid 10-digit Indian mobile number.',
      error: { code: 'INVALID_PHONE' }
    });
  }

  const idVal = validateIDProof(idProof || 'Aadhaar Card', idNumber);
  if (!idVal.isValid) {
    return res.status(400).json({
      success: false,
      message: idVal.error || 'Invalid ID Proof Number.',
      error: { code: 'INVALID_ID_PROOF' }
    });
  }

  if (!currentAddress || !currentAddress.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Current Address is required.',
      error: { code: 'INVALID_ADDRESS' }
    });
  }

  // Use normalized values
  const payload = {
    ...req.body,
    name: name.trim(),
    phone: phoneVal.normalizedValue || phone.trim(),
    idProof: idProof || 'Aadhaar Card',
    idNumber: idVal.formattedValue || idNumber.trim()
  };

  const newCustomer = await customerService.create(payload);
  return res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: newCustomer
  });
};

export const updateCustomer = (req: Request, res: Response) => {
  const { name, phone, idProof, idNumber, currentAddress } = req.body || {};

  if (name !== undefined && (!name || !name.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Customer Full Name cannot be empty.',
      error: { code: 'INVALID_NAME' }
    });
  }

  if (phone !== undefined) {
    const phoneVal = validatePhone(phone);
    if (!phoneVal.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneVal.error || 'Please enter a valid 10-digit Indian mobile number.',
        error: { code: 'INVALID_PHONE' }
      });
    }
  }

  if (idNumber !== undefined) {
    const idVal = validateIDProof(idProof || 'Aadhaar Card', idNumber);
    if (!idVal.isValid) {
      return res.status(400).json({
        success: false,
        message: idVal.error || 'Invalid ID Proof Number.',
        error: { code: 'INVALID_ID_PROOF' }
      });
    }
  }

  if (currentAddress !== undefined && (!currentAddress || !currentAddress.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Current Address cannot be empty.',
      error: { code: 'INVALID_ADDRESS' }
    });
  }

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
