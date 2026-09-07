import Decimal from 'decimal.js';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { syncQueueService } from './syncQueue.service.js';
import { DayBookEntry, Loan, FixedDeposit } from '../types/index.js';

const FILE_NAME = 'daybook_entries.json';

const initialDayBook: DayBookEntry[] = [];

export class AccountingService {
  public getDayBook(): DayBookEntry[] {
    const list = googleDriveRepository.readJson<DayBookEntry[]>(FILE_NAME, initialDayBook);
    return Array.isArray(list) ? list : [];
  }

  public getBalances(): { cashInHand: number; cashAtBank: number } {
    const entries = this.getDayBook();
    let cashInHand = new Decimal(0);
    let cashAtBank = new Decimal(0);

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
    syncQueueService.enqueue('daybook', newEntry.id, 'CREATE', newEntry);
    return newEntry;
  }

  public getTrialBalance(): any[] {
    const balances = this.getBalances();
    const loans = googleDriveRepository.readJson<Loan[]>('loans.json', []);
    const fds = googleDriveRepository.readJson<FixedDeposit[]>('fixed_deposits.json', []);
    const entries = this.getDayBook();

    const goldLoanPortfolio = loans
      .filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE')
      .reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);

    const fdLiability = fds
      .filter((f) => f.status === 'ACTIVE')
      .reduce((sum, f) => sum + (f.principal || 0), 0);

    const interestIncome = entries
      .filter((e) => e.accountHead === 'Interest Income' || e.accountHead === 'Cash Collections')
      .reduce((sum, e) => sum + (e.cashIn || 0) + (e.bankIn || 0), 0);

    const totalDebits = Math.max(0, balances.cashInHand) + Math.max(0, balances.cashAtBank) + goldLoanPortfolio;
    const totalCredits = Math.max(0, -balances.cashInHand) + Math.max(0, -balances.cashAtBank) + fdLiability + interestIncome;
    const capitalAccount = Math.max(0, totalDebits - totalCredits);

    return [
      { accountHead: 'Cash in Hand', debit: Math.max(0, balances.cashInHand), credit: Math.max(0, -balances.cashInHand) },
      { accountHead: 'Cash at Bank', debit: Math.max(0, balances.cashAtBank), credit: Math.max(0, -balances.cashAtBank) },
      { accountHead: 'Gold Loan Portfolio', debit: goldLoanPortfolio, credit: 0 },
      { accountHead: 'Fixed Deposits Liability', debit: 0, credit: fdLiability },
      { accountHead: 'Capital Account', debit: 0, credit: capitalAccount },
      { accountHead: 'Interest Income', debit: 0, credit: interestIncome }
    ];
  }

  public getProfitAndLoss(): any {
    const entries = this.getDayBook();
    const interestIncome = entries
      .filter((e) => e.accountHead === 'Interest Income' || e.accountHead === 'Cash Collections')
      .reduce((sum, e) => sum + (e.cashIn || 0) + (e.bankIn || 0), 0);

    const fdExpenses = entries
      .filter((e) => e.accountHead === 'Interest Expense' || e.accountHead === 'FD Interest Expense')
      .reduce((sum, e) => sum + (e.cashOut || 0) + (e.bankOut || 0), 0);

    const opExpenses = entries
      .filter((e) => e.accountHead === 'Operational Expenses' || e.accountHead === 'Office Expenses')
      .reduce((sum, e) => sum + (e.cashOut || 0) + (e.bankOut || 0), 0);

    const totalExpenses = fdExpenses + opExpenses;
    const netProfit = interestIncome - totalExpenses;

    return {
      revenue: [
        { head: 'Interest Income on Gold Loans', amount: interestIncome }
      ],
      expenses: [
        { head: 'FD Interest Expenses', amount: fdExpenses },
        { head: 'Operational Expenses', amount: opExpenses }
      ],
      netProfit
    };
  }

  public getBalanceSheet(): any {
    const balances = this.getBalances();
    const loans = googleDriveRepository.readJson<Loan[]>('loans.json', []);
    const fds = googleDriveRepository.readJson<FixedDeposit[]>('fixed_deposits.json', []);
    const pnl = this.getProfitAndLoss();

    const goldLoanPortfolio = loans
      .filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE')
      .reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);

    const fdLiability = fds
      .filter((f) => f.status === 'ACTIVE')
      .reduce((sum, f) => sum + (f.principal || 0), 0);

    const totalAssets = balances.cashInHand + balances.cashAtBank + goldLoanPortfolio;
    const knownLiabilities = fdLiability + (pnl.netProfit || 0);
    const capitalAccount = Math.max(0, totalAssets - knownLiabilities);

    return {
      assets: [
        { head: 'Cash in Hand', amount: balances.cashInHand },
        { head: 'Cash at Bank', amount: balances.cashAtBank },
        { head: 'Gold Loan Principal Portfolio', amount: goldLoanPortfolio }
      ],
      liabilities: [
        { head: 'Fixed Deposit Liabilities', amount: fdLiability },
        { head: 'Capital Account', amount: capitalAccount },
        { head: 'Current Period Retained Earnings', amount: pnl.netProfit || 0 }
      ]
    };
  }
}

export const accountingService = new AccountingService();
