import { Request, Response } from 'express';
import { syncService } from '../services/sync.service.js';
import { googleDriveRentalService } from '../integrations/google/googleDriveRental.service.js';
import { googleSheetsService } from '../integrations/google/googleSheets.service.js';

export class SyncController {
  async getStatus(_req: Request, res: Response): Promise<void> {
    try {
      const status = syncService.getSyncSummary();
      res.status(200).json({ success: true, data: status });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async triggerManualSync(_req: Request, res: Response): Promise<void> {
    try {
      const result = await syncService.runFullReconciliation();
      const status = syncService.getSyncSummary();
      res.status(200).json({
        success: true,
        message: result.reconciled
          ? `Reconciliation complete. Sync version: ${result.version}`
          : 'Sync attempted — Drive connectivity may be degraded. Events queued for retry.',
        data: {
          ...result,
          ...status
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async testConnection(_req: Request, res: Response): Promise<void> {
    try {
      // 1. Test Google Drive connectivity
      const driveResult = await googleDriveRentalService.verifyConnection();

      // 2. Test Google Sheets (if spreadsheet ID configured)
      let sheetsResult: { success: boolean; message: string } = {
        success: false,
        message: 'Sheets not configured (RENTAL_SPREADSHEET_ID not set)'
      };

      if (googleSheetsService.isReady()) {
        sheetsResult = await googleSheetsService.verifyAccess();
      }

      const overallSuccess = driveResult.success;

      const message = driveResult.success
        ? `✅ Google Drive connected (${driveResult.account}) — Folder: ${driveResult.folderName || 'kkv finance'}${sheetsResult.success ? ` | Sheets: ${sheetsResult.message}` : ''}`
        : `❌ ${driveResult.message}`;

      res.status(200).json({
        success: overallSuccess,
        message,
        details: {
          drive: driveResult,
          sheets: sheetsResult,
          authMode: driveResult.authMode,
          account: driveResult.account,
          folderId: driveResult.folderId,
          folderName: driveResult.folderName
        }
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: `Connection test error: ${err.message || err}`
      });
    }
  }
}

export const syncController = new SyncController();
