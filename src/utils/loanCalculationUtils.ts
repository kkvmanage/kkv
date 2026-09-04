import {
  Loan,
  Receipt,
  AmountBand,
  MasterControlSettings,
  CalculationStrategy,
  LoanTypeConfig
} from '../types';

/**
 * Format a number as Indian Currency string (e.g. ₹1,00,000 or ₹1,500)
 */
export const formatINR = (amount: number | undefined | null): string => {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

/**
 * Clean currency rounding to 2 decimal places or nearest integer
 */
export const roundCurrency = (amount: number): number => {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

/**
 * Parse a DD-MM-YYYY or YYYY-MM-DD date string into a Date object
 */
export const parseLoanDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      // DD-MM-YYYY
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }
  return new Date(dateStr);
};

/**
 * Format a Date object into DD-MM-YYYY
 */
export const formatLoanDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Calculate the next due date (default +1 month from reference date)
 */
export const calculateNextDueDate = (issueDateStr?: string): string => {
  const baseDate = issueDateStr ? parseLoanDate(issueDateStr) : new Date();
  const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, baseDate.getDate());
  return formatLoanDate(nextDate);
};

/**
 * Check whether a loan product is active and visible on Loan Issue
 */
export const isLoanProductVisibleOnIssue = (
  loanType: LoanTypeConfig | { id: string; name?: string; showOnLoanIssue?: boolean; active?: boolean },
  settings?: MasterControlSettings | null
): boolean => {
  if (loanType.active === false) return false;

  if (loanType.showOnLoanIssue !== undefined) {
    return Boolean(loanType.showOnLoanIssue);
  }

  const typeKey = (loanType.name || loanType.id || '').toLowerCase();
  if (typeKey.includes('gold')) {
    if (settings?.showOnLoanIssue !== undefined) return Boolean(settings.showOnLoanIssue);
  } else if (typeKey.includes('silver')) {
    if (settings?.silverShowOnLoanIssue !== undefined) return Boolean(settings.silverShowOnLoanIssue);
  } else if (typeKey.includes('pronote')) {
    if (settings?.pronoteShowOnLoanIssue !== undefined) return Boolean(settings.pronoteShowOnLoanIssue);
  } else if (typeKey.includes('hire') || typeKey.includes('purchase')) {
    if (settings?.hireShowOnLoanIssue !== undefined) return Boolean(settings.hireShowOnLoanIssue);
  }

  return true;
};

/**
 * Filter loan types to those active and configured for display in Loan Issue
 */
export const getActiveLoanTypesForIssue = (
  loanTypes: LoanTypeConfig[] | undefined,
  settings?: MasterControlSettings | null
): LoanTypeConfig[] => {
  const list = loanTypes || settings?.loanTypes || [];
  const filtered = list.filter((lt) => isLoanProductVisibleOnIssue(lt, settings));

  if (filtered.length > 0) return filtered;

  // Safe fallback if all are turned off
  return [
    {
      id: 'gold-loan',
      name: 'Gold Loan',
      active: true,
      showOnLoanIssue: true,
      cardFeeEnabled: true,
      cardFee: 25,
      defaultMonthlyRate: 1.5,
      sortOrder: 1
    }
  ];
};

/**
 * Resolve matching Amount Band for a loan product and principal amount
 */
export const getApplicableInterestBand = (
  principal: number,
  loanTypeNameOrId: string = 'Gold Loan',
  settings?: MasterControlSettings | null
): AmountBand | null => {
  if (!settings || principal <= 0) return null;

  const key = (loanTypeNameOrId || '').toLowerCase().trim();
  let bands: AmountBand[] = [];

  const loanTypeObj = settings.loanTypes?.find(
    (lt) => lt.id.toLowerCase() === key || lt.name.toLowerCase() === key
  );

  if (loanTypeObj?.interestProfileId === 'silver-bands' || (!loanTypeObj?.interestProfileId && key.includes('silver'))) {
    bands = settings.silverAmountBands || [];
  } else if (loanTypeObj?.interestProfileId === 'gold-bands' || (!loanTypeObj?.interestProfileId && (key.includes('gold') || (!key.includes('pronote') && !key.includes('hire'))))) {
    bands = settings.amountBands || [];
  }

  if (!bands || bands.length === 0) return null;

  // Evaluate bands in order
  for (const band of bands) {
    if (band.condition === 'Below' && principal <= band.amount) {
      return band;
    }
    if (band.condition === 'Above' && principal > band.amount) {
      return band;
    }
  }

  // If no exact match found, choose closest boundary
  const sorted = [...bands].sort((a, b) => a.amount - b.amount);
  const fallback = sorted.find((b) => principal <= b.amount) || sorted[sorted.length - 1];
  return fallback || null;
};

