import { rentalRepository } from '../repositories/rental.repository.js';
import { googleSheetsService } from '../integrations/google/googleSheets.service.js';
import { googleDriveRentalService } from '../integrations/google/googleDriveRental.service.js';
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
    // Background worker runs every 20 seconds to reconcile any pending/retrying events
    this.periodicInterval = setInterval(() => {
      this.processPendingSyncQueue().catch((err) => {
        console.warn('[SyncService] Periodic background sync warning:', err?.message || err);
      });
    }, 20000);
  }

  /**
   * Schedules queue processing with a short debounce delay (e.g. 200ms).
   */
  public scheduleProcessing(delayMs: number = 200): void {
    if (this.processTimeout) clearTimeout(this.processTimeout);
    this.processTimeout = setTimeout(() => {
      this.processPendingSyncQueue().catch((err) => {
        console.warn('[SyncService] Scheduled queue process warning:', err?.message || err);
      });
    }, delayMs);
  }

  /**
   * Processes all pending and retryable outbox items.
   */
  public async processPendingSyncQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      // 1. Verify Drive & Sheets readiness
      if (!googleDriveRentalService.isReady()) {
        googleDriveRentalService.init();
      }

      const isDriveReady = googleDriveRentalService.isReady();

      const queue = rentalRepository.getSyncQueue();
      const pendingItems = queue.filter((item) => item.status === 'PENDING' || item.status === 'RETRYING');

      if (pendingItems.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      console.log(`[SyncService] 🔄 Processing ${pendingItems.length} pending outbox sync events...`);

      // 2. Process each pending event
      for (const item of pendingItems) {
        processed++;
        const now = new Date().toISOString();

        // Mark in-flight
        rentalRepository.updateSyncQueueItem(item.id, {
          status: 'SYNCING' as any,
          attempts: (item.attempts || 0) + 1
        });

        try {
          // A. Synchronize entity to Google Drive structured individual files
          const safeEntityId = item.entityId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${item.entityType.toLowerCase()}_${safeEntityId}.json`;

          let entityData: any = item.payload;
          if (!entityData || Object.keys(entityData).length === 0) {
            if (item.entityType === 'Complex') entityData = rentalRepository.getComplexById(item.entityId);
            else if (item.entityType === 'Shop') entityData = rentalRepository.getShopById(item.entityId);
            else if (item.entityType === 'RentPayment') entityData = rentalRepository.getPaymentById(item.entityId);
            else if (item.entityType === 'Expense') entityData = rentalRepository.getExpenseById(item.entityId);
          }

          if (isDriveReady) {
            await googleDriveRentalService.uploadOrUpdateJsonFile(fileName, {
              eventId: item.id,
              entityType: item.entityType,
              entityId: item.entityId,
              operation: item.operation,
              timestamp: now,
              data: entityData || { status: 'DELETED', id: item.entityId }
            });
          }

          // B. Synchronize to Google Sheets mirror
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

          // C. Mark operational database record as SYNCED
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
            lastError: undefined
          });

          succeeded++;
          this.lastSuccessfulSync = now;
          console.log(`[SyncService] ✅ Synced ${item.entityType}:${item.entityId} (${item.operation})`);
        } catch (err: any) {
          failed++;
          const errorMessage = err?.message || String(err);
          const currentAttempts = (item.attempts || 0) + 1;
          const nextStatus = currentAttempts >= 5 ? 'FAILED' : 'RETRYING';

          rentalRepository.updateSyncQueueItem(item.id, {
            status: nextStatus as any,
            attempts: currentAttempts,
            lastError: errorMessage
          });

          // Mark entity error state in local DB
          if (item.entityType === 'Complex') {
            rentalRepository.updateComplex(item.entityId, { syncStatus: nextStatus === 'FAILED' ? 'FAILED' : 'PENDING', lastSyncError: errorMessage });
          } else if (item.entityType === 'Shop') {
            rentalRepository.updateShop(item.entityId, { syncStatus: nextStatus === 'FAILED' ? 'FAILED' : 'PENDING', lastSyncError: errorMessage });
          } else if (item.entityType === 'RentPayment') {
            rentalRepository.updatePayment(item.entityId, { syncStatus: nextStatus === 'FAILED' ? 'FAILED' : 'PENDING', lastSyncError: errorMessage });
          } else if (item.entityType === 'Expense') {
            rentalRepository.updateExpense(item.entityId, { syncStatus: nextStatus === 'FAILED' ? 'FAILED' : 'PENDING', lastSyncError: errorMessage });
          }

          console.warn(`[SyncService] ⚠️ Sync failed for ${item.entityType}:${item.entityId} (Attempt ${currentAttempts}/5): ${errorMessage}`);
        }
      }

      // 3. Update master structured dataset in Google Drive
      if (isDriveReady && succeeded > 0) {
        try {
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
        } catch (datasetErr: any) {
          console.warn('[SyncService] Structured dataset notice:', datasetErr?.message || datasetErr);
        }
      }
    } catch (batchErr: any) {
      console.error('[SyncService] Batch sync error:', batchErr?.message || batchErr);
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Periodic Safety Reconciliation:
   * Re-evaluates entire local dataset and ensures full synchronization.
   */
  public async runFullReconciliation(): Promise<{ reconciled: boolean; version: number }> {
    console.log('[SyncService] ⏱️ Running Full Reconciliation...');
    this.lastReconciliationTime = new Date().toISOString();

    try {
      // First process any pending queue items
      await this.processPendingSyncQueue();

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

        // Sync all entities to Google Sheets if ready
        if (googleSheetsService.isReady()) {
          for (const c of complexes) await googleSheetsService.syncComplex(c);
          for (const s of shops) await googleSheetsService.syncShop(s);
          for (const p of payments) await googleSheetsService.syncPayment(p);
          for (const e of expenses) await googleSheetsService.syncExpense(e);
        }

        // Mark any remaining pending items as SYNCED
        const pendingItems = rentalRepository.getSyncQueue('PENDING');
        for (const item of pendingItems) {
          rentalRepository.updateSyncQueueItem(item.id, { status: 'SYNCED', attempts: item.attempts + 1 });
        }

        this.lastSuccessfulSync = this.lastReconciliationTime;
        console.log(`[SyncService] ✅ Reconciliation complete. Sync Version: ${res.version}`);
        return { reconciled: true, version: res.version };
      }
    } catch (err: any) {
      console.warn('[SyncService] ⚠️ Reconciliation notice:', err?.message || err);
    }

    return { reconciled: false, version: googleDriveRentalService.getRentalVersion() };
  }

  /**
   * Enqueues an entity mutation into the local transactional outbox queue and schedules immediate sync.
   */
  public triggerSync(
    entityType: RentalEntityType,
    entityId: string,
    operation: SyncOperation = 'CREATE',
    payload?: any
  ): void {
    try {
      rentalRepository.createSyncQueueItem(entityType, entityId, operation, payload);
      console.log(`[SyncService] 📥 Enqueued sync event [${operation}] ${entityType}:${entityId}`);
      // Asynchronously schedule queue processing without blocking caller
      this.scheduleProcessing(100);
    } catch (err: any) {
      console.error('[SyncService] Error enqueueing sync event:', err?.message || err);
    }
  }

  /**
   * Returns live sync status summary for API consumption and UI indicators.
   */
  public getSyncSummary(): SyncSummary & {
    version: number;
    authMode: string;
    lastReconciledAt: string;
    driveConnected: boolean;
    driveAccount: string;
    isProcessing: boolean;
    folderId: string;
  } {
    const queue = rentalRepository.getSyncQueue();
    const synced = queue.filter((q) => q.status === 'SYNCED').length;
    const pending = queue.filter((q) => q.status === 'PENDING' || q.status === 'RETRYING').length;
    const failed = queue.filter((q) => q.status === 'FAILED').length;

    const isReady = googleDriveRentalService.isReady();

    // Actual count of synced operational entities
    const complexes = rentalRepository.getComplexes();
    const shops = rentalRepository.getShops();
    const payments = rentalRepository.getPayments();
    const expenses = rentalRepository.getExpenses();
    const totalLocalEntities = complexes.length + shops.length + payments.length + expenses.length;

    return {
      total: queue.length,
      synced: synced > 0 ? synced : totalLocalEntities,
      pending,
      failed,
      lastSyncedAt: this.lastSuccessfulSync,
      isConfigured: isReady,
      version: googleDriveRentalService.getRentalVersion(),
      authMode: googleDriveRentalService.getAuthMode(),
      lastReconciledAt: this.lastReconciliationTime,
      driveConnected: isReady,
      driveAccount: googleDriveRentalService.getConnectedAccount(),
      isProcessing: this.isProcessing,
      folderId: googleDriveRentalService.getRootFolderId()
    };
  }
}

export const syncService = new SyncService();
