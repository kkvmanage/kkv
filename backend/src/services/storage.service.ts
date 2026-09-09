import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';

export interface SaveFileOptions {
  category?: 'customer' | 'loan' | 'rental' | 'backup' | 'general';
  mimeType?: string;
  originalName?: string;
}

export interface StoredFileMetadata {
  fileId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  relativePath: string;
  createdAt: string;
}

export class StorageService {
  private baseStorageDir: string;
  private allowedMimeTypes: string[] = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/json',
    'application/zip',
    'text/csv'
  ];

  constructor(storageDir?: string) {
    this.baseStorageDir = storageDir || path.resolve(env.LOCAL_STORAGE_PATH || path.resolve(process.cwd(), 'data'), 'uploads');
    this.ensureDirectoryExists(this.baseStorageDir);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private sanitizeCategory(category?: string): string {
    const clean = (category || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return clean || 'general';
  }

  private getSafeExtension(originalName?: string, mimeType?: string): string {
    if (originalName && originalName.includes('.')) {
      const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
      if (['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.json', '.zip', '.csv'].includes(ext)) {
        return ext;
      }
    }

    switch (mimeType?.toLowerCase()) {
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'application/pdf':
        return '.pdf';
      case 'application/zip':
        return '.zip';
      case 'application/json':
        return '.json';
      case 'text/csv':
        return '.csv';
      default:
        return '.bin';
    }
  }

  private resolveSafePath(relativePath: string): string {
    const resolved = path.resolve(this.baseStorageDir, relativePath);
    // Path traversal check
    if (!resolved.startsWith(path.resolve(this.baseStorageDir))) {
      throw new Error('Security Error: Illegal path traversal detected.');
    }
    return resolved;
  }

  /**
   * Saves a buffer to server local storage inside a structured category folder.
   */
  public async saveFile(buffer: Buffer, options: SaveFileOptions = {}): Promise<StoredFileMetadata> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Cannot save empty file buffer.');
    }

    const mimeType = (options.mimeType || 'application/octet-stream').toLowerCase();
    if (!this.allowedMimeTypes.includes(mimeType) && !mimeType.startsWith('image/')) {
      throw new Error(`Unsupported file MIME type: ${mimeType}`);
    }

    const category = this.sanitizeCategory(options.category);
    const categoryDir = path.resolve(this.baseStorageDir, category);
    this.ensureDirectoryExists(categoryDir);

    const fileId = uuidv4();
    const ext = this.getSafeExtension(options.originalName, mimeType);
    const fileName = `${fileId}${ext}`;
    const relativePath = path.join(category, fileName);
    const targetPath = this.resolveSafePath(relativePath);

    await fs.promises.writeFile(targetPath, buffer);

    return {
      fileId,
      fileName,
      originalName: options.originalName || fileName,
      mimeType,
      sizeBytes: buffer.length,
      category,
      relativePath,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves a file buffer from server local storage.
   */
  public async getFile(relativePath: string): Promise<{ buffer: Buffer; size: number }> {
    const safePath = this.resolveSafePath(relativePath);
    if (!fs.existsSync(safePath)) {
      throw new Error('File not found in storage.');
    }
    const buffer = await fs.promises.readFile(safePath);
    return { buffer, size: buffer.length };
  }

  /**
   * Deletes a file safely from server local storage.
   */
  public async deleteFile(relativePath: string): Promise<boolean> {
    try {
      const safePath = this.resolveSafePath(relativePath);
      if (fs.existsSync(safePath)) {
        await fs.promises.unlink(safePath);
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn(`[StorageService] Warning deleting file '${relativePath}':`, err?.message || err);
      return false;
    }
  }

  /**
   * Checks if a file exists.
   */
  public fileExists(relativePath: string): boolean {
    try {
      const safePath = this.resolveSafePath(relativePath);
      return fs.existsSync(safePath);
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
export default storageService;