/**
 * Get applicable monthly interest rate % based on Master Control configuration
 */
export const getApplicableInterestRate = (
  principal: number,
  loanTypeNameOrId: string = 'Gold Loan',
  settings?: MasterControlSettings | null
): number => {
  const key = (loanTypeNameOrId || '').toLowerCase().trim();
  const matchedLoanType = settings?.loanTypes?.find(
    (lt) => lt.id.toLowerCase() === key || lt.name.toLowerCase() === key
  );

  if (matchedLoanType?.interestProfileId === 'fixed-rate' && typeof matchedLoanType.defaultMonthlyRate === 'number') {
    return matchedLoanType.defaultMonthlyRate;
  }

  const matchedBand = getApplicableInterestBand(principal, loanTypeNameOrId, settings);
  if (matchedBand && typeof matchedBand.baseRateMonthly === 'number') {
    return matchedBand.baseRateMonthly;
  }

  if (matchedLoanType && typeof matchedLoanType.defaultMonthlyRate === 'number') {
    return matchedLoanType.defaultMonthlyRate;
  }

  if (key.includes('silver')) {
    return settings?.silverLoanMonthlyRate ?? 2.0;
  }
  if (key.includes('pronote')) {
    if (settings?.pronoteMonthlyRate !== undefined) return settings.pronoteMonthlyRate;
    if (settings?.pronoteRate !== undefined) return settings.pronoteRate;
    return 1.0;
  }
  if (key.includes('hire') || key.includes('purchase')) {
    return settings?.hirePurchaseMonthlyRate ?? 1.0;
  }

  // Default Gold Loan
  return settings?.goldLoanMonthlyRate ?? 1.5;
};

/**
 * Retrieve product-specific card/processing fee configuration
 */
export const getProductCardFeeConfig = (
  loanTypeNameOrId: string = 'Gold Loan',
  settings?: MasterControlSettings | null
): { enabled: boolean; amount: number } => {
  const key = (loanTypeNameOrId || '').toLowerCase().trim();

  // 1. Check canonical loanTypes first
  if (settings?.loanTypes && settings.loanTypes.length > 0) {
    const matched = settings.loanTypes.find(
      (lt) => lt.id.toLowerCase() === key || lt.name.toLowerCase() === key
    );
    if (matched) {
      return {
        enabled: matched.cardFeeEnabled !== undefined ? Boolean(matched.cardFeeEnabled) : true,
        amount: typeof matched.cardFee === 'number' ? matched.cardFee : (settings.defaultCardFee ?? 25)
      };
    }
  }

  // 2. Legacy fallback keys
  if (key.includes('silver')) {
    return {
      enabled: settings?.silverCardFeeEnabled ?? true,
      amount: settings?.silverCardFee ?? settings?.defaultCardFee ?? 30
    };
  }
  if (key.includes('pronote')) {
    return {
      enabled: settings?.pronoteCardFeeEnabled ?? true,
      amount: settings?.pronoteCardFee ?? settings?.defaultCardFee ?? 35
    };
  }
  if (key.includes('hire') || key.includes('purchase')) {
    return {
      enabled: settings?.hireCardFeeEnabled ?? true,
      amount: settings?.hireCardFee ?? settings?.defaultCardFee ?? 40
    };
  }

  // Gold Loan / default
  return {
    enabled: settings?.goldCardFeeEnabled ?? true,
    amount: settings?.goldCardFee ?? settings?.defaultCardFee ?? 25
  };
};

export interface LoanTermsCalculation {
  principal: number;
  interestRate: number; // monthly %
  monthlyInterest: number;
  emiAmount?: number;
  matchingBand: AmountBand | null;
  cardFeeConfig: { enabled: boolean; amount: number };
  effectiveCardFee: number;
  advanceInterestAmount: number;
  netDisbursed: number;
  nextDueDate: string;
  contractSnapshot: {
    interestRate: number;
    interestRateUnit: 'MONTHLY' | 'YEARLY';
    rateSource: 'MASTER_CONTROL' | 'CUSTOM';
    rateEffectiveAt: string;
    loanConfigVersion: string;
    amountBandId?: string;
    amountBandCondition?: 'Below' | 'Above';
    amountBandThreshold?: number;
    penaltyAfterMonths?: number;
    penaltyStepUpMonthly?: number;
    penaltyCalculation?: string;
    cardFee: number;
    cardFeeEnabled: boolean;
  };
}

