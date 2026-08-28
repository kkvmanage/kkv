import Decimal from 'decimal.js';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { DayBookEntry } from '../types/index.js';

const FILE_NAME = 'daybook_entries.json';

const initialDayBook: DayBookEntry[] = [
  {
    id: 'db-1',
    time: '10:14 AM',
    billNo: '1',
    particulars: 'New Loan Disbursement (GL-01) - thayba',
    accountHead: 'Gold Loan Portfolio',
    mode: 'UPI',
    cashIn: 0,
    cashOut: 0,
    bankIn: 0,
    bankOut: 100000,
    cashBal: 50000,
    bankBal: -100000,
    tdsAmount: 0,
    customerName: 'thayba',
    loanNo: 'GL-01',
    date: '25/08/2026'
  },
  {
    id: 'db-2',
    time: '11:30 AM',
    billNo: '2',
    particulars: 'Repayment Collection - thayba',
    accountHead: 'Cash Collections',
    mode: 'Cash',
    cashIn: 1500,
    cashOut: 0,
    bankIn: 0,
    bankOut: 0,
    cashBal: 51500,
    bankBal: -100000,
    tdsAmount: 0,
    customerName: 'thayba',
    loanNo: 'GL-01',
    date: '25/08/2026'
  },
  {
    id: 'db-3',
    time: '12:45 PM',
    billNo: 'FD-01',
    particulars: 'Fixed Deposit Receipt - Thayba Begum',
    accountHead: 'Fixed Deposits',
    mode: 'Cash',
    cashIn: 200000,
    cashOut: 0,
    bankIn: 0,
    bankOut: 0,
    cashBal: 251500,
    bankBal: -100000,
    tdsAmount: 0,
    customerName: 'Thayba Begum',
    date: '25/08/2026'
  }
];

export class AccountingService {
  public getDayBook(): DayBookEntry[] {
    return googleDriveRepository.readJson<DayBookEntry[]>(FILE_NAME, initialDayBook);
  }

  public getBalances(): { cashInHand: number; cashAtBank: number } {
    const entries = this.getDayBook();
    let cashInHand = new Decimal(385000); // Base initial float
    let cashAtBank = new Decimal(1240000); // Base initial bank float

    entries.forEach((e) => {
      cashInHand = cashInHand.plus(new Decimal(e.cashIn || 0)).minus(new Decimal(e.cashOut || 0));
      cashAtBank = cashAtBank.plus(new Decimal(e.bankIn || 0)).minus(new Decimal(e.bankOut || 0));
    });

    return {
      cashInHand: cashInHand.toNumber(),
      cashAtBank: cashAtBank.toNumber()
    };
  }

  public addEntry(entryData: Omit<DayBookEntry, 'id' | 'cashBal' | 'bankBal'>): DayBookEntry {
    const entries = this.getDayBook();
    const currentBal = this.getBalances();

    const cashIn = new Decimal(entryData.cashIn || 0);
    const cashOut = new Decimal(entryData.cashOut || 0);
    const bankIn = new Decimal(entryData.bankIn || 0);
    const bankOut = new Decimal(entryData.bankOut || 0);

    const newCashBal = new Decimal(currentBal.cashInHand).plus(cashIn).minus(cashOut).toNumber();
    const newBankBal = new Decimal(currentBal.cashAtBank).plus(bankIn).minus(bankOut).toNumber();

    const newEntry: DayBookEntry = {
      ...entryData,
      id: `db-${Date.now()}`,
      time: entryData.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      cashIn: cashIn.toNumber(),
      cashOut: cashOut.toNumber(),
      bankIn: bankIn.toNumber(),
      bankOut: bankOut.toNumber(),
      cashBal: newCashBal,
      bankBal: newBankBal,
      date: entryData.date || new Date().toLocaleDateString('en-GB')
    };

    entries.unshift(newEntry);
    googleDriveRepository.writeJson(FILE_NAME, entries);
    return newEntry;
  }

  public getTrialBalance(): any[] {
    const balances = this.getBalances();
    return [
      { accountHead: 'Cash in Hand', debit: Math.max(0, balances.cashInHand), credit: Math.max(0, -balances.cashInHand) },
      { accountHead: 'Cash at Bank', debit: Math.max(0, balances.cashAtBank), credit: Math.max(0, -balances.cashAtBank) },
      { accountHead: 'Gold Loan Portfolio', debit: 100000, credit: 0 },
      { accountHead: 'Fixed Deposits Liability', debit: 0, credit: 200000 },
      { accountHead: 'Capital Account', debit: 0, credit: 1625000 },
      { accountHead: 'Interest Income', debit: 0, credit: 1500 }
    ];
  }

  public getProfitAndLoss(): any {
    return {
      revenue: [
        { head: 'Interest Income on Gold Loans', amount: 1500 }
      ],
      expenses: [
        { head: 'FD Interest Expenses', amount: 0 },
        { head: 'Operational Expenses', amount: 0 }
      ],
      netProfit: 1500
    };
  }

  public getBalanceSheet(): any {
    const balances = this.getBalances();
    return {
      assets: [
        { head: 'Cash in Hand', amount: balances.cashInHand },
        { head: 'Cash at Bank', amount: balances.cashAtBank },
        { head: 'Gold Loan Principal Portfolio', amount: 100000 }
      ],
      liabilities: [
        { head: 'Fixed Deposit Liabilities', amount: 200000 },
        { head: 'Capital Account', amount: 1625000 },
        { head: 'Current Period Retained Earnings', amount: 1500 }
      ]
    };
  }
}

export const accountingService = new AccountingService();
