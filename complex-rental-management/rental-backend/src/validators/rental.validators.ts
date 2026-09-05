import { Request, Response, NextFunction } from 'express';

export const validateCreateComplex = (req: Request, res: Response, next: NextFunction): void => {
  const name = req.body.complexName || req.body.name;
  const location = req.body.location || req.body.address;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ success: false, message: 'Complex name (complexName) is required' });
    return;
  }
  if (!location || typeof location !== 'string' || !location.trim()) {
    res.status(400).json({ success: false, message: 'Complex location (location) is required' });
    return;
  }
  next();
};

export const validateCreateShop = (req: Request, res: Response, next: NextFunction): void => {
  const { complexId, shopNumber, monthlyRent, tenantName } = req.body;
  if (!complexId || typeof complexId !== 'string') {
    res.status(400).json({ success: false, message: 'Valid complexId is required' });
    return;
  }
  if (!shopNumber || typeof shopNumber !== 'string' || !shopNumber.trim()) {
    res.status(400).json({ success: false, message: 'Shop number (shopNumber) is required' });
    return;
  }
  if (!tenantName || typeof tenantName !== 'string' || !tenantName.trim()) {
    res.status(400).json({ success: false, message: 'Tenant name (tenantName) is required' });
    return;
  }
  if (monthlyRent === undefined || typeof monthlyRent !== 'number' || monthlyRent < 0) {
    res.status(400).json({ success: false, message: 'Monthly rent (monthlyRent) must be a non-negative number' });
    return;
  }
  next();
};

export const validateCreateRentPayment = (req: Request, res: Response, next: NextFunction): void => {
  const { shopId, amountReceived, paymentMonth, paymentDate, paymentMode, advanceToUse } = req.body;
  if (!shopId || typeof shopId !== 'string') {
    res.status(400).json({ success: false, message: 'shopId is required' });
    return;
  }
  if (!paymentMonth || typeof paymentMonth !== 'string') {
    res.status(400).json({ success: false, message: 'paymentMonth is required (YYYY-MM)' });
    return;
  }
  if (!paymentDate || typeof paymentDate !== 'string') {
    res.status(400).json({ success: false, message: 'paymentDate is required (YYYY-MM-DD)' });
    return;
  }
  if (!paymentMode || !['CASH', 'GPAY', 'BOTH'].includes(paymentMode)) {
    res.status(400).json({ success: false, message: 'paymentMode must be CASH, GPAY, or BOTH' });
    return;
  }

  const numAmount = Number(amountReceived) || 0;
  const numAdv = Number(advanceToUse) || 0;

  if (numAmount <= 0 && numAdv <= 0) {
    res.status(400).json({ success: false, message: 'amountReceived or advanceToUse must be greater than zero' });
    return;
  }

  if (paymentMode === 'BOTH') {
    const { cashAmount, gpayAmount } = req.body;
    const c = Number(cashAmount) || 0;
    const g = Number(gpayAmount) || 0;
    if (Math.abs(c + g - numAmount) > 0.01) {
      res.status(400).json({
        success: false,
        message: `Sum of cash (₹${c}) and gpay (₹${g}) must equal amountReceived (₹${numAmount})`,
      });
      return;
    }
  }

  next();
};

export const validateCreateExpense = (req: Request, res: Response, next: NextFunction): void => {
  const { complexId, category, expenseReason, expenseAmount, expenseDate, paymentMode } = req.body;
  if (!complexId || typeof complexId !== 'string') {
    res.status(400).json({ success: false, message: 'complexId is required' });
    return;
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    res.status(400).json({ success: false, message: 'Expense category is required' });
    return;
  }
  if (!expenseReason || typeof expenseReason !== 'string' || !expenseReason.trim()) {
    res.status(400).json({ success: false, message: 'Expense reason is required' });
    return;
  }
  if (expenseAmount === undefined || typeof expenseAmount !== 'number' || expenseAmount <= 0) {
    res.status(400).json({ success: false, message: 'Expense amount (expenseAmount) must be greater than zero' });
    return;
  }
  if (!expenseDate || typeof expenseDate !== 'string') {
    res.status(400).json({ success: false, message: 'expenseDate is required (YYYY-MM-DD)' });
    return;
  }
  if (paymentMode && !['CASH', 'GPAY', 'BOTH'].includes(paymentMode)) {
    res.status(400).json({ success: false, message: 'paymentMode must be CASH, GPAY, or BOTH' });
    return;
  }
  next();
};
