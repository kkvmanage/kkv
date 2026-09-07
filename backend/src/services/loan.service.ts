import Decimal from 'decimal.js';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { googleDriveService } from './googleDriveService.js';
import { syncQueueService } from './syncQueue.service.js';
import { Loan, Receipt, LoanTypeConfig } from '../types/index.js';
import { customerService } from './customer.service.js';
import { receiptService } from './receipt.service.js';
import { accountingService } from './accounting.service.js';
import { adminService } from './admin.service.js';

const FILE_NAME = 'loans.json';

const initialLoans: Loan[] = [];

export class LoanService {
  public getAll(): Loan[] {
    let list = googleDriveRepository.readJson<Loan[]>(FILE_NAME, initialLoans);
    if (!Array.isArray(list)) {
      list = [];
    }
    return list;
  }

  public getById(id: string): Loan | null {
    const loans = this.getAll();
    return loans.find((l) => l.id === id || l.loanNo.toLowerCase() === id.toLowerCase()) || null;
  }

  public getByLoanNo(loanNo: string): Loan | null {
    const loans = this.getAll();
    return loans.find((l) => l.loanNo.toLowerCase() === loanNo.toLowerCase()) || null;
  }

  public calculateFinancials(principal: number, interestRatePercent: number, items: any[], marketRatePerGram: number = 6000) {
    const decPrincipal = new Decimal(principal || 0);
    const decRate = new Decimal(interestRatePercent || 0);

    // Monthly interest = (Principal * InterestRatePercent) / 100
    const monthlyInterest = decPrincipal.times(decRate).dividedBy(100).toDecimalPlaces(2).toNumber();

    let totalGross = new Decimal(0);
    let totalNet = new Decimal(0);

    items.forEach((it) => {
      totalGross = totalGross.plus(new Decimal(it.grossWeight || 0));
      totalNet = totalNet.plus(new Decimal(it.netWeight || 0));
    });

    const marketValue = totalNet.times(marketRatePerGram).toDecimalPlaces(2).toNumber();
    const ltv = marketValue > 0 ? decPrincipal.times(100).dividedBy(marketValue).toDecimalPlaces(2).toNumber() : 0;

    return {
      monthlyInterest,
      totalGrossWeight: totalGross.toNumber(),
      totalNetWeight: totalNet.toNumber(),
      marketValue,
      ltv
    };
  }

