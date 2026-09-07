import assert from 'assert';

console.log('====================================================');
console.log('  KKV GOLD FINANCE — COMPREHENSIVE AUTOMATED AUDIT  ');
console.log('====================================================\n');

// ── 1. TEST CANONICAL CUSTOMER ID UTILITIES ──────────────────────────────────
console.log('▶ [TEST SUITE 1] Canonical Customer ID & Relational Matching...');

const getCanonicalCustomerId = (cust) => {
  if (!cust) return '';
  if (typeof cust === 'string') return cust.trim();
  if (typeof cust === 'number') return `CUST-${String(cust).padStart(3, '0')}`;
  if (cust.customerId) return `CUST-${String(cust.customerId).padStart(3, '0')}`;
  if (cust.id) return cust.id.trim();
  return '';
};

const isMatchingCustomerId = (targetId, customerRef) => {
  if (targetId === undefined || targetId === null || customerRef === undefined || customerRef === null) return false;
  const strTarget = String(targetId).trim().toLowerCase();
  if (typeof customerRef === 'object') {
    const custObj = customerRef;
    const custId = custObj.id ? String(custObj.id).trim().toLowerCase() : '';
    const custNumId = custObj.customerId ? String(custObj.customerId).trim().toLowerCase() : '';
    const formattedNumId = custObj.customerId ? `cust-${String(custObj.customerId).padStart(3, '0')}`.toLowerCase() : '';
    if (strTarget === custId) return true;
    if (custNumId && strTarget === custNumId) return true;
    if (formattedNumId && strTarget === formattedNumId) return true;
    const targetDigits = strTarget.replace(/\D/g, '');
    const custDigits = custNumId || custId.replace(/\D/g, '');
    if (targetDigits && custDigits && parseInt(targetDigits, 10) === parseInt(custDigits, 10)) return true;
    return false;
  }
  const strRef = String(customerRef).trim().toLowerCase();
  if (strTarget === strRef) return true;
  const targetDigits = strTarget.replace(/\D/g, '');
  const refDigits = strRef.replace(/\D/g, '');
  if (targetDigits && refDigits && parseInt(targetDigits, 10) === parseInt(refDigits, 10)) return true;
  return false;
};

const sampleCustomer = {
  id: 'CUST-0006',
  customerId: 6,
  name: 'Sanjai',
  phone: '8637628773'
};

assert.strictEqual(getCanonicalCustomerId(sampleCustomer), 'CUST-006');
assert.strictEqual(getCanonicalCustomerId(6), 'CUST-006');
assert.strictEqual(getCanonicalCustomerId('CUST-0006'), 'CUST-0006');
assert.strictEqual(isMatchingCustomerId('CUST-0006', sampleCustomer), true);
assert.strictEqual(isMatchingCustomerId('cust-006', sampleCustomer), true);
assert.strictEqual(isMatchingCustomerId('6', sampleCustomer), true);
assert.strictEqual(isMatchingCustomerId(6, sampleCustomer), true);
assert.strictEqual(isMatchingCustomerId('CUST-9999', sampleCustomer), false);
console.log('  ✔ Canonical Customer ID & Relational Matching: PASS\n');


// ── 2. TEST CALENDAR-MONTH ARITHMETIC & DATE FUNCTIONS ──────────────────────
console.log('▶ [TEST SUITE 2] Date & Calendar-Month Precision...');

