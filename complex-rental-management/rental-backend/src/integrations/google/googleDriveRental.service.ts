import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { config } from '../../config/app.config.js';
import {
  RentalComplex,
  RentalShop,
  RentalPayment,
  RentalExpense,
  AuditLog
} from '../../types/rental.types.js';

export interface RentalSyncMetadata {
  rentalSyncVersion: number;
  lastSyncedAt: string;
  lastMutationAt?: string;
  recordCounts: {
    complexes: number;
    shops: number;
    rentPayments: number;
    expenses: number;
    auditLogs: number;
  };
  destinationFolderId: string;
  destinationFolderName: string;
  syncedBy?: string;
}

export class GoogleDriveRentalService {
  private drive: drive_v3.Drive | null = null;
  private authType: 'OAUTH' | 'SERVICE_ACCOUNT' | 'NONE' = 'NONE';
  private principalEmail: string = '';
  private rentalFolderId: string = '';
  private currentVersion: number = 100;
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  public init(): boolean {
    try {
      const clientId = config.google.clientId;
      const clientSecret = config.google.clientSecret;
      const redirectUri = config.google.redirectUri;
      const refreshToken = config.google.refreshToken;
      const serviceEmail = config.google.clientEmail;
      const privateKey = config.google.privateKey;

      // 1. PRIMARY: Google OAuth 2.0 User Authentication (Personal My Drive)
      if (clientId && clientSecret && refreshToken) {
        try {
          const oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
          oauthClient.setCredentials({ refresh_token: refreshToken });

          this.drive = google.drive({ version: 'v3', auth: oauthClient });
          this.authType = 'OAUTH';
          this.principalEmail = config.google.accountEmail || 'Authorized User';
          this.initialized = true;
          console.log(`[GoogleDriveRentalService] ✅ Initialized Drive API via OAuth (${this.principalEmail})`);
          return true;
        } catch (oaErr: any) {
          console.warn('[GoogleDriveRentalService] ⚠️ OAuth client initialization warning:', oaErr?.message || oaErr);
        }
      }

      // 2. ALTERNATIVE: Service Account for Shared Drive
      if (serviceEmail && privateKey) {
        try {
          const formattedKey = privateKey.replace(/\\n/g, '\n');
          const jwtClient = new google.auth.JWT(
            serviceEmail,
            undefined,
            formattedKey,
            ['https://www.googleapis.com/auth/drive']
          );
          this.drive = google.drive({ version: 'v3', auth: jwtClient });
          this.authType = 'SERVICE_ACCOUNT';
          this.principalEmail = serviceEmail;
          this.initialized = true;
          console.log(`[GoogleDriveRentalService] 🏢 Initialized Drive API via Service Account (${serviceEmail})`);
          return true;
        } catch (saErr: any) {
          console.warn('[GoogleDriveRentalService] ⚠️ Service Account initialization failed:', saErr?.message || saErr);
        }
      }

      this.initialized = false;
      this.authType = 'NONE';
      this.drive = null;
      return false;
    } catch (err: any) {
      console.error('[GoogleDriveRentalService] Initialization error:', err?.message || err);
      this.initialized = false;
      this.authType = 'NONE';
      this.drive = null;
      return false;
    }
  }

  public isReady(): boolean {
    if (!this.initialized || !this.drive) {
      return this.init();
    }
    return true;
  }

  public getAuthMode(): 'OAUTH' | 'SERVICE_ACCOUNT' | 'NONE' {
    return this.authType;
  }

  public getConnectedAccount(): string {
    return this.principalEmail;
  }

  public getRentalVersion(): number {
    return this.currentVersion;
  }