  public async create(loanData: Omit<Loan, 'id' | 'loanNo'> & { loanNo?: string }): Promise<Loan> {
    const loans = this.getAll();
    let maxNum = 0;
    for (const l of loans) {
      const match = (l.loanNo || '').match(/\d+/);
      if (match) {
        const n = parseInt(match[0], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const loanNo = loanData.loanNo || `GL-${(maxNum + 1).toString().padStart(2, '0')}`;
    const id = `L-${Date.now()}`;
    let driveFolderId: string | undefined;

    try {
      const folders = await googleDriveService.ensureLoanFolders(id);
      driveFolderId = folders.loanFolderId;
    } catch (e) {
      console.warn('[LoanService] Drive folder setup warning:', e);
    }

    const effectivePrincipal = Number(loanData.principal ?? (loanData as any).principalAmount ?? (loanData as any).loanAmount ?? 0);

    // ── MASTER CONTROL RESOLUTION (SINGLE SOURCE OF TRUTH) ────────────────────
    const masterSettings = adminService.getMasterSettings();
    const loanTypes: LoanTypeConfig[] = masterSettings.loanTypes || [];

    const reqTypeId = (loanData.loanTypeId || loanData.loanType || '').toLowerCase().trim();
    if (!reqTypeId) {
      throw new Error('Loan Type is required.');
    }

    const matchedType = loanTypes.find(
      (t) => t.id.toLowerCase() === reqTypeId || t.name.toLowerCase() === reqTypeId
    );

    if (!matchedType) {
      throw new Error(`Loan type "${loanData.loanTypeId || loanData.loanType}" was not found in Master Control configuration.`);
    }

    if (!matchedType.active) {
      throw new Error(`Loan type "${matchedType.name}" is currently disabled in Master Control.`);
    }

    if (matchedType.showOnLoanIssue === false) {
      throw new Error(`Loan type "${matchedType.name}" is not enabled for new loan issuance in Master Control.`);
    }

    // Enforce server-authoritative Card Fee
    const serverCardFee = matchedType.cardFee !== undefined
      ? matchedType.cardFee
      : (masterSettings.defaultCardFee || 25);
    const serverCardFeeEnabled = matchedType.cardFeeEnabled !== undefined
      ? Boolean(matchedType.cardFeeEnabled)
      : true;
    const configVersion = matchedType.configurationVersion || 1;

    // Server-authoritative Interest Rate resolution per product configuration
    let interestRate = matchedType.defaultMonthlyRate !== undefined ? matchedType.defaultMonthlyRate : 2.0;
    let interestProfileName = 'Gold Amount Bands';
    let amountBandId: string | undefined;

    if (matchedType.interestProfileId === 'pronote-interest') {
      interestProfileName = 'Pronote Interest';
      interestRate = matchedType.defaultMonthlyRate !== undefined ? matchedType.defaultMonthlyRate : 4.0;
    } else if (matchedType.interestProfileId === 'fixed-rate') {
      interestProfileName = `Fixed Rate (${interestRate}%/mo)`;
      interestRate = matchedType.defaultMonthlyRate !== undefined ? matchedType.defaultMonthlyRate : 1.5;
    } else if (matchedType.interestProfileId === 'silver-bands') {
      interestProfileName = 'Silver Amount Bands';
      interestRate = matchedType.defaultMonthlyRate !== undefined ? matchedType.defaultMonthlyRate : 3.0;
    } else if (matchedType.interestProfileId === 'gold-bands') {
      interestProfileName = 'Gold Amount Bands';
      interestRate = matchedType.defaultMonthlyRate !== undefined ? matchedType.defaultMonthlyRate : 2.0;
    } else if (typeof matchedType.defaultMonthlyRate === 'number' && matchedType.defaultMonthlyRate > 0) {
      interestRate = matchedType.defaultMonthlyRate;
      interestProfileName = matchedType.name;
    }

    const calc = this.calculateFinancials(effectivePrincipal, interestRate, loanData.items || []);

    const effectiveCardFee = serverCardFeeEnabled ? serverCardFee : 0;
    const advanceInterest = loanData.deductAdvanceInterest
      ? (loanData.advanceInterestAmount || 0)
      : 0;
    const netDisbursed = new Decimal(effectivePrincipal).minus(advanceInterest).minus(effectiveCardFee).toNumber();

    const newLoan: Loan = {
      ...loanData,
      principal: effectivePrincipal,
      id,
      loanNo,
      loanType: matchedType ? matchedType.name : loanData.loanType,
      loanTypeId: matchedType ? matchedType.id : (loanData.loanTypeId || 'gold-loan'),
      loanTypeName: matchedType ? matchedType.name : (loanData.loanTypeName || loanData.loanType),

      // ── IMMUTABLE CONTRACTUAL SNAPSHOT FIELDS ──────────────────────────────
      loanTypeNameSnapshot: matchedType ? matchedType.name : loanData.loanType,
      interestRateSnapshot: interestRate,
      interestProfileSnapshot: interestProfileName,
      cardFeeSnapshot: serverCardFee,
      interestProfileIdSnapshot: matchedType?.interestProfileId || 'gold-bands',
      interestProfileNameSnapshot: interestProfileName,
      interestConfigurationSnapshot: {
        interestRate,
        interestRateUnit: 'MONTHLY',
        rateSource: 'MASTER_CONTROL',
        amountBandId
      },
      configurationVersion: configVersion,
      configurationSource: matchedType.useMasterDefaults !== false ? 'MASTER_INHERITED' : 'CUSTOM_OVERRIDE',
      rateEffectiveAt: loanData.date || new Date().toISOString(),

      interestRate,
      cardFee: serverCardFee,
      cardFeeEnabled: serverCardFeeEnabled,
      monthlyInterest: calc.monthlyInterest,
      totalGrossWeight: calc.totalGrossWeight,
      totalNetWeight: calc.totalNetWeight,
      marketValue: calc.marketValue,
      ltv: calc.ltv,
      disbursedAmount: netDisbursed,
      netDisbursed,
      outstandingPrincipal: effectivePrincipal,
      accruedInterest: calc.monthlyInterest,
      status: 'ACTIVE',
      date: loanData.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      lastInterestPaidDate: loanData.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
      driveFolderId,
      documentDriveIds: [],
      receiptDriveIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    loans.unshift(newLoan);
    googleDriveRepository.writeJson(FILE_NAME, loans);

    // Enqueue background sync event
    syncQueueService.enqueue('loan', newLoan.loanNo, 'CREATE', newLoan);

    // Update customer active loans count
    const customer = customerService.getById(newLoan.customerId);
    if (customer) {
      customerService.update(customer.id, {
        activeLoansCount: (customer.activeLoansCount || 0) + 1,
        totalBorrowed: new Decimal(customer.totalBorrowed || 0).plus(effectivePrincipal).toNumber()
      });
    }

    // Create New Loan Receipt
    try {
      receiptService.create({
        receiptNo: 0,
        loanId: newLoan.id,
        loanNo: newLoan.loanNo,
        customerId: newLoan.customerId,
        customerName: newLoan.customerName,
        kind: 'NEW LOAN',
        loanType: newLoan.loanType,
        amount: effectivePrincipal,
        principalComponent: effectivePrincipal,
        interestComponent: 0,
        paymentMode: newLoan.bankMode === 'Cash' ? 'Cash' : 'UPI',
        date: newLoan.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
        notes: 'New Loan Disbursement'
      });
    } catch (e) {
      console.warn('[LoanService] Receipt creation note:', e);
    }

    // Create DayBook Entry
    try {
      const isCash = newLoan.bankMode === 'Cash';
      const isSplit = newLoan.bankMode === 'Split';
      const cashDisbursed = isCash ? effectivePrincipal : isSplit ? (newLoan.cashAmount || 0) : 0;
      const bankDisbursed = isCash ? 0 : isSplit ? (newLoan.bankAmount || 0) : effectivePrincipal;

      accountingService.addEntry({
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        billNo: loanNo,
        particulars: `Loan Disbursement (${loanNo}) - ${newLoan.customerName}`,
        accountHead: 'Gold Loan Portfolio',
        mode: isCash ? 'Cash' : newLoan.bankMode === 'UPI' ? 'UPI' : 'Bank',
        cashIn: 0,
        cashOut: cashDisbursed,
        bankIn: 0,
        bankOut: bankDisbursed,
        customerName: newLoan.customerName,
        loanNo,
        date: newLoan.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
      });
    } catch (e) {
      console.warn('[LoanService] Accounting entry note:', e);
    }

    return newLoan;
  }

  public closeLoan(loanNo: string): Loan | null {
    const loans = this.getAll();
    const index = loans.findIndex((l) => l.loanNo.toLowerCase() === loanNo.toLowerCase());
    if (index === -1) return null;

    loans[index].outstandingPrincipal = 0;
    loans[index].status = 'CLOSED';

    googleDriveRepository.writeJson(FILE_NAME, loans);
    syncQueueService.enqueue('loan', loans[index].loanNo, 'UPDATE', loans[index]);
    return loans[index];
  }

  public update(id: string, updates: Partial<Loan>): Loan | null {
    const loans = this.getAll();
    const index = loans.findIndex((l) => l.id === id || l.loanNo.toLowerCase() === id.toLowerCase());
    if (index === -1) return null;
    loans[index] = { ...loans[index], ...updates };
    googleDriveRepository.writeJson(FILE_NAME, loans);
    syncQueueService.enqueue('loan', loans[index].loanNo, 'UPDATE', loans[index]);
    return loans[index];
  }

  public delete(id: string): boolean {
    const loans = this.getAll();
    const filtered = loans.filter((l) => l.id !== id && l.loanNo.toLowerCase() !== id.toLowerCase());
    if (filtered.length === loans.length) return false;
    googleDriveRepository.writeJson(FILE_NAME, filtered);
    syncQueueService.enqueue('loan', id, 'DELETE', { id, isDeleted: true });
    return true;
  }
}

export const loanService = new LoanService();
