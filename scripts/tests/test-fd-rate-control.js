import assert from 'assert';

console.log('=================================================================');
console.log('  KKV GOLD FINANCE — MASTER ADMIN FD INTEREST RATE CONTROL TEST  ');
console.log('=================================================================\n');

// ── 1. MASTER SETTINGS INITIAL STATE ─────────────────────────────────────────
console.log('▶ [TEST 1] Master Rate Initial State & Defaulting...');

let masterControlSettings = {
  fdInterestRate: 12,
  fdInterestRateEffectiveFrom: '01-08-2026',
  fdInterestRateHistory: [
    {
      id: 'FD-RATE-001',
      rate: 12,
      previousRate: 10,
      effectiveFrom: '01-08-2026',
      changedBy: 'Master Admin',
      changedAt: '2026-08-01T09:00:00.000Z',
      notes: 'Initial Base Master FD Interest Rate'
    }
  ]
};

assert.strictEqual(masterControlSettings.fdInterestRate, 12);
assert.strictEqual(masterControlSettings.fdInterestRateEffectiveFrom, '01-08-2026');
assert.strictEqual(masterControlSettings.fdInterestRateHistory.length, 1);
console.log('  ✔ Initial Master FD Rate is 12.00% p.a. (Effective 01-08-2026)\n');


// ── 2. CREATE FD-001 (USES CURRENT MASTER RATE 12%) ──────────────────────────
console.log('▶ [TEST 2] Issue FD-001 Snapshotted with 12% Rate...');

const fixedDeposits = [];

const issueFD = (fdNo, customerId, principal, tenureMonths, customRate) => {
  const contractualRate = customRate !== undefined ? customRate : (masterControlSettings.fdInterestRate ?? 12);
  const monthlyPayout = Math.round(((principal * contractualRate) / 100) / 12);
  const newFd = {
    id: `fd-${fdNo.toLowerCase()}`,
    fdNo,
    customerId,
    principal,
    remainingPrincipal: principal,
    tenureMonths,
    interestRatePA: contractualRate,
    monthlyPayout,
    status: 'ACTIVE',
    rateSource: 'MASTER_ADMIN',
    rateEffectiveDate: masterControlSettings.fdInterestRateEffectiveFrom
  };
  fixedDeposits.push(newFd);
  return newFd;
};

const fd1 = issueFD('FD-001', 'CUST-0001', 200000, 12);
assert.strictEqual(fd1.interestRatePA, 12);
assert.strictEqual(fd1.monthlyPayout, 2000);
console.log(`  ✔ FD-001 created with contractual rate: ${fd1.interestRatePA}% p.a. (Monthly Payout: ₹${fd1.monthlyPayout})\n`);


// ── 3. CHANGE MASTER RATE TO 13% & AUDIT TRAIL ──────────────────────────────
console.log('▶ [TEST 3] Master Admin Changes Rate: 12% → 13%...');

const updateFDInterestRate = (newRate, effectiveFrom, notes, isUnlocked) => {
  if (!isUnlocked) {
    throw new Error('Master Control must be unlocked to change FD interest rates.');
  }
  if (isNaN(newRate) || newRate <= 0 || newRate > 36) {
    throw new Error('Invalid interest rate.');
  }

  const currentRate = masterControlSettings.fdInterestRate ?? 12;
  const historyItem = {
    id: `FD-RATE-${Date.now()}`,
    rate: newRate,
    previousRate: currentRate,
    effectiveFrom,
    effectiveTo: null,
    changedBy: 'Master Admin',
    changedAt: new Date().toISOString(),
    notes: notes || 'Rate Revision'
  };

  const existingHistory = masterControlSettings.fdInterestRateHistory || [];
  const updatedHistory = [
    historyItem,
    ...existingHistory.map(h => ({
      ...h,
      effectiveTo: h.effectiveTo || effectiveFrom
    }))
  ];

  masterControlSettings = {
    ...masterControlSettings,
    fdInterestRate: newRate,
    fdInterestRateEffectiveFrom: effectiveFrom,
    fdInterestRateHistory: updatedHistory
  };

  return true;
};

// Attempt unauthorized edit -> Should throw
assert.throws(() => {
  updateFDInterestRate(13, '15-10-2026', 'Unauthorized attempt', false);
}, /Master Control must be unlocked/);

// Authorized edit
updateFDInterestRate(13, '15-10-2026', 'Q4 Rate Adjustment', true);

assert.strictEqual(masterControlSettings.fdInterestRate, 13);
assert.strictEqual(masterControlSettings.fdInterestRateEffectiveFrom, '15-10-2026');
assert.strictEqual(masterControlSettings.fdInterestRateHistory.length, 2);
assert.strictEqual(masterControlSettings.fdInterestRateHistory[0].rate, 13);
assert.strictEqual(masterControlSettings.fdInterestRateHistory[0].previousRate, 12);
console.log('  ✔ Master Rate successfully updated to 13.00% p.a. with audit history\n');


// ── 4. VERIFY EXISTING FD-001 RETAINS 12% (NON-RETROACTIVE) ───────────────────
console.log('▶ [TEST 4] Contractual Rate Preservation on Existing FD-001...');

