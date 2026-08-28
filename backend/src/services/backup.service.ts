import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { customerService } from './customer.service.js';
import { loanService } from './loan.service.js';
import { receiptService } from './receipt.service.js';
import { fdService } from './fd.service.js';
import { accountingService } from './accounting.service.js';

export class BackupService {
  public exportBackup(): { filename: string | null; data: any } {
    const fullBackup = {
      exportTimestamp: new Date().toISOString(),
      customers: customerService.getAll(),
      loans: loanService.getAll(),
      receipts: receiptService.getAll(),
      fdCustomers: fdService.getCustomers(),
      fixedDeposits: fdService.getDeposits(),
      fdInterestPayouts: fdService.getPayouts(),
      fdWithdrawals: fdService.getWithdrawals(),
      dayBookEntries: accountingService.getDayBook()
    };

    const filename = googleDriveRepository.createBackup(fullBackup);
    return { filename, data: fullBackup };
  }

  public restoreBackup(data: any): boolean {
    try {
      if (!data || typeof data !== 'object') return false;

      if (Array.isArray(data.customers)) googleDriveRepository.writeJson('customers.json', data.customers);
      if (Array.isArray(data.loans)) googleDriveRepository.writeJson('loans.json', data.loans);
      if (Array.isArray(data.receipts)) googleDriveRepository.writeJson('receipts.json', data.receipts);
      if (Array.isArray(data.fdCustomers)) googleDriveRepository.writeJson('fd_customers.json', data.fdCustomers);
      if (Array.isArray(data.fixedDeposits)) googleDriveRepository.writeJson('fixed_deposits.json', data.fixedDeposits);
      if (Array.isArray(data.fdInterestPayouts)) googleDriveRepository.writeJson('fd_interest_payouts.json', data.fdInterestPayouts);
      if (Array.isArray(data.fdWithdrawals)) googleDriveRepository.writeJson('fd_withdrawals.json', data.fdWithdrawals);
      if (Array.isArray(data.dayBookEntries)) googleDriveRepository.writeJson('daybook_entries.json', data.dayBookEntries);

      return true;
    } catch (err) {
      console.error('[BackupService] Error restoring backup:', err);
      return false;
    }
  }

  public listBackups(): string[] {
    return googleDriveRepository.listBackups();
  }
}

export const backupService = new BackupService();
