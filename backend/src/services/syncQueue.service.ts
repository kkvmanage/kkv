import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { googleDriveService } from './googleDriveService.js';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export type SyncEntityType =
  | 'customer'
  | 'loan'
  | 'receipt'
  | 'fixed_deposit'
  | 'fd_customer'
  | 'fd_interest_payout'
  | 'fd_withdrawal'
  | 'daybook'
  | 'reminder'
  | 'notification'
  | 'settings';

export type SyncEventStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'RETRYING';

export interface SyncEvent {
  eventId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  version: number;
  timestamp: string;
  payload: any;
  status: SyncEventStatus;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt?: string;
  error?: string;
  driveFileId?: string;
  syncedAt?: string;
}

export interface SyncStatusSummary {
  totalEvents: number;
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  retrying: number;
  isProcessing: boolean;
  driveConnected: boolean;
  driveAccount: string;
  lastProcessedAt?: string;
  recentEvents: SyncEvent[];
}

const OUTBOX_FILE = 'sync_outbox.json';
const MAX_RETRIES = 5;
const MAX_OUTBOX_HISTORY = 500;

export class SyncQueueService {
  private isProcessing = false;
  private processTimeout: NodeJS.Timeout | null = null;
  private periodicInterval: NodeJS.Timeout | null = null;
  private incrementalFolderId: string | null = null;
  private lastProcessedAt: string | undefined;

  constructor() {
    this.initPeriodicWorker();
  }

  /**
   * Initializes periodic background worker to reconcile any pending/failed events.
   */
  private initPeriodicWorker(): void {
    if (this.periodicInterval) clearInterval(this.periodicInterval);
    // Reconcile pending/failed events every 20 seconds
    this.periodicInterval = setInterval(() => {
      this.processQueue().catch((err) => {
        console.warn('[SyncQueueService] Periodic queue process warning:', err?.message || err);
      });
    }, 20000);
  }

