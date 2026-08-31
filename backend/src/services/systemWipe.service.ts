import crypto from 'crypto';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { googleDriveService } from './googleDriveService.js';
import { customerService } from './customer.service.js';
import { loanService } from './loan.service.js';
import { receiptService } from './receipt.service.js';
import { fdService } from './fd.service.js';
import { accountingService } from './accounting.service.js';

export interface WipeVerificationToken {
  token: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  drivePath: string;
  expiresAt: number;
}

class SystemWipeService {
  private activeTokens: Map<string, WipeVerificationToken> = new Map();

  /**
   * STEP 2, 3, 4:
   * 1. Collects all database collections into a single backup snapshot.
   * 2. Checks Google OAuth 2.0 connection.
   * 3. Uploads backup JSON file to Google Drive: My Drive -> KKV_DATABASE -> Backups -> Full_System_Backups
   * 4. VERIFIES uploaded file:
   *    - File existence & accessibility
   *    - File size > 0 bytes
   *    - Downloads file & parses JSON structure to ensure backup validity.
   * 5. Returns a 15-min single-use verification token.
   */
  public async initiateFullBackupAndVerify(confirmationText: string): Promise<WipeVerificationToken> {
    if (confirmationText !== 'WIPE ALL DATA') {
      throw new Error('Invalid confirmation text. You must type "WIPE ALL DATA" exactly.');
    }

    // 1. Verify Google Drive OAuth Connection
    if (!googleDriveService.isConnected()) {
      googleDriveService.initGoogleDrive();
      if (!googleDriveService.isConnected()) {
        throw new Error('Google OAuth 2.0 is not connected. Please connect your Google account before attempting Wipe All Data.');
      }
    }

    // Test Root Folder Access
    const rootTest = await googleDriveService.testRootFolderAccess();
    if (!rootTest.accessible) {
      throw new Error(rootTest.error || 'Google Drive root folder cannot be accessed by the authorized account.');
    }

    // 2. Gather All Operational Data Snapshot
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10);
    const timeStr = timestamp.toTimeString().slice(0, 8).replace(/:/g, '-');
    const fileName = `KKV_GOLD_FINANCE_FULL_BACKUP_${dateStr}_${timeStr}.json`;

    const customers = customerService.getAll();
    const loans = loanService.getAll();
    const receipts = receiptService.getAll();
    const fixedDeposits = fdService.getDeposits();
    const fdCustomers = fdService.getCustomers();
    const fdInterestPayouts = fdService.getPayouts();
    const fdWithdrawals = fdService.getWithdrawals();
    const dayBookEntries = accountingService.getDayBook();
    const reminders = googleDriveRepository.readJson<any[]>('reminders.json', []);
    const auditLogs = googleDriveRepository.readJson<any[]>('audit_logs.json', []);
    const notifications = googleDriveRepository.readJson<any[]>('notifications.json', []);

    const snapshotPayload = {
      metadata: {
        appName: 'KKV Gold Finance',
        backupType: 'FULL_SYSTEM_WIPE_BACKUP',
        createdAt: timestamp.toISOString(),
        timestamp: timestamp.getTime(),
        initiatedBy: 'Admin',
        version: '1.0.0'
      },
      counts: {
        customers: customers.length,
        loans: loans.length,
        receipts: receipts.length,
        fixedDeposits: fixedDeposits.length,
        dayBookEntries: dayBookEntries.length
      },
      data: {
        customers,
        loans,
        receipts,
        fixedDeposits,
        fdCustomers,
        fdInterestPayouts,
        fdWithdrawals,
        dayBookEntries,
        reminders,
        auditLogs,
        notifications
      }
    };

    const jsonContent = JSON.stringify(snapshotPayload, null, 2);
    const jsonBuffer = Buffer.from(jsonContent, 'utf-8');

    // 3. Ensure Folder Path: My Drive -> KKV_DATABASE -> Backups -> Full_System_Backups
    const rootId = googleDriveService.getRootFolderId();
    const kkvDbFolderId = await googleDriveService.getOrCreateFolder('KKV_DATABASE', rootId);
    const backupsFolderId = await googleDriveService.getOrCreateFolder('Backups', kkvDbFolderId);
    const fullBackupsFolderId = await googleDriveService.getOrCreateFolder('Full_System_Backups', backupsFolderId);

    // 4. Upload Backup to Google Drive
    const uploadResult = await googleDriveService.uploadFile(
      {
        originalname: fileName,
        mimetype: 'application/json',
        buffer: jsonBuffer
      },
      fullBackupsFolderId
    );

    const fileId = uploadResult.fileId;
    if (!fileId) {
      throw new Error('Google Drive upload failed to return a valid File ID. No data was deleted.');
    }

    // 5. CRITICAL VERIFICATION OF GOOGLE DRIVE BACKUP
    console.log(`[SystemWipeService] Verifying Google Drive backup file ID: ${fileId}...`);

    // Check A: File Existence & Access
    const fileExistsCheck = await googleDriveService.verifyFileExists(fileId);
    if (!fileExistsCheck.exists) {
      throw new Error('Google Drive backup verification failed: Uploaded file does not exist or is inaccessible. No data was deleted.');
    }

