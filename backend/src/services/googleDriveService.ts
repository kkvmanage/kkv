import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { env } from '../config/env.js';
import { driveTokenService } from './drive/DriveTokenService.js';

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

export interface DriveFileUploadResult {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  folderId?: string;
}

export class GoogleDriveService {
  private drive: drive_v3.Drive | null = null;
  private oauth2Client: any = null;
  private rootFolderId: string = (env.GOOGLE_DRIVE_ROOT_FOLDER_ID || env.GOOGLE_DRIVE_FOLDER_ID || '15MY3DHoYCSccsIvh5j31lUOZ6ZrSYdlh').trim();
  private isDriveConfigured: boolean = false;

  constructor() {
    this.initGoogleDrive();
  }

  public initGoogleDrive(): boolean {
    try {
      this.rootFolderId = (env.GOOGLE_DRIVE_ROOT_FOLDER_ID || env.GOOGLE_DRIVE_FOLDER_ID || '15MY3DHoYCSccsIvh5j31lUOZ6ZrSYdlh').trim();

      const clientId = env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      const redirectUri = env.GOOGLE_REDIRECT_URI;

      if (!clientId || !clientSecret) {
        console.warn('[GoogleDriveService] ⚠️ OAuth Client ID and Secret not configured.');
        this.isDriveConfigured = false;
        this.drive = null;
        return false;
      }

      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      const refreshToken = driveTokenService.getRefreshToken() || env.GOOGLE_REFRESH_TOKEN;

      if (refreshToken) {
        this.oauth2Client.setCredentials({ refresh_token: refreshToken });
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        this.isDriveConfigured = true;
        console.log('[GoogleDriveService] ✅ Initialized Google Drive API via OAuth 2.0 Client');
        console.log('[GoogleDriveService] 📁 Root Folder ID configured:', this.rootFolderId);
        return true;
      }

      console.warn('[GoogleDriveService] ⚠️ Google Drive OAuth refresh token not available.');
      this.isDriveConfigured = false;
      this.drive = null;
      return false;
    } catch (err) {
      console.error('[GoogleDriveService] ❌ Failed to initialize Google Drive client:', err);
      this.isDriveConfigured = false;
      this.drive = null;
      return false;
    }
  }

  public isConnected(): boolean {
    return this.isDriveConfigured && !!this.drive && (driveTokenService.hasRefreshToken() || !!env.GOOGLE_REFRESH_TOKEN);
  }

  public getRootFolderId(): string {
    return this.rootFolderId;
  }

