import fs from 'fs';
import path from 'path';
import { driveService } from './DriveService.js';
import { driveFolderService } from './DriveFolderService.js';

export class DriveStorageService {
  private memoryCache: Map<string, any> = new Map();

  private getCacheKey(subFolder: string, fileName: string): string {
    return `${subFolder}:${fileName}`;
  }

  public async createFile<T>(subFolder: string, fileName: string, data: T): Promise<boolean> {
    const key = this.getCacheKey(subFolder, fileName);
    this.memoryCache.set(key, data);

    try {
      // 1. Local / Serverless disk storage
      const dirPath = driveFolderService.getLocalFolderPath(subFolder);
      const filePath = path.join(dirPath, fileName);
      const tempPath = `${filePath}.${Date.now()}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, filePath);

      // 2. Google Drive storage if connected
      if (driveService.isConnected()) {
        const folderId = driveFolderService.getDriveFolderId(subFolder);
        await driveService.uploadJsonFile(fileName, data, folderId);
      }
      return true;
    } catch (err) {
      console.warn(`[DriveStorageService] Notice: File write for ${subFolder}/${fileName} preserved in-memory:`, (err as any)?.message || err);
      return true;
    }
  }

  public async readFile<T>(subFolder: string, fileName: string, fallback: T): Promise<T> {
    const key = this.getCacheKey(subFolder, fileName);
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) as T;
    }

    try {
      // 1. Try Google Drive if connected
      if (driveService.isConnected()) {
        const folderId = driveFolderService.getDriveFolderId(subFolder);
        const driveData = await driveService.readJsonFile<T>(fileName, folderId);
        if (driveData !== null) {
          this.memoryCache.set(key, driveData);
          return driveData;
        }
      }

      // 2. Fallback to Local disk storage
      const dirPath = driveFolderService.getLocalFolderPath(subFolder);
      const filePath = path.join(dirPath, fileName);
      if (!fs.existsSync(filePath)) {
        this.memoryCache.set(key, fallback);
        return fallback;
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as T;
      this.memoryCache.set(key, parsed);
      return parsed;
    } catch (err) {
      console.warn(`[DriveStorageService] Notice: Reading ${subFolder}/${fileName} using fallback:`, (err as any)?.message || err);
      return this.memoryCache.has(key) ? (this.memoryCache.get(key) as T) : fallback;
    }
  }

  public async updateFile<T>(subFolder: string, fileName: string, data: T): Promise<boolean> {
    return this.createFile(subFolder, fileName, data);
  }

  public async deleteFile(subFolder: string, fileName: string): Promise<boolean> {
    const key = this.getCacheKey(subFolder, fileName);
    this.memoryCache.delete(key);

    try {
      const dirPath = driveFolderService.getLocalFolderPath(subFolder);
      const filePath = path.join(dirPath, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (err) {
      console.warn(`[DriveStorageService] Notice: Deleting file ${subFolder}/${fileName}:`, (err as any)?.message || err);
      return true;
    }
  }

  public async listFiles(subFolder: string): Promise<string[]> {
    try {
      const dirPath = driveFolderService.getLocalFolderPath(subFolder);
      if (!fs.existsSync(dirPath)) return [];
      return fs.readdirSync(dirPath).filter(f => !f.endsWith('.tmp'));
    } catch {
      return [];
    }
  }

  public async searchFiles(subFolder: string, queryStr: string): Promise<string[]> {
    const files = await this.listFiles(subFolder);
    return files.filter(f => f.toLowerCase().includes(queryStr.toLowerCase()));
  }

  public async createFolder(parentSubFolder: string, newFolderName: string): Promise<string> {
    const fullSubFolder = `${parentSubFolder}/${newFolderName}`;
    driveFolderService.getLocalFolderPath(fullSubFolder);
    if (driveService.isConnected()) {
      const parentDriveId = driveFolderService.getDriveFolderId(parentSubFolder);
      return driveService.getOrCreateFolder(newFolderName, parentDriveId);
    }
    return fullSubFolder;
  }

  public async backupFile(fileName: string, data: any): Promise<string | null> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${timestamp}_${fileName}`;
      await this.createFile('backups', backupName, data);
      return backupName;
    } catch (err) {
      console.warn('[DriveStorageService] Notice: Creating backup file:', (err as any)?.message || err);
      return null;
    }
  }
}

export const driveStorageService = new DriveStorageService();
