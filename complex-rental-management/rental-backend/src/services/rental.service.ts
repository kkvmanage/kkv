import { rentalRepository } from '../repositories/rental.repository.js';
import { syncService } from './sync.service.js';
import {
  RentalComplex,
  RentalShop,
  RentalPayment,
  RentalExpense,
  RentalDashboardData,
  AdminRentalSummary,
  MonthlyRentReportItem,
  PaymentModeReportData,
  PaymentMode,
  ExpenseCategory,
  RentalStatus
} from '../types/rental.types.js';

export class RentalService {
  // ── COMPLEXES ──────────────────────────────────────────────────────────────
  getComplexes(): RentalComplex[] {
    return rentalRepository.getComplexes();
  }

  getComplexById(complexId: string): RentalComplex | null {
    return rentalRepository.getComplexById(complexId);
  }

  createComplex(data: { complexName: string; location: string; status?: RentalStatus }, actorId: string): RentalComplex {
    const complex = rentalRepository.createComplex({
      complexName: data.complexName.trim(),
      location: data.location.trim(),
      status: data.status || 'ACTIVE'
    });

    rentalRepository.createAuditLog({
      userId: actorId,
      action: 'CREATE_COMPLEX',
      entityType: 'Complex',
      entityId: complex.complexId,
      newValue: complex
    });

    syncService.triggerSync('Complex', complex.complexId, 'CREATE');
    return complex;
  }

  updateComplex(
    complexId: string,
    updates: Partial<RentalComplex>,
    actorId: string
  ): RentalComplex | null {
    const oldVal = rentalRepository.getComplexById(complexId);
    if (!oldVal) return null;

    const updated = rentalRepository.updateComplex(complexId, updates);
    if (updated) {
      rentalRepository.createAuditLog({
        userId: actorId,
        action: 'UPDATE_COMPLEX',
        entityType: 'Complex',
        entityId: updated.complexId,
        oldValue: oldVal,
        newValue: updated
      });

      syncService.triggerSync('Complex', updated.complexId, 'UPDATE');
    }
    return updated;
  }

  // ── SHOPS ──────────────────────────────────────────────────────────────────
  getShops(complexId?: string, status?: RentalStatus): (RentalShop & { complexName: string })[] {
    let shops = rentalRepository.getShops();
    const complexes = rentalRepository.getComplexes();
    const complexMap = new Map(complexes.map((c) => [c.complexId, c.complexName]));

    if (complexId) {
      shops = shops.filter((s) => s.complexId === complexId);
    }
    if (status) {
      shops = shops.filter((s) => s.status === status);
    }

    return shops.map((s) => ({
      ...s,
      complexName: complexMap.get(s.complexId) || s.complexId
    }));
  }

  getShopById(shopId: string): (RentalShop & { complexName: string }) | null {
    const shop = rentalRepository.getShopById(shopId);
    if (!shop) return null;

    const complex = rentalRepository.getComplexById(shop.complexId);
    return {
      ...shop,
      complexName: complex ? complex.complexName : shop.complexId
    };
  }

  createShop(
    data: {
      complexId: string;
      shopNumber: string;
      shopName: string;
      tenantName: string;
      mobileNumber: string;
      monthlyRent: number;
      status?: RentalStatus;
    },
    actorId: string
  ): RentalShop {
    const shop = rentalRepository.createShop({
      complexId: data.complexId,
      shopNumber: data.shopNumber.trim(),
      shopName: data.shopName.trim(),
      tenantName: data.tenantName.trim(),
      mobileNumber: data.mobileNumber.trim(),
      monthlyRent: Number(data.monthlyRent) || 0,
      status: data.status || 'ACTIVE'
    });

    rentalRepository.createAuditLog({
      userId: actorId,
      action: 'CREATE_SHOP',
      entityType: 'Shop',
      entityId: shop.shopId,
      newValue: shop
    });

    syncService.triggerSync('Shop', shop.shopId, 'CREATE');
    return shop;
  }

