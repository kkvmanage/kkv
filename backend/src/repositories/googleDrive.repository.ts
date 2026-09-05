import fs from 'fs';
import path from 'path';

export class GoogleDriveRepository {
  private baseDir: string;
  private dbDir: string;
  private backupsDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'KKV_GOLD_FINANCE');
    this.dbDir = path.join(this.baseDir, 'config');
    this.backupsDir = path.join(this.baseDir, 'backups');
    this.initFolders();
  }

  private initFolders(): void {
    try {
      if (!fs.existsSync(this.dbDir)) fs.mkdirSync(this.dbDir, { recursive: true });
      if (!fs.existsSync(this.backupsDir)) fs.mkdirSync(this.backupsDir, { recursive: true });
    } catch (err) {
      console.error('[GoogleDriveRepository] Error initializing storage folders:', err);
    }
  }

  public checkConnection(): boolean {
    return fs.existsSync(this.baseDir);
  }

  public readJson<T>(filename: string, fallback: T): T {
    try {
      const filePath = path.join(this.dbDir, filename);
      if (!fs.existsSync(filePath)) {
        this.writeJson(filename, fallback);
        return fallback;
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`[GoogleDriveRepository] Error reading file ${filename}:`, err);
      return fallback;
    }
  }

  public writeJson<T>(filename: string, data: T): boolean {
    try {
      this.initFolders();
      const filePath = path.join(this.dbDir, filename);
      const tempPath = `${filePath}.tmp`;
      const content = JSON.stringify(data, null, 2);
      
      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, filePath);

      // Async sync to driveStorageService
      import('../services/drive/DriveStorageService.js')
        .then(({ driveStorageService }) => driveStorageService.createFile('config', filename, data))
        .catch(() => {});
      return true;
    } catch (err) {
      console.error(`[GoogleDriveRepository] Error writing file ${filename}:`, err);
      return false;
    }
  }

  public createBackup(data: any): string | null {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${timestamp}.json`;
      const filePath = path.join(this.backupsDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      import('../services/drive/DriveStorageService.js')
        .then(({ driveStorageService }) => driveStorageService.createFile('backups', filename, data))
        .catch(() => {});
      return filename;
    } catch (err) {
      console.error('[GoogleDriveRepository] Error creating backup:', err);
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