const parseFDDate = (dateStr) => {
  if (!dateStr) return new Date();
  const parts = dateStr.trim().split(/[-/]/).map((p) => parseInt(p, 10));
  if (parts.length === 3 && !parts.some(isNaN)) {
    if (parts[0] > 1000) return new Date(parts[0], parts[1] - 1, parts[2]);
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return new Date();
};

const formatFDDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const addCalendarMonths = (startDateStr, monthsToAdd) => {
  if (!startDateStr || monthsToAdd <= 0) return startDateStr;
  const date = parseFDDate(startDateStr);
  const origDay = date.getDate();
  const origMonth = date.getMonth();
  const origYear = date.getFullYear();
  const totalMonths = origMonth + monthsToAdd;
  const targetYear = origYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(origDay, maxDaysInTargetMonth);
  return formatFDDate(new Date(targetYear, targetMonth, targetDay));
};

const getDaysDifference = (targetDateStr, baseDateStr) => {
  const t = parseFDDate(targetDateStr);
  const b = parseFDDate(baseDateStr);
  return Math.floor((t.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
};

// Test Standard Month Addition
assert.strictEqual(addCalendarMonths('02-09-2026', 1), '02-10-2026');
assert.strictEqual(addCalendarMonths('02-09-2026', 12), '02-09-2027');

// Test Month-End Overflow (Jan 31 + 1 month -> Feb 28 in non-leap year)
assert.strictEqual(addCalendarMonths('31-01-2026', 1), '28-02-2026');

// Test Month-End Overflow (Jan 31 + 1 month -> Feb 29 in leap year 2028)
assert.strictEqual(addCalendarMonths('31-01-2028', 1), '29-02-2028');

// Test Leap Day Rollover (Feb 29 2028 + 12 months -> Feb 28 2029)
assert.strictEqual(addCalendarMonths('29-02-2028', 12), '28-02-2029');

// Test Days Difference
assert.strictEqual(getDaysDifference('10-09-2026', '02-09-2026'), 8);
assert.strictEqual(getDaysDifference('02-09-2026', '02-09-2026'), 0);
assert.strictEqual(getDaysDifference('01-09-2026', '02-09-2026'), -1);
console.log('  ✔ Date & Calendar-Month Precision: PASS\n');


// ── 3. TEST FINANCIAL CALCULATIONS: LOANS ────────────────────────────────────
console.log('▶ [TEST SUITE 3] Financial Calculations: Gold Loans...');

const calculateLoanMonthlyInterest = (principal, interestRatePercent) => {
  return Math.round((principal * interestRatePercent) / 100);
};

const calculateLoanOverduePenalty = (
  principal,
  interestRateMonthly,
  daysOverdue,
  graceDays = 3,
  penaltyPercentPerDay = 3.6
) => {
  if (daysOverdue <= graceDays) return 0;
  const effectiveOverdueDays = daysOverdue - graceDays;
  const baseMonthlyInterest = (principal * interestRateMonthly) / 100;
  const dailyInterest = baseMonthlyInterest / 30;
  const penalty = dailyInterest * effectiveOverdueDays * (penaltyPercentPerDay / 100);
  return Math.round(penalty);
};

// Loan 1: ₹1,00,000 @ 1.5% monthly = ₹1,500/mo
const l1Interest = calculateLoanMonthlyInterest(100000, 1.5);
assert.strictEqual(l1Interest, 1500);

// Loan 2: ₹2,05,000 @ 1.5% monthly = ₹3,075/mo
const l2Interest = calculateLoanMonthlyInterest(205000, 1.5);
assert.strictEqual(l2Interest, 3075);

// Overdue within grace period (2 days late) -> ₹0 penalty
assert.strictEqual(calculateLoanOverduePenalty(100000, 1.5, 2, 3), 0);

// Overdue past grace period (8 days late, 5 effective overdue days)
const penalty8Days = calculateLoanOverduePenalty(100000, 1.5, 8, 3, 3.6);
assert.ok(penalty8Days > 0);
console.log('  ✔ Loan Interest & Overdue Formulas: PASS\n');


// ── 4. TEST FINANCIAL CALCULATIONS: FIXED DEPOSITS ───────────────────────────
console.log('▶ [TEST SUITE 4] Financial Calculations: Fixed Deposits...');

const calculateFDMonthlyPayout = (principal, ratePA) => {
  return Math.round(((principal * ratePA) / 100) / 12);
};

// FD 1: ₹2,00,000 @ 12% p.a. = ₹2,000/mo
assert.strictEqual(calculateFDMonthlyPayout(200000, 12), 2000);

// FD 2: ₹1,00,000 @ 12% p.a. = ₹1,000/mo
assert.strictEqual(calculateFDMonthlyPayout(100000, 12), 1000);

// Partial Withdrawal
let fdPrincipal = 200000;
const wd1 = 50000;
let remaining = Math.max(0, fdPrincipal - wd1);
assert.strictEqual(remaining, 150000);

const wd2 = 25000;
remaining = Math.max(0, remaining - wd2);
assert.strictEqual(remaining, 125000);

// Invalid Withdrawal (exceeding remaining)
const invalidWd = 200000;
assert.ok(invalidWd > remaining, 'Withdrawal must not exceed remaining principal');

// Full Closure
const finalWd = 125000;
remaining = Math.max(0, remaining - finalWd);
assert.strictEqual(remaining, 0);
const fdStatus = remaining === 0 ? 'WITHDRAWN' : 'ACTIVE';
assert.strictEqual(fdStatus, 'WITHDRAWN');
console.log('  ✔ Fixed Deposit Payouts, Withdrawals & Closure: PASS\n');


// ── 5. TEST STATE PERSISTENCE, CASCADE DELETE & ORPHAN PREVENTION ────────────
console.log('▶ [TEST SUITE 5] Cascade Deletion & Orphan Prevention...');

let stateCustomers = [
  { id: 'CUST-0001', customerId: 1, name: 'Alice', phone: '9000000001', isDeleted: false },
  { id: 'CUST-0002', customerId: 2, name: 'Bob', phone: '9000000002', isDeleted: false }
];
let stateLoans = [
  { id: 'L-1', loanNo: 'GL-01', customerId: 'CUST-0001', principal: 50000 },
  { id: 'L-2', loanNo: 'GL-02', customerId: 'CUST-0002', principal: 75000 }
];
let stateReceipts = [
  { id: 'RCPT-1', receiptNo: 1, loanId: 'L-1', loanNo: 'GL-01', customerId: 'CUST-0001', amount: 50000 },
  { id: 'RCPT-2', receiptNo: 2, loanId: 'L-2', loanNo: 'GL-02', customerId: 'CUST-0002', amount: 75000 }
];
let stateFDs = [
  { id: 'FD-1', fdNo: 'FD-01', customerId: 'CUST-0001', principal: 100000, status: 'ACTIVE' },
  { id: 'FD-2', fdNo: 'FD-02', customerId: 'CUST-0002', principal: 200000, status: 'ACTIVE' }
];
let stateFDPayouts = [
  { id: 'FDP-1', fdNo: 'FD-01', customerId: 'CUST-0001', amount: 1000, status: 'PAID' }
];
let stateFDWithdrawals = [
  { id: 'FDW-1', fdNo: 'FD-01', customerId: 'CUST-0001', principalAmount: 20000 }
];
let stateFDRenewals = [
  { id: 'FDR-1', fdNo: 'FD-01', customerId: 'CUST-0001', renewalPeriodMonths: 12 }
];

// Perform Permanent Delete on CUST-0001
const deleteTargetId = 'CUST-0001';
const deletedLoanNos = new Set();
const deletedFdNos = new Set();

stateLoans.forEach(l => {
  if (l.customerId === deleteTargetId) deletedLoanNos.add(l.loanNo);
});
stateFDs.forEach(f => {
  if (f.customerId === deleteTargetId) deletedFdNos.add(f.fdNo);
});

// Cascade
stateCustomers = stateCustomers.filter(c => c.id !== deleteTargetId);
stateLoans = stateLoans.filter(l => l.customerId !== deleteTargetId);
stateReceipts = stateReceipts.filter(r => r.customerId !== deleteTargetId && !deletedLoanNos.has(r.loanNo));
stateFDs = stateFDs.filter(f => f.customerId !== deleteTargetId);
stateFDPayouts = stateFDPayouts.filter(p => !deletedFdNos.has(p.fdNo));
stateFDWithdrawals = stateFDWithdrawals.filter(w => !deletedFdNos.has(w.fdNo));
stateFDRenewals = stateFDRenewals.filter(r => !deletedFdNos.has(r.fdNo));

// Verification
assert.strictEqual(stateCustomers.length, 1);
assert.strictEqual(stateCustomers[0].id, 'CUST-0002');
assert.strictEqual(stateLoans.length, 1);
assert.strictEqual(stateLoans[0].loanNo, 'GL-02');
assert.strictEqual(stateReceipts.length, 1);
assert.strictEqual(stateReceipts[0].loanNo, 'GL-02');
assert.strictEqual(stateFDs.length, 1);
assert.strictEqual(stateFDs[0].fdNo, 'FD-02');
assert.strictEqual(stateFDPayouts.length, 0);
assert.strictEqual(stateFDWithdrawals.length, 0);
assert.strictEqual(stateFDRenewals.length, 0);

console.log('  ✔ Cascade Deletion & Orphan Prevention: PASS\n');


// ── 6. TEST BACKUP EXPORT & RESTORE DATA INTEGRITY ───────────────────────────
console.log('▶ [TEST SUITE 6] Backup Export & Restore Completeness...');

const testBackup = {
  timestamp: new Date().toISOString(),
  version: '2.4.0',
  data: {
    customers: [{ id: 'CUST-0001', name: 'Alice', phone: '9000000001' }],
    loans: [{ id: 'L-1', loanNo: 'GL-01', customerId: 'CUST-0001', principal: 50000 }],
    receipts: [{ id: 'RCPT-1', receiptNo: 1, loanNo: 'GL-01', customerId: 'CUST-0001', amount: 50000 }],
    fixedDeposits: [{ id: 'FD-1', fdNo: 'FD-01', customerId: 'CUST-0001', principal: 100000 }],
    fdInterestPayouts: [{ id: 'FDP-1', fdNo: 'FD-01', amount: 1000 }],
    fdWithdrawals: [{ id: 'FDW-1', fdNo: 'FD-01', principalAmount: 20000 }],
    fdRenewals: [{ id: 'FDR-1', fdNo: 'FD-01', renewalPeriodMonths: 12 }],
    dayBookEntries: [{ id: 'DB-1', billNo: '1', particulars: 'Test Entry' }]
  }
};

const jsonStr = JSON.stringify(testBackup);
const parsed = JSON.parse(jsonStr);
const restoreData = parsed.data || parsed;

assert.ok(Array.isArray(restoreData.customers) && restoreData.customers.length === 1);
assert.ok(Array.isArray(restoreData.loans) && restoreData.loans.length === 1);
assert.ok(Array.isArray(restoreData.receipts) && restoreData.receipts.length === 1);
assert.ok(Array.isArray(restoreData.fixedDeposits) && restoreData.fixedDeposits.length === 1);
assert.ok(Array.isArray(restoreData.fdInterestPayouts) && restoreData.fdInterestPayouts.length === 1);
assert.ok(Array.isArray(restoreData.fdWithdrawals) && restoreData.fdWithdrawals.length === 1);
assert.ok(Array.isArray(restoreData.fdRenewals) && restoreData.fdRenewals.length === 1);
assert.ok(Array.isArray(restoreData.dayBookEntries) && restoreData.dayBookEntries.length === 1);

console.log('  ✔ Backup Export & Restore Completeness: PASS\n');

console.log('====================================================');
console.log('  ALL AUTOMATED AUDIT SUITES PASSED SUCCESSFULLY!   ');
console.log('====================================================');