  /**
   * Ensures the 'Rental' subfolder exists inside the designated 'KKV DB' folder (1PYqtIQ-Uyz-pgdKUu33r4W9bhSzcZHjv).
   */
  public async ensureRentalFolder(): Promise<string> {
    if (this.rentalFolderId) {
      return this.rentalFolderId;
    }

    if (!this.isReady() || !this.drive) {
      throw new Error('Google Drive API is not initialized');
    }

    const parentFolderId = config.google.driveFolderId || '1PYqtIQ-Uyz-pgdKUu33r4W9bhSzcZHjv';

    try {
      // Search for existing 'Rental' folder under parentFolderId
      const q = `name = 'Rental' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${parentFolderId}' in parents`;
      const listRes = await this.drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      if (listRes.data.files && listRes.data.files.length > 0) {
        this.rentalFolderId = listRes.data.files[0].id!;
        return this.rentalFolderId;
      }

      // Create 'Rental' folder
      const createRes = await this.drive.files.create({
        requestBody: {
          name: 'Rental',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId]
        },
        fields: 'id, name',
        supportsAllDrives: true
      });

      this.rentalFolderId = createRes.data.id!;
      console.log(`[GoogleDriveRentalService] 📁 Created 'Rental' subfolder in KKV DB (${this.rentalFolderId})`);
      return this.rentalFolderId;
    } catch (err: any) {
      console.warn('[GoogleDriveRentalService] Could not resolve Rental folder, defaulting to root KKV DB folder:', err?.message || err);
      this.rentalFolderId = parentFolderId;
      return this.rentalFolderId;
    }
  }

  /**
   * Uploads or updates a JSON file inside KKV DB / Rental /
   */
  public async uploadOrUpdateJsonFile(fileName: string, data: any): Promise<string> {
    if (!this.isReady() || !this.drive) {
      throw new Error('Google Drive API is not connected');
    }

    const folderId = await this.ensureRentalFolder();
    const content = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(content, 'utf-8');

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // Check if file already exists in folder
    const q = `name = '${fileName}' and trashed = false and '${folderId}' in parents`;
    const existing = await this.drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (existing.data.files && existing.data.files.length > 0) {
      const fileId = existing.data.files[0].id!;
      await this.drive.files.update({
        fileId,
        media: {
          mimeType: 'application/json',
          body: stream
        },
        supportsAllDrives: true
      });
      return fileId;
    } else {
      const created = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json'
        },
        media: {
          mimeType: 'application/json',
          body: stream
        },
        fields: 'id, name',
        supportsAllDrives: true
      });
      return created.data.id!;
    }
  }

  /**
   * Synchronizes all structured Rental datasets to Google Drive KKV DB / Rental /
   */
  public async syncStructuredDataset(payload: {
    complexes: RentalComplex[];
    shops: RentalShop[];
    payments: RentalPayment[];
    expenses: RentalExpense[];
    auditLogs?: AuditLog[];
    mutationTimestamp?: string;
  }): Promise<{ version: number; lastSyncedAt: string; fileIds: Record<string, string> }> {
    this.currentVersion += 1;
    const now = new Date().toISOString();

    const metadata: RentalSyncMetadata = {
      rentalSyncVersion: this.currentVersion,
      lastSyncedAt: now,
      lastMutationAt: payload.mutationTimestamp || now,
      recordCounts: {
        complexes: payload.complexes.length,
        shops: payload.shops.length,
        rentPayments: payload.payments.length,
        expenses: payload.expenses.length,
        auditLogs: (payload.auditLogs || []).length
      },
      destinationFolderId: config.google.driveFolderId || '1PYqtIQ-Uyz-pgdKUu33r4W9bhSzcZHjv',
      destinationFolderName: 'KKV DB / Rental',
      syncedBy: this.principalEmail || 'Rental Service'
    };

    const fileIds: Record<string, string> = {};

    // Upload datasets in parallel
    const [cId, sId, pId, eId, aId, mId] = await Promise.all([
      this.uploadOrUpdateJsonFile('complexes.json', payload.complexes),
      this.uploadOrUpdateJsonFile('shops.json', payload.shops),
      this.uploadOrUpdateJsonFile('rent_payments.json', payload.payments),
      this.uploadOrUpdateJsonFile('expenses.json', payload.expenses),
      this.uploadOrUpdateJsonFile('audit_logs.json', payload.auditLogs || []),
      this.uploadOrUpdateJsonFile('metadata.json', metadata)
    ]);

    fileIds.complexes = cId;
    fileIds.shops = sId;
    fileIds.rentPayments = pId;
    fileIds.expenses = eId;
    fileIds.auditLogs = aId;
    fileIds.metadata = mId;

    console.log(`[GoogleDriveRentalService] ☁️ Synced structured dataset (Version: ${this.currentVersion}, Records: ${payload.complexes.length} complexes, ${payload.shops.length} shops, ${payload.payments.length} payments, ${payload.expenses.length} expenses)`);

    return {
      version: this.currentVersion,
      lastSyncedAt: now,
      fileIds
    };
  }
}

export const googleDriveRentalService = new GoogleDriveRentalService();