  /**
   * Reads all sync events from the persistent outbox file.
   */
  public getOutboxEvents(): SyncEvent[] {
    try {
      const list = googleDriveRepository.readJson<SyncEvent[]>(OUTBOX_FILE, []);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  /**
   * Atomically saves the outbox events list to disk.
   */
  private saveOutboxEvents(events: SyncEvent[]): void {
    // Keep most recent events up to MAX_OUTBOX_HISTORY
    const trimmed = events.slice(0, MAX_OUTBOX_HISTORY);
    googleDriveRepository.writeJson(OUTBOX_FILE, trimmed);
  }

  /**
   * Enqueues a structured sync event following a successful local database mutation.
   * NEVER throws or blocks caller execution if queueing encounters any issue.
   */
  public enqueue(
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperation,
    payload: any,
    version: number = 1
  ): SyncEvent {
    try {
      const eventId = `EVT-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const newEvent: SyncEvent = {
        eventId,
        entityType,
        entityId: String(entityId),
        operation,
        version,
        timestamp: new Date().toISOString(),
        payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
        status: 'PENDING',
        retryCount: 0,
        maxRetries: MAX_RETRIES
      };

      const events = this.getOutboxEvents();
      // Unshift to put latest event first
      events.unshift(newEvent);
      this.saveOutboxEvents(events);

      console.log(`[SyncQueueService] 📥 Enqueued sync event [${eventId}] ${operation} ${entityType}:${entityId}`);

      // Schedule debounced immediate processing
      this.scheduleProcessing(200);

      return newEvent;
    } catch (err: any) {
      console.error('[SyncQueueService] Error enqueueing sync event:', err?.message || err);
      // Fallback object so callers never crash
      return {
        eventId: `EVT-${Date.now()}`,
        entityType,
        entityId: String(entityId),
        operation,
        version,
        timestamp: new Date().toISOString(),
        payload,
        status: 'FAILED',
        retryCount: 0,
        maxRetries: MAX_RETRIES,
        error: err?.message || 'Enqueue error'
      };
    }
  }

  /**
   * Schedules queue processing with a configurable debounce delay.
   */
  public scheduleProcessing(delayMs: number = 500): void {
    if (this.processTimeout) clearTimeout(this.processTimeout);
    this.processTimeout = setTimeout(() => {
      this.processQueue().catch((err) => {
        console.warn('[SyncQueueService] Scheduled queue process warning:', err?.message || err);
      });
    }, delayMs);
  }

  /**
   * Returns or creates the designated incremental sync subfolder in Google Drive.
   */
  private async getIncrementalFolderId(): Promise<string> {
    if (this.incrementalFolderId) return this.incrementalFolderId;

    try {
      const rootId = googleDriveService.getRootFolderId();
      if (!rootId) {
        throw new Error('Google Drive root folder ID not configured');
      }

      // Check if incremental sync folder exists in Google Drive
      const folderId = await googleDriveService.getOrCreateFolder('incremental_sync', rootId);
      this.incrementalFolderId = folderId;
      return folderId;
    } catch (err: any) {
      // Fallback to root folder if subfolder creation fails
      const fallback = googleDriveService.getRootFolderId();
      this.incrementalFolderId = fallback;
      return fallback;
    }
  }

  /**
   * Processes all pending and retryable events in the outbox.
   */
  public async processQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      // 1. Check Google Drive connectivity
      if (!googleDriveService.isConnected()) {
        googleDriveService.initGoogleDrive(true);
      }

      const isDriveConnected = googleDriveService.isConnected();
      if (!isDriveConnected) {
        // Drive is temporarily unavailable - events remain PENDING / RETRYING
        this.isProcessing = false;
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      const events = this.getOutboxEvents();
      const pendingEvents = events.filter((e) => e.status === 'PENDING' || e.status === 'RETRYING');

      if (pendingEvents.length === 0) {
        this.isProcessing = false;
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      const targetFolderId = await this.getIncrementalFolderId();

      for (const event of pendingEvents) {
        processed++;
        event.status = 'SYNCING';
        event.lastAttemptAt = new Date().toISOString();

        try {
          // Construct deterministic file name for idempotent updates: e.g. "customer_CUST-0001.json"
          const safeEntityId = event.entityId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const syncFileName = `${event.entityType}_${safeEntityId}.json`;

          const syncFilePayload = {
            eventId: event.eventId,
            entityType: event.entityType,
            entityId: event.entityId,
            operation: event.operation,
            version: event.version,
            updatedAt: event.timestamp,
            syncedAt: new Date().toISOString(),
            data: event.payload
          };

          const jsonBuffer = Buffer.from(JSON.stringify(syncFilePayload, null, 2), 'utf-8');

          // Idempotent upload/update to Google Drive
          const uploadRes = await googleDriveService.uploadFile(
            {
              originalname: syncFileName,
              mimetype: 'application/json',
              buffer: jsonBuffer
            },
            targetFolderId
          );

          event.status = 'SYNCED';
          event.driveFileId = uploadRes.fileId;
          event.syncedAt = new Date().toISOString();
          event.error = undefined;
          succeeded++;

          console.log(`[SyncQueueService] ✅ Synced event [${event.eventId}] (${syncFileName}) to Google Drive`);
        } catch (eventErr: any) {
          failed++;
          event.retryCount = (event.retryCount || 0) + 1;
          const errMsg = eventErr?.message || String(eventErr);
          event.error = errMsg;

          if (event.retryCount >= event.maxRetries) {
            event.status = 'FAILED';
            console.error(`[SyncQueueService] ❌ Sync event [${event.eventId}] exceeded max retries: ${errMsg}`);
          } else {
            event.status = 'RETRYING';
            console.warn(`[SyncQueueService] ⚠️ Sync event [${event.eventId}] retry #${event.retryCount} failed: ${errMsg}`);
          }
        }
      }

      this.lastProcessedAt = new Date().toISOString();
      this.saveOutboxEvents(events);
    } catch (queueErr: any) {
      console.error('[SyncQueueService] Queue batch processing error:', queueErr?.message || queueErr);
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Manually triggers immediate retry of all failed and retrying events.
   */
  public async retryPendingEvents(): Promise<{ queued: number; message: string }> {
    const events = this.getOutboxEvents();
    let queued = 0;

    for (const e of events) {
      if (e.status === 'FAILED' || e.status === 'RETRYING') {
        e.status = 'PENDING';
        e.retryCount = 0;
        e.error = undefined;
        queued++;
      }
    }

    if (queued > 0) {
      this.saveOutboxEvents(events);
      this.scheduleProcessing(50);
    }

    return {
      queued,
      message: `${queued} failed/pending events reset for immediate synchronization.`
    };
  }

  /**
   * Returns the current sync status summary for API consumption and UI indicators.
   */
  public getSyncStatus(): SyncStatusSummary {
    const events = this.getOutboxEvents();
    const pending = events.filter((e) => e.status === 'PENDING').length;
    const syncing = events.filter((e) => e.status === 'SYNCING').length;
    const synced = events.filter((e) => e.status === 'SYNCED').length;
    const failed = events.filter((e) => e.status === 'FAILED').length;
    const retrying = events.filter((e) => e.status === 'RETRYING').length;

    return {
      totalEvents: events.length,
      pending,
      syncing,
      synced,
      failed,
      retrying,
      isProcessing: this.isProcessing,
      driveConnected: googleDriveService.isConnected(),
      driveAccount: googleDriveService.getConnectedAccount() || 'goldfinancekkv@gmail.com',
      lastProcessedAt: this.lastProcessedAt,
      recentEvents: events.slice(0, 20)
    };
  }
}

export const syncQueueService = new SyncQueueService();
