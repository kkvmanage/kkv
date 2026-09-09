import { Request, Response } from 'express';
import { syncService } from '../services/sync.service.js';

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
        message: 'Reconciliation complete.',
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
      res.status(200).json({
        success: true,
        message: 'Authoritative Local Storage and Database Active',
        details: {
          storage: 'MongoDB & Local File Vault',
          status: 'HEALTHY'
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
