import { Request, Response } from 'express';
import { fdService } from '../services/fd.service.js';

export const getFDCustomers = (req: Request, res: Response) => {
  const customers = fdService.getCustomers();
  return res.json({
    success: true,
    data: customers
  });
};

export const createFDCustomer = (req: Request, res: Response) => {
  const newCust = fdService.createCustomer(req.body);
  return res.status(201).json({
    success: true,
    message: 'FD Customer created',
    data: newCust
  });
};

export const getFixedDeposits = (req: Request, res: Response) => {
  const deposits = fdService.getDeposits();
  return res.json({
    success: true,
    data: deposits
  });
};

export const createFixedDeposit = (req: Request, res: Response) => {
  const newFD = fdService.createDeposit(req.body);
  return res.status(201).json({
    success: true,
    message: 'Fixed Deposit created',
    data: newFD
  });
};

export const payFDInterest = (req: Request, res: Response) => {
  const { amount, mode } = req.body;
  const payout = fdService.payInterest(req.params.fdNo, Number(amount), mode);
  if (!payout) {
    return res.status(404).json({ success: false, message: `FD ${req.params.fdNo} not found` });
  }
  return res.json({
    success: true,
    message: 'FD interest payout recorded',
    data: payout
  });
};

export const withdrawFD = (req: Request, res: Response) => {
  const { mode, notes } = req.body;
  const withdrawal = fdService.withdraw(req.params.fdNo, mode, notes);
  if (!withdrawal) {
    return res.status(404).json({ success: false, message: `FD ${req.params.fdNo} not found` });
  }
  return res.json({
    success: true,
    message: 'FD withdrawn successfully',
    data: withdrawal
  });
};
