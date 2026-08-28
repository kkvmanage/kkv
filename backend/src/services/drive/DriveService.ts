import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env.js';

export class DriveService {
  private drive: drive_v3.Drive | null = null;
  private isDriveConfigured = false;
  private rootFolderId = '';

  constructor() {
    this.initGoogleDrive();
  }

  private initGoogleDrive() {
    try {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      let privateKey = process.env.GOOGLE_PRIVATE_KEY;

      if (clientEmail && privateKey) {
        // Fix newline formatting for private key
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
        console.log('[DriveService] Initialized Google Drive API via Service Account');
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
        console.log('[DriveService] Initialized Google Drive API via OAuth2');
        return;
      }

      console.log('[DriveService] Google Drive API credentials not provided — using local disk persistent storage (KKV_GOLD_FINANCE/)');
    } catch (err) {
      console.warn('[DriveService] Failed to initialize Google Drive client:', err);
    }
  }

  public isConnected(): boolean {
    return this.isDriveConfigured && !!this.drive;
  }

  // Google Drive folder search or creation
  public async getOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
    if (!this.isDriveConfigured || !this.drive) {
      return folderName;
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

      // Create new folder
      const folderMetadata: drive_v3.Schema$File = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parent ? [parent] : undefined
      };

      const created = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id'
      });

      return created.data.id!;
    } catch (err) {
      console.error(`[DriveService] Error in getOrCreateFolder for ${folderName}:`, err);
      return folderName;
    }
  }

  // Upload or update JSON file in Drive
  public async uploadJsonFile(fileName: string, content: any, folderId?: string): Promise<string | null> {
    if (!this.isDriveConfigured || !this.drive) {
      return null;
    }

    try {
      const jsonStr = JSON.stringify(content, null, 2);
      const media = {
        mimeType: 'application/json',
        body: jsonStr
      };

      const targetFolder = folderId || this.rootFolderId;

      // Check if file already exists
      let query = `name = '${fileName}' and trashed = false`;
      if (targetFolder) query += ` and '${targetFolder}' in parents`;

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
        return fileId;
      }

      const fileMetadata: drive_v3.Schema$File = {
        name: fileName,
        parents: targetFolder ? [targetFolder] : undefined
      };

      const created = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id'
      });

      return created.data.id!;
    } catch (err) {
      console.error(`[DriveService] Error uploading JSON file ${fileName}:`, err);
      return null;
    }
  }

  // Read JSON file content from Drive
  public async readJsonFile<T>(fileName: string, folderId?: string): Promise<T | null> {
    if (!this.isDriveConfigured || !this.drive) {
      return null;
    }

    try {
      const targetFolder = folderId || this.rootFolderId;
      let query = `name = '${fileName}' and trashed = false`;
      if (targetFolder) query += ` and '${targetFolder}' in parents`;

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
    } catch (err) {
      console.error(`[DriveService] Error reading JSON file ${fileName}:`, err);
      return null;
    }
  }
}

export const driveService = new DriveService();
