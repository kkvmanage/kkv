import { Request, Response } from 'express';
import { receiptService } from '../services/receipt.service.js';

export const getReceipts = (req: Request, res: Response) => {
  const receipts = receiptService.getAll();
  return res.json({
    success: true,
    message: 'Receipts retrieved successfully',
    data: receipts,
    timestamp: new Date().toISOString()
  });
};

export const getReceiptByNo = (req: Request, res: Response) => {
  const receipt = receiptService.getByReceiptNo(Number(req.params.receiptNo)) || receiptService.getById(req.params.receiptNo);
  if (!receipt) {
    return res.status(404).json({
      success: false,
      message: `Receipt ${req.params.receiptNo} not found`
    });
  }
  return res.json({
    success: true,
    data: receipt
  });
};

export const createReceipt = (req: Request, res: Response) => {
  const newReceipt = receiptService.create(req.body);
  return res.status(201).json({
    success: true,
    message: 'Receipt recorded successfully',
    data: newReceipt
  });
};
