import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { googleDriveService } from './googleDriveService.js';
import { customerService } from './customer.service.js';
import { loanService } from './loan.service.js';
import { receiptService } from './receipt.service.js';
import { fdService } from './fd.service.js';
import { accountingService } from './accounting.service.js';
import {
  objectsToCsv,
  calculateSha256,
  BackupManifest,
  BackupManifestFile
} from '../utils/backupExport.util.js';

export interface BackupHistoryRecord {
  backupId: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  createdAt: string;
  createdBy: {
    userId: string;
    name: string;
    role: string;
  };
  recordCounts: BackupManifest['recordCounts'];
  backupType?: 'FULL_BACKUP' | 'PRE_RESTORE_BACKUP' | 'RESTORED_STATE' | 'EMERGENCY_BACKUP' | 'PRE_WIPE_BACKUP';
  downloadAcknowledged: boolean;
  downloadAcknowledgedAt?: string;
  downloadAcknowledgedBy?: string;
  googleDriveUploaded: boolean;
  googleDriveFileId?: string;
  googleDriveUploadedAt?: string;
  googleDriveVerified?: boolean;
  driveAuthMode?: 'OAUTH' | 'SERVICE_ACCOUNT' | 'NONE';
  driveAccount?: string;
  driveFileId?: string;
  driveFolderId?: string;
  driveSyncStatus?: 'LOCAL_VERIFIED' | 'DRIVE_PENDING' | 'DRIVE_VERIFIED' | 'FAILED';
  status: 'CREATED' | 'VERIFIED' | 'LOCAL_VERIFIED' | 'DRIVE_PENDING' | 'DRIVE_VERIFIED' | 'FAILED' | 'RESTORED';
}

