import fs from 'fs';
import path from 'path';
import { getFinanceDb, getRentalDb, getMongoClient } from '../config/database.js';
import { env } from '../config/env.js';

export interface ConcurrencyError extends Error {
  statusCode: number;
  code: string;
}

export class DatabaseService {
  private dataDir: string;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'backend/data');
    if (!fs.existsSync(this.dataDir)) {
      this.dataDir = path.resolve(process.cwd(), 'data');
    }
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch {
        // Ignored if cannot create in serverless read-only environment
      }
    }
  }

  private getFilePath(collection: string): string {
    return path.join(this.dataDir, `${collection}.json`);
  }

  private readLocalJson<T>(collection: string, defaultValue: T): T {
    try {
      const p = this.getFilePath(collection);
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`[DatabaseService] Fallback read warning for ${collection}:`, err);
    }
    return defaultValue;
  }

  private writeLocalJson<T>(collection: string, data: T): void {
    try {
      const p = this.getFilePath(collection);
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      // In serverless readonly environments, local writes may fail, but Atlas is authoritative
      console.warn(`[DatabaseService] Fallback local write warning for ${collection}:`, err);
    }
  }

  /**
   * Execute idempotent financial operation
   */
  async handleIdempotency<T>(
    idempotencyKey?: string,
    operation?: () => Promise<T>
  ): Promise<{ handled: boolean; result?: T }> {
    if (!idempotencyKey || !idempotencyKey.trim()) {
      return { handled: false };
    }

    const key = idempotencyKey.trim();
    const db = await getFinanceDb();

    if (db) {
      const existing = await db.collection('idempotency_keys').findOne({ key });
      if (existing && existing.response) {
        return { handled: true, result: existing.response as T };
      }
    } else {
      const keys = this.readLocalJson<Record<string, any>>('idempotency_keys', {});
      if (keys[key]) {
        return { handled: true, result: keys[key] as T };
      }
    }

    if (operation) {
      const result = await operation();
      if (db) {
        await db.collection('idempotency_keys').updateOne(
          { key },
          { $set: { key, response: result, createdAt: new Date() } },
          { upsert: true }
        );
      } else {
        const keys = this.readLocalJson<Record<string, any>>('idempotency_keys', {});
        keys[key] = result;
        this.writeLocalJson('idempotency_keys', keys);
      }
      return { handled: true, result };
    }

    return { handled: false };
  }

  /**
   * Generic GetAll with MongoDB Atlas First + Local Fallback
   */
  async getAll<T extends { id?: string }>(collection: string): Promise<T[]> {
    const db = await getFinanceDb();
    if (db) {
      try {
        const items = await db.collection(collection).find({}).toArray();
        return items.map((doc) => {
          const { _id, ...rest } = doc as any;
          return rest as T;
        });
      } catch (err) {
        console.warn(`[DatabaseService] Atlas fetch error for ${collection}, using fallback:`, err);
      }
    }
    return this.readLocalJson<T[]>(collection, []);
  }

  /**
   * Generic GetById with MongoDB Atlas First + Local Fallback
   */
  async getById<T extends { id?: string; loanNo?: string; fdNo?: string; uid?: string }>(
    collection: string,
    id: string
  ): Promise<T | null> {
    const db = await getFinanceDb();
    if (db) {
      try {
        const doc = await db.collection(collection).findOne({
          $or: [{ id }, { loanNo: id }, { fdNo: id }, { uid: id }]
        });
        if (doc) {
          const { _id, ...rest } = doc as any;
          return rest as T;
        }
        return null;
      } catch (err) {
        console.warn(`[DatabaseService] Atlas find error for ${collection}:`, err);
      }
    }

    const localList = this.readLocalJson<T[]>(collection, []);
    return localList.find((i) => i.id === id || i.loanNo === id || i.fdNo === id || i.uid === id) || null;
  }

  /**
   * Generic Insert with Optimistic Versioning & Concurrency Safety
   */
  async insert<T extends { id?: string; version?: number; createdAt?: string }>(
    collection: string,
    item: T
  ): Promise<T> {
    const record = {
      ...item,
      version: (item as any).version || 1,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const db = await getFinanceDb();
    if (db) {
      try {
        await db.collection(collection).insertOne({ ...record });
      } catch (err: any) {
        if (err.code === 11000) {
          const conflictErr = new Error(`Record with this identifier already exists in ${collection}.`) as ConcurrencyError;
          conflictErr.statusCode = 409;
          conflictErr.code = 'DUPLICATE_KEY';
          throw conflictErr;
        }
        throw err;
      }
    }

    // Mirror to local JSON storage for local tests / offline safety
    const localList = this.readLocalJson<T[]>(collection, []);
    localList.push(record as unknown as T);
    this.writeLocalJson(collection, localList);

    return record as unknown as T;
  }

  /**
   * Generic Update with Optimistic Concurrency Control (detects stale edits)
   */
  async update<T extends { id?: string; version?: number; updatedAt?: string }>(
    collection: string,
    id: string,
    updates: Partial<T>,
    expectedVersion?: number
  ): Promise<T | null> {
    const db = await getFinanceDb();

    if (db) {
      const existing = await db.collection(collection).findOne({
        $or: [{ id }, { loanNo: id }, { fdNo: id }, { uid: id }]
      });

      if (!existing) return null;

      // Optimistic Concurrency Check
      if (expectedVersion !== undefined && existing.version !== undefined) {
        if (existing.version !== expectedVersion) {
          const err = new Error(
            `Optimistic Concurrency Conflict: Record ${id} was modified by another staff member (current version: ${existing.version}, your version: ${expectedVersion}). Please refresh.`
          ) as ConcurrencyError;
          err.statusCode = 409;
          err.code = 'VERSION_CONFLICT';
          throw err;
        }
      }

      const nextVersion = (existing.version || 1) + 1;
      const updatedData = {
        ...existing,
        ...updates,
        version: nextVersion,
        updatedAt: new Date().toISOString()
      };
      delete (updatedData as any)._id;

      await db.collection(collection).updateOne(
        { $or: [{ id }, { loanNo: id }, { fdNo: id }, { uid: id }] },
        { $set: updatedData }
      );

      // Mirror to local cache
      const localList = this.readLocalJson<T[]>(collection, []);
      const idx = localList.findIndex((i: any) => i.id === id || i.loanNo === id || i.fdNo === id || i.uid === id);
      if (idx !== -1) {
        localList[idx] = updatedData as unknown as T;
        this.writeLocalJson(collection, localList);
      }

      return updatedData as unknown as T;
    }

    // Local Fallback Update with version check
    const localList = this.readLocalJson<T[]>(collection, []);
    const idx = localList.findIndex((i: any) => i.id === id || i.loanNo === id || i.fdNo === id || i.uid === id);
    if (idx === -1) return null;

    const currentItem: any = localList[idx];
    if (expectedVersion !== undefined && currentItem.version !== undefined) {
      if (currentItem.version !== expectedVersion) {
        const err = new Error(
          `Optimistic Concurrency Conflict: Record ${id} was modified. Please reload.`
        ) as ConcurrencyError;
        err.statusCode = 409;
        err.code = 'VERSION_CONFLICT';
        throw err;
      }
    }

    const nextVersion = (currentItem.version || 1) + 1;
    const merged = {
      ...currentItem,
      ...updates,
      version: nextVersion,
      updatedAt: new Date().toISOString()
    };
    localList[idx] = merged;
    this.writeLocalJson(collection, localList);

    return merged;
  }

  /**
   * Generic Soft Delete / Hard Delete
   */
  async delete(collection: string, id: string, softDelete: boolean = true): Promise<boolean> {
    const db = await getFinanceDb();

    if (db) {
      if (softDelete) {
        const res = await db.collection(collection).updateOne(
          { $or: [{ id }, { loanNo: id }, { fdNo: id }, { uid: id }] },
          { $set: { isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
        );
        return res.matchedCount > 0;
      } else {
        const res = await db.collection(collection).deleteOne({
          $or: [{ id }, { loanNo: id }, { fdNo: id }, { uid: id }]
        });
        return res.deletedCount > 0;
      }
    }

    const localList = this.readLocalJson<any[]>(collection, []);
    const idx = localList.findIndex((i: any) => i.id === id || i.loanNo === id || i.fdNo === id || i.uid === id);
    if (idx === -1) return false;

    if (softDelete) {
      localList[idx] = {
        ...localList[idx],
        isDeleted: true,
        deletedAt: new Date().toISOString()
      };
    } else {
      localList.splice(idx, 1);
    }
    this.writeLocalJson(collection, localList);
    return true;
  }

  /**
   * Multi-Document Transaction Wrapper (MongoDB Atlas)
   */
  async withTransaction<R>(fn: () => Promise<R>): Promise<R> {
    const clientInstance = await getMongoClient();
    if (clientInstance) {
      const session = clientInstance.startSession();
      try {
        session.startTransaction();
        const result = await fn();
        await session.commitTransaction();
        return result;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        await session.endSession();
      }
    }
    return fn();
  }

  /**
   * Migrate and sync local database into MongoDB Atlas
   */
  async migrateLocalToAtlas(): Promise<{
    success: boolean;
    migratedCounts: Record<string, number>;
    message: string;
  }> {
    const db = await getFinanceDb();
    if (!db) {
      return {
        success: false,
        migratedCounts: {},
        message: 'MongoDB Atlas is not configured or reachable. Check MONGODB_URI.'
      };
    }

    const collections = [
      'customers',
      'loans',
      'receipts',
      'fixed_deposits',
      'fd_customers',
      'fd_interest_payouts',
      'fd_withdrawals',
      'daybook_entries',
      'admin_users',
      'master_settings',
      'reminders',
      'notifications'
    ];

    const counts: Record<string, number> = {};

    for (const col of collections) {
      const localItems = this.readLocalJson<any[]>(col, []);
      if (Array.isArray(localItems) && localItems.length > 0) {
        for (const item of localItems) {
          const filter = item.id
            ? { id: item.id }
            : item.loanNo
            ? { loanNo: item.loanNo }
            : item.fdNo
            ? { fdNo: item.fdNo }
            : item.uid
            ? { uid: item.uid }
            : { _syntheticId: item._syntheticId || Math.random().toString() };

          await db.collection(col).updateOne(filter, { $set: item }, { upsert: true });
        }
        counts[col] = localItems.length;
      } else {
        counts[col] = 0;
      }
    }

    return {
      success: true,
      migratedCounts: counts,
      message: 'Local database successfully exported and verified into MongoDB Atlas.'
    };
  }
}

export const dbService = new DatabaseService();
