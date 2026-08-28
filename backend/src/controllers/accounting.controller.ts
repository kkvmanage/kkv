import { Request, Response } from 'express';
import { accountingService } from '../services/accounting.service.js';

export const getDayBook = (req: Request, res: Response) => {
  const entries = accountingService.getDayBook();
  return res.json({
    success: true,
    data: entries
  });
};

export const addVoucher = (req: Request, res: Response) => {
  const entry = accountingService.addEntry(req.body);
  return res.status(201).json({
    success: true,
    message: 'Voucher recorded successfully',
    data: entry
  });
};

export const getBalances = (req: Request, res: Response) => {
  const balances = accountingService.getBalances();
  return res.json({
    success: true,
    data: balances
  });
};

export const getTrialBalance = (req: Request, res: Response) => {
  const tb = accountingService.getTrialBalance();
  return res.json({
    success: true,
    data: tb
  });
};

export const getProfitAndLoss = (req: Request, res: Response) => {
  const pl = accountingService.getProfitAndLoss();
  return res.json({
    success: true,
    data: pl
  });
};

export const getBalanceSheet = (req: Request, res: Response) => {
  const bs = accountingService.getBalanceSheet();
  return res.json({
    success: true,
    data: bs
  });
};
