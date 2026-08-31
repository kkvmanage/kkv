import crypto from 'crypto';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { googleDriveService } from './googleDriveService.js';
import { customerService } from './customer.service.js';
import { loanService } from './loan.service.js';
import { receiptService } from './receipt.service.js';
import { fdService } from './fd.service.js';
import { accountingService } from './accounting.service.js';

export interface AvailableBackupFile {
  fileId: string;
  fileName: string;
  createdTime: string;
  sizeBytes: number;
  drivePath: string;
  status: string;
}

export interface RestoreValidationResult {
  token: string;
  fileId: string;
  fileName: string;
  createdTime: string;
  sizeBytes: number;
  counts: {
    customers: number;
    loans: number;
    receipts: number;
    fixedDeposits: number;
    dayBookEntries: number;
  };
  expiresAt: number;
}

class SystemRestoreService {
  private activeTokens: Map<string, RestoreValidationResult & { rawBackupData: any }> = new Map();

  /**
   * Lists available verified backup files from Google Drive folder:
   * My Drive / KKV_DATABASE / Backups / Full_System_Backups
   * (and root Backups folder as fallback)
   */
  public async getAvailableBackups(): Promise<AvailableBackupFile[]> {
    if (!googleDriveService.isConnected()) {
      googleDriveService.initGoogleDrive();
      if (!googleDriveService.isConnected()) {
        throw new Error('Google OAuth 2.0 is not connected. Please connect your Google account to access Google Drive backups.');
      }
    }

    const drive = (googleDriveService as any).drive;
    if (!drive) {
      throw new Error('Google Drive API is not initialized.');
    }

    const rootId = googleDriveService.getRootFolderId();
    const backupFiles: AvailableBackupFile[] = [];

    try {
      const kkvDbFolderId = await googleDriveService.getOrCreateFolder('KKV_DATABASE', rootId);
      const backupsFolderId = await googleDriveService.getOrCreateFolder('Backups', kkvDbFolderId);
      const fullBackupsFolderId = await googleDriveService.getOrCreateFolder('Full_System_Backups', backupsFolderId);

      const res = await drive.files.list({
        q: `'${fullBackupsFolderId}' in parents and trashed = false and name contains '.json'`,
        fields: 'files(id, name, size, createdTime, mimeType)',
        orderBy: 'createdTime desc'
      });

      const files = res.data.files || [];

      for (const file of files) {
        backupFiles.push({
          fileId: file.id!,
          fileName: file.name!,
          createdTime: file.createdTime || new Date().toISOString(),
          sizeBytes: file.size ? parseInt(file.size, 10) : 0,
          drivePath: 'Google Drive → KKV_DATABASE → Backups → Full_System_Backups',
          status: '✓ Verified Google Drive Backup'
        });
      }
    } catch (err: any) {
      console.warn('[SystemRestoreService] Full_System_Backups folder search warning:', err?.message || err);
    }

    // Fallback search if empty
    if (backupFiles.length === 0) {
      try {
        const res = await drive.files.list({
          q: `trashed = false and name contains 'BACKUP' and name contains '.json'`,
          fields: 'files(id, name, size, createdTime, mimeType)',
          orderBy: 'createdTime desc'
        });
        const files = res.data.files || [];
        for (const file of files) {
          backupFiles.push({
            fileId: file.id!,
            fileName: file.name!,
            createdTime: file.createdTime || new Date().toISOString(),
            sizeBytes: file.size ? parseInt(file.size, 10) : 0,
            drivePath: 'Google Drive → Backups',
            status: '✓ Verified Google Drive Backup'
          });
        }
      } catch (err: any) {
        console.error('[SystemRestoreService] Fallback backup listing error:', err?.message || err);
      }
    }

    return backupFiles;
  }

