import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { env } from '../config/env.js';

export interface DriveFileUploadResult {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  folderId?: string;
}

export interface CustomerFolderStructure {
  customerFolderId: string;
  profilePhotoFolderId: string;
  kycFolderId: string;
}

export interface LoanFolderStructure {
  loanFolderId: string;
  documentsFolderId: string;
  receiptsFolderId: string;
}

export class GoogleDriveService {
  private drive: drive_v3.Drive | null = null;
  private isDriveConfigured = false;
  private rootFolderId = '';

  constructor() {
    this.initGoogleDrive();
  }

  private initGoogleDrive() {
    try {
      const clientEmail = env.GOOGLE_CLIENT_EMAIL;
      let privateKey = env.GOOGLE_PRIVATE_KEY;

      if (clientEmail && privateKey) {
        // Fix newline characters if passed with literal \n
        privateKey = privateKey.replace(/\\n/g, '\n');
        const auth = new google.auth.JWT(
          clientEmail,
          undefined,
          privateKey,
          ['https://www.googleapis.com/auth/drive']
        );
        this.drive = google.drive({ version: 'v3', auth });
        this.isDriveConfigured = true;
        this.rootFolderId = env.GOOGLE_DRIVE_FOLDER_ID;
        console.log('[GoogleDriveService] ✅ Initialized Google Drive API via Service Account:', clientEmail);
        return;
      }

      if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
        const oauth2Client = new google.auth.OAuth2(
          env.GOOGLE_CLIENT_ID,
          env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
        this.drive = google.drive({ version: 'v3', auth: oauth2Client });
        this.isDriveConfigured = true;
        this.rootFolderId = env.GOOGLE_DRIVE_FOLDER_ID;
        console.log('[GoogleDriveService] ✅ Initialized Google Drive API via OAuth2');
        return;
      }

      console.warn('[GoogleDriveService] ⚠️ Google Drive credentials not provided. Drive features will operate in local fallback mode.');
    } catch (err) {
      console.error('[GoogleDriveService] ❌ Failed to initialize Google Drive client:', err);
    }
  }

  public isConnected(): boolean {
    return this.isDriveConfigured && !!this.drive;
  }

  // Get or Create Folder by Name under Parent
  public async getOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
    if (!this.drive) {
      return `local_folder_${folderName}`;
    }

    try {
      const parent = parentId || this.rootFolderId;
      let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      if (parent) {
        query += ` and '${parent}' in parents`;
      }

      const res = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
      }