  public async testRootFolderAccess(): Promise<{ accessible: boolean; folderName?: string; error?: string }> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) {
        return { accessible: false, error: 'Google Drive is not connected. Please connect your Google account first.' };
      }
    }
    try {
      const res = await this.drive.files.get({
        fileId: this.rootFolderId,
        fields: 'id, name, mimeType, trashed'
      });
      if (res.data && !res.data.trashed) {
        console.log(`[GoogleDriveService] ✅ Root folder access verified: "${res.data.name}" (${res.data.id})`);
        return { accessible: true, folderName: res.data.name || undefined };
      }
      return { accessible: false, error: 'Root folder is in trash or unavailable.' };
    } catch (err: any) {
      const msg = err?.message || 'File not found';
      console.error(`[GoogleDriveService] ❌ Root folder access failed (${this.rootFolderId}):`, msg);
      return {
        accessible: false,
        error: `The configured Google Drive folder cannot be accessed by the authorized Google account.`
      };
    }
  }

  /**
   * Dynamically search for or create a folder on Google Drive.
   * Supports path splitting (e.g., "system/admins") and returns the REAL Google Drive folder ID.
   */
  public async getOrCreateFolder(folderPath: string, parentId?: string): Promise<string> {
    if (!this.drive) {
      throw new Error('[GoogleDriveService] Google Drive API is not initialized or connected.');
    }

    let currentParent = (parentId || this.rootFolderId || '').trim();

    // Strict check: Never accept fake local fallback strings or folder names as Google Drive parent IDs
    if (!currentParent || currentParent.startsWith('local_') || currentParent === 'KKV_GOLD_FINANCE') {
      throw new Error(`[GoogleDriveService] Cannot search/create folder "${folderPath}" with invalid parent ID "${currentParent}".`);
    }

    const segments = folderPath.split('/').map(s => s.trim()).filter(Boolean);
    if (segments.length === 0) {
      return currentParent;
    }

    let currentPath = '';
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      console.log(`[GoogleDriveService] Processing folder segment: "${currentPath}" (parent ID: ${currentParent})`);
      currentParent = await this.getOrCreateSingleSegment(segment, currentParent);
    }

    return currentParent;
  }

  private async getOrCreateSingleSegment(folderName: string, parentFolderId: string): Promise<string> {
    if (!this.drive) {
      throw new Error('[GoogleDriveService] Google Drive API is not initialized.');
    }

    const safeName = folderName.replace(/'/g, "\\'");
    try {
      const query = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${parentFolderId}' in parents`;

      const res = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (res.data.files && res.data.files.length > 0) {
        const foundId = res.data.files[0].id!;
        console.log(`[GoogleDriveService] Found existing Drive folder "${folderName}" -> ID: ${foundId}`);
        return foundId;
      }

      // Create new folder under parentFolderId
      const folderMetadata: drive_v3.Schema$File = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
      };

      const created = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, name'
      });

      const newId = created.data.id!;
      console.log(`[GoogleDriveService] Created new Drive folder "${folderName}" -> ID: ${newId}`);
      return newId;
    } catch (err: any) {
      console.error(`[GoogleDriveService] Error in getOrCreateSingleSegment for "${folderName}":`, err?.message || err);
      throw new Error(`Failed to access or create Google Drive folder "${folderName}": ${err?.message || 'Drive API error'}`);
    }
  }

  // Ensure Customer Folders Structure under KKV_GOLD_FINANCE/Customers/
  public async ensureCustomerFolders(customerId: string): Promise<CustomerFolderStructure> {
    const rootId = this.rootFolderId;
    const customersFolderId = await this.getOrCreateFolder('Customers', rootId);
    const customerFolderId = await this.getOrCreateFolder(customerId, customersFolderId);

    const profilePhotoFolderId = await this.getOrCreateFolder('Profile_Photo', customerFolderId);
    const kycFolderId = await this.getOrCreateFolder('KYC_Documents', customerFolderId);

    return {
      customerFolderId,
      profilePhotoFolderId,
      kycFolderId
    };
  }

  // Ensure Loan Folders Structure under KKV_GOLD_FINANCE/Loans/
  public async ensureLoanFolders(loanId: string): Promise<LoanFolderStructure> {
    const rootId = this.rootFolderId;
    const loansFolderId = await this.getOrCreateFolder('Loans', rootId);
    const loanFolderId = await this.getOrCreateFolder(loanId, loansFolderId);

    const documentsFolderId = await this.getOrCreateFolder('Loan_Documents', loanFolderId);
    const receiptsFolderId = await this.getOrCreateFolder('Receipts', loanFolderId);

    return {
      loanFolderId,
      documentsFolderId,
      receiptsFolderId
    };
  }

  // Ensure Backups Folder Structure under KKV_GOLD_FINANCE/Backups/
  public async ensureBackupsFolder(deviceId?: string): Promise<string> {
    const rootId = this.rootFolderId;
    if (!rootId) {
      throw new Error('[GoogleDriveService] Root GOOGLE_DRIVE_FOLDER_ID is not configured.');
    }

    // 1. Get or create 'Backups' directly inside the root folder
    const backupsFolderId = await this.getOrCreateFolder('Backups', rootId);

    // 2. Get or create device folder ('Desktop' or 'Mobile') inside 'Backups'
    const deviceName = deviceId
      ? (deviceId.toLowerCase().includes('mobile') ? 'Mobile' : 'Desktop')
      : 'Desktop';

    const deviceFolderId = await this.getOrCreateFolder(deviceName, backupsFolderId);
    return deviceFolderId;
  }

  // Upload File (from Buffer) to Google Drive
  public async uploadFile(
    file: { originalname: string; mimetype: string; buffer: Buffer },
    parentFolderId?: string
  ): Promise<DriveFileUploadResult> {
    if (!this.drive) {
      throw new Error('[GoogleDriveService] Cannot upload file: Google Drive API is not connected.');
    }

    const targetFolder = parentFolderId || this.rootFolderId;
    if (targetFolder && targetFolder.startsWith('local_')) {
      throw new Error(`[GoogleDriveService] Invalid parent folder ID "${targetFolder}" for file upload.`);
    }

    try {
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

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

      // Attempt to grant public link read permission
      try {
        await this.drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
      } catch {
        // Ignore permission grant error if restricted
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
    } catch (err: any) {
      console.error(`[GoogleDriveService] Error uploading file "${file.originalname}":`, err?.message || err);
      throw err;
    }
  }

  // Verify that a file physically exists on Google Drive
  public async verifyFileExists(fileId: string): Promise<{ exists: boolean; name?: string; size?: number }> {
    if (!this.drive) return { exists: false };
    try {
      const res = await this.drive.files.get({
        fileId,
        fields: 'id, name, size, mimeType, parents, trashed'
      });
      if (res.data && !res.data.trashed) {
        return {
          exists: true,
          name: res.data.name || undefined,
          size: res.data.size ? parseInt(res.data.size, 10) : undefined
        };
      }
      return { exists: false };
    } catch (err: any) {
      console.error(`[GoogleDriveService] Verification failed for Drive File ID ${fileId}:`, err?.message || err);
      return { exists: false };
    }
  }

  // List Files in Folder
  public async listFiles(folderId?: string, queryStr?: string): Promise<drive_v3.Schema$File[]> {
    if (!this.drive) return [];

    try {
      const targetFolder = folderId || this.rootFolderId;
      let query = 'trashed = false';
      if (targetFolder && !targetFolder.startsWith('local_')) {
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

  // Get File Metadata
  public async getFileMetadata(fileId: string): Promise<drive_v3.Schema$File | null> {
    if (!this.drive || fileId.startsWith('local_')) return null;

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
    if (!this.drive || fileId.startsWith('local_')) {
      throw new Error('Google Drive API is not connected or file ID is invalid.');
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
    if (!this.drive || fileId.startsWith('local_')) return true;

    try {
      await this.drive.files.delete({ fileId });
      console.log(`[GoogleDriveService] Deleted Drive file ${fileId}`);
      return true;
    } catch (err) {
      console.error(`[GoogleDriveService] Error deleting Drive file ${fileId}:`, err);
      return false;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