const inspectFd1 = fixedDeposits.find(f => f.fdNo === 'FD-001');
assert.strictEqual(inspectFd1.interestRatePA, 12);
assert.strictEqual(inspectFd1.monthlyPayout, 2000);
console.log(`  ✔ Existing FD-001 permanently retains 12.00% p.a. (Monthly Payout remains ₹2,000)\n`);


// ── 5. CREATE FD-002 (AUTOMATICALLY ADOPTS 13%) ──────────────────────────────
console.log('▶ [TEST 5] Issue FD-002 (Adopts New Master Rate 13%)...');

const fd2 = issueFD('FD-002', 'CUST-0002', 200000, 12);
assert.strictEqual(fd2.interestRatePA, 13);
// 200000 * 0.13 / 12 = 2166.666... -> 2167
assert.strictEqual(fd2.monthlyPayout, 2167);
console.log(`  ✔ FD-002 created with contractual rate: ${fd2.interestRatePA}% p.a. (Monthly Payout: ₹${fd2.monthlyPayout})\n`);


// ── 6. CHANGE MASTER RATE AGAIN TO 14% & VERIFY MULTI-CONTRACT ISOLATION ─────
console.log('▶ [TEST 6] Change Master Rate to 14% & Verify Multi-Contract Isolation...');

updateFDInterestRate(14, '01-01-2027', 'Annual 2027 Revision', true);
const fd3 = issueFD('FD-003', 'CUST-0003', 200000, 12);

assert.strictEqual(fixedDeposits.find(f => f.fdNo === 'FD-001').interestRatePA, 12);
assert.strictEqual(fixedDeposits.find(f => f.fdNo === 'FD-002').interestRatePA, 13);
assert.strictEqual(fixedDeposits.find(f => f.fdNo === 'FD-003').interestRatePA, 14);

console.log('  ✔ Contract Isolation Verified:');
console.log('    • FD-001 Contract Rate: 12.00% p.a.');
console.log('    • FD-002 Contract Rate: 13.00% p.a.');
console.log('    • FD-003 Contract Rate: 14.00% p.a.\n');


// ── 7. INTEREST PAYOUT CALCULATION USES STORED CONTRACT RATE ─────────────────
console.log('▶ [TEST 7] Interest Payout & Pending Calculation by Contract Rate...');

const calculateFDMonthlyInterest = (fd) => {
  return Math.round(((fd.remainingPrincipal * fd.interestRatePA) / 100) / 12);
};

assert.strictEqual(calculateFDMonthlyInterest(fixedDeposits[0]), 2000); // 12%
assert.strictEqual(calculateFDMonthlyInterest(fixedDeposits[1]), 2167); // 13%
assert.strictEqual(calculateFDMonthlyInterest(fixedDeposits[2]), 2333); // 14%
console.log('  ✔ Monthly interest accurately calculated using individual contract rates\n');


// ── 8. FD RENEWAL EXPLICIT RATE CAPTURE ──────────────────────────────────────
console.log('▶ [TEST 8] FD Renewal Rate Handling...');

const renewFDContract = (fd, renewalPeriodMonths, renewalRateOverride) => {
  const currentMasterRate = masterControlSettings.fdInterestRate ?? 12;
  const renewalRate = renewalRateOverride !== undefined ? renewalRateOverride : currentMasterRate;
  const renewalRecord = {
    id: `FDR-${Date.now()}`,
    fdNo: fd.fdNo,
    customerId: fd.customerId,
    previousRate: fd.interestRatePA,
    renewalRate: renewalRate,
    renewalPeriodMonths,
    renewedAt: new Date().toISOString()
  };
  return renewalRecord;
};

const renewalFd1 = renewFDContract(fixedDeposits[0], 12); // Uses current master rate (14%)
assert.strictEqual(renewalFd1.previousRate, 12);
assert.strictEqual(renewalFd1.renewalRate, 14);
console.log(`  ✔ FD-001 Renewal: Previous Rate 12.00% → Renewal Rate 14.00% explicitly recorded\n`);


// ── 9. BACKUP & RESTORE RATE CONFIGURATION PERSISTENCE ───────────────────────
console.log('▶ [TEST 9] Backup Export & Restore Parity for Rates & History...');

const exportedBackup = {
  version: '2.4.0',
  data: {
    fixedDeposits,
    masterControlSettings
  }
};

const backupString = JSON.stringify(exportedBackup);
const parsedBackup = JSON.parse(backupString);
const restoredMasterSettings = parsedBackup.data.masterControlSettings;
const restoredFDs = parsedBackup.data.fixedDeposits;

assert.strictEqual(restoredMasterSettings.fdInterestRate, 14);
assert.strictEqual(restoredMasterSettings.fdInterestRateHistory.length, 3);
assert.strictEqual(restoredFDs[0].interestRatePA, 12);
assert.strictEqual(restoredFDs[1].interestRatePA, 13);
assert.strictEqual(restoredFDs[2].interestRatePA, 14);
console.log('  ✔ Backup & Restore Parity: PASS\n');

console.log('=================================================================');
console.log('  ALL MASTER ADMIN FD INTEREST RATE CONTROL TESTS PASSED (100%)  ');
console.log('=================================================================');
