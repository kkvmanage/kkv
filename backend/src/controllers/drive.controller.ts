import { Request, Response } from 'express';
import { google } from 'googleapis';
import { googleDriveService } from '../services/googleDriveService.js';
import { driveService } from '../services/drive/DriveService.js';
import { driveTokenService } from '../services/drive/DriveTokenService.js';
import { env } from '../config/env.js';

export class DriveController {
  // Generate OAuth Connect URL
  public connect = async (req: Request, res: Response) => {
    try {
      const oauth2Client = driveService.getOAuthClient();
      const scopes = ['https://www.googleapis.com/auth/drive.file'];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes
      });

      if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
        return res.status(200).json({ success: true, url: authUrl });
      }

      return res.redirect(authUrl);
    } catch (err: any) {
      console.error('[DriveController] Error generating connect URL:', err);
      return res.status(500).json({
        success: false,
        message: 'Google Drive authorization failed. Please try connecting again.'
      });
    }
  };

  // OAuth Callback Handler
  public callback = async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Google Drive authorization failed. Missing authorization code.'
        });
      }

      const oauth2Client = driveService.getOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);

      let googleAccount = '';
      try {
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        googleAccount = userInfo.data.email || '';
      } catch (e) {
        console.warn('[DriveController] Could not fetch user email during callback:', e);
      }

      if (tokens.refresh_token) {
        driveTokenService.saveTokens({
          refreshToken: tokens.refresh_token,
          googleAccount,
          scope: tokens.scope
        });
      } else {
        console.warn('[DriveController] OAuth callback completed without new refresh token');
      }

      // Re-initialize Drive services with new credentials
      driveService.initGoogleDrive();
      googleDriveService.initGoogleDrive();

      const frontendUrl = env.CORS_ORIGIN || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/admin?drive_connected=true`);
    } catch (err: any) {
      console.error('[DriveController] Error handling OAuth callback:', err);
      return res.status(500).json({
        success: false,
        message: 'Google Drive authorization failed. Please try connecting again.'
      });
    }
  };

  // Check Drive Connection Status
  public getStatus = async (req: Request, res: Response) => {
    try {
      const isConnected = driveService.isConnected() || googleDriveService.isConnected();
      const googleAccount = driveTokenService.getGoogleAccount();
      const rootConfigured = !!(env.GOOGLE_DRIVE_ROOT_FOLDER_ID && env.GOOGLE_DRIVE_ROOT_FOLDER_ID !== 'KKV_GOLD_FINANCE');

      if (!isConnected) {
        return res.status(200).json({
          connected: false,
          success: true,
          googleAccount: '',
          rootFolderConfigured: rootConfigured
        });
      }

      return res.status(200).json({
        connected: true,
        success: true,
        googleAccount: googleAccount || undefined,
        rootFolderConfigured: rootConfigured,
        data: {
          connected: true,
          googleAccount: googleAccount || undefined,
          rootFolderConfigured: rootConfigured,
          rootFolderId: driveService.getRootFolderId()
        }
      });
    } catch (err: any) {
      return res.status(200).json({
        connected: false,
        success: false,
        message: 'Failed to check Google Drive status'
      });
    }
  };

  // Upload File
  public uploadFile = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please select a valid JPG, PNG, or PDF file (max 10MB).'
        });
      }

      const { folderId, customerId, loanId, category } = req.body;

      let targetFolderId = folderId;

      if (!targetFolderId && customerId) {
        const folders = await googleDriveService.ensureCustomerFolders(customerId);
        targetFolderId = category === 'profile' ? folders.profilePhotoFolderId : folders.kycFolderId;
      } else if (!targetFolderId && loanId) {
        const folders = await googleDriveService.ensureLoanFolders(loanId);
        targetFolderId = category === 'receipt' ? folders.receiptsFolderId : folders.documentsFolderId;
      }

      const result = await googleDriveService.uploadFile(
        {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer
        },
        targetFolderId
      );

      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully to Google Drive',
        data: result
      });
    } catch (err: any) {
      console.error('[DriveController] Upload error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to upload file to Google Drive',
        error: { message: err.message }
      });
    }
  };

  // List Files
  public listFiles = async (req: Request, res: Response) => {
    try {
      const { folderId, search } = req.query;
      const files = await googleDriveService.listFiles(
        folderId as string | undefined,
        search as string | undefined
      );

      return res.status(200).json({
        success: true,
        data: files
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to list Google Drive files',
        error: { message: err.message }
      });
    }
  };

  // Download / View File
  public getFile = async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const fileData = await googleDriveService.downloadFile(fileId);

      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${fileData.name}"`);

      fileData.stream.pipe(res);
    } catch (err: any) {
      console.error('[DriveController] File download error:', err);
      return res.status(404).json({
        success: false,
        message: 'File not found or failed to download from Google Drive',
        error: { message: err.message }
      });
    }
  };

  // Delete File
  public deleteFile = async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const success = await googleDriveService.deleteFile(fileId);

      if (success) {
        return res.status(200).json({
          success: true,
          message: `File ${fileId} deleted successfully from Google Drive`
        });
      }

      return res.status(400).json({
        success: false,
        message: `Failed to delete file ${fileId} from Google Drive`
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Error deleting file from Google Drive',
        error: { message: err.message }
      });
    }
  };

  // Upload Customer Document Specific Endpoint
  public uploadCustomerDocument = async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const category = req.body.category || 'kyc';

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided for upload.'
        });
      }

      const folders = await googleDriveService.ensureCustomerFolders(customerId);
      const targetFolderId = category === 'profile' ? folders.profilePhotoFolderId : folders.kycFolderId;

      const result = await googleDriveService.uploadFile(
        {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer
        },
        targetFolderId
      );

      return res.status(201).json({
        success: true,
        message: `Customer ${category} document uploaded to Google Drive`,
        data: {
          customerId,
          category,
          driveFile: result
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload customer document',
        error: { message: err.message }
      });
    }
  };

  // Upload Loan Document Specific Endpoint
  public uploadLoanDocument = async (req: Request, res: Response) => {
    try {
      const { loanId } = req.params;
      const category = req.body.category || 'document';

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided for upload.'
        });
      }

      const folders = await googleDriveService.ensureLoanFolders(loanId);
      const targetFolderId = category === 'receipt' ? folders.receiptsFolderId : folders.documentsFolderId;

      const result = await googleDriveService.uploadFile(
        {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer
        },
        targetFolderId
      );

      return res.status(201).json({
        success: true,
        message: `Loan ${category} document uploaded to Google Drive`,
        data: {
          loanId,
          category,
          driveFile: result
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload loan document',
        error: { message: err.message }
      });
    }
  };
}

export const driveController = new DriveController();