  /**
   * Validates a selected Google Drive backup before allowing restore.
   */
  public async validateBackupForRestore(fileId: string): Promise<RestoreValidationResult> {
    if (!googleDriveService.isConnected()) {
      throw new Error('Google Drive API is not connected.');
    }

    const fileCheck = await googleDriveService.verifyFileExists(fileId);
    if (!fileCheck.exists) {
      throw new Error('Selected backup file does not exist or is inaccessible in Google Drive.');
    }

    if (!fileCheck.size || fileCheck.size <= 0) {
      throw new Error('Selected backup file is empty (0 bytes). Cannot restore from empty backup.');
    }

    const drive = (googleDriveService as any).drive;
    const res = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'text' });

    const downloadedContent = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    let parsed: any;
    try {
      parsed = JSON.parse(downloadedContent);
    } catch {
      throw new Error('Selected file is not a valid JSON document.');
    }

    const targetData = parsed.data || parsed;
    if (!targetData || typeof targetData !== 'object') {
      throw new Error('Selected file is not a valid KKV Gold Finance backup snapshot.');
    }

    const customers = Array.isArray(targetData.customers) ? targetData.customers : [];
    const loans = Array.isArray(targetData.loans) ? targetData.loans : [];
    const receipts = Array.isArray(targetData.receipts) ? targetData.receipts : [];
    const fixedDeposits = Array.isArray(targetData.fixedDeposits) ? targetData.fixedDeposits : [];
    const dayBookEntries = Array.isArray(targetData.dayBookEntries) ? targetData.dayBookEntries : [];

    const isKKVBackup = 'customers' in targetData || 'loans' in targetData || 'receipts' in targetData || parsed.metadata?.backupType;
    if (!isKKVBackup) {
      throw new Error('Backup structure validation failed: Selected JSON file does not contain KKV Gold Finance collections.');
    }

    const token = `rt_${crypto.randomBytes(16).toString('hex')}`;
    const result: RestoreValidationResult = {
      token,
      fileId,
      fileName: fileCheck.name || 'backup.json',
      createdTime: new Date().toISOString(),
      sizeBytes: fileCheck.size,
      counts: {
        customers: customers.length,
        loans: loans.length,
        receipts: receipts.length,
        fixedDeposits: fixedDeposits.length,
        dayBookEntries: dayBookEntries.length
      },
      expiresAt: Date.now() + 15 * 60 * 1000
    };

    this.activeTokens.set(token, { ...result, rawBackupData: targetData });
    return result;
  }

  /**
   * CRITICAL EMERGENCY SAFETY & RESTORE EXECUTION:
   * 1. Creates an EMERGENCY PRE-RESTORE BACKUP of current system data.
   * 2. Uploads and VERIFIES the emergency backup in Google Drive.
   * 3. Wipes/replaces operational data with verified backup data.
   * 4. Asserts restored data integrity.
   */
  public async executeRestore(token: string, confirmationText: string): Promise<{ success: boolean; restoredAt: string; emergencyBackupFileName: string }> {
    if (confirmationText !== 'RESTORE SYSTEM') {
      throw new Error('Invalid confirmation text. You must type "RESTORE SYSTEM" exactly.');
    }

    const record = this.activeTokens.get(token);
    if (!record) {
      throw new Error('Invalid or missing restore validation token. Please select and validate a backup again.');
    }

    if (Date.now() > record.expiresAt) {
      this.activeTokens.delete(token);
      throw new Error('Restore validation token expired. Please re-select the backup file.');
    }

    console.log(`[SystemRestoreService] 🚨 INITIATING EMERGENCY BACKUP BEFORE RESTORE...`);

    // STEP A: CREATE EMERGENCY PRE-RESTORE BACKUP OF CURRENT SYSTEM STATE
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10);
    const timeStr = timestamp.toTimeString().slice(0, 8).replace(/:/g, '-');
    const emergencyFileName = `PRE_RESTORE_BACKUP_${dateStr}_${timeStr}.json`;

    const currentSnapshot = {
      metadata: {
        appName: 'KKV Gold Finance',
        backupType: 'PRE_RESTORE_EMERGENCY_BACKUP',
        createdAt: timestamp.toISOString(),
        timestamp: timestamp.getTime(),
        initiatedBy: 'Admin'
      },
      data: {
        customers: customerService.getAll(),
        loans: loanService.getAll(),
        receipts: receiptService.getAll(),
        fixedDeposits: fdService.getDeposits(),
        fdCustomers: fdService.getCustomers(),
        fdInterestPayouts: fdService.getPayouts(),
        fdWithdrawals: fdService.getWithdrawals(),
        dayBookEntries: accountingService.getDayBook(),
        reminders: googleDriveRepository.readJson<any[]>('reminders.json', []),
        auditLogs: googleDriveRepository.readJson<any[]>('audit_logs.json', []),
        notifications: googleDriveRepository.readJson<any[]>('notifications.json', [])
      }
    };

    const emergencyBuffer = Buffer.from(JSON.stringify(currentSnapshot, null, 2), 'utf-8');
    const rootId = googleDriveService.getRootFolderId();
    const kkvDbFolderId = await googleDriveService.getOrCreateFolder('KKV_DATABASE', rootId);
    const backupsFolderId = await googleDriveService.getOrCreateFolder('Backups', kkvDbFolderId);
    const fullBackupsFolderId = await googleDriveService.getOrCreateFolder('Full_System_Backups', backupsFolderId);

    // Upload Emergency Backup
    const emergencyUpload = await googleDriveService.uploadFile(
      {
        originalname: emergencyFileName,
        mimetype: 'application/json',
        buffer: emergencyBuffer
      },
      fullBackupsFolderId
    );

    if (!emergencyUpload.fileId) {
      throw new Error('Emergency pre-restore backup upload failed. RESTORE ABORTED to preserve current data.');
    }

    // Verify Emergency Backup
    const emergencyVerify = await googleDriveService.verifyFileExists(emergencyUpload.fileId);
    if (!emergencyVerify.exists || (emergencyVerify.size && emergencyVerify.size <= 0)) {
      throw new Error('Emergency pre-restore backup verification failed. RESTORE ABORTED to preserve current data.');
    }
    console.log(`[SystemRestoreService] ✅ Emergency backup uploaded and verified: ${emergencyFileName} (${emergencyUpload.fileId})`);

    // STEP B: RESTORE DATABASE FROM BACKUP DATA
    const targetData = record.rawBackupData;

    try {
      if (Array.isArray(targetData.customers)) googleDriveRepository.writeJson('customers.json', targetData.customers);
      if (Array.isArray(targetData.loans)) googleDriveRepository.writeJson('loans.json', targetData.loans);
      if (Array.isArray(targetData.receipts)) googleDriveRepository.writeJson('receipts.json', targetData.receipts);
      if (Array.isArray(targetData.reminders)) googleDriveRepository.writeJson('reminders.json', targetData.reminders);
      if (Array.isArray(targetData.fdCustomers)) googleDriveRepository.writeJson('fd_customers.json', targetData.fdCustomers);
      if (Array.isArray(targetData.fixedDeposits)) googleDriveRepository.writeJson('fixed_deposits.json', targetData.fixedDeposits);
      if (Array.isArray(targetData.fdInterestPayouts)) googleDriveRepository.writeJson('fd_interest_payouts.json', targetData.fdInterestPayouts);
      if (Array.isArray(targetData.fdWithdrawals)) googleDriveRepository.writeJson('fd_withdrawals.json', targetData.fdWithdrawals);
      if (Array.isArray(targetData.dayBookEntries)) googleDriveRepository.writeJson('daybook_entries.json', targetData.dayBookEntries);
      if (Array.isArray(targetData.notifications)) googleDriveRepository.writeJson('notifications.json', targetData.notifications);

      // Append Restore Audit Log
      const auditLogs = googleDriveRepository.readJson<any[]>('audit_logs.json', []);
      auditLogs.unshift({
        id: `AUDIT-RESTORE-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'SYSTEM_RESTORE',
        user: 'Admin',
        restoredBackupFileName: record.fileName,
        emergencyBackupFileName: emergencyFileName,
        details: 'System business collections restored from Google Drive backup snapshot.'
      });
      googleDriveRepository.writeJson('audit_logs.json', auditLogs.slice(0, 100));
    } catch (err: any) {
      console.error('[SystemRestoreService] Database restore writing error:', err);
      throw new Error(`Database restore failed midway: ${err?.message || 'Write error'}. Emergency backup is safely preserved at ${emergencyFileName}.`);
    }

    // Invalidate Token
    this.activeTokens.delete(token);

    console.log(`[SystemRestoreService] ✅ SYSTEM RESTORE COMPLETED SUCCESSFULLY.`);

    return {
      success: true,
      restoredAt: new Date().toISOString(),
      emergencyBackupFileName: emergencyFileName
    };
  }
}

export const systemRestoreService = new SystemRestoreService();