      // Create folder
      const folderMetadata: drive_v3.Schema$File = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parent ? [parent] : undefined
      };

      const created = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, name'
      });

      return created.data.id!;
    } catch (err) {
      console.error(`[GoogleDriveService] Error in getOrCreateFolder for "${folderName}":`, err);
      return `local_folder_${folderName}`;
    }
  }

  // Create Nested Folder Hierarchy e.g. ["KKV_GOLD_FINANCE", "Customers", "CUST-001", "KYC_Documents"]
  public async createFolderHierarchy(pathSegments: string[]): Promise<string> {
    let currentParentId = this.rootFolderId || undefined;
    for (const segment of pathSegments) {
      currentParentId = await this.getOrCreateFolder(segment, currentParentId);
    }
    return currentParentId || '';
  }

  // Ensure Customer Folders Structure
  public async ensureCustomerFolders(customerId: string): Promise<CustomerFolderStructure> {
    const kkvRoot = await this.getOrCreateFolder('KKV_GOLD_FINANCE', this.rootFolderId);
    const customersFolder = await this.getOrCreateFolder('Customers', kkvRoot);
    const customerFolderId = await this.getOrCreateFolder(customerId, customersFolder);

    const profilePhotoFolderId = await this.getOrCreateFolder('Profile_Photo', customerFolderId);
    const kycFolderId = await this.getOrCreateFolder('KYC_Documents', customerFolderId);

    return {
      customerFolderId,
      profilePhotoFolderId,
      kycFolderId
    };
  }

  // Ensure Loan Folders Structure
  public async ensureLoanFolders(loanId: string): Promise<LoanFolderStructure> {
    const kkvRoot = await this.getOrCreateFolder('KKV_GOLD_FINANCE', this.rootFolderId);
    const loansFolder = await this.getOrCreateFolder('Loans', kkvRoot);
    const loanFolderId = await this.getOrCreateFolder(loanId, loansFolder);

    const documentsFolderId = await this.getOrCreateFolder('Loan_Documents', loanFolderId);
    const receiptsFolderId = await this.getOrCreateFolder('Receipts', loanFolderId);

    return {
      loanFolderId,
      documentsFolderId,
      receiptsFolderId
    };
  }

  // Upload File (from Buffer)
  public async uploadFile(
    file: { originalname: string; mimetype: string; buffer: Buffer },
    parentFolderId?: string
  ): Promise<DriveFileUploadResult> {
    if (!this.drive) {
      // Local fallback file ID
      const mockFileId = `local_file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return {
        fileId: mockFileId,
        name: file.originalname,
        mimeType: file.mimetype,
        webViewLink: `#local-preview-${mockFileId}`,
        folderId: parentFolderId
      };
    }

    try {
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      const targetFolder = parentFolderId || this.rootFolderId;
      const fileMetadata: drive_v3.Schema$File = {
        name: file.originalname,
        parents: targetFolder ? [targetFolder] : undefined
      };

      const media = {
        mimeType: file.mimetype,
        body: bufferStream
      };

      const res = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, mimeType, webViewLink, webContentLink'
      });

      const fileId = res.data.id!;

      // Make file reader accessible via link
      try {
        await this.drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
      } catch (permErr) {
        // Ignore permission warnings if domain restricted
      }

      console.log(`[GoogleDriveService] Uploaded file "${file.originalname}" -> Drive File ID: ${fileId}`);

      return {
        fileId,
        name: res.data.name || file.originalname,
        mimeType: res.data.mimeType || file.mimetype,
        webViewLink: res.data.webViewLink || undefined,
        webContentLink: res.data.webContentLink || undefined,
        folderId: targetFolder
      };
    } catch (err) {
      console.error(`[GoogleDriveService] Error uploading file "${file.originalname}":`, err);
      throw err;
    }
  }

  // List Files in Folder
  public async listFiles(folderId?: string, queryStr?: string): Promise<drive_v3.Schema$File[]> {
    if (!this.drive) return [];

    try {
      const targetFolder = folderId || this.rootFolderId;
      let query = 'trashed = false';
      if (targetFolder) {
        query += ` and '${targetFolder}' in parents`;
      }
      if (queryStr) {
        query += ` and name contains '${queryStr}'`;
      }

      const res = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink)',
        orderBy: 'createdTime desc'
      });

      return res.data.files || [];
    } catch (err) {
      console.error('[GoogleDriveService] Error listing files:', err);
      return [];
    }
  }

  // Get File Details
  public async getFileMetadata(fileId: string): Promise<drive_v3.Schema$File | null> {
    if (!this.drive) return null;

    try {
      const res = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink'
      });
      return res.data;
    } catch (err) {
      console.error(`[GoogleDriveService] Error fetching metadata for file ${fileId}:`, err);
      return null;
    }
  }

  // Download File (Stream)
  public async downloadFile(fileId: string): Promise<{ stream: any; mimeType: string; name: string }> {
    if (!this.drive) {
      throw new Error('Google Drive API is not connected.');
    }

    try {
      const meta = await this.getFileMetadata(fileId);
      const res = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return {
        stream: res.data,
        mimeType: meta?.mimeType || 'application/octet-stream',
        name: meta?.name || `file_${fileId}`
      };
    } catch (err) {
      console.error(`[GoogleDriveService] Error downloading file ${fileId}:`, err);
      throw err;
    }
  }

  // Delete File
  public async deleteFile(fileId: string): Promise<boolean> {
    if (!this.drive) return true;

    try {
      await this.drive.files.delete({ fileId });
      console.log(`[GoogleDriveService] Deleted Drive file ${fileId}`);
      return true;
    } catch (err) {
      console.error(`[GoogleDriveService] Error deleting Drive file ${fileId}:`, err);
      return false;
    }
  }

  // Search Files
  public async searchFiles(queryStr: string, folderId?: string): Promise<drive_v3.Schema$File[]> {
    return this.listFiles(folderId, queryStr);
  }
}

export const googleDriveService = new GoogleDriveService();