/**
 * Calculate complete loan financial terms & dynamic preview for Loan Issue
 */
export const calculateLoanTerms = (params: {
  principal: number;
  loanTypeId?: string;
  loanTypeName?: string;
  repaymentStrategy?: CalculationStrategy;
  settings?: MasterControlSettings | null;
  deductAdvanceInterest?: boolean;
  advanceDays?: number;
  customCardFeeEnabled?: boolean;
  customCardFeeAmount?: number;
  issueDate?: string;
}): LoanTermsCalculation => {
  const {
    principal,
    loanTypeId = 'gold-loan',
    loanTypeName = 'Gold Loan',
    repaymentStrategy = 'MONTHLY_INTEREST_ONLY',
    settings,
    deductAdvanceInterest = false,
    advanceDays = 0,
    customCardFeeEnabled,
    customCardFeeAmount,
    issueDate
  } = params;

  const numericPrincipal = typeof principal === 'number' && !isNaN(principal) ? Math.max(0, principal) : 0;
  const matchingBand = getApplicableInterestBand(numericPrincipal, loanTypeName || loanTypeId, settings);
  const interestRate = getApplicableInterestRate(numericPrincipal, loanTypeName || loanTypeId, settings);

  let monthlyInterest = Math.round((numericPrincipal * interestRate) / 100);
  let emiAmount: number | undefined = undefined;

  if (repaymentStrategy === 'EMI' && numericPrincipal > 0) {
    const r = interestRate / 100;
    const n = 12;
    emiAmount = Math.round((numericPrincipal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }

  const productFeeConfig = getProductCardFeeConfig(loanTypeName || loanTypeId, settings);
  const isCardFeeActive = customCardFeeEnabled !== undefined ? customCardFeeEnabled : productFeeConfig.enabled;
  const cardFeeVal = customCardFeeAmount !== undefined ? customCardFeeAmount : productFeeConfig.amount;
  const effectiveCardFee = isCardFeeActive ? cardFeeVal : 0;

  const advanceInterestAmount = deductAdvanceInterest
    ? Math.round((monthlyInterest / 30) * (advanceDays || 30))
    : 0;

  const netDisbursed = Math.max(0, numericPrincipal - advanceInterestAmount - effectiveCardFee);
  const nextDueDate = calculateNextDueDate(issueDate);

  const contractSnapshot = {
    interestRate,
    interestRateUnit: 'MONTHLY' as const,
    rateSource: 'MASTER_CONTROL' as const,
    rateEffectiveAt: new Date().toISOString(),
    loanConfigVersion: settings?.loanConfigVersion || 'v1',
    amountBandId: matchingBand?.id,
    amountBandCondition: matchingBand?.condition,
    amountBandThreshold: matchingBand?.amount,
    penaltyAfterMonths: matchingBand?.penaltyAfterMonths ?? 3,
    penaltyStepUpMonthly: matchingBand?.penaltyStepUpMonthly ?? 0.1,
    penaltyCalculation: matchingBand?.penaltyCalculation ?? 'From the start — stepped rate over the whole overc',
    cardFee: effectiveCardFee,
    cardFeeEnabled: isCardFeeActive
  };

  return {
    principal: numericPrincipal,
    interestRate,
    monthlyInterest,
    emiAmount,
    matchingBand,
    cardFeeConfig: productFeeConfig,
    effectiveCardFee,
    advanceInterestAmount,
    netDisbursed,
    nextDueDate,
    contractSnapshot
  };
};

export interface LoanOverdueResult {
  dueDateStr: string;
  outstanding: number;
  baseMonthlyInterest: number;
  interestAlreadyPaid: number;
  remainingInterestDue: number;
  isInterestFullyPaid: boolean;
  daysOverdue: number;
  monthsOverdue: number;
  statusText: 'CLOSED' | 'PAID' | 'PARTIALLY PAID' | 'OVERDUE' | 'DUE TODAY' | 'UPCOMING' | 'NOT DUE';
  penaltyRatePercent: number;
  penaltyAmount: number;
  totalDue: number;
}

/**
 * Calculate overdue interest, penalty, and total dues for a loan contract
 * Prioritizes the loan's contractual values so changing Master Control never recalculates old contracts.
 */
export const calculateLoanOverdueAndDues = (params: {
  loan: Loan;
  asOfDate?: string;
  receipts?: Receipt[];
  settings?: MasterControlSettings | null;
}): LoanOverdueResult => {
  const { loan, asOfDate, receipts = [], settings } = params;

  const outstanding = typeof loan.outstandingPrincipal === 'number'
    ? loan.outstandingPrincipal
    : loan.principal || 0;

  // Use contractual interest rate and monthly interest snapshot
  const contractualRate = loan.interestRate || getApplicableInterestRate(loan.principal, loan.loanType || loan.loanTypeName, settings);
  const baseMonthlyInterest = loan.monthlyInterest || Math.round((loan.principal * contractualRate) / 100);

  const today = asOfDate ? parseLoanDate(asOfDate) : new Date();

  // Derive due date
  const dueDateStr = loan.nextDueDate || calculateNextDueDate(loan.date);
  const dueDate = parseLoanDate(dueDateStr);

  // Compute interest payments for this period
  const paidReceipts = receipts.filter(
    (r) => r.loanId === loan.id || (r.loanNo && r.loanNo === loan.loanNo)
  );

  const interestAlreadyPaid = paidReceipts.reduce((sum, r) => {
    if (r.kind === 'INTEREST PAYMENT' || r.kind === 'INTEREST + PRINCIPAL' || r.kind === 'PART PAYMENT') {
      return sum + (Number(r.interestComponent) || 0);
    }
    return sum;
  }, 0);

  const isInterestFullyPaid: boolean = Boolean(
    interestAlreadyPaid >= baseMonthlyInterest ||
    (loan.lastInterestPaidDate && parseLoanDate(loan.lastInterestPaidDate) >= dueDate)
  );

  const remainingInterestDue = isInterestFullyPaid
    ? 0
    : Math.max(0, baseMonthlyInterest - (interestAlreadyPaid % baseMonthlyInterest));

  let daysOverdue = 0;
  let monthsOverdue = 0;
  let statusText: LoanOverdueResult['statusText'] = 'UPCOMING';

  if (loan.status === 'CLOSED' || outstanding <= 0) {
    statusText = 'CLOSED';
  } else if (isInterestFullyPaid) {
    statusText = 'PAID';
  } else if (interestAlreadyPaid > 0 && interestAlreadyPaid < baseMonthlyInterest) {
    statusText = 'PARTIALLY PAID';
  } else {
    const timeDiff = today.getTime() - dueDate.getTime();
    if (timeDiff > 0) {
      statusText = 'OVERDUE';
      daysOverdue = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      monthsOverdue = Math.max(1, Math.ceil(daysOverdue / 30));
    } else if (timeDiff === 0 || formatLoanDate(today) === dueDateStr) {
      statusText = 'DUE TODAY';
    } else {
      statusText = 'NOT DUE';
    }
  }

  // Calculate Penalty based on loan's contractual penalty rules or Master Control
  let penaltyAmount = 0;
  let penaltyRatePercent = 0;

  if (statusText === 'OVERDUE') {
    const penaltyThresholdMonths = loan.penaltyAfterMonths ?? 3;
    const penaltyStepUp = loan.penaltyStepUpMonthly ?? 0.1;
    const graceDays = settings?.graceDays ?? 3;

    if (daysOverdue > graceDays) {
      if (monthsOverdue > penaltyThresholdMonths) {
        // Step-up penalty calculation
        const overdueMonthsBeyondThreshold = monthsOverdue - penaltyThresholdMonths;
        penaltyRatePercent = overdueMonthsBeyondThreshold * penaltyStepUp;
        penaltyAmount = Math.round((remainingInterestDue * penaltyRatePercent) / 100);
      } else {
        // Standard per-day penalty if configured
        const dailyPenaltyRate = settings?.overduePenaltyPerDayPercent ?? 0;
        if (dailyPenaltyRate > 0) {
          penaltyAmount = Math.round((remainingInterestDue * dailyPenaltyRate * daysOverdue) / 100);
          penaltyRatePercent = dailyPenaltyRate * daysOverdue;
        }
      }
    }
  }

  const totalDue = remainingInterestDue + penaltyAmount;

  return {
    dueDateStr,
    outstanding,
    baseMonthlyInterest,
    interestAlreadyPaid,
    remainingInterestDue,
    isInterestFullyPaid,
    daysOverdue,
    monthsOverdue,
    statusText,
    penaltyRatePercent,
    penaltyAmount,
    totalDue
  };
};
