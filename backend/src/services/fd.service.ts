import Decimal from 'decimal.js';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { FixedDeposit, FDCustomer, FDInterestPayout, FDWithdrawal, DayBookEntry } from '../types/index.js';
import { accountingService } from './accounting.service.js';

const FD_CUST_FILE = 'fd_customers.json';
const FD_DEPOSITS_FILE = 'fixed_deposits.json';
const FD_PAYOUTS_FILE = 'fd_interest_payouts.json';
const FD_WITHDRAWALS_FILE = 'fd_withdrawals.json';

const initialFDCustomers: FDCustomer[] = [
  {
    id: 'fd-c1',
    name: 'Thayba Begum',
    phone: '9123456789',
    email: 'thaybabegum@example.com',
    idProofType: 'PAN Card',
    address: '45 Lake View Road',
    createdAt: '25/08/2026'
  }
];

const initialDeposits: FixedDeposit[] = [
  {
    id: 'FD-1',
    fdNo: 'FD-01',
    customerId: 'fd-c1',
    depositorName: 'Thayba Begum',
    phone: '9123456789',
    idProofType: 'PAN Card',
    idProofNumber: 'ABCDE1234F',
    address: '45 Lake View Road',
    depositDate: '25/08/2026',
    maturityDate: '25/08/2027',
    principal: 200000,
    interestRatePA: 12,
    receivingMethod: 'Cash',
    monthlyPayout: 2000,
    status: 'ACTIVE'
  }
];

export class FDService {
  public getCustomers(): FDCustomer[] {
    return googleDriveRepository.readJson<FDCustomer[]>(FD_CUST_FILE, initialFDCustomers);
  }

