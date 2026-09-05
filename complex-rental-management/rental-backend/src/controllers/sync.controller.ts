import { Request, Response } from 'express';
import { syncService } from '../services/sync.service.js';
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
      const result = await syncService.processPendingSyncQueue();
      res.status(200).json({
        success: true,
        message: 'Sync queue processed',
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async testConnection(_req: Request, res: Response): Promise<void> {
    try {
      const isReady = googleSheetsService.isReady();
      res.status(200).json({
        success: isReady,
        message: isReady ? 'Google Sheets credentials and spreadsheet ID configured' : 'Google Sheets not configured or missing credentials',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const syncController = new SyncController();
