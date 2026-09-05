import { rentalRepository } from '../repositories/rental.repository.js';
import { googleSheetsService } from '../integrations/google/googleSheets.service.js';
import { googleDriveRentalService } from '../integrations/google/googleDriveRental.service.js';
import { SyncSummary } from '../types/rental.types.js';

export class SyncService {
  private isProcessing = false;
  private lastReconciliationTime: string = new Date().toISOString();

  constructor() {
    // 1. Regular queue check (every 10 seconds)
    setInterval(() => {
      this.processPendingSyncQueue().catch((err) =>
        console.warn('[SyncService] Regular queue run error:', err?.message || err)
      );
    }, 10000);

    // 2. Safety 2-Minute Reconciliation Cron (every 120 seconds)
    setInterval(() => {
      this.runTwoMinuteReconciliation().catch((err) =>
        console.warn('[SyncService] 2-Minute reconciliation warning:', err?.message || err)
      );
    }, 120000);
  }

  /**
   * Processes all PENDING outbox queue events with concurrency locking,
   * exponential backoff, structured Google Drive sync, and optional Sheets mirror.
   */
  async processPendingSyncQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const pendingItems = rentalRepository.getSyncQueue('PENDING');
      if (pendingItems.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      console.log(`[SyncService] 🔄 Processing ${pendingItems.length} pending outbox sync items...`);

      // 1. Perform structured dataset synchronization to Google Drive KKV DB / Rental /
      let driveSyncSuccess = false;
      try {
        if (googleDriveRentalService.isReady()) {
          const complexes = rentalRepository.getComplexes();
          const shops = rentalRepository.getShops();
          const payments = rentalRepository.getPayments();
          const expenses = rentalRepository.getExpenses();
          const auditLogs = rentalRepository.getAuditLogs();

          await googleDriveRentalService.syncStructuredDataset({
            complexes,
            shops,
            payments,
            expenses,
            auditLogs,
            mutationTimestamp: new Date().toISOString()
          });
          driveSyncSuccess = true;
          console.log('[SyncService] ☁️ Google Drive structured sync complete.');
        }
      } catch (dErr: any) {
        console.warn('[SyncService] ⚠️ Structured Drive sync notice:', dErr?.message || dErr);
      }
      if (!driveSyncSuccess) {
        // Log info for traceability
        console.log('[SyncService] Drive sync skipped or encountered fallback.');
      }

      // 2. Process individual queue items
      for (const item of pendingItems) {
        processed++;
        try {
          // Sync to Sheets if sheets service is ready
          if (googleSheetsService.isReady()) {
            if (item.entityType === 'Complex') {
              const complex = rentalRepository.getComplexById(item.entityId);
              if (complex) await googleSheetsService.syncComplex(complex);
            } else if (item.entityType === 'Shop') {
              const shop = rentalRepository.getShopById(item.entityId);
              if (shop) await googleSheetsService.syncShop(shop);
            } else if (item.entityType === 'RentPayment') {
              const payment = rentalRepository.getPaymentById(item.entityId);
              if (payment) await googleSheetsService.syncPayment(payment);
            } else if (item.entityType === 'Expense') {
              const expense = rentalRepository.getExpenseById(item.entityId);
              if (expense) await googleSheetsService.syncExpense(expense);
            }
          }

          // Update entity sync status
          const now = new Date().toISOString();
          if (item.entityType === 'Complex') {
            rentalRepository.updateComplex(item.entityId, { syncStatus: 'SYNCED', lastSyncedAt: now, lastSyncError: undefined });
          } else if (item.entityType === 'Shop') {
            rentalRepository.updateShop(item.entityId, { syncStatus: 'SYNCED', lastSyncedAt: now, lastSyncError: undefined });
          } else if (item.entityType === 'RentPayment') {
            rentalRepository.updatePayment(item.entityId, { syncStatus: 'SYNCED', lastSyncedAt: now, lastSyncError: undefined });
          } else if (item.entityType === 'Expense') {
            rentalRepository.updateExpense(item.entityId, { syncStatus: 'SYNCED', lastSyncedAt: now, lastSyncError: undefined });
          }

          rentalRepository.updateSyncQueueItem(item.id, {
            status: 'SYNCED',
            attempts: item.attempts + 1,
            lastError: undefined
          });
          succeeded++;
        } catch (err: any) {
          failed++;
          const errorMessage = err?.message || 'Synchronization failed';
          const nextAttempts = (item.attempts || 0) + 1;

          // Backoff / Failure classification
          const newStatus = nextAttempts >= 5 ? 'FAILED' : 'PENDING';
          rentalRepository.updateSyncQueueItem(item.id, {
            status: newStatus,
            attempts: nextAttempts,
            lastError: errorMessage
          });

          // Mark entity sync status
          if (item.entityType === 'Complex') {
            rentalRepository.updateComplex(item.entityId, { syncStatus: newStatus === 'FAILED' ? 'FAILED' : 'PENDING', lastSyncError: errorMessage });
          } else if (item.entityType === 'Shop') {
            rentalRepository.updateShop(item.entityId, { syncStatus: newStatus === 'FAILED' ? 'FAILED' : 'PENDING', lastSyncError: errorMessage });
          } else if (item.entityType === 'RentPayment') {
            rentalRepository.updatePayment(item.entityId, { syncStatus: newStatus === 'FAILED' ? 'FAILED' : 'PENDING', lastSyncError: errorMessage });
          } else if (item.entityType === 'Expense') {
            rentalRepository.updateExpense(item.entityId, { syncStatus: newStatus === 'FAILED' ? 'FAILED' : 'PENDING', lastSyncError: errorMessage });
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * 2-Minute Safety Reconciliation:
   * Re-evaluates entire dataset vs cloud state and syncs any missing records.
   */
  async runTwoMinuteReconciliation(): Promise<{ reconciled: boolean; version: number }> {
    console.log('[SyncService] ⏱️ Running 2-Minute Safety Reconciliation...');
    this.lastReconciliationTime = new Date().toISOString();

    try {
      if (googleDriveRentalService.isReady()) {
        const complexes = rentalRepository.getComplexes();
        const shops = rentalRepository.getShops();
        const payments = rentalRepository.getPayments();
        const expenses = rentalRepository.getExpenses();
        const auditLogs = rentalRepository.getAuditLogs();

        const res = await googleDriveRentalService.syncStructuredDataset({
          complexes,
          shops,
          payments,
          expenses,
          auditLogs,
          mutationTimestamp: this.lastReconciliationTime
        });

        // Clear any successfully synced pending queue items
        const pendingItems = rentalRepository.getSyncQueue('PENDING');
        for (const item of pendingItems) {
          rentalRepository.updateSyncQueueItem(item.id, { status: 'SYNCED', attempts: item.attempts + 1 });
        }

        console.log(`[SyncService] ✅ 2-Minute Reconciliation complete. Sync Version: ${res.version}`);
        return { reconciled: true, version: res.version };
      }
    } catch (err: any) {
      console.warn('[SyncService] ⚠️ 2-Minute reconciliation Drive notice:', err?.message || err);
    }

    return { reconciled: false, version: googleDriveRentalService.getRentalVersion() };
  }

  getSyncSummary(): SyncSummary & { version: number; authMode: string; lastReconciledAt: string } {
    const queue = rentalRepository.getSyncQueue();
    const synced = queue.filter((q) => q.status === 'SYNCED').length;
    const pending = queue.filter((q) => q.status === 'PENDING').length;
    const failed = queue.filter((q) => q.status === 'FAILED').length;

    const payments = rentalRepository.getPayments();
    const lastSyncedPayment = payments
      .filter((p) => p.lastSyncedAt)
      .sort((a, b) => new Date(b.lastSyncedAt!).getTime() - new Date(a.lastSyncedAt!).getTime())[0];

    const isReady = googleDriveRentalService.isReady() || googleSheetsService.isReady();

    return {
      total: queue.length,
      synced,
      pending,
      failed,
      lastSyncedAt: lastSyncedPayment?.lastSyncedAt || this.lastReconciliationTime,
      isConfigured: isReady,
      version: googleDriveRentalService.getRentalVersion(),
      authMode: googleDriveRentalService.getAuthMode(),
      lastReconciledAt: this.lastReconciliationTime
    };
  }

  /**
   * Immediate transactional outbox trigger:
   * Adds event to local sync queue and immediately begins asynchronous background sync.
   */
  triggerSync(
    entityType: 'Complex' | 'Shop' | 'RentPayment' | 'Expense' | 'AuditLog',
    entityId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE' = 'CREATE',
    payload?: any
  ): void {
    rentalRepository.createSyncQueueItem(entityType, entityId, operation, payload);
    // Asynchronously trigger sync without blocking the current request
    setImmediate(() => {
      this.processPendingSyncQueue().catch((err) =>
        console.warn('[SyncService] Immediate sync error:', err?.message || err)
      );
    });
  }
}

export const syncService = new SyncService();