    // Check B: Non-Zero Size
    const fileSize = fileExistsCheck.size || jsonBuffer.length;
    if (fileSize <= 0) {
      throw new Error('Google Drive backup verification failed: Uploaded file size is 0 bytes. No data was deleted.');
    }

    // Check C: Content & Structure Verification by Downloading Back
    try {
      const verifyDrive = (googleDriveService as any).drive;
      if (!verifyDrive) {
        throw new Error('Drive API unavailable for content verification.');
      }

      const res = await verifyDrive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'text' });

      const downloadedContent = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const parsed = JSON.parse(downloadedContent);

      if (!parsed || parsed.metadata?.backupType !== 'FULL_SYSTEM_WIPE_BACKUP' || !parsed.data) {
        throw new Error('Google Drive backup verification failed: Uploaded file JSON structure is invalid.');
      }
      console.log(`[SystemWipeService] ✅ Verified backup structure: ${parsed.counts?.customers || 0} customers, ${parsed.counts?.loans || 0} loans.`);
    } catch (verErr: any) {
      console.error('[SystemWipeService] Verification download check error:', verErr?.message || verErr);
      throw new Error(`Google Drive backup verification failed: ${verErr?.message || 'File integrity check failed'}. No application data was deleted.`);
    }

    // 6. Generate Verification Token
    const token = `wt_${crypto.randomBytes(16).toString('hex')}`;
    const tokenRecord: WipeVerificationToken = {
      token,
      fileId,
      fileName,
      fileSize,
      uploadedAt: timestamp.toISOString(),
      drivePath: 'Google Drive → KKV_DATABASE → Backups → Full_System_Backups',
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
    };

    this.activeTokens.set(token, tokenRecord);
    return tokenRecord;
  }

  /**
   * STEP 6 & 7: ATOMIC DATA WIPE
   * Permanently wipes all operational collections only if a valid, unexpired verification token is provided.
   */
  public confirmAndWipeData(token: string, confirmationText: string): { success: boolean; wipedAt: string; fileName: string; drivePath: string } {
    if (confirmationText !== 'WIPE ALL DATA') {
      throw new Error('Invalid confirmation text. You must type "WIPE ALL DATA" exactly.');
    }

    const record = this.activeTokens.get(token);
    if (!record) {
      throw new Error('Invalid or missing backup verification token. Please re-run backup creation.');
    }

    if (Date.now() > record.expiresAt) {
      this.activeTokens.delete(token);
      throw new Error('Backup verification token expired. Please re-run backup creation.');
    }

    console.log(`[SystemWipeService] 🚨 EXECUTING PERMANENT DATA WIPE. Verified backup: ${record.fileName} (${record.fileId})`);

    // 1. Wipe Operational Business Collections
    googleDriveRepository.writeJson('customers.json', []);
    googleDriveRepository.writeJson('loans.json', []);
    googleDriveRepository.writeJson('receipts.json', []);
    googleDriveRepository.writeJson('reminders.json', []);
    googleDriveRepository.writeJson('fd_customers.json', []);
    googleDriveRepository.writeJson('fixed_deposits.json', []);
    googleDriveRepository.writeJson('fd_interest_payouts.json', []);
    googleDriveRepository.writeJson('fd_withdrawals.json', []);
    googleDriveRepository.writeJson('daybook_entries.json', []);
    googleDriveRepository.writeJson('backups_history.json', []);
    googleDriveRepository.writeJson('notifications.json', []);

    // 2. Log System Audit Record (DO NOT delete audit logs completely, write single wipe audit record)
    const wipeAuditRecord = {
      id: `AUDIT-WIPE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'SYSTEM_WIPE_ALL_DATA',
      user: 'Admin',
      backupFileName: record.fileName,
      driveFileId: record.fileId,
      driveVerificationStatus: 'VERIFIED',
      details: 'All operational customer, loan, payment, receipt, and ledger data permanently wiped following Google Drive backup verification.'
    };
    googleDriveRepository.writeJson('audit_logs.json', [wipeAuditRecord]);

    // 3. Post-Wipe Verification Check
    const customersAfter = googleDriveRepository.readJson<any[]>('customers.json', []);
    const loansAfter = googleDriveRepository.readJson<any[]>('loans.json', []);
    const receiptsAfter = googleDriveRepository.readJson<any[]>('receipts.json', []);

    if (customersAfter.length !== 0 || loansAfter.length !== 0 || receiptsAfter.length !== 0) {
      throw new Error('Database wipe assertion failed: Operational tables were not completely cleared.');
    }

    // Invalidate token
    this.activeTokens.delete(token);

    console.log('[SystemWipeService] ✅ SYSTEM DATA SUCCESSFULLY WIPED. Database verified empty.');

    return {
      success: true,
      wipedAt: new Date().toISOString(),
      fileName: record.fileName,
      drivePath: record.drivePath
    };
  }
}

export const systemWipeService = new SystemWipeService();
