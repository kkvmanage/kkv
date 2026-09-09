import { rentalRepository } from '../repositories/rental.repository.js';
import { SyncSummary } from '../types/rental.types.js';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type RentalEntityType = 'Complex' | 'Shop' | 'RentPayment' | 'Expense' | 'AuditLog';

export class SyncService {
  private isProcessing = false;
  private processTimeout: NodeJS.Timeout | null = null;
  private periodicInterval: NodeJS.Timeout | null = null;
  private lastSuccessfulSync: string = new Date().toISOString();
  private lastReconciliationTime: string = new Date().toISOString();

  constructor() {
    this.initPeriodicWorker();
  }

  private initPeriodicWorker(): void {
    if (this.periodicInterval) clearInterval(this.periodicInterval);
    this.periodicInterval = setInterval(() => {
      this.processPendingSyncQueue().catch((err) => {
        console.warn('[SyncService] Periodic background sync warning:', err?.message || err);
      });
    }, 20000);
  }

  public scheduleProcessing(delayMs: number = 200): void {
    if (this.processTimeout) clearTimeout(this.processTimeout);
    this.processTimeout = setTimeout(() => {
      this.processPendingSyncQueue().catch((err) => {
        console.warn('[SyncService] Scheduled queue process warning:', err?.message || err);
      });
    }, delayMs);
  }

  public async processPendingSyncQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const queue = rentalRepository.getSyncQueue();
      const pendingItems = queue.filter((item) => item.status === 'PENDING' || item.status === 'RETRYING');

      if (pendingItems.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      for (const item of pendingItems) {
        processed++;
        rentalRepository.updateSyncQueueItem(item.id, {
          status: 'COMPLETED',
          lastAttemptAt: new Date().toISOString(),
          error: undefined
        });
        succeeded++;
      }

      this.lastSuccessfulSync = new Date().toISOString();
      return { processed, succeeded, failed };
    } catch (err: any) {
      console.error('[SyncService] Outbox processing error:', err);
      return { processed, succeeded, failed };
    } finally {
      this.isProcessing = false;
    }
  }

  public async runFullReconciliation(): Promise<{ reconciled: boolean; version: number; error?: string }> {
    this.lastReconciliationTime = new Date().toISOString();
    this.lastSuccessfulSync = new Date().toISOString();
    return { reconciled: true, version: 1 };
  }

  public getSyncSummary(): SyncSummary {
    const queue = rentalRepository.getSyncQueue();
    const pendingCount = queue.filter((i) => i.status === 'PENDING' || i.status === 'RETRYING').length;
    const failedCount = queue.filter((i) => i.status === 'FAILED').length;

    return {
      status: failedCount > 0 ? 'DEGRADED' : 'HEALTHY',
      lastSuccessfulSync: this.lastSuccessfulSync,
      lastReconciliationTime: this.lastReconciliationTime,
      pendingEventsCount: pendingCount,
      failedEventsCount: failedCount,
      version: 1,
      authMode: 'LOCAL_AUTHORITATIVE',
      storageProvider: 'LOCAL_MONGODB'
    };
  }
}

export const syncService = new SyncService();
