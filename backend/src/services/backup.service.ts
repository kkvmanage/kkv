import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { googleDriveService } from './googleDriveService.js';
import { customerService } from './customer.service.js';
import { loanService } from './loan.service.js';
import { receiptService } from './receipt.service.js';
import { fdService } from './fd.service.js';
import { accountingService } from './accounting.service.js';

export interface BackupResult {
  success: boolean;
  backupId: string;
  driveFileId: string;
  fileName: string;
  uploadedAt: string;
  sizeBytes: number;
  recordCounts: {
    customers: number;
    loans: number;
    receipts: number;
    fixedDeposits: number;
  };
}

export class BackupService {
  /**
   * Creates a complete backup package and uploads it to Google Drive under KKV_GOLD_FINANCE/Backups/
   */
  public async createCloudBackup(incomingData?: any, deviceId?: string): Promise<BackupResult> {
    const customers = incomingData?.customers || customerService.getAll();
    const loans = incomingData?.loans || loanService.getAll();
    const receipts = incomingData?.receipts || receiptService.getAll();
    const fixedDeposits = incomingData?.fixedDeposits || fdService.getDeposits();
    const fdCustomers = incomingData?.fdCustomers || fdService.getCustomers();
    const fdInterestPayouts = incomingData?.fdInterestPayouts || fdService.getPayouts();
    const fdWithdrawals = incomingData?.fdWithdrawals || fdService.getWithdrawals();
    const dayBookEntries = incomingData?.dayBookEntries || accountingService.getDayBook();

    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10);
    const timeStr = timestamp.toTimeString().slice(0, 8).replace(/:/g, '-');
    const fileName = `KKV_GOLD_FINANCE_BACKUP_${dateStr}_${timeStr}.json`;

    const fullBackupPayload = {
      backupVersion: '1.0',
      application: 'KKV Gold Finance',
      createdAt: timestamp.toISOString(),
      deviceId: deviceId || 'Desktop',
      branch: 'KKV Gold Finance - Main Branch',
      data: {
        customers,
        loans,
        receipts,
        fdCustomers,
        fixedDeposits,
        fdInterestPayouts,
        fdWithdrawals,
        dayBookEntries,
        settings: incomingData?.settings || {}
      }
    };

    const jsonBuffer = Buffer.from(JSON.stringify(fullBackupPayload, null, 2), 'utf-8');

    // 1. Ensure Backups Folder in Google Drive
    const backupFolderId = await googleDriveService.ensureBackupsFolder(deviceId || 'Desktop');

    // 2. Upload Backup JSON Buffer
    const uploadResult = await googleDriveService.uploadFile(
      {
        originalname: fileName,
        mimetype: 'application/json',
        buffer: jsonBuffer
      },
      backupFolderId
    );

    const backupRecord: BackupResult = {
      success: true,
      backupId: `BCK-${Date.now()}`,
      driveFileId: uploadResult.fileId,
      fileName,
      uploadedAt: timestamp.toISOString(),
      sizeBytes: jsonBuffer.length,
      recordCounts: {
        customers: Array.isArray(customers) ? customers.length : 0,
        loans: Array.isArray(loans) ? loans.length : 0,
        receipts: Array.isArray(receipts) ? receipts.length : 0,
        fixedDeposits: Array.isArray(fixedDeposits) ? fixedDeposits.length : 0
      }
    };

    // 3. Verify file exists on Google Drive
    const verification = await googleDriveService.verifyFileExists(uploadResult.fileId);
    if (!verification.exists) {
      throw new Error(`Google Drive upload failed verification for file ID: ${uploadResult.fileId}`);
    }

    // 4. Save to local audit history
    try {
      const history = googleDriveRepository.readJson<any[]>('backups_history.json', []);
      history.unshift(backupRecord);
      googleDriveRepository.writeJson('backups_history.json', history.slice(0, 50));
    } catch {
      // Ignore history log errors
    }

    return backupRecord;
  }

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
      const targetData = data.data || data;

      if (Array.isArray(targetData.customers)) googleDriveRepository.writeJson('customers.json', targetData.customers);
      if (Array.isArray(targetData.loans)) googleDriveRepository.writeJson('loans.json', targetData.loans);
      if (Array.isArray(targetData.receipts)) googleDriveRepository.writeJson('receipts.json', targetData.receipts);
      if (Array.isArray(targetData.fdCustomers)) googleDriveRepository.writeJson('fd_customers.json', targetData.fdCustomers);
      if (Array.isArray(targetData.fixedDeposits)) googleDriveRepository.writeJson('fixed_deposits.json', targetData.fixedDeposits);
      if (Array.isArray(targetData.fdInterestPayouts)) googleDriveRepository.writeJson('fd_interest_payouts.json', targetData.fdInterestPayouts);
      if (Array.isArray(targetData.fdWithdrawals)) googleDriveRepository.writeJson('fd_withdrawals.json', targetData.fdWithdrawals);
      if (Array.isArray(targetData.dayBookEntries)) googleDriveRepository.writeJson('daybook_entries.json', targetData.dayBookEntries);

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