function formatBackupTimestamp(d: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}-${MM}-${DD}_${hh}-${mm}-${ss}`;
}

class BackupPackageService {
  private backupsDir: string;
  private historyFile = 'backups_history.json';
  private downloadAcknowledgments: Map<string, { userId: string; timestamp: string }> = new Map();

  constructor() {
    this.backupsDir = path.resolve(process.cwd(), 'KKV_GOLD_FINANCE', 'backups');
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }
  }

  /**
   * Generates a complete, portable ZIP backup package containing:
   * - manifest.json
   * - snapshot.json
   * - data/*.csv (all major entities)
   * - schema/backup-schema-version.json
   * - checksums/SHA256SUMS.txt
   */
  public async createFullBackupPackage(
    user?: { userId?: string; name?: string; role?: string },
    options?: { backupType?: 'FULL_BACKUP' | 'PRE_RESTORE_BACKUP' | 'RESTORED_STATE' | 'EMERGENCY_BACKUP' | 'PRE_WIPE_BACKUP' }
  ): Promise<BackupHistoryRecord> {
    const timestamp = new Date();
    const backupType = options?.backupType || 'FULL_BACKUP';
    const timestampStr = formatBackupTimestamp(timestamp);
    const dateStr = timestamp.toISOString().slice(0, 10);
    const backupId = `BKP-${dateStr.replace(/-/g, '')}-${timestamp.getTime().toString().slice(-4)}`;
    const fileName = `KKV_GOLD_FINANCE_${backupType}_${timestampStr}.zip`;

    console.log(`[BackupPackageService] 📦 Starting complete backup package generation: ${backupId} (${fileName})...`);

    // 1. Fetch All Operational Entities
    const customers = customerService.getAll() || [];
    const loans = loanService.getAll() || [];
    const receipts = receiptService.getAll() || [];
    const fixedDeposits = fdService.getDeposits() || [];
    const fdCustomers = fdService.getCustomers() || [];
    const fdInterestPayouts = fdService.getPayouts() || [];
    const fdWithdrawals = fdService.getWithdrawals() || [];
    const dayBookEntries = accountingService.getDayBook() || [];
    const reminders = googleDriveRepository.readJson<any[]>('reminders.json', []) || [];
    const auditLogs = googleDriveRepository.readJson<any[]>('audit_logs.json', []) || [];
    const notifications = googleDriveRepository.readJson<any[]>('notifications.json', []) || [];

    // Extract sub-entities for specialized CSV exports
    const customerKycList: any[] = [];
    customers.forEach((c: any) => {
      if (c.idProofNumber || c.panNumber || c.kycVerified || c.proofType) {
        customerKycList.push({
          customerId: c.id,
          customerName: c.name,
          mobileNumber: c.mobile,
          proofType: c.proofType || 'Aadhaar',
          idProofNumber: c.idProofNumber || '',
          panNumber: c.panNumber || '',
          kycVerified: !!c.kycVerified,
          kycDate: c.kycDate || c.createdAt || ''
        });
      }
    });

    const loanPaymentsList: any[] = [];
    const loanInterestHistoryList: any[] = [];
    const goldPledgeItemsList: any[] = [];

    loans.forEach((loan: any) => {
      // Payments / Repayments
      if (Array.isArray(loan.repayments)) {
        loan.repayments.forEach((rep: any, idx: number) => {
          loanPaymentsList.push({
            paymentId: rep.id || `${loan.loanNo}-PAY-${idx + 1}`,
            loanNo: loan.loanNo,
            customerId: loan.customerId,
            paymentDate: rep.date || rep.paymentDate,
            principalPaid: rep.principalAmount || rep.principalPaid || 0,
            interestPaid: rep.interestAmount || rep.interestPaid || 0,
            totalAmount: rep.amount || rep.totalPaid || 0,
            paymentMode: rep.mode || rep.paymentMode || 'Cash',
            receiptNo: rep.receiptNo || '',
            remarks: rep.remarks || ''
          });
        });
      }

      // Interest history
      if (Array.isArray(loan.interestHistory)) {
        loan.interestHistory.forEach((hist: any, idx: number) => {
          loanInterestHistoryList.push({
            historyId: hist.id || `${loan.loanNo}-INT-${idx + 1}`,
            loanNo: loan.loanNo,
            customerId: loan.customerId,
            date: hist.date,
            interestCharged: hist.interestCharged || hist.amount || 0,
            rate: hist.interestRate || loan.interestRate || 0,
            remarks: hist.remarks || ''
          });
        });
      }

      // Gold Pledge Items
      if (Array.isArray(loan.items)) {
        loan.items.forEach((item: any, idx: number) => {
          goldPledgeItemsList.push({
            itemId: item.id || `${loan.loanNo}-ITEM-${idx + 1}`,
            loanNo: loan.loanNo,
            customerId: loan.customerId,
            itemName: item.name || item.itemName || 'Gold Ornament',
            purity: item.purity || '22K',
            grossWeightGrams: item.grossWeight || item.grossWeightGrams || 0,
            netWeightGrams: item.netWeight || item.netWeightGrams || 0,
            itemCount: item.count || item.quantity || 1,
            estimatedValue: item.marketValue || item.estimatedValue || 0,
            remarks: item.remarks || ''
          });
        });
      }
    });

    const recordCounts: BackupManifest['recordCounts'] = {
      customers: customers.length,
      customerKyc: customerKycList.length,
      loans: loans.length,
      loanPayments: loanPaymentsList.length,
      loanInterestHistory: loanInterestHistoryList.length,
      goldPledgeItems: goldPledgeItemsList.length,
      receipts: receipts.length,
      fixedDeposits: fixedDeposits.length,
      fdInterestPayouts: fdInterestPayouts.length,
      fdWithdrawals: fdWithdrawals.length,
      dayBookEntries: dayBookEntries.length,
      notifications: notifications.length,
      auditLogs: auditLogs.length,
      totalRecords:
        customers.length +
        loans.length +
        receipts.length +
        fixedDeposits.length +
        fdCustomers.length +
        fdInterestPayouts.length +
        fdWithdrawals.length +
        dayBookEntries.length +
        reminders.length +
        notifications.length
    };

    // 2. Build Authoritative JSON Snapshot
    const snapshotPayload = {
      backupId,
      applicationName: 'KKV GOLD FINANCE',
      applicationVersion: '2.5.0',
      backupSchemaVersion: '1.0.0',
      createdAt: timestamp.toISOString(),
      timestamp: timestamp.getTime(),
      createdBy: {
        userId: user?.userId || 'ADMIN-001',
        name: user?.name || 'Administrator',
        role: user?.role || 'Admin'
      },
      counts: recordCounts,
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
        notifications,
        auditLogs
      }
    };

    const snapshotJsonStr = JSON.stringify(snapshotPayload, null, 2);
    const snapshotBuffer = Buffer.from(snapshotJsonStr, 'utf-8');

    // 3. Generate CSV Exports
    const filesToPackage: { path: string; buffer: Buffer }[] = [
      { path: 'snapshot.json', buffer: snapshotBuffer },
      { path: 'data/customers.csv', buffer: Buffer.from(objectsToCsv(customers), 'utf-8') },
      { path: 'data/customer_kyc.csv', buffer: Buffer.from(objectsToCsv(customerKycList), 'utf-8') },
      { path: 'data/loans.csv', buffer: Buffer.from(objectsToCsv(loans), 'utf-8') },
      { path: 'data/loan_payments.csv', buffer: Buffer.from(objectsToCsv(loanPaymentsList), 'utf-8') },
      { path: 'data/loan_interest_history.csv', buffer: Buffer.from(objectsToCsv(loanInterestHistoryList), 'utf-8') },
      { path: 'data/gold_pledge_items.csv', buffer: Buffer.from(objectsToCsv(goldPledgeItemsList), 'utf-8') },
      { path: 'data/receipts.csv', buffer: Buffer.from(objectsToCsv(receipts), 'utf-8') },
      { path: 'data/fixed_deposits.csv', buffer: Buffer.from(objectsToCsv(fixedDeposits), 'utf-8') },
      { path: 'data/fd_customers.csv', buffer: Buffer.from(objectsToCsv(fdCustomers), 'utf-8') },
      { path: 'data/fd_payouts.csv', buffer: Buffer.from(objectsToCsv(fdInterestPayouts), 'utf-8') },
      { path: 'data/fd_withdrawals.csv', buffer: Buffer.from(objectsToCsv(fdWithdrawals), 'utf-8') },
      { path: 'data/daybook.csv', buffer: Buffer.from(objectsToCsv(dayBookEntries), 'utf-8') },
      { path: 'data/notifications.csv', buffer: Buffer.from(objectsToCsv(notifications), 'utf-8') },
      { path: 'data/audit_logs.csv', buffer: Buffer.from(objectsToCsv(auditLogs), 'utf-8') },
      {
        path: 'schema/backup-schema-version.json',
        buffer: Buffer.from(
          JSON.stringify(
            {
              schemaVersion: '1.0.0',
              compatibleVersions: ['1.0.0'],
              application: 'KKV Gold Finance',
              description: 'Official Database Export and Restoration Schema'
            },
            null,
            2
          ),
          'utf-8'
        )
      }
    ];

    // 4. Build Manifest & Checksums
    const manifestFiles: BackupManifestFile[] = [];
    const sha256Lines: string[] = [];

    for (const f of filesToPackage) {
      const sha = calculateSha256(f.buffer);
      manifestFiles.push({
        path: f.path,
        size: f.buffer.length,
        sha256: sha
      });
      sha256Lines.push(`${sha}  ${f.path}`);
    }

    const manifest: BackupManifest = {
      backupId,
      applicationName: 'KKV GOLD FINANCE',
      applicationVersion: '2.5.0',
      backupSchemaVersion: '1.0.0',
      createdAt: timestamp.toISOString(),
      createdBy: {
        userId: user?.userId || 'ADMIN-001',
        name: user?.name || 'Administrator',
        role: user?.role || 'Admin'
      },
      recordCounts,
      files: manifestFiles
    };

    const manifestJsonStr = JSON.stringify(manifest, null, 2);
    const manifestBuffer = Buffer.from(manifestJsonStr, 'utf-8');
    const sha256SumsBuffer = Buffer.from(sha256Lines.join('\n') + '\n', 'utf-8');

    filesToPackage.push({ path: 'manifest.json', buffer: manifestBuffer });
    filesToPackage.push({ path: 'checksums/SHA256SUMS.txt', buffer: sha256SumsBuffer });

    // 5. Construct ZIP Package
    const zip = new JSZip();
    for (const file of filesToPackage) {
      zip.file(file.path, file.buffer);
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    const zipSha256 = calculateSha256(zipBuffer);
    const localFilePath = path.join(this.backupsDir, fileName);
    fs.writeFileSync(localFilePath, zipBuffer);

    console.log(`[BackupPackageService] ✅ ZIP created: ${fileName} (${zipBuffer.length} bytes, SHA-256: ${zipSha256})`);

    // 6. Record in History
    const historyRecord: BackupHistoryRecord = {
      backupId,
      fileName,
      fileSize: zipBuffer.length,
      sha256: zipSha256,
      createdAt: timestamp.toISOString(),
      createdBy: {
        userId: user?.userId || 'ADMIN-001',
        name: user?.name || 'Administrator',
        role: user?.role || 'Admin'
      },
      recordCounts,
      backupType,
      downloadAcknowledged: false,
      googleDriveUploaded: false,
      driveAuthMode: googleDriveService.getAuthMode(),
      driveAccount: googleDriveService.getConnectedAccount(),
      driveFolderId: googleDriveService.getFullBackupsFolderId() || googleDriveService.getRootFolderId(),
      driveSyncStatus: 'LOCAL_VERIFIED',
      status: 'LOCAL_VERIFIED'
    };

    this.saveHistoryRecord(historyRecord);

    // Write audit log
    const auditRecord = {
      id: `AUDIT-BKP-${Date.now()}`,
      timestamp: timestamp.toISOString(),
      action: 'BACKUP_CREATED',
      user: user?.name || 'Administrator',
      backupId,
      fileName,
      fileSize: zipBuffer.length,
      sha256: zipSha256,
      details: `Full backup package created with ${recordCounts.totalRecords} total operational records.`
    };
    const currentLogs = googleDriveRepository.readJson<any[]>('audit_logs.json', []);
    googleDriveRepository.writeJson('audit_logs.json', [auditRecord, ...currentLogs.slice(0, 500)]);

    // 7. Automatic Google Drive Upload if Connected
    if (googleDriveService.isConnected()) {
      try {
        console.log(`[BackupPackageService] ☁️ Automatically uploading ${fileName} to Google Drive kkv finance folder...`);
        await this.uploadBackupToDrive(backupId);
        const updated = this.getBackupHistory().find(r => r.backupId === backupId);
        if (updated) return updated;
      } catch (driveErr: any) {
        console.warn(`[BackupPackageService] ⚠️ Automatic Google Drive upload failed for ${backupId} (Local backup remains intact):`, driveErr?.message || driveErr);
      }
    }

    return historyRecord;
  }

  /**
   * Retrieves the raw ZIP buffer for authenticated download.
   */
  public getBackupZip(backupIdOrFileName: string): { buffer: Buffer; fileName: string; fileSize: number; sha256: string } | null {
    const history = this.getBackupHistory();
    const record = history.find(r => r.backupId === backupIdOrFileName || r.fileName === backupIdOrFileName);

    let targetFileName = record ? record.fileName : backupIdOrFileName;
    if (!targetFileName.endsWith('.zip')) {
      targetFileName = `${targetFileName}.zip`;
    }

    const filePath = path.join(this.backupsDir, targetFileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`[BackupPackageService] File not found: ${filePath}`);
      return null;
    }

    const buffer = fs.readFileSync(filePath);
    const sha256 = calculateSha256(buffer);

    return {
      buffer,
      fileName: targetFileName,
      fileSize: buffer.length,
      sha256
    };
  }

  /**
   * Records explicit administrator download acknowledgment.
   */
  public acknowledgeDownload(backupId: string, user?: { userId?: string; name?: string }): { success: boolean; acknowledgedAt: string } {
    const history = this.getBackupHistory();
    const record = history.find(r => r.backupId === backupId || r.fileName === backupId);

    const now = new Date().toISOString();
    this.downloadAcknowledgments.set(backupId, {
      userId: user?.userId || 'ADMIN-001',
      timestamp: now
    });

    if (record) {
      record.downloadAcknowledged = true;
      record.downloadAcknowledgedAt = now;
      record.downloadAcknowledgedBy = user?.name || 'Administrator';
      this.updateHistoryRecord(record);
    }

    // Audit log
    const auditRecord = {
      id: `AUDIT-DL-${Date.now()}`,
      timestamp: now,
      action: 'BACKUP_DOWNLOADED_ACKNOWLEDGED',
      user: user?.name || 'Administrator',
      backupId,
      details: 'Administrator explicitly acknowledged downloading the verified backup package to local workstation.'
    };
    const currentLogs = googleDriveRepository.readJson<any[]>('audit_logs.json', []);
    googleDriveRepository.writeJson('audit_logs.json', [auditRecord, ...currentLogs.slice(0, 500)]);

    console.log(`[BackupPackageService] 📥 Download acknowledged for backup: ${backupId}`);
    return { success: true, acknowledgedAt: now };
  }

  /**
   * Checks whether a backup download was explicitly acknowledged.
   */
  public isDownloadAcknowledged(backupId: string): boolean {
    if (this.downloadAcknowledgments.has(backupId)) return true;
    const history = this.getBackupHistory();
    const record = history.find(r => r.backupId === backupId);
    return !!record?.downloadAcknowledged;
  }

  /**
   * Uploads verified ZIP package to Google Drive into KKV_GOLD_FINANCE/Backups/Full_System_Backups.
   */
  public async uploadBackupToDrive(backupId: string): Promise<{ success: boolean; fileId: string; drivePath: string; sha256: string }> {
    const zipData = this.getBackupZip(backupId);
    if (!zipData) {
      throw new Error(`Backup file "${backupId}" not found on server.`);
    }

    const history = this.getBackupHistory();
    const record = history.find(r => r.backupId === backupId || r.fileName === backupId);

    const uploadRes = await googleDriveService.uploadBackupArchive({
      buffer: zipData.buffer,
      fileName: zipData.fileName,
      backupType: record?.backupType || 'FULL_BACKUP',
      sha256: zipData.sha256,
      description: `KKV Gold Finance Full Backup ${backupId}`
    });

    // Update history record
    if (record) {
      record.googleDriveUploaded = true;
      record.googleDriveFileId = uploadRes.fileId;
      record.googleDriveUploadedAt = uploadRes.syncedAt;
      record.googleDriveVerified = true;
      record.driveAuthMode = googleDriveService.getAuthMode();
      record.driveAccount = googleDriveService.getConnectedAccount();
      record.driveFileId = uploadRes.fileId;
      record.driveFolderId = uploadRes.folderId;
      record.driveSyncStatus = 'DRIVE_VERIFIED';
      record.status = 'DRIVE_VERIFIED';
      this.updateHistoryRecord(record);
    }

    console.log(`[BackupPackageService] ☁️ Backup ${backupId} successfully verified on Google Drive (File ID: ${uploadRes.fileId})`);

    return {
      success: true,
      fileId: uploadRes.fileId,
      drivePath: uploadRes.drivePath,
      sha256: uploadRes.sha256
    };
  }

  /**
   * Returns list of all historical backups.
   */
  public getBackupHistory(): BackupHistoryRecord[] {
    return googleDriveRepository.readJson<BackupHistoryRecord[]>(this.historyFile, []);
  }

  private saveHistoryRecord(record: BackupHistoryRecord): void {
    const list = this.getBackupHistory();
    const existingIdx = list.findIndex(r => r.backupId === record.backupId);
    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }
    googleDriveRepository.writeJson(this.historyFile, list);
  }

  private updateHistoryRecord(record: BackupHistoryRecord): void {
    this.saveHistoryRecord(record);
  }
}

export const backupPackageService = new BackupPackageService();
