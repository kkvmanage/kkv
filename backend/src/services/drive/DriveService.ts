import { google, drive_v3 } from 'googleapis';
import { env } from '../../config/env.js';
import { driveTokenService } from './DriveTokenService.js';

export class DriveService {
  private drive: drive_v3.Drive | null = null;
  private oauth2Client: any = null;
  private isDriveConfigured = false;
  private rootFolderId = '';

  constructor() {
    this.initGoogleDrive();
  }

  public initGoogleDrive(): boolean {
    try {
      this.rootFolderId = (env.GOOGLE_DRIVE_ROOT_FOLDER_ID || env.GOOGLE_DRIVE_FOLDER_ID || '').trim();

      const clientId = env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      const redirectUri = env.GOOGLE_REDIRECT_URI;

      if (!clientId || !clientSecret) {
        console.log('[DriveService] Google OAuth credentials (CLIENT_ID / CLIENT_SECRET) not configured.');
        this.isDriveConfigured = false;
        this.drive = null;
        return false;
      }

      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      // Listen for automatically refreshed tokens from Google OAuth client
      this.oauth2Client.on('tokens', (tokens: any) => {
        if (tokens.refresh_token) {
          console.log('[DriveService] Received updated refresh token from OAuth client');
          driveTokenService.saveTokens({ refreshToken: tokens.refresh_token });
        }
      });

      // Fetch stored refresh token (or fallback to env variable if present)
      const refreshToken = driveTokenService.getRefreshToken() || env.GOOGLE_REFRESH_TOKEN;

      if (refreshToken) {
        this.oauth2Client.setCredentials({ refresh_token: refreshToken });
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        this.isDriveConfigured = true;
        console.log('[DriveService] Initialized Google Drive API via OAuth 2.0 Client');
        console.log(`[DriveService] Configured Root Folder ID: ${this.rootFolderId}`);
        return true;
      }

      console.log('[DriveService] Google Drive OAuth refresh token not available — waiting for user authorization');
      this.isDriveConfigured = false;
      this.drive = null;
      return false;
    } catch (err) {
      console.warn('[DriveService] Failed to initialize Google Drive OAuth client:', err);
      this.isDriveConfigured = false;
      this.drive = null;
      return false;
    }
  }

  public isConnected(): boolean {
    return this.isDriveConfigured && !!this.drive && driveTokenService.hasRefreshToken();
  }

