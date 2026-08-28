import fs from 'fs';
import path from 'path';
import { driveService } from './DriveService.js';

export class DriveFolderService {
  private baseDir: string;
  private folderMap: Record<string, string> = {};

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'KKV_GOLD_FINANCE');
    this.initStructure();
  }

  public async initStructure(): Promise<void> {
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

    // Local Disk Folder Tree Initialization
    for (const f of folders) {
      const fullPath = path.join(this.baseDir, f);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }

    // Google Drive Folder Tree Initialization if connected
    if (driveService.isConnected()) {
      try {
        const rootId = await driveService.getOrCreateFolder('KKV_GOLD_FINANCE');
        for (const f of folders) {
          const folderId = await driveService.getOrCreateFolder(f, rootId);
          this.folderMap[f] = folderId;
        }
      } catch (err) {
        console.error('[DriveFolderService] Error initializing Google Drive folders:', err);
      }
    }
  }

  public getLocalFolderPath(subFolder: string): string {
    const p = path.join(this.baseDir, subFolder);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
    return p;
  }

  public getDriveFolderId(subFolder: string): string | undefined {
    return this.folderMap[subFolder];
  }
}

export const driveFolderService = new DriveFolderService();
