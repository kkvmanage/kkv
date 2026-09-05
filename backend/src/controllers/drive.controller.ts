import { Request, Response } from 'express';
import { google } from 'googleapis';
import { googleDriveService } from '../services/googleDriveService.js';
import { driveTokenService } from '../services/drive/DriveTokenService.js';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { env } from '../config/env.js';

function logDriveAudit(action: string, details: Record<string, any>, user?: string) {
  try {
    const auditRecord = {
      id: `AUDIT-DRIVE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      action,
      user: user || 'Administrator',
      userId: 'ADMIN-001',
      role: 'Admin',
      ...details
    };
    const currentLogs = googleDriveRepository.readJson<any[]>('audit_logs.json', []);
    googleDriveRepository.writeJson('audit_logs.json', [auditRecord, ...currentLogs.slice(0, 500)]);
  } catch (err) {
    console.warn('[DriveController] Failed to record audit log:', err);
  }
}

export class DriveController {
  // Generate Google OAuth 2.0 Authorization URL
  public connect = async (req: Request, res: Response) => {
    try {
      const oauth2Client = googleDriveService.getOAuthClient();
      const state = driveTokenService.generateState();

      console.log('[DriveController] OAuth redirect URI:', env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI);

      const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/userinfo.email'
      ];

      const designatedEmail = env.GOOGLE_DRIVE_ACCOUNT_EMAIL || driveTokenService.getGoogleAccount() || undefined;

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
        state,
        redirect_uri: env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI,
        ...(designatedEmail ? { login_hint: designatedEmail } : {})
      });

      logDriveAudit('DRIVE_REAUTH_STARTED', {
        authMode: 'OAUTH',
        stateGenerated: !!state,
        redirectUri: env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI,
        designatedEmail: designatedEmail || 'Auto'
      });

      if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
        return res.status(200).json({ success: true, url: authUrl, state, redirectUri: env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI });
      }

      return res.redirect(authUrl);
    } catch (err: any) {
      console.error('[DriveController] Error generating Google OAuth URL:', err);
      logDriveAudit('DRIVE_REAUTH_FAILED', {
        error: err?.message || 'Failed to initialize OAuth'
      });
      return res.status(500).json({
        success: false,
        message: 'Google Drive authorization failed to initialize. Please check Google Client ID & Secret settings.'
      });
    }
  };

  // Google OAuth 2.0 Callback Handler
  public callback = async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code) {
        logDriveAudit('DRIVE_REAUTH_FAILED', { error: 'Missing authorization code' });
        return res.status(400).json({
          success: false,
          message: 'Google Drive authorization failed: Missing authorization code.'
        });
      }

      // State CSRF validation
      if (state && !driveTokenService.validateState(state)) {
        console.warn('[DriveController] Warning: OAuth state parameter mismatch or expired.');
      }

      const oauth2Client = googleDriveService.getOAuthClient();
      console.log('[DriveController] Exchanging OAuth authorization code with redirect_uri:', env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI);
      const { tokens } = await oauth2Client.getToken({
        code,
        redirect_uri: env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI
      });

      oauth2Client.setCredentials(tokens);

      let googleAccount = '';
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        googleAccount = userInfo.data.email || '';
      } catch (e) {
        console.warn('[DriveController] Could not fetch user email during callback:', e);
      }

      driveTokenService.saveTokens({
        refreshToken: tokens.refresh_token || undefined,
        accessToken: tokens.access_token || undefined,
        expiryDate: tokens.expiry_date || undefined,
        googleAccount,
        scope: tokens.scope
      });

      // Initialize Drive service with new OAuth credentials
      googleDriveService.initGoogleDrive();

      logDriveAudit('DRIVE_REAUTH_SUCCESS', {
        googleAccount: googleAccount || 'Authorized User',
        authMode: 'OAUTH'
      });

      // Ensure root folder exists in user's Drive and verify access
      let folderAccessible = false;
      let folderError = '';
      try {
        const hierarchy = await googleDriveService.ensureBackupFolderHierarchy();
        folderAccessible = !!hierarchy.fullBackupsFolderId;
        
        logDriveAudit('DRIVE_ACCESS_VERIFIED', {
          googleAccount: googleAccount || 'Authorized User',
          rootFolderId: hierarchy.rootFolderId,
          fullBackupsFolderId: hierarchy.fullBackupsFolderId,
          folderAccessible: true
        });
      } catch (fErr: any) {
        console.warn('[DriveController] Folder initialization notice:', fErr?.message || fErr);
        folderError = fErr?.message || 'Access denied to configured folder.';
      }

      console.log(`[DriveController] ✅ Google Drive successfully connected for: ${googleAccount || 'Authorized User'}`);

      const frontendUrl = env.CORS_ORIGIN || 'http://localhost:5173';
      
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Drive Connected</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8FAFC; color: #1E293B; }
            .card { background: white; padding: 24px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; }
            .success { color: #16A34A; font-weight: bold; font-size: 18px; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success">✓ Google Drive Connected</div>
            <p>Authorized account: <strong>${googleAccount || 'Authorized User'}</strong></p>
            <p style="font-size: 13px; color: #64748B;">This window will close automatically...</p>
          </div>
          <script>
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'GOOGLE_DRIVE_AUTH_SUCCESS',
                  email: ${JSON.stringify(googleAccount)},
                  folderAccessible: ${JSON.stringify(folderAccessible)}
                }, '*');
                setTimeout(function() { window.close(); }, 1200);
              } else {
                window.location.href = '${frontendUrl}/admin?drive_connected=true';
              }
            } catch(e) {
              window.location.href = '${frontendUrl}/admin?drive_connected=true';
            }
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      console.error('[DriveController] Error handling OAuth callback:', err);
      logDriveAudit('DRIVE_REAUTH_FAILED', {
        error: err?.message || 'OAuth callback error'
      });
      const frontendUrl = env.CORS_ORIGIN || 'http://localhost:5173';
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Drive Authorization Failed</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #FEF2F2; color: #991B1B; }
            .card { background: white; padding: 24px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; }
            .err { color: #DC2626; font-weight: bold; font-size: 18px; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="err">✕ Authorization Failed</div>
            <p>${err?.message || 'Could not complete Google Drive authorization.'}</p>
            <p style="font-size: 13px; color: #64748B;">This window will close automatically...</p>
          </div>
          <script>
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'GOOGLE_DRIVE_AUTH_FAILED',
                  error: ${JSON.stringify(err?.message || 'OAuth error')}
                }, '*');
                setTimeout(function() { window.close(); }, 2000);
              } else {
                window.location.href = '${frontendUrl}/admin?drive_error=oauth_failed';
              }
            } catch(e) {
              window.location.href = '${frontendUrl}/admin?drive_error=oauth_failed';
            }
          </script>
        </body>
        </html>
      `);
    }
  };

  // Check Drive Connection Status
  public getStatus = async (req: Request, res: Response) => {
    try {
      const health = await googleDriveService.getDriveHealth();
      return res.status(200).json({
        success: true,
        connected: health.success,
        authMode: health.authMode,
        email: health.googleAccount,
        googleAccount: health.googleAccount,
        folderAccessible: health.folderAccessible,
        folderName: health.folderName || 'KKV DB',
        canUpload: health.canUpload,
        errorCode: health.errorCode,
        message: health.message,
        data: {
          connected: health.success,
          authMode: health.authMode,
          googleAccount: health.googleAccount,
          folderAccessible: health.folderAccessible,
          folderName: health.folderName || 'KKV DB',
          canUpload: health.canUpload
        }
      });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        connected: false,
        authMode: 'NONE',
        message: 'Failed to check Google Drive status'
      });
    }
  };

  // Safe OAuth Diagnostic endpoint (Development/Admin)
  public getOAuthConfig = async (req: Request, res: Response) => {
    try {
      const clientId = env.GOOGLE_CLIENT_ID || '';
      const maskedClientId = clientId.length > 16 
        ? `${clientId.substring(0, 16)}...${clientId.substring(clientId.length - 20)}`
        : (clientId ? '***CONFIGURED***' : 'NOT_SET');

      return res.status(200).json({
        success: true,
        configured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        clientIdMasked: maskedClientId,
        redirectUri: env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI,
        authUrl: '/api/auth/google-drive/start',
        targetFolder: 'My Drive / KKV DB',
        folderId: env.GOOGLE_DRIVE_FOLDER_ID || env.GOOGLE_DRIVE_ROOT_FOLDER_ID
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to read OAuth config diagnostic'
      });
    }
  };

  // Disconnect Google Drive
  public disconnect = async (req: Request, res: Response) => {
    try {
      googleDriveService.disconnect();
      return res.status(200).json({
        success: true,
        message: 'Google Drive has been disconnected.'
      });
    } catch (err: any) {
      console.error('[DriveController] Disconnect error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to disconnect Google Drive.'
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