  public createCustomer(data: Omit<FDCustomer, 'id' | 'createdAt'>): FDCustomer {
    const customers = this.getCustomers();
    const newCust: FDCustomer = {
      ...data,
      id: `fdc-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('en-GB')
    };
    customers.unshift(newCust);
    googleDriveRepository.writeJson(FD_CUST_FILE, customers);
    return newCust;
  }

  public getDeposits(): FixedDeposit[] {
    return googleDriveRepository.readJson<FixedDeposit[]>(FD_DEPOSITS_FILE, initialDeposits);
  }

  public createDeposit(data: Omit<FixedDeposit, 'id' | 'fdNo'>): FixedDeposit {
    const deposits = this.getDeposits();
    const nextNo = deposits.length + 1;
    const fdNo = `FD-${nextNo.toString().padStart(2, '0')}`;

    const principal = new Decimal(data.principal || 0);
    const ratePA = new Decimal(data.interestRatePA || 0);
    // Monthly payout = (Principal * RatePA) / (12 * 100)
    const monthlyPayout = principal.times(ratePA).dividedBy(1200).toDecimalPlaces(2).toNumber();

    const newFD: FixedDeposit = {
      ...data,
      id: `FD-${Date.now()}`,
      fdNo,
      monthlyPayout
    };

    deposits.unshift(newFD);
    googleDriveRepository.writeJson(FD_DEPOSITS_FILE, deposits);

    // Create DayBook Entry
    const isCash = data.receivingMethod === 'Cash';
    const isBank = data.receivingMethod === 'Bank' || data.receivingMethod === 'UPI';

    accountingService.addEntry({
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      billNo: fdNo,
      particulars: `Fixed Deposit Inflow (${fdNo}) - ${data.depositorName}`,
      accountHead: 'Fixed Deposits',
      mode: data.receivingMethod,
      cashIn: isCash ? data.principal : 0,
      cashOut: 0,
      bankIn: isBank ? data.principal : 0,
      bankOut: 0,
      customerName: data.depositorName,
      date: data.depositDate
    });

    return newFD;
  }

  public getPayouts(): FDInterestPayout[] {
    return googleDriveRepository.readJson<FDInterestPayout[]>(FD_PAYOUTS_FILE, []);
  }

  public payInterest(fdNo: string, amount: number, mode: 'Cash' | 'Bank' | 'UPI'): FDInterestPayout | null {
    const deposits = this.getDeposits();
    const targetFD = deposits.find((f) => f.fdNo === fdNo);
    if (!targetFD) return null;

    const payout: FDInterestPayout = {
      id: `fd-payout-${Date.now()}`,
      fdNo,
      depositorName: targetFD.depositorName,
      amount,
      date: new Date().toLocaleDateString('en-GB'),
      mode,
      status: 'PAID'
    };

    const payouts = this.getPayouts();
    payouts.unshift(payout);
    googleDriveRepository.writeJson(FD_PAYOUTS_FILE, payouts);

    // Accounting Entry
    const isCash = mode === 'Cash';
    accountingService.addEntry({
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      billNo: `INT-${fdNo}`,
      particulars: `FD Interest Payout (${fdNo}) - ${targetFD.depositorName}`,
      accountHead: 'Interest Expense',
      mode,
      cashIn: 0,
      cashOut: isCash ? amount : 0,
      bankIn: 0,
      bankOut: isCash ? 0 : amount,
      customerName: targetFD.depositorName,
      date: payout.date
    });

    return payout;
  }

  public getWithdrawals(): FDWithdrawal[] {
    return googleDriveRepository.readJson<FDWithdrawal[]>(FD_WITHDRAWALS_FILE, []);
  }

  public withdraw(fdNo: string, mode: 'Cash' | 'Bank' | 'UPI', notes?: string): FDWithdrawal | null {
    const deposits = this.getDeposits();
    const index = deposits.findIndex((f) => f.fdNo === fdNo);
    if (index === -1) return null;

    const targetFD = deposits[index];
    deposits[index].status = 'WITHDRAWN';
    googleDriveRepository.writeJson(FD_DEPOSITS_FILE, deposits);

    const withdrawal: FDWithdrawal = {
      id: `fd-wth-${Date.now()}`,
      fdNo,
      depositorName: targetFD.depositorName,
      principalAmount: targetFD.principal,
      interestPaid: 0,
      totalAmount: targetFD.principal,
      withdrawalDate: new Date().toLocaleDateString('en-GB'),
      mode,
      notes
    };

    const withdrawals = this.getWithdrawals();
    withdrawals.unshift(withdrawal);
    googleDriveRepository.writeJson(FD_WITHDRAWALS_FILE, withdrawals);

    // Accounting Entry
    const isCash = mode === 'Cash';
    accountingService.addEntry({
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      billNo: `WTH-${fdNo}`,
      particulars: `Fixed Deposit Withdrawal (${fdNo}) - ${targetFD.depositorName}`,
      accountHead: 'Fixed Deposits',
      mode,
      cashIn: 0,
      cashOut: isCash ? targetFD.principal : 0,
      bankIn: 0,
      bankOut: isCash ? 0 : targetFD.principal,
      customerName: targetFD.depositorName,
      date: withdrawal.withdrawalDate
    });

    return withdrawal;
  }

  public bulkUpdateDates(fdNos: string[], newDepositDate?: string, offsetDays?: number): FixedDeposit[] {
    const deposits = this.getDeposits();
    const daybookEntries = googleDriveRepository.readJson<DayBookEntry[]>('daybook_entries.json', []);
    const updatedDeposits: FixedDeposit[] = [];

    const parseDMY = (s: string): Date => {
      const [d, m, y] = s.split('/').map(Number);
      return new Date(y, m - 1, d);
    };

    const formatDMY = (d: Date): string => {
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    for (const fd of deposits) {
      if (fdNos.includes(fd.fdNo)) {
        let oldDepDate = parseDMY(fd.depositDate);
        let newDepDate = oldDepDate;
        let oldMatDate = parseDMY(fd.maturityDate);
        let newMatDate = oldMatDate;

        if (newDepositDate) {
          // If specifying a new deposit date directly (should be in DD/MM/YYYY)
          newDepDate = parseDMY(newDepositDate);
          // Calculate difference in days to apply the same offset to maturity date
          const diffTime = newDepDate.getTime() - oldDepDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          newMatDate = new Date(oldMatDate.getTime() + diffDays * 24 * 60 * 60 * 1000);
        } else if (offsetDays !== undefined) {
          // If shifting by days offset
          newDepDate = new Date(oldDepDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
          newMatDate = new Date(oldMatDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
        }

        fd.depositDate = formatDMY(newDepDate);
        fd.maturityDate = formatDMY(newMatDate);
        updatedDeposits.push(fd);

        // Update corresponding daybook entry dates too!
        for (const entry of daybookEntries) {
          if (entry.billNo === fd.fdNo) {
            entry.date = fd.depositDate;
          }
        }
      }
    }

    googleDriveRepository.writeJson(FD_DEPOSITS_FILE, deposits);
    googleDriveRepository.writeJson('daybook_entries.json', daybookEntries);

    return updatedDeposits;
  }
}

export const fdService = new FDService();
