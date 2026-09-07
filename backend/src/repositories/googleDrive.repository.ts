import fs from 'fs';
import path from 'path';
import {
  getStorageBaseDir,
  getConfigDirectory,
  getBackupsDirectory,
  ensureDirectoryExists
} from '../config/storage.js';

export class GoogleDriveRepository {
  private memoryCache: Map<string, any> = new Map();

  private get baseDir(): string {
    return getStorageBaseDir();
  }

  private get dbDir(): string {
    return getConfigDirectory();
  }

  private get backupsDir(): string {
    return getBackupsDirectory();
  }

  constructor() {
    // Safe non-throwing directory initialization
    this.initFolders();
  }

  private initFolders(): void {
    try {
      ensureDirectoryExists(this.dbDir);
      ensureDirectoryExists(this.backupsDir);
    } catch (err) {
      console.warn('[GoogleDriveRepository] Notice: Storage directory initialization warning:', (err as any)?.message || err);
    }
  }

  public checkConnection(): boolean {
    try {
      return fs.existsSync(this.baseDir);
    } catch {
      return false;
    }
  }

  public readJson<T>(filename: string, fallback: T): T {
    try {
      // Check in-memory cache first if available
      if (this.memoryCache.has(filename)) {
        return this.memoryCache.get(filename) as T;
      }

      const filePath = path.join(this.dbDir, filename);
      if (!fs.existsSync(filePath)) {
        this.memoryCache.set(filename, fallback);
        return fallback;
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as T;
      this.memoryCache.set(filename, parsed);
      return parsed;
    } catch (err) {
      console.warn(`[GoogleDriveRepository] Notice: Reading ${filename} falling back to default/cache:`, (err as any)?.message || err);
      return this.memoryCache.has(filename) ? (this.memoryCache.get(filename) as T) : fallback;
    }
  }

  public writeJson<T>(filename: string, data: T): boolean {
    // Always update in-memory cache
    this.memoryCache.set(filename, data);

    try {
      this.initFolders();
      const filePath = path.join(this.dbDir, filename);
      const tempPath = `${filePath}.${Date.now()}.tmp`;
      const content = JSON.stringify(data, null, 2);

      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, filePath);

      // Async sync to driveStorageService if available
      import('../services/drive/DriveStorageService.js')
        .then(({ driveStorageService }) => driveStorageService.createFile('config', filename, data))
        .catch(() => {});

      return true;
    } catch (err) {
      console.warn(`[GoogleDriveRepository] Notice: File write for ${filename} handled safely in-memory:`, (err as any)?.message || err);
      // Return true because data is preserved in memoryCache for this runtime session
      return true;
    }
  }

  public createBackup(data: any): string | null {
    try {
      this.initFolders();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${timestamp}.json`;
      const filePath = path.join(this.backupsDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

      import('../services/drive/DriveStorageService.js')
        .then(({ driveStorageService }) => driveStorageService.createFile('backups', filename, data))
        .catch(() => {});

      return filename;
    } catch (err) {
      console.warn('[GoogleDriveRepository] Warning creating local backup file:', (err as any)?.message || err);
      return null;
    }
  }

  public listBackups(): string[] {
    try {
      if (!fs.existsSync(this.backupsDir)) return [];
      return fs.readdirSync(this.backupsDir).filter((f) => f.endsWith('.json'));
    } catch {
      return [];
    }
  }

  public readBackup(filename: string): any | null {
    try {
      const filePath = path.join(this.backupsDir, filename);
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

export const googleDriveRepository = new GoogleDriveRepository();