  updateShop(shopId: string, updates: Partial<RentalShop>, actorId: string): RentalShop | null {
    const oldVal = rentalRepository.getShopById(shopId);
    if (!oldVal) return null;

    const updated = rentalRepository.updateShop(shopId, updates);
    if (updated) {
      rentalRepository.createAuditLog({
        userId: actorId,
        action: 'UPDATE_SHOP',
        entityType: 'Shop',
        entityId: updated.shopId,
        oldValue: oldVal,
        newValue: updated
      });

      syncService.triggerSync('Shop', updated.shopId, 'UPDATE');
    }
    return updated;
  }

  // ── MONTHLY RENT CALCULATION ───────────────────────────────────────────────
  getShopMonthlyStatus(
    shopId: string,
    month: string
  ): {
    shopId: string;
    month: string;
    monthlyRent: number;
    amountPaid: number;
    advanceUsed: number;
    advanceGenerated: number;
    outstandingBalance: number;
    availableAdvanceCredit: number;
    paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
    payments: RentalPayment[];
  } | null {
    const shop = rentalRepository.getShopById(shopId);
    if (!shop) return null;

    const payments = rentalRepository.getPaymentsByShopAndMonth(shopId, month);
    const amountPaid = payments.reduce((sum, p) => sum + p.amountReceived, 0);
    const advanceUsed = payments.reduce((sum, p) => sum + p.advanceUsed, 0);
    const advanceGenerated = payments.reduce((sum, p) => sum + p.advanceGenerated, 0);

    const totalCovered = amountPaid + advanceUsed;
    const outstandingBalance = Math.max(0, shop.monthlyRent - totalCovered);

    let paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING';
    if (totalCovered >= shop.monthlyRent) {
      paymentStatus = 'PAID';
    } else if (totalCovered > 0) {
      paymentStatus = 'PARTIAL';
    }

    return {
      shopId: shop.shopId,
      month,
      monthlyRent: shop.monthlyRent,
      amountPaid,
      advanceUsed,
      advanceGenerated,
      outstandingBalance,
      availableAdvanceCredit: shop.availableAdvance || 0,
      paymentStatus,
      payments
    };
  }

  // ── RENT PAYMENTS ──────────────────────────────────────────────────────────
  getPayments(filters?: {
    complexId?: string;
    shopId?: string;
    month?: string;
    paymentMode?: PaymentMode;
    startDate?: string;
    endDate?: string;
  }): (RentalPayment & { shopNumber?: string; shopName?: string; tenantName?: string; complexName?: string })[] {
    let payments = rentalRepository.getPayments();
    const shops = rentalRepository.getShops();
    const complexes = rentalRepository.getComplexes();

    const shopMap = new Map(shops.map((s) => [s.shopId, s]));
    const complexMap = new Map(complexes.map((c) => [c.complexId, c.complexName]));

    if (filters?.complexId) payments = payments.filter((p) => p.complexId === filters.complexId);
    if (filters?.shopId) payments = payments.filter((p) => p.shopId === filters.shopId);
    if (filters?.month) payments = payments.filter((p) => p.paymentMonth === filters.month);
    if (filters?.paymentMode) payments = payments.filter((p) => p.paymentMode === filters.paymentMode);
    if (filters?.startDate) payments = payments.filter((p) => p.paymentDate >= filters.startDate!);
    if (filters?.endDate) payments = payments.filter((p) => p.paymentDate <= filters.endDate!);

    // Sort descending by paymentDate
    payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    return payments.map((p) => {
      const s = shopMap.get(p.shopId);
      return {
        ...p,
        shopNumber: s ? s.shopNumber : '',
        shopName: s ? s.shopName : '',
        tenantName: s ? s.tenantName : '',
        complexName: complexMap.get(p.complexId) || p.complexId
      };
    });
  }

