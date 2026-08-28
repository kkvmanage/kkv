import Decimal from 'decimal.js';
import { customerService } from './customer.service.js';
import { loanService } from './loan.service.js';
import { fdService } from './fd.service.js';
import { accountingService } from './accounting.service.js';

export class DashboardService {
  public getSummary() {
    const customers = customerService.getAll();
    const loans = loanService.getAll();
    const fds = fdService.getDeposits();
    const balances = accountingService.getBalances();

    const activeLoans = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
    const activeFDs = fds.filter((f) => f.status === 'ACTIVE');

    let totalDisbursed = new Decimal(0);
    let totalOutstanding = new Decimal(0);

    loans.forEach((l) => {
      totalDisbursed = totalDisbursed.plus(new Decimal(l.disbursedAmount || l.principal || 0));
      if (l.status === 'ACTIVE' || l.status === 'OVERDUE') {
        totalOutstanding = totalOutstanding.plus(new Decimal(l.outstandingPrincipal || 0));
      }
    });

    return {
      activeLoansCount: activeLoans.length,
      cashInHand: balances.cashInHand,
      totalCustomers: customers.length,
      totalOutstanding: totalOutstanding.toNumber(),
      cashAtBank: balances.cashAtBank,
      totalDisbursed: totalDisbursed.toNumber(),
      activeFDsCount: activeFDs.length
    };
  }
}

export const dashboardService = new DashboardService();
