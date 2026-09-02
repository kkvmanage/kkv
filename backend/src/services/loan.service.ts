import Decimal from 'decimal.js';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { googleDriveService } from './googleDriveService.js';
import { Loan, Receipt, DayBookEntry } from '../types/index.js';
import { customerService } from './customer.service.js';
import { receiptService } from './receipt.service.js';
import { accountingService } from './accounting.service.js';
import { adminService } from './admin.service.js';

const FILE_NAME = 'loans.json';

const initialLoans: Loan[] = [
  {
    id: 'L-1',
    receiptBillNo: 1,
    loanNo: 'GL-01',
    customerId: 'CUST-001',
    customerName: 'thayba',
    customerPhone: '9876543210',
    customerGender: 'Female',
    customerAge: 28,
    customerOccupation: 'Business',
    customerEmail: 'thayba@example.com',
    customerCurrentAddress: '123 Market Street, Main Town',
    customerPermanentAddress: '123 Market Street, Main Town',
    date: '25/08/2026',
    loanType: 'GOLD LOAN',
    repaymentSystem: 'Monthly interest only',
    area: 'Main Town',
    showroom: 'Main Branch',
    principal: 100000,
    interestRate: 1.5,
    bankMode: 'UPI',
    cashAmount: 0,
    bankAmount: 100000,
    deductAdvanceInterest: false,
    advanceDays: 30,
    advanceInterestAmount: 1500,
    cardFee: 10,
    cardFeePaymentMode: 'Cash',
    items: [
      {
        id: 'item-1',
        item: 'Gold Chain & Bangle',
        qty: 2,
        purity: '22ct',
        grossWeight: 25.5,
        netWeight: 24.0
      }
    ],
    totalGrossWeight: 25.5,
    totalNetWeight: 24.0,
    marketValue: 144000,
    ltv: 69.4,
    monthlyInterest: 1500,
    notes: 'Sample Gold Loan',
    photos: [],
    status: 'ACTIVE',
    disbursedAmount: 100000,
    outstandingPrincipal: 100000,
    accruedInterest: 1500,
    renewalDate: '25/08/2027',
    lastInterestPaidDate: '25/08/2026',
    nextDueDate: '25/09/2026'
  }
];

export class LoanService {
  public getAll(): Loan[] {
    return googleDriveRepository.readJson<Loan[]>(FILE_NAME, initialLoans);
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

  public getApplicableInterestRate(principal: number): number {
    const masterSettings = adminService.getMasterSettings();
    const bands = masterSettings?.amountBands || [];
    if (bands.length > 0 && principal > 0) {
      const sorted = [...bands].sort((a, b) => a.amount - b.amount);
      for (const b of sorted) {
        if (b.condition === 'Below' && principal <= b.amount) {
          return b.baseRateMonthly;
        }
        if (b.condition === 'Above' && principal > b.amount) {
          return b.baseRateMonthly;
        }
      }
      const match = sorted.find((b) => principal <= b.amount) || sorted[sorted.length - 1];
      if (match) return match.baseRateMonthly;
    }
    return masterSettings?.goldLoanMonthlyRate || 1.5;
  }

  public async create(loanData: Omit<Loan, 'id' | 'loanNo'>): Promise<Loan> {
    const loans = this.getAll();
    const nextNumber = loans.length + 1;
    const loanNo = `GL-${nextNumber.toString().padStart(2, '0')}`;
    const id = `L-${Date.now()}`;
    let driveFolderId: string | undefined;

    try {
      const folders = await googleDriveService.ensureLoanFolders(id);
      driveFolderId = folders.loanFolderId;
    } catch (e) {
      console.warn('[LoanService] Drive folder setup warning:', e);
    }

    // Automatically determine & enforce rate from Master Control settings
    const interestRate = this.getApplicableInterestRate(loanData.principal);
    const calc = this.calculateFinancials(loanData.principal, interestRate, loanData.items || []);

    const newLoan: Loan = {
      ...loanData,
      id,
      loanNo,
      interestRate,
      monthlyInterest: calc.monthlyInterest,
      totalGrossWeight: calc.totalGrossWeight,
      totalNetWeight: calc.totalNetWeight,
      marketValue: calc.marketValue,
      ltv: calc.ltv,
      disbursedAmount: loanData.principal,
      outstandingPrincipal: loanData.principal,
      accruedInterest: calc.monthlyInterest,
      status: 'ACTIVE',
      lastInterestPaidDate: loanData.date,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
      driveFolderId,
      documentDriveIds: [],
      receiptDriveIds: []
    };

    loans.unshift(newLoan);
    googleDriveRepository.writeJson(FILE_NAME, loans);

    // Update customer active loans count
    const customer = customerService.getById(newLoan.customerId);
    if (customer) {
      customerService.update(customer.id, {
        activeLoansCount: customer.activeLoansCount + 1,
        totalBorrowed: new Decimal(customer.totalBorrowed).plus(newLoan.principal).toNumber()
      });
    }

    // Create New Loan Receipt
    receiptService.create({
      receiptNo: 0,
      loanId: newLoan.id,
      loanNo: newLoan.loanNo,
      customerId: newLoan.customerId,
      customerName: newLoan.customerName,
      kind: 'NEW LOAN',
      loanType: newLoan.loanType,
      amount: newLoan.principal,
      principalComponent: newLoan.principal,
      interestComponent: 0,
      paymentMode: newLoan.bankMode === 'Cash' ? 'Cash' : 'UPI',
      date: newLoan.date,
      notes: 'New Loan Disbursement'
    });

    // Create DayBook Entry
    const isCash = newLoan.bankMode === 'Cash';
    const isSplit = newLoan.bankMode === 'Split';
    const cashDisbursed = isCash ? newLoan.principal : isSplit ? newLoan.cashAmount : 0;
    const bankDisbursed = isCash ? 0 : isSplit ? newLoan.bankAmount : newLoan.principal;

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
      date: newLoan.date
    });

    return newLoan;
  }

  public closeLoan(loanNo: string): Loan | null {
    const loans = this.getAll();
    const index = loans.findIndex((l) => l.loanNo.toLowerCase() === loanNo.toLowerCase());
    if (index === -1) return null;

    loans[index].outstandingPrincipal = 0;
    loans[index].status = 'CLOSED';

    googleDriveRepository.writeJson(FILE_NAME, loans);
    return loans[index];
  }

  public update(id: string, updates: Partial<Loan>): Loan | null {
    const loans = this.getAll();
    const index = loans.findIndex((l) => l.id === id || l.loanNo.toLowerCase() === id.toLowerCase());
    if (index === -1) return null;
    loans[index] = { ...loans[index], ...updates };
    googleDriveRepository.writeJson(FILE_NAME, loans);
    return loans[index];
  }

  public delete(id: string): boolean {
    const loans = this.getAll();
    const filtered = loans.filter((l) => l.id !== id && l.loanNo.toLowerCase() !== id.toLowerCase());
    if (filtered.length === loans.length) return false;
    googleDriveRepository.writeJson(FILE_NAME, filtered);
    return true;
  }
}

export const loanService = new LoanService();