  createPayment(
    data: {
      complexId: string;
      shopId: string;
      paymentMonth: string;
      amountReceived: number;
      paymentMode: PaymentMode;
      cashAmount?: number;
      gpayAmount?: number;
      advanceToUse?: number;
      paymentDate: string;
      mobileNumber?: string;
      notes?: string;
    },
    actorId: string
  ): RentalPayment {
    const shop = rentalRepository.getShopById(data.shopId);
    if (!shop) throw new Error('Shop not found');

    const numAmountReceived = Number(data.amountReceived) || 0;
    const numAdvanceToUse = Number(data.advanceToUse) || 0;
    const requestedCash = Number(data.cashAmount) || 0;
    const requestedGpay = Number(data.gpayAmount) || 0;

    // Validate Payment Modes
    let finalCash = 0;
    let finalGpay = 0;
    if (data.paymentMode === 'CASH') {
      finalCash = numAmountReceived;
      finalGpay = 0;
    } else if (data.paymentMode === 'GPAY') {
      finalCash = 0;
      finalGpay = numAmountReceived;
    } else if (data.paymentMode === 'BOTH') {
      if (Math.abs(requestedCash + requestedGpay - numAmountReceived) > 0.01) {
        throw new Error(
          `Split sum (Cash: ₹${requestedCash} + GPay: ₹${requestedGpay} = ₹${requestedCash + requestedGpay}) does not equal total amount received (₹${numAmountReceived}).`
        );
      }
      finalCash = requestedCash;
      finalGpay = requestedGpay;
    }

    // Verify available advance credit
    if (numAdvanceToUse > (shop.availableAdvance || 0)) {
      throw new Error(`Requested advance usage (₹${numAdvanceToUse}) exceeds available advance credit (₹${shop.availableAdvance || 0}).`);
    }

    // Calculate monthly rent coverage
    const existingPayments = rentalRepository.getPaymentsByShopAndMonth(shop.shopId, data.paymentMonth);
    const priorCovered = existingPayments.reduce((sum, p) => sum + p.amountReceived + p.advanceUsed, 0);
    const outstandingBeforeThis = Math.max(0, shop.monthlyRent - priorCovered);

    const actualAdvanceUsed = Math.min(numAdvanceToUse, outstandingBeforeThis);
    const remainingDueAfterAdvance = Math.max(0, outstandingBeforeThis - actualAdvanceUsed);

    const rentCoveredByCashGpay = Math.min(numAmountReceived, remainingDueAfterAdvance);
    const advanceGenerated = Math.max(0, numAmountReceived - remainingDueAfterAdvance);
    const balanceAfterPayment = Math.max(0, remainingDueAfterAdvance - rentCoveredByCashGpay);

    const totalCoveredAfter = priorCovered + actualAdvanceUsed + rentCoveredByCashGpay;
    let paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING';
    if (totalCoveredAfter >= shop.monthlyRent) {
      paymentStatus = 'PAID';
    } else if (totalCoveredAfter > 0) {
      paymentStatus = 'PARTIAL';
    }

    const payment = rentalRepository.createPayment({
      complexId: shop.complexId,
      shopId: shop.shopId,
      paymentMonth: data.paymentMonth,
      monthlyRent: shop.monthlyRent,
      amountReceived: numAmountReceived,
      cashAmount: finalCash,
      gpayAmount: finalGpay,
      paymentMode: data.paymentMode,
      advanceUsed: actualAdvanceUsed,
      advanceGenerated,
      balanceAfterPayment,
      paymentStatus,
      paymentDate: data.paymentDate,
      mobileNumber: data.mobileNumber || shop.mobileNumber,
      notes: data.notes
    });

    rentalRepository.createAuditLog({
      userId: actorId,
      action: 'CREATE_RENT_PAYMENT',
      entityType: 'RentPayment',
      entityId: payment.paymentId,
      newValue: payment
    });

    if (advanceGenerated > 0) {
      rentalRepository.createAuditLog({
        userId: actorId,
        action: 'ADVANCE_GENERATED',
        entityType: 'RentPayment',
        entityId: payment.paymentId,
        newValue: { shopId: shop.shopId, advanceGenerated }
      });
    }

    if (actualAdvanceUsed > 0) {
      rentalRepository.createAuditLog({
        userId: actorId,
        action: 'ADVANCE_USED',
        entityType: 'RentPayment',
        entityId: payment.paymentId,
        newValue: { shopId: shop.shopId, advanceUsed: actualAdvanceUsed }
      });
    }

    // Update shop available advance balance
    const newAvailableAdvance = Math.max(
      0,
      (Number(shop.availableAdvance) || 0) - actualAdvanceUsed + advanceGenerated
    );
    rentalRepository.updateShop(shop.shopId, {
      availableAdvance: newAvailableAdvance
    });

    syncService.triggerSync('RentPayment', payment.paymentId, 'CREATE');
    syncService.triggerSync('Shop', shop.shopId, 'UPDATE');
    return payment;
  }