  public getOAuthClient(): any {
    if (!this.oauth2Client) {
      const clientId = env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      const redirectUri = env.GOOGLE_REDIRECT_URI;

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth Client ID and Secret must be configured in environment.');
      }

      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );
    }
    return this.oauth2Client;
  }

  public getRootFolderId(): string {
    return this.rootFolderId;
  }

  /**
   * Verify that the configured root folder exists and is accessible using drive.files.get.
   * Throws explicit error if inaccessible or permission is missing.
   */
  public async verifyRootFolderAccess(): Promise<{ id: string; name: string }> {
    if (!driveTokenService.hasRefreshToken() && !env.GOOGLE_REFRESH_TOKEN) {
      throw new Error('Google Drive is not connected. Please connect your Google account first.');
    }

    if (!this.isConnected() || !this.drive) {
      // Attempt re-init
      const success = this.initGoogleDrive();
      if (!success || !this.drive) {
        throw new Error('Google Drive authorization expired or is incomplete. Please reconnect your Google account.');
      }
    }

    const rootId = (this.rootFolderId || '').trim();
    if (!rootId || rootId === 'KKV_GOLD_FINANCE') {
      throw new Error('Google Drive root folder configuration is invalid.');
    }

    try {
      const res = await this.drive.files.get({
        fileId: rootId,
        fields: 'id, name, mimeType, trashed'
      });

      if (!res.data || res.data.trashed) {
        throw new Error(`The configured Google Drive folder (${rootId}) is in trash or unavailable.`);
      }

      console.log(`[DriveService] Root folder verified successfully: "${res.data.name}" (ID: ${res.data.id})`);
      return { id: res.data.id!, name: res.data.name || '' };
    } catch (err: any) {
      const status = err?.status || err?.code || err?.response?.status;
      const errorMsg = err?.message || String(err);
      console.error(`[DriveService] Root folder access failed for root ID ${rootId}:`, errorMsg);

      if (status === 404) {
        throw new Error(`The configured Google Drive folder cannot be accessed by the authorized Google account.`);
      }
      if (status === 403) {
        throw new Error(`The configured Google Drive folder cannot be accessed by the authorized Google account.`);
      }

      throw new Error(`The configured Google Drive folder cannot be accessed by the authorized Google account.`);
    }
  }

  /**
   * Hierarchical folder creation/resolution.
   * Handles paths like "system/admins" or "system/audit-logs" by splitting by '/'
   * and starting from current parentId or rootFolderId.
   */
  public async getOrCreateFolder(folderPath: string, parentId?: string): Promise<string> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) {
        throw new Error('Google Drive is not connected. Please connect your Google account first.');
      }
    }

    if (!folderPath || folderPath.trim() === '') {
      throw new Error('[DriveService] Folder path cannot be empty.');
    }

    let currentParentId = (parentId || this.rootFolderId || '').trim();

    if (!currentParentId || currentParentId === 'KKV_GOLD_FINANCE') {
      throw new Error('Google Drive root folder configuration is invalid.');
    }

    const segments = folderPath.split('/').map(s => s.trim()).filter(Boolean);
    if (segments.length === 0) {
      return currentParentId;
    }

    let pathProgress = '';
    for (const segment of segments) {
      pathProgress = pathProgress ? `${pathProgress}/${segment}` : segment;
      console.log(`[DriveService] Initializing folder path segment: "${pathProgress}" under parent ID: ${currentParentId}`);
      currentParentId = await this.getOrCreateSingleFolderSegment(segment, currentParentId);
    }

    return currentParentId;
  }

  /**
   * Look up or create a single folder segment under parentFolderId using search query:
   * name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${parentFolderId}' in parents
   */
  private async getOrCreateSingleFolderSegment(folderName: string, parentFolderId: string): Promise<string> {
    if (!parentFolderId || parentFolderId.trim() === '' || parentFolderId === 'KKV_GOLD_FINANCE') {
      throw new Error('Google Drive root folder configuration is invalid.');
    }

    if (!this.drive) {
      throw new Error('Google Drive is not connected. Please connect your Google account first.');
    }

    const cleanParentId = parentFolderId.trim();
    const safeFolderName = folderName.replace(/'/g, "\\'");

    try {
      const query = `name = '${safeFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${cleanParentId}' in parents`;

      const res = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (res.data.files && res.data.files.length > 0) {
        const foundId = res.data.files[0].id!;
        console.log(`[DriveService] Found existing folder "${folderName}" -> ID: ${foundId}`);
        return foundId;
      }

      // Create new folder under cleanParentId
      const folderMetadata: drive_v3.Schema$File = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [cleanParentId]
      };

      const created = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, name'
      });

      const newId = created.data.id!;
      console.log(`[DriveService] Created folder "${folderName}" under parent ID ${cleanParentId} -> ID: ${newId}`);
      return newId;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error(`[DriveService] Error in getOrCreateSingleFolderSegment for "${folderName}":`, msg);
      throw new Error(`Failed to access or create Google Drive folder "${folderName}": ${msg}`);
    }
  }

  // Upload or update JSON file in Drive
  public async uploadJsonFile(fileName: string, content: any, folderId?: string): Promise<string | null> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) {
        throw new Error('Google Drive is not connected. Please connect your Google account first.');
      }
    }

    try {
      const jsonStr = JSON.stringify(content, null, 2);
      const media = {
        mimeType: 'application/json',
        body: jsonStr
      };

      const targetFolder = (folderId || this.rootFolderId || '').trim();
      if (!targetFolder || targetFolder === 'KKV_GOLD_FINANCE') {
        throw new Error('Google Drive root folder configuration is invalid.');
      }

      const safeFileName = fileName.replace(/'/g, "\\'");
      const query = `name = '${safeFileName}' and trashed = false and '${targetFolder}' in parents`;

      const existing = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)'
      });

      if (existing.data.files && existing.data.files.length > 0) {
        const fileId = existing.data.files[0].id!;
        await this.drive.files.update({
          fileId,
          media
        });
        console.log(`[DriveService] Updated JSON file "${fileName}" (File ID: ${fileId})`);
        return fileId;
      }

      const fileMetadata: drive_v3.Schema$File = {
        name: fileName,
        parents: [targetFolder]
      };

      const created = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id'
      });

      const newId = created.data.id!;
      console.log(`[DriveService] Uploaded JSON file "${fileName}" (File ID: ${newId})`);
      return newId;
    } catch (err: any) {
      console.error(`[DriveService] Error uploading JSON file ${fileName}:`, err?.message || err);
      throw err;
    }
  }

  // Read JSON file content from Drive
  public async readJsonFile<T>(fileName: string, folderId?: string): Promise<T | null> {
    if (!this.isConnected() || !this.drive) {
      return null;
    }

    try {
      const targetFolder = (folderId || this.rootFolderId || '').trim();
      if (!targetFolder || targetFolder === 'KKV_GOLD_FINANCE') {
        return null;
      }

      const safeFileName = fileName.replace(/'/g, "\\'");
      const query = `name = '${safeFileName}' and trashed = false and '${targetFolder}' in parents`;

      const res = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)'
      });

      if (!res.data.files || res.data.files.length === 0) {
        return null;
      }

      const fileId = res.data.files[0].id!;
      const download = await this.drive.files.get({
        fileId,
        alt: 'media'
      });

      return download.data as unknown as T;
    } catch (err: any) {
      console.error(`[DriveService] Error reading JSON file ${fileName}:`, err?.message || err);
      return null;
    }
  }
}

export const driveService = new DriveService();
