import path from 'path';
import { driveService } from './DriveService.js';
import {
  getStorageBaseDir,
  ensureDirectoryExists
} from '../../config/storage.js';

export class DriveFolderService {
  private folderMap: Record<string, string> = {};
  private localInitialized = false;

  private get baseDir(): string {
    return getStorageBaseDir();
  }

  constructor() {
    // Safe non-blocking initialization
    this.initLocalStructure();
  }

  public initLocalStructure(): void {
    if (this.localInitialized) return;

    const folders = [
      'config',
      'customers',
      'loans',
      'loan-receipts',
      'interest-payments',
      'fixed-deposits',
      'fd-customers',
      'fd-deposits',
      'reminders',
      'backups',
      'reports',
      'system/settings',
      'system/admins',
      'system/audit-logs'
    ];

    try {
      ensureDirectoryExists(this.baseDir);
      for (const f of folders) {
        const fullPath = path.join(this.baseDir, f);
        ensureDirectoryExists(fullPath);
      }
      this.localInitialized = true;
    } catch (err) {
      console.warn('[DriveFolderService] Notice: Storage directory initialization warning:', (err as any)?.message || err);
    }
  }

  public async initStructure(): Promise<void> {
    this.initLocalStructure();

    const folders = [
      'config',
      'customers',
      'loans',
      'loan-receipts',
      'interest-payments',
      'fixed-deposits',
      'fd-customers',
      'fd-deposits',
      'reminders',
      'backups',
      'reports',
      'system/settings',
      'system/admins',
      'system/audit-logs'
    ];

    // Google Drive Folder Tree Initialization if connected
    if (driveService.isConnected()) {
      try {
        await driveService.verifyRootFolderAccess();
        for (const f of folders) {
          const folderId = await driveService.getOrCreateFolder(f);
          this.folderMap[f] = folderId;
        }
        console.log('[DriveFolderService] Google Drive folder tree initialized successfully.');
      } catch (err) {
        console.warn('[DriveFolderService] Warning initializing Google Drive folders:', (err as any)?.message || err);
      }
    }
  }

  public getLocalFolderPath(subFolder: string): string {
    this.initLocalStructure();
    const p = path.join(this.baseDir, subFolder);
    ensureDirectoryExists(p);
    return p;
  }

  public getDriveFolderId(subFolder: string): string | undefined {
    return this.folderMap[subFolder];
  }
}

export const driveFolderService = new DriveFolderService();