  // ── EXPENSES ───────────────────────────────────────────────────────────────
  getExpenses(filters?: {
    complexId?: string;
    shopId?: string;
    category?: ExpenseCategory;
    startDate?: string;
    endDate?: string;
  }): (RentalExpense & { complexName?: string; shopNumber?: string })[] {
    let expenses = rentalRepository.getExpenses();
    const complexes = rentalRepository.getComplexes();
    const shops = rentalRepository.getShops();

    const complexMap = new Map(complexes.map((c) => [c.complexId, c.complexName]));
    const shopMap = new Map(shops.map((s) => [s.shopId, s.shopNumber]));

    if (filters?.complexId) expenses = expenses.filter((e) => e.complexId === filters.complexId);
    if (filters?.shopId) expenses = expenses.filter((e) => e.shopId === filters.shopId);
    if (filters?.category) expenses = expenses.filter((e) => e.category === filters.category);
    if (filters?.startDate) expenses = expenses.filter((e) => e.expenseDate >= filters.startDate!);
    if (filters?.endDate) expenses = expenses.filter((e) => e.expenseDate <= filters.endDate!);

    expenses.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

    return expenses.map((e) => ({
      ...e,
      complexName: complexMap.get(e.complexId) || e.complexId,
      shopNumber: e.shopId ? shopMap.get(e.shopId) || '' : ''
    }));
  }

  createExpense(
    data: {
      complexId: string;
      shopId?: string;
      expenseDate: string;
      category: ExpenseCategory;
      expenseReason: string;
      expenseAmount: number;
      paymentMode: PaymentMode;
      cashAmount?: number;
      gpayAmount?: number;
      notes?: string;
    },
    actorId: string
  ): RentalExpense {
    const numAmount = Number(data.expenseAmount) || 0;
    if (numAmount <= 0) throw new Error('Expense amount must be greater than zero.');

    let finalCash = 0;
    let finalGpay = 0;
    if (data.paymentMode === 'CASH') {
      finalCash = numAmount;
      finalGpay = 0;
    } else if (data.paymentMode === 'GPAY') {
      finalCash = 0;
      finalGpay = numAmount;
    } else if (data.paymentMode === 'BOTH') {
      const c = Number(data.cashAmount) || 0;
      const g = Number(data.gpayAmount) || 0;
      if (Math.abs(c + g - numAmount) > 0.01) {
        throw new Error(`Expense split sum (₹${c + g}) does not equal total expense amount (₹${numAmount}).`);
      }
      finalCash = c;
      finalGpay = g;
    }

    const expense = rentalRepository.createExpense({
      complexId: data.complexId,
      shopId: data.shopId,
      expenseDate: data.expenseDate,
      category: data.category,
      expenseReason: data.expenseReason.trim(),
      expenseAmount: numAmount,
      paymentMode: data.paymentMode,
      cashAmount: finalCash,
      gpayAmount: finalGpay,
      notes: data.notes
    });

    rentalRepository.createAuditLog({
      userId: actorId,
      action: 'CREATE_EXPENSE',
      entityType: 'Expense',
      entityId: expense.expenseId,
      newValue: expense
    });

    syncService.triggerSync('Expense', expense.expenseId, 'CREATE');
    return expense;
  }

  updateExpense(
    expenseId: string,
    updates: Partial<RentalExpense>,
    actorId: string
  ): RentalExpense | null {
    const oldVal = rentalRepository.getExpenseById(expenseId);
    if (!oldVal) return null;

    const updated = rentalRepository.updateExpense(expenseId, updates);
    if (updated) {
      rentalRepository.createAuditLog({
        userId: actorId,
        action: 'UPDATE_EXPENSE',
        entityType: 'Expense',
        entityId: updated.expenseId,
        oldValue: oldVal,
        newValue: updated
      });

      syncService.triggerSync('Expense', updated.expenseId, 'UPDATE');
    }
    return updated;
  }

