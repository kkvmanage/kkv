import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { driveTokenService } from './drive/DriveTokenService.js';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';

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

export interface DriveFolderConfig {
  rootFolderId: string;
  rootFolderName: string;
  backupsFolderId: string;
  backupsFolderName: string;
  fullBackupsFolderId: string;
  fullBackupsFolderName: string;
  emergencyBackupsFolderId?: string;
  emergencyBackupsFolderName?: string;
  lastVerifiedAt?: string;
}

export interface DriveHealthResult {
  success: boolean;
  configured: boolean;
  authMode: 'OAUTH' | 'SERVICE_ACCOUNT' | 'NONE';
  principal?: string;
  googleAccount: string;
  sharedDrive?: boolean;
  sharedDriveId?: string;
  rootFolder: string;
  backupFolder: string;
  fullBackupFolder: string;
  rootFolderId?: string;
  folderId?: string;
  backupsFolderId?: string;
  fullBackupsFolderId?: string;
  driveAccessible: boolean;
  folderAccessible: boolean;
  folderName?: string;
  folderIdConfigured: boolean;
  writable?: boolean;
  canUpload: boolean;
  status: 'READY' | 'REAUTH_REQUIRED' | 'FOLDER_ACCESS_DENIED' | 'NOT_CONNECTED' | 'FAILED' | 'INVALID_TARGET' | 'CONFIGURATION_MISSING' | 'NOT_READY';
  errorCode?: string;
  message?: string;
  connected?: boolean;
}

const FOLDER_CONFIG_FILE = 'drive_folder_config.json';

function calculateSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export class GoogleDriveService {
  public drive: drive_v3.Drive | null = null;
  private oauth2Client: OAuth2Client | null = null;
  private authType: 'OAUTH' | 'SERVICE_ACCOUNT' | 'NONE' = 'NONE';
  private principalEmail: string = '';
  private rootFolderId: string = (env.GOOGLE_DRIVE_ROOT_FOLDER_ID || env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
  private isDriveConfigured: boolean = false;
  private folderConfigCache: DriveFolderConfig | null = null;

  constructor() {
    this.initGoogleDrive();
  }

  private hasLoggedStatus: boolean = false;

  /**
   * Initializes Google Drive with OAuth 2.0 user authentication for goldfinancekkv@gmail.com.
   * Silently refreshes tokens using the refresh token in the background.
   */
  public initGoogleDrive(silent: boolean = false): boolean {
    try {
      this.rootFolderId = (env.GOOGLE_DRIVE_FOLDER_ID || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1gqDbQuvf2EWkh_y-kiqRDBV3fOpEEGPx').trim();

      // 1. PRIMARY: Google OAuth 2.0 User Authentication
      const clientId = env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      const redirectUri = env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI;
      const refreshToken = env.GOOGLE_REFRESH_TOKEN || driveTokenService.getRefreshToken();

      if (clientId && clientSecret && refreshToken) {
        try {
          const oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
          oauthClient.setCredentials({ refresh_token: refreshToken });

          // Auto-persist new access tokens when refreshed
          oauthClient.on('tokens', (tokens) => {
            console.log('[GoogleDriveService] 🔄 Auto-refreshed OAuth access token from Google.');
            driveTokenService.saveTokens({
              refreshToken: tokens.refresh_token || refreshToken,
              accessToken: tokens.access_token || undefined,
              expiryDate: tokens.expiry_date || undefined
            });
          });

          this.oauth2Client = oauthClient;
          this.drive = google.drive({ version: 'v3', auth: oauthClient });
          this.authType = 'OAUTH';
          this.principalEmail = env.GOOGLE_DRIVE_ACCOUNT_EMAIL || driveTokenService.getGoogleAccount() || 'goldfinancekkv@gmail.com';
          this.isDriveConfigured = true;

          if (!this.hasLoggedStatus && !silent) {
            console.log(`[GoogleDriveService] ✅ Initialized Google Drive API via OAuth 2.0 (${this.principalEmail})`);
            this.hasLoggedStatus = true;
          }
          return true;
        } catch (oaErr: any) {
          if (!silent) {
            console.warn('[GoogleDriveService] ⚠️ OAuth client initialization error:', oaErr?.message || oaErr);
          }
        }
      }

      // 2. Fallback: Service Account if explicitly configured and no OAuth
      const serviceEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const rawPrivateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

      if (serviceEmail && rawPrivateKey) {
        try {
          const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
          const jwtClient = new google.auth.JWT(
            serviceEmail,
            undefined,
            privateKey,
            ['https://www.googleapis.com/auth/drive']
          );
          this.drive = google.drive({ version: 'v3', auth: jwtClient });
          this.authType = 'SERVICE_ACCOUNT';
          this.principalEmail = serviceEmail;
          this.isDriveConfigured = true;
          if (!this.hasLoggedStatus && !silent) {
            console.log(`[GoogleDriveService] 🏢 Initialized Google Drive API via Service Account (${serviceEmail})`);
            this.hasLoggedStatus = true;
          }
          return true;
        } catch (saErr: any) {
          if (!silent) {
            console.warn('[GoogleDriveService] ⚠️ Service Account initialization failed:', saErr?.message || saErr);
          }
        }
      }

      // 3. Not Connected - Log single warning only once
      this.authType = 'NONE';
      this.principalEmail = '';
      this.isDriveConfigured = false;
      this.drive = null;
      this.oauth2Client = null;
      if (!this.hasLoggedStatus && !silent) {
        console.log('[GoogleDriveService] Google Drive is not connected. Optional integration disabled.');
        this.hasLoggedStatus = true;
      }
      return false;
    } catch (err: any) {
      this.authType = 'NONE';
      this.principalEmail = '';
      this.isDriveConfigured = false;
      this.drive = null;
      this.oauth2Client = null;
      if (!this.hasLoggedStatus && !silent) {
        console.log('[GoogleDriveService] Google Drive is not connected. Optional integration disabled.');
        this.hasLoggedStatus = true;
      }
      return false;
    }
  }

  public isConnected(): boolean {
    return this.isDriveConfigured && !!this.drive;
  }

  public getAuthType(): 'OAUTH' | 'SERVICE_ACCOUNT' | 'NONE' {
    return this.authType;
  }

  public getAuthMode(): 'OAUTH' | 'SERVICE_ACCOUNT' | 'NONE' {
    return this.authType;
  }

  public getPrincipalEmail(): string {
    if (this.authType === 'SERVICE_ACCOUNT') {
      return this.principalEmail || env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    }
    return driveTokenService.getGoogleAccount() || this.principalEmail || env.GOOGLE_DRIVE_ACCOUNT_EMAIL || '';
  }

  public getConnectedAccount(): string {
    return this.getPrincipalEmail();
  }

  public getRedirectUri(): string {
    return env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI;
  }

  public getOAuthClient(): OAuth2Client {
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri = env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth Client ID and Secret are not configured in environment.');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Ensures active access token is valid before making Drive API calls.
   * If token is expired, refreshes it automatically using the stored refresh token.
   */
  public async ensureValidAccessToken(): Promise<void> {
    if (this.authType !== 'OAUTH' || !this.oauth2Client) {
      return;
    }

    try {
      await this.oauth2Client.getAccessToken();
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error('[GoogleDriveService] ❌ OAuth token refresh failed:', errMsg);
      if (
        errMsg.includes('invalid_grant') ||
        errMsg.includes('Token has been expired or revoked') ||
        err?.code === 400 ||
        err?.code === 401
      ) {
        throw new Error('GOOGLE_DRIVE_REAUTH_REQUIRED: Your Google Drive authorization has expired or was revoked. Please reconnect your Google account in Settings.');
      }
      throw err;
    }
  }

  /**
   * Retrieves or loads cached folder configuration.
   */
  public getStoredFolderConfig(): DriveFolderConfig | null {
    if (this.folderConfigCache) return this.folderConfigCache;
    const stored = googleDriveRepository.readJson<DriveFolderConfig | null>(FOLDER_CONFIG_FILE, null);
    if (stored && stored.rootFolderId && stored.fullBackupsFolderId) {
      this.folderConfigCache = stored;
      return stored;
    }
    return null;
  }

  public saveFolderConfig(config: DriveFolderConfig): void {
    this.folderConfigCache = config;
    googleDriveRepository.writeJson(FOLDER_CONFIG_FILE, config);
    console.log(`[GoogleDriveService] 📁 Persisted single-destination backup folder structure:`, {
      root: config.rootFolderName,
      backups: config.backupsFolderName,
      fullBackups: config.fullBackupsFolderName,
      fullBackupsFolderId: config.fullBackupsFolderId
    });
  }

  /**
   * Directly verifies the configured kkv finance Google Drive target folder (Personal My Drive).
   */
  public async verifyTargetFolder(): Promise<{
    folderId: string;
    folderName: string;
    sharedDriveId?: string;
    isFolder: boolean;
    isWritable: boolean;
    isSharedDrive: boolean;
  }> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) {
        const err = new Error('Google Drive is not connected.');
        (err as any).code = 'GOOGLE_DRIVE_NOT_CONNECTED';
        throw err;
      }
    }

    await this.ensureValidAccessToken();

    const folderId = (env.GOOGLE_DRIVE_FOLDER_ID || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1gqDbQuvf2EWkh_y-kiqRDBV3fOpEEGPx').trim();

    console.log(`[GoogleDriveService] ⚙️ Safe Runtime Config:`);
    console.log(`  GOOGLE_DRIVE_AUTH_MODE=${this.authType.toLowerCase()}`);
    console.log(`  GOOGLE_DRIVE_FOLDER_ID=${folderId}`);
    console.log(`  GOOGLE_DRIVE_ACCOUNT=${this.getPrincipalEmail()}`);
    console.log(`  GOOGLE_DRIVE_CLIENT_CONFIGURED=${Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)}`);
    console.log(`  GOOGLE_DRIVE_REFRESH_TOKEN_CONFIGURED=${Boolean(env.GOOGLE_REFRESH_TOKEN)}`);

    if (!folderId) {
      const err = new Error('GOOGLE_DRIVE_FOLDER_NOT_CONFIGURED: GOOGLE_DRIVE_FOLDER_ID is not set in backend/.env.');
      (err as any).code = 'GOOGLE_DRIVE_FOLDER_NOT_CONFIGURED';
      throw err;
    }

    try {
      const res = await this.drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, trashed, capabilities, driveId, parents, owners',
        supportsAllDrives: true
      });

      if (!res.data || res.data.trashed) {
        const err = new Error(`GOOGLE_DRIVE_FOLDER_NOT_FOUND: Configured folder "${folderId}" was not found or is in trash.`);
        (err as any).code = 'GOOGLE_DRIVE_FOLDER_NOT_FOUND';
        throw err;
      }

      const isFolder = res.data.mimeType === 'application/vnd.google-apps.folder';
      if (!isFolder) {
        const err = new Error(`GOOGLE_DRIVE_FOLDER_NOT_FOUND: Configured Google Drive target "${folderId}" is not a folder.`);
        (err as any).code = 'GOOGLE_DRIVE_FOLDER_NOT_FOUND';
        throw err;
      }

      const driveId = res.data.driveId;
      const isSharedDrive = Boolean(driveId);

      const isWritable = Boolean(res.data.capabilities?.canAddChildren || res.data.capabilities?.canEdit);
      if (!isWritable) {
        const err = new Error(`GOOGLE_DRIVE_FOLDER_ACCESS_DENIED: The configured Drive folder "${folderId}" is not writable by ${this.getPrincipalEmail()}.`);
        (err as any).code = 'GOOGLE_DRIVE_FOLDER_ACCESS_DENIED';
        throw err;
      }

      return {
        folderId: res.data.id || folderId,
        folderName: res.data.name || 'kkv finance',
        sharedDriveId: driveId || undefined,
        isFolder,
        isWritable,
        isSharedDrive
      };
    } catch (err: any) {
      if ((err as any).code) throw err;
      const status = err?.status || err?.code || err?.response?.status;
      const msg = err?.message || String(err);
      if (msg.includes('invalid_grant') || status === 401) {
        const e = new Error('GOOGLE_DRIVE_REAUTH_REQUIRED: Google Drive OAuth authentication failed.');
        (e as any).code = 'GOOGLE_DRIVE_REAUTH_REQUIRED';
        throw e;
      }
      if (status === 404) {
        const e = new Error(`GOOGLE_DRIVE_FOLDER_NOT_FOUND: The configured kkv finance folder ID "${folderId}" was not found on Google Drive or is not accessible to ${this.getPrincipalEmail()}.`);
        (e as any).code = 'GOOGLE_DRIVE_FOLDER_NOT_FOUND';
        throw e;
      }
      if (status === 403) {
        const e = new Error(`GOOGLE_DRIVE_FOLDER_ACCESS_DENIED: The configured Drive folder "${folderId}" is not accessible to ${this.getPrincipalEmail()}.`);
        (e as any).code = 'GOOGLE_DRIVE_FOLDER_ACCESS_DENIED';
        throw e;
      }
      throw err;
    }
  }

  /**
   * Resolves and verifies the single centralized backup destination:
   * My Drive -> KKV GOLD FINANCE -> kkv finance
   */
  public async ensureBackupFolderHierarchy(): Promise<DriveFolderConfig> {
    const target = await this.verifyTargetFolder();
    const config: DriveFolderConfig = {
      rootFolderId: target.folderId,
      rootFolderName: target.folderName,
      backupsFolderId: target.folderId,
      backupsFolderName: target.folderName,
      fullBackupsFolderId: target.folderId,
      fullBackupsFolderName: target.folderName,
      lastVerifiedAt: new Date().toISOString()
    };
    this.saveFolderConfig(config);
    return config;
  }

  public getRootFolderId(): string {
    const config = this.getStoredFolderConfig();
    return config?.rootFolderId || (env.GOOGLE_DRIVE_FOLDER_ID || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1gqDbQuvf2EWkh_y-kiqRDBV3fOpEEGPx').trim();
  }

  public getBackupsFolderId(): string {
    return this.getRootFolderId();
  }

  public getFullBackupsFolderId(): string {
    return this.getRootFolderId();
  }

  /**
   * Diagnostic Health Check without exposing sensitive credentials.
   */
  public async getDriveHealth(): Promise<DriveHealthResult> {
    const configured = this.isConnected();
    const configuredFolderId = (env.GOOGLE_DRIVE_FOLDER_ID || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1gqDbQuvf2EWkh_y-kiqRDBV3fOpEEGPx').trim();

    if (!configured || !this.drive) {
      return {
        success: false,
        connected: false,
        configured: false,
        authMode: this.authType,
        principal: this.getPrincipalEmail(),
        googleAccount: this.getPrincipalEmail(),
        sharedDrive: false,
        sharedDriveId: undefined,
        rootFolder: 'kkv finance',
        backupFolder: 'kkv finance',
        fullBackupFolder: 'kkv finance',
        rootFolderId: configuredFolderId,
        folderId: configuredFolderId,
        backupsFolderId: configuredFolderId,
        fullBackupsFolderId: configuredFolderId,
        driveAccessible: false,
        folderAccessible: false,
        folderName: 'kkv finance',
        folderIdConfigured: !!configuredFolderId,
        canUpload: false,
        status: 'NOT_CONNECTED',
        errorCode: 'GOOGLE_DRIVE_NOT_CONNECTED',
        message: 'Google Drive is not connected.'
      };
    }

    try {
      await this.ensureValidAccessToken();
      const folder = await this.verifyTargetFolder();

      return {
        success: folder.isFolder && folder.isWritable,
        connected: folder.isFolder && folder.isWritable,
        configured: true,
        authMode: this.authType,
        principal: this.getPrincipalEmail(),
        googleAccount: this.getPrincipalEmail(),
        sharedDrive: folder.isSharedDrive,
        sharedDriveId: folder.sharedDriveId,
        rootFolder: folder.folderName,
        backupFolder: folder.folderName,
        fullBackupFolder: folder.folderName,
        rootFolderId: folder.folderId,
        folderId: folder.folderId,
        backupsFolderId: folder.folderId,
        fullBackupsFolderId: folder.folderId,
        driveAccessible: true,
        folderAccessible: folder.isFolder,
        folderName: folder.folderName,
        folderIdConfigured: true,
        writable: folder.isWritable,
        canUpload: folder.isFolder && folder.isWritable,
        status: (folder.isFolder && folder.isWritable) ? 'READY' : 'FOLDER_ACCESS_DENIED',
        message: (folder.isFolder && folder.isWritable)
          ? 'Google Drive backup destination (My Drive → KKV GOLD FINANCE → kkv finance) is verified and ready.'
          : 'Google Drive target folder is not accessible.'
      };
    } catch (err: any) {
      const status = err?.status || err?.code || err?.response?.status;
      const errMsg = err?.message || String(err);
      let errorCode = (err as any).code || 'GOOGLE_DRIVE_API_UNAVAILABLE';
      let statusStr: DriveHealthResult['status'] = 'FAILED';
      let message = err?.message || 'Google Drive is temporarily unavailable.';

      if (errMsg.includes('GOOGLE_DRIVE_REAUTH_REQUIRED') || status === 401 || errMsg.includes('invalid_grant')) {
        errorCode = 'GOOGLE_DRIVE_REAUTH_REQUIRED';
        statusStr = 'REAUTH_REQUIRED';
        message = 'Google Drive OAuth authorization expired or invalid.';
      } else if (errorCode === 'GOOGLE_DRIVE_FOLDER_NOT_CONFIGURED' || errorCode === 'GOOGLE_DRIVE_CONFIGURATION_MISSING') {
        errorCode = 'GOOGLE_DRIVE_CONFIGURATION_MISSING';
        statusStr = 'CONFIGURATION_MISSING';
        message = 'GOOGLE_DRIVE_FOLDER_ID is not configured in backend/.env.';
      } else if (status === 404 || errorCode === 'GOOGLE_DRIVE_FOLDER_NOT_FOUND') {
        errorCode = 'GOOGLE_DRIVE_FOLDER_NOT_FOUND';
        statusStr = 'FOLDER_ACCESS_DENIED';
        message = err?.message || 'The configured kkv finance backup folder was not found on Google Drive.';
      } else if (status === 403 || errorCode === 'GOOGLE_DRIVE_FOLDER_ACCESS_DENIED') {
        errorCode = 'GOOGLE_DRIVE_FOLDER_ACCESS_DENIED';
        statusStr = 'FOLDER_ACCESS_DENIED';
        message = err?.message || 'The configured Drive folder is not accessible to the OAuth user.';
      } else {
        message = err?.message || message;
      }

      return {
        success: false,
        connected: false,
        configured: true,
        authMode: this.authType,
        principal: this.getPrincipalEmail(),
        googleAccount: this.getPrincipalEmail(),
        sharedDrive: false,
        sharedDriveId: undefined,
        rootFolder: 'kkv finance',
        backupFolder: 'kkv finance',
        fullBackupFolder: 'kkv finance',
        rootFolderId: configuredFolderId,
        folderId: configuredFolderId,
        backupsFolderId: configuredFolderId,
        fullBackupsFolderId: configuredFolderId,
        driveAccessible: false,
        folderAccessible: false,
        folderName: 'kkv finance',
        folderIdConfigured: true,
        canUpload: false,
        status: statusStr,
        errorCode,
        message
      };
    }
  }

  /**
   * Search for or create a folder on Google Drive.
   */
  public async getOrCreateFolder(folderPath: string, parentId?: string): Promise<string> {
    if (!this.drive) {
      this.initGoogleDrive();
      if (!this.drive) {
        throw new Error('GOOGLE_DRIVE_NOT_CONNECTED: Google Drive is not connected.');
      }
    }

    await this.ensureValidAccessToken();

    let currentParent = (parentId || this.rootFolderId || '').trim();
    if (!currentParent || currentParent.startsWith('local_') || currentParent === 'kkv finance') {
      currentParent = this.rootFolderId;
    }

    const segments = folderPath.split('/').map(s => s.trim()).filter(Boolean);
    if (segments.length === 0) {
      return currentParent;
    }

    for (const segment of segments) {
      currentParent = await this.getOrCreateSingleSegment(segment, currentParent);
    }

    return currentParent;
  }

  private async getOrCreateSingleSegment(folderName: string, parentFolderId: string): Promise<string> {
    if (!this.drive) {
      throw new Error('GOOGLE_DRIVE_NOT_CONNECTED: Google Drive API is not initialized.');
    }

    const safeName = folderName.replace(/'/g, "\\'");
    try {
      const parentCondition = parentFolderId === 'root' ? `'root' in parents` : `'${parentFolderId}' in parents`;
      const query = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and ${parentCondition}`;

      const res = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
      }

      const created = await this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId]
        },
        fields: 'id, name',
        supportsAllDrives: true
      });

      return created.data.id!;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('invalid_grant') || err?.code === 401) {
        throw new Error('GOOGLE_DRIVE_REAUTH_REQUIRED: Google Drive authorization expired.');
      }
      throw new Error(`Failed to access or create Google Drive folder "${folderName}": ${errMsg}`);
    }
  }

  /**
   * Uploads a backup archive directly into Full_System_Backups and verifies:
   * 1. File exists
   * 2. Parents includes fullBackupsFolderId
   * 3. File size matches
   * 4. Downloads and recalculates SHA-256
   */
  public async uploadBackupArchive(payload: {
    buffer: Buffer;
    fileName: string;
    backupId?: string;
    backupType?: 'FULL_BACKUP' | 'PRE_RESTORE_BACKUP' | 'RESTORED_STATE' | 'EMERGENCY_BACKUP' | 'PRE_WIPE_BACKUP';
    sha256: string;
    description?: string;
  }): Promise<{
    verified: boolean;
    fileId: string;
    fileName: string;
    fileSize: number;
    sha256: string;
    folderId: string;
    drivePath: string;
    syncedAt: string;
    uploadedAt: string;
    backupType: string;
  }> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) {
        const err = new Error('Google Drive is not connected.');
        (err as any).code = 'GOOGLE_DRIVE_NOT_CONNECTED';
        throw err;
      }
    }

    await this.ensureValidAccessToken();
    const folderConfig = await this.ensureBackupFolderHierarchy();
    const targetFolderId = folderConfig.fullBackupsFolderId;

    if (!targetFolderId) {
      const err = new Error('GOOGLE_DRIVE_FOLDER_NOT_FOUND: kkv finance folder ID is not established.');
      (err as any).code = 'GOOGLE_DRIVE_FOLDER_NOT_FOUND';
      throw err;
    }

    const backupType = payload.backupType || 'FULL_BACKUP';
    const drivePath = 'My Drive → KKV GOLD FINANCE → kkv finance';

    console.log(`[GoogleDriveService] ☁️ Uploading ${payload.fileName} (${payload.buffer.length} bytes) to kkv finance (${targetFolderId})...`);

    try {
      const bufferStream = new Readable();
      bufferStream.push(payload.buffer);
      bufferStream.push(null);

      const fileMetadata: drive_v3.Schema$File = {
        name: payload.fileName,
        parents: [targetFolderId],
        mimeType: 'application/zip',
        description: payload.description || `KKV Gold Finance Backup Package (${backupType})`
      };

      const media = {
        mimeType: 'application/zip',
        body: bufferStream
      };

      const uploadRes = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, size, parents, mimeType, createdTime',
        supportsAllDrives: true
      });

      const fileId = uploadRes.data.id;
      if (!fileId) {
        const err = new Error('Google Drive upload did not return a valid File ID.');
        (err as any).code = 'GOOGLE_DRIVE_UPLOAD_FAILED';
        throw err;
      }

      // Step 1: Verification - File existence, size & parent folder check
      const getRes = await this.drive.files.get({
        fileId,
        fields: 'id, name, size, parents, trashed',
        supportsAllDrives: true
      });

      if (getRes.data.trashed || !getRes.data.size || parseInt(getRes.data.size, 10) === 0) {
        const err = new Error('Uploaded Google Drive file verification failed (file empty or trashed).');
        (err as any).code = 'GOOGLE_DRIVE_VERIFICATION_FAILED';
        throw err;
      }

      if (!getRes.data.parents || !getRes.data.parents.includes(targetFolderId)) {
        const err = new Error(`Uploaded file parent folder verification failed. Expected folder: ${targetFolderId}, found: ${JSON.stringify(getRes.data.parents)}`);
        (err as any).code = 'GOOGLE_DRIVE_VERIFICATION_FAILED';
        throw err;
      }

      // Step 2: Verification - Download and round-trip SHA-256 check
      const downloadRes = await this.drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
      );

      const downloadedBuffer = Buffer.from(downloadRes.data as ArrayBuffer);
      const downloadedSha = calculateSha256(downloadedBuffer);

      if (downloadedSha !== payload.sha256) {
        const err = new Error(`Google Drive SHA-256 verification mismatch. Local: ${payload.sha256}, Remote: ${downloadedSha}`);
        (err as any).code = 'GOOGLE_DRIVE_VERIFICATION_FAILED';
        throw err;
      }

      console.log(`[GoogleDriveService] ✅ Upload and round-trip SHA-256 verified for ${payload.fileName} in kkv finance.`);

      const nowIso = new Date().toISOString();
      return {
        verified: true,
        fileId,
        fileName: payload.fileName,
        fileSize: payload.buffer.length,
        sha256: downloadedSha,
        folderId: targetFolderId,
        drivePath,
        syncedAt: nowIso,
        uploadedAt: nowIso,
        backupType
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error(`[GoogleDriveService] Upload failed for ${payload.fileName}:`, errMsg);

      if (errMsg.includes('invalid_grant') || err?.code === 401) {
        const e = new Error('GOOGLE_DRIVE_REAUTH_REQUIRED: Google Drive authorization expired. Please reconnect your account.');
        (e as any).code = 'GOOGLE_DRIVE_REAUTH_REQUIRED';
        throw e;
      }

      if (errMsg.includes('storageQuotaExceeded') || errMsg.includes('quota') || (err?.code === 403 && errMsg.includes('storage'))) {
        const e = new Error('GOOGLE_DRIVE_QUOTA_EXCEEDED: Google Drive storage quota exceeded.');
        (e as any).code = 'GOOGLE_DRIVE_QUOTA_EXCEEDED';
        throw e;
      }

      if ((err as any).code) throw err;
      const e = new Error(`GOOGLE_DRIVE_UPLOAD_FAILED: ${errMsg}`);
      (e as any).code = 'GOOGLE_DRIVE_UPLOAD_FAILED';
      throw e;
    }
  }

  /**
   * Lists verified backup files located strictly inside kkv finance.
   */
  public async listFullBackups(): Promise<Array<{
    fileId: string;
    fileName: string;
    createdTime: string;
    sizeBytes: number;
    drivePath: string;
    status: string;
    isZip: boolean;
  }>> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) {
        throw new Error('Google Drive is not connected.');
      }
    }

    await this.ensureValidAccessToken();
    const folderConfig = await this.ensureBackupFolderHierarchy();
    const targetFolderId = folderConfig.fullBackupsFolderId;

    const res = await this.drive.files.list({
      q: `'${targetFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, size, createdTime, mimeType, description)',
      orderBy: 'createdTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    const files = res.data.files || [];
    return files.map(file => {
      const isZip = (file.name || '').endsWith('.zip');
      return {
        fileId: file.id!,
        fileName: file.name!,
        createdTime: file.createdTime || new Date().toISOString(),
        sizeBytes: file.size ? parseInt(file.size, 10) : 0,
        drivePath: 'My Drive → KKV GOLD FINANCE → kkv finance',
        status: '✓ Verified Google Drive Backup',
        isZip
      };
    });
  }

  /**
   * Downloads a Drive file buffer by fileId.
   */
  public async downloadDriveFileBuffer(fileId: string): Promise<{ buffer: Buffer; name: string; size: number; mimeType: string }> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) {
        throw new Error('Google Drive is not connected.');
      }
    }

    await this.ensureValidAccessToken();

    const meta = await this.drive.files.get({
      fileId,
      fields: 'id, name, size, mimeType, trashed',
      supportsAllDrives: true
    });

    if (meta.data.trashed) {
      throw new Error('Requested Google Drive file is in the trash.');
    }

    const downloadRes = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(downloadRes.data as ArrayBuffer);
    return {
      buffer,
      name: meta.data.name || `drive_backup_${fileId}.zip`,
      size: buffer.length,
      mimeType: meta.data.mimeType || 'application/zip'
    };
  }

  // Ensure Customer Folders Structure
  public async ensureCustomerFolders(customerId: string): Promise<CustomerFolderStructure> {
    const rootId = this.getRootFolderId();
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

  // Ensure Loan Folders Structure
  public async ensureLoanFolders(loanId: string): Promise<LoanFolderStructure> {
    const rootId = this.getRootFolderId();
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

  public async testRootFolderAccess(): Promise<{ accessible: boolean; error?: string; errorCode?: string }> {
    try {
      const health = await this.getDriveHealth();
      if (!health.success || !health.folderAccessible) {
        return {
          accessible: false,
          errorCode: health.errorCode || 'GOOGLE_DRIVE_FOLDER_ACCESS_DENIED',
          error: health.message || 'Configured Google Drive folder cannot be accessed.'
        };
      }
      return { accessible: true };
    } catch (err: any) {
      return {
        accessible: false,
        errorCode: 'GOOGLE_DRIVE_FOLDER_ACCESS_DENIED',
        error: err?.message || 'Failed to access Google Drive root folder.'
      };
    }
  }

  public async ensureBackupsFolder(_deviceId?: string): Promise<string> {
    const folderConfig = await this.ensureBackupFolderHierarchy();
    return folderConfig.fullBackupsFolderId;
  }

  public async uploadFile(
    file: { originalname: string; mimetype?: string; buffer: Buffer },
    folderId?: string
  ): Promise<DriveFileUploadResult> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) {
        throw new Error('GOOGLE_DRIVE_NOT_CONNECTED: Google Drive is not connected.');
      }
    }

    await this.ensureValidAccessToken();

    const targetFolderId = folderId || this.getRootFolderId();
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    const fileMetadata: drive_v3.Schema$File = {
      name: file.originalname,
      parents: [targetFolderId]
    };

    const media = {
      mimeType: file.mimetype || 'application/octet-stream',
      body: bufferStream
    };

    const res = await this.drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, mimeType, webViewLink, webContentLink',
      supportsAllDrives: true
    });

    return {
      fileId: res.data.id!,
      name: res.data.name!,
      mimeType: res.data.mimeType!,
      webViewLink: res.data.webViewLink || undefined,
      webContentLink: res.data.webContentLink || undefined,
      folderId: targetFolderId
    };
  }

  public async listFiles(folderId?: string, query?: string): Promise<any[]> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) return [];
    }

    await this.ensureValidAccessToken();
    const targetFolder = folderId || this.getRootFolderId();
    let q = `'${targetFolder}' in parents and trashed = false`;
    if (query) {
      q = `${q} and (${query})`;
    }
    const res = await this.drive.files.list({
      q,
      fields: 'files(id, name, mimeType, size, createdTime, webViewLink, webContentLink)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    return res.data.files || [];
  }

  public async downloadFile(fileId: string): Promise<{ buffer: Buffer; stream: Readable; name: string; mimeType: string }> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) {
        throw new Error('Google Drive is not connected.');
      }
    }

    await this.ensureValidAccessToken();

    const meta = await this.drive.files.get({
      fileId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true
    });

    const res = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    return {
      buffer,
      stream,
      name: meta.data.name || 'download',
      mimeType: meta.data.mimeType || 'application/octet-stream'
    };
  }

  public async deleteFile(fileId: string): Promise<boolean> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) return false;
    }

    await this.ensureValidAccessToken();
    try {
      await this.drive.files.delete({ fileId, supportsAllDrives: true });
      return true;
    } catch {
      return false;
    }
  }

  public async verifyFileExists(fileId: string): Promise<{ exists: boolean; fileId: string; name?: string }> {
    if (!this.isConnected() || !this.drive) {
      this.initGoogleDrive();
      if (!this.isConnected() || !this.drive) return { exists: false, fileId };
    }

    await this.ensureValidAccessToken();
    try {
      const res = await this.drive.files.get({
        fileId,
        fields: 'id, name, trashed',
        supportsAllDrives: true
      });
      const exists = !!(res.data && !res.data.trashed);
      return { exists, fileId, name: res.data?.name || undefined };
    } catch {
      return { exists: false, fileId };
    }
  }

  /**
   * Disconnects Google Drive by clearing local OAuth tokens.
   */
  public disconnect(): void {
    driveTokenService.clearTokens();
    this.drive = null;
    this.oauth2Client = null;
    this.authType = 'NONE';
    this.principalEmail = '';
    this.isDriveConfigured = false;
    this.folderConfigCache = null;
    console.log('[GoogleDriveService] 🔌 Disconnected Google Drive and cleared tokens.');
  }
}

export const googleDriveService = new GoogleDriveService();