  deleteExpense(expenseId: string, actorId: string): boolean {
    const oldVal = rentalRepository.getExpenseById(expenseId);
    if (!oldVal) return false;

    const deleted = rentalRepository.deleteExpense(expenseId);
    if (deleted) {
      rentalRepository.createAuditLog({
        userId: actorId,
        action: 'DELETE_EXPENSE',
        entityType: 'Expense',
        entityId: expenseId,
        oldValue: oldVal
      });
    }
    return deleted;
  }

  // ── DASHBOARD & AGGREGATIONS ───────────────────────────────────────────────
  getDashboardData(month?: string): RentalDashboardData {
    const currentMonth = month || new Date().toISOString().substring(0, 7);
    const today = new Date().toISOString().substring(0, 10);

    const complexes = rentalRepository.getComplexes();
    const shops = rentalRepository.getShops();
    const activeShops = shops.filter((s) => s.status === 'ACTIVE');
    const payments = rentalRepository.getPayments();
    const expenses = rentalRepository.getExpenses();

    const expectedMonthlyRent = activeShops.reduce((sum, s) => sum + s.monthlyRent, 0);
    const availableAdvance = shops.reduce((sum, s) => sum + (s.availableAdvance || 0), 0);

    // Filter current month
    const thisMonthPayments = payments.filter((p) => p.paymentMonth === currentMonth);
    const collectedThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.amountReceived, 0);
    const advanceUsedThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.advanceUsed, 0);

    const pendingRent = Math.max(0, expectedMonthlyRent - (collectedThisMonth + advanceUsedThisMonth));

    // Filter today
    const todaysPayments = payments.filter((p) => p.paymentDate === today);
    const todaysCollection = todaysPayments.reduce((sum, p) => sum + p.amountReceived, 0);

    const todaysExpensesList = expenses.filter((e) => e.expenseDate === today);
    const todaysExpenses = todaysExpensesList.reduce((sum, e) => sum + e.expenseAmount, 0);

    const thisMonthExpensesList = expenses.filter((e) => e.expenseDate.startsWith(currentMonth));
    const thisMonthExpenses = thisMonthExpensesList.reduce((sum, e) => sum + e.expenseAmount, 0);

    const netCollection = collectedThisMonth - thisMonthExpenses;

    // Complex-wise stats
    const complexStats = complexes.map((c) => {
      const cShops = shops.filter((s) => s.complexId === c.complexId);
      const cActiveShops = cShops.filter((s) => s.status === 'ACTIVE');
      const cExpected = cActiveShops.reduce((sum, s) => sum + s.monthlyRent, 0);

      const cPayments = thisMonthPayments.filter((p) => p.complexId === c.complexId);
      const cCollected = cPayments.reduce((sum, p) => sum + p.amountReceived, 0);
      const cAdvanceUsed = cPayments.reduce((sum, p) => sum + p.advanceUsed, 0);
      const cPending = Math.max(0, cExpected - (cCollected + cAdvanceUsed));

      const cExpenses = thisMonthExpensesList
        .filter((e) => e.complexId === c.complexId)
        .reduce((sum, e) => sum + e.expenseAmount, 0);

      return {
        complexId: c.complexId,
        complexName: c.complexName,
        location: c.location,
        totalShops: cShops.length,
        expectedRent: cExpected,
        collected: cCollected,
        pending: cPending,
        expenses: cExpenses,
        net: cCollected - cExpenses
      };
    });

    // Monthly Trends (past 6 months)
    const monthlyTrend: {
      month: string;
      expected: number;
      collected: number;
      pending: number;
      expenses: number;
      net: number;
    }[] = [];

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const mPayments = payments.filter((p) => p.paymentMonth === mStr);
      const mCollected = mPayments.reduce((sum, p) => sum + p.amountReceived, 0);
      const mAdvanceUsed = mPayments.reduce((sum, p) => sum + p.advanceUsed, 0);
      const mExpected = expectedMonthlyRent;
      const mPending = Math.max(0, mExpected - (mCollected + mAdvanceUsed));
      const mExpenses = expenses
        .filter((e) => e.expenseDate.startsWith(mStr))
        .reduce((sum, e) => sum + e.expenseAmount, 0);

      monthlyTrend.push({
        month: mStr,
        expected: mExpected,
        collected: mCollected,
        pending: mPending,
        expenses: mExpenses,
        net: mCollected - mExpenses
      });
    }

    // Payment Mode Split
    const cashTotal = thisMonthPayments.reduce((sum, p) => sum + p.cashAmount, 0);
    const gpayTotal = thisMonthPayments.reduce((sum, p) => sum + p.gpayAmount, 0);

    return {
      totalComplexes: complexes.length,
      totalShops: shops.length,
      expectedMonthlyRent,
      collectedThisMonth,
      pendingRent,
      availableAdvance,
      todaysCollection,
      todaysExpenses,
      thisMonthExpenses,
      netCollection,
      recentPayments: payments.slice(0, 10),
      recentExpenses: expenses.slice(0, 10),
      complexStats,
      monthlyTrend,
      paymentModeSplit: {
        cashTotal,
        gpayTotal,
        total: cashTotal + gpayTotal
      }
    };
  }

  // ── ADMIN RENTAL SUMMARY ───────────────────────────────────────────────────
  getAdminSummary(): AdminRentalSummary {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const complexes = rentalRepository.getComplexes();
    const shops = rentalRepository.getShops();
    const activeShops = shops.filter((s) => s.status === 'ACTIVE');
    const payments = rentalRepository.getPayments();
    const expenses = rentalRepository.getExpenses();

    const expectedMonthlyRent = activeShops.reduce((sum, s) => sum + s.monthlyRent, 0);
    const advanceAmount = shops.reduce((sum, s) => sum + (s.availableAdvance || 0), 0);

    const thisMonthPayments = payments.filter((p) => p.paymentMonth === currentMonth);
    const collectedThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.amountReceived, 0);
    const advanceUsedThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.advanceUsed, 0);
    const pendingRent = Math.max(0, expectedMonthlyRent - (collectedThisMonth + advanceUsedThisMonth));

    const thisMonthExpenses = expenses
      .filter((e) => e.expenseDate.startsWith(currentMonth))
      .reduce((sum, e) => sum + e.expenseAmount, 0);

    const netCollection = collectedThisMonth - thisMonthExpenses;

    const complexPerformance = complexes.map((c) => {
      const cShops = shops.filter((s) => s.complexId === c.complexId && s.status === 'ACTIVE');
      const cExpected = cShops.reduce((sum, s) => sum + s.monthlyRent, 0);
      const cPayments = thisMonthPayments.filter((p) => p.complexId === c.complexId);
      const cCollected = cPayments.reduce((sum, p) => sum + p.amountReceived, 0);
      const cAdvanceUsed = cPayments.reduce((sum, p) => sum + p.advanceUsed, 0);
      const cPending = Math.max(0, cExpected - (cCollected + cAdvanceUsed));
      const cExpenses = expenses
        .filter((e) => e.complexId === c.complexId && e.expenseDate.startsWith(currentMonth))
        .reduce((sum, e) => sum + e.expenseAmount, 0);

      return {
        complexId: c.complexId,
        complexName: c.complexName,
        expectedRent: cExpected,
        collected: cCollected,
        pending: cPending,
        expenses: cExpenses,
        net: cCollected - cExpenses
      };
    });

    const complexBreakdown = complexes.map((c) => {
      const cShops = shops.filter((s) => s.complexId === c.complexId);
      const cActiveShops = cShops.filter((s) => s.status === 'ACTIVE');
      const cExpected = cActiveShops.reduce((sum, s) => sum + s.monthlyRent, 0);
      const cPayments = thisMonthPayments.filter((p) => p.complexId === c.complexId);
      const cCollected = cPayments.reduce((sum, p) => sum + p.amountReceived, 0);
      const cAdvanceUsed = cPayments.reduce((sum, p) => sum + p.advanceUsed, 0);
      const cPending = Math.max(0, cExpected - (cCollected + cAdvanceUsed));
      const cExpenses = expenses
        .filter((e) => e.complexId === c.complexId && e.expenseDate.startsWith(currentMonth))
        .reduce((sum, e) => sum + e.expenseAmount, 0);

      return {
        complexId: c.complexId,
        complexName: c.complexName,
        totalShops: cShops.length,
        expectedRent: cExpected,
        collected: cCollected,
        pending: cPending,
        expenses: cExpenses,
        netCollection: cCollected - cExpenses
      };
    });

    return {
      totalComplexes: complexes.length,
      totalShops: shops.length,
      expectedMonthlyRent,
      collectedThisMonth,
      pendingRent,
      advanceAmount,
      totalExpenses: thisMonthExpenses,
      netCollection,
      complexPerformance,
      complexBreakdown
    };
  }

  // ── REPORTS ────────────────────────────────────────────────────────────────
  getMonthlyRentReport(month: string): MonthlyRentReportItem[] {
    const complexes = rentalRepository.getComplexes();
    const shops = rentalRepository.getShops();
    const payments = rentalRepository.getPayments().filter((p) => p.paymentMonth === month);
    const expenses = rentalRepository.getExpenses().filter((e) => e.expenseDate.startsWith(month));

    return complexes.map((c) => {
      const cShops = shops.filter((s) => s.complexId === c.complexId);
      const cActiveShops = cShops.filter((s) => s.status === 'ACTIVE');
      const cExpected = cActiveShops.reduce((sum, s) => sum + s.monthlyRent, 0);
      const cAdvance = cShops.reduce((sum, s) => sum + (s.availableAdvance || 0), 0);

      const cPayments = payments.filter((p) => p.complexId === c.complexId);
      const cCollected = cPayments.reduce((sum, p) => sum + p.amountReceived, 0);
      const cAdvanceUsed = cPayments.reduce((sum, p) => sum + p.advanceUsed, 0);
      const cPending = Math.max(0, cExpected - (cCollected + cAdvanceUsed));

      const cExpenses = expenses
        .filter((e) => e.complexId === c.complexId)
        .reduce((sum, e) => sum + e.expenseAmount, 0);

      return {
        complexId: c.complexId,
        complexName: c.complexName,
        location: c.location,
        totalShops: cShops.length,
        expectedRent: cExpected,
        collected: cCollected,
        pending: cPending,
        advance: cAdvance,
        expenses: cExpenses,
        netCollection: cCollected - cExpenses
      };
    });
  }

  getPaymentModeReport(startDate?: string, endDate?: string): PaymentModeReportData {
    let payments = rentalRepository.getPayments();
    const shops = rentalRepository.getShops();
    const shopMap = new Map(shops.map((s) => [s.shopId, s]));

    if (startDate) payments = payments.filter((p) => p.paymentDate >= startDate);
    if (endDate) payments = payments.filter((p) => p.paymentDate <= endDate);

    const cashTotal = payments.reduce((sum, p) => sum + p.cashAmount, 0);
    const gpayTotal = payments.reduce((sum, p) => sum + p.gpayAmount, 0);
    const cashCount = payments.filter((p) => p.paymentMode === 'CASH').length;
    const gpayCount = payments.filter((p) => p.paymentMode === 'GPAY').length;
    const bothCount = payments.filter((p) => p.paymentMode === 'BOTH').length;

    const transactions = payments.map((p) => {
      const s = shopMap.get(p.shopId);
      return {
        paymentId: p.paymentId,
        shopNumber: s ? s.shopNumber : p.shopId,
        tenantName: s ? s.tenantName : '',
        amountReceived: p.amountReceived,
        cashAmount: p.cashAmount,
        gpayAmount: p.gpayAmount,
        paymentMode: p.paymentMode,
        paymentDate: p.paymentDate
      };
    });

    return {
      cashTotal,
      gpayTotal,
      totalPayments: payments.length,
      cashCount,
      gpayCount,
      bothCount,
      transactions
    };
  }
}

export const rentalService = new RentalService();
