import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/app.config.js';
import {
  RentalComplex,
  RentalShop,
  RentalPayment,
  RentalExpense,
  AuditLog,
  SyncQueueItem,
  UserAccount,
  UserSession,
  PasswordResetToken
} from '../types/rental.types.js';
import { IdGenerator } from '../utils/idGenerator.js';

interface DatabaseSchema {
  users: UserAccount[];
  sessions: UserSession[];
  passwordResetTokens: PasswordResetToken[];
  complexes: RentalComplex[];
  shops: RentalShop[];
  payments: RentalPayment[];
  expenses: RentalExpense[];
  auditLogs: AuditLog[];
  syncQueue: SyncQueueItem[];
  sequences: {
    user: number;
    complex: number;
    shop: number;
    payment: number;
    expense: number;
    audit: number;
    sync: number;
  };
}

export class RentalRepository {
  private dbPath: string;
  private memoryCache: DatabaseSchema | null = null;

  constructor() {
    this.dbPath = path.join(config.databaseDir, 'rental.db.json');
    this.initDatabase();
  }

  private initDatabase(): void {
    if (!fs.existsSync(config.databaseDir)) {
      fs.mkdirSync(config.databaseDir, { recursive: true });
    }

    if (!fs.existsSync(this.dbPath)) {
      const defaultPasswordHash = bcrypt.hashSync('rental123', 10);
      const defaultAdminHash = bcrypt.hashSync('admin123', 10);
      const now = new Date().toISOString();

      const initialData: DatabaseSchema = {
        users: [
          {
            id: 'USR-0001',
            googleId: null,
            email: 'admin@kkvgoldfinance.com',
            name: 'Rental Administrator',
            displayName: 'Rental Administrator',
            role: 'RENTAL_ADMIN',
            status: 'ACTIVE',
            isActive: true,
            authProvider: 'BOTH',
            passwordHash: defaultAdminHash,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: null
          },
          {
            id: 'USR-0002',
            googleId: null,
            email: 'staff@kkvgoldfinance.com',
            name: 'Rental Staff Member',
            displayName: 'Rental Staff',
            role: 'RENTAL_STAFF',
            status: 'ACTIVE',
            isActive: true,
            authProvider: 'BOTH',
            passwordHash: defaultPasswordHash,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: null
          }
        ],
        sessions: [],
        passwordResetTokens: [],
        complexes: [],
        shops: [],
        payments: [],
        expenses: [],
        auditLogs: [],
        syncQueue: [],
        sequences: {
          user: 2,
          complex: 0,
          shop: 0,
          payment: 0,
          expense: 0,
          audit: 0,
          sync: 0
        }
      };

      this.persistData(initialData);
    } else {
      // Ensure schema upgrades for existing database
      const data = this.loadData();
      let changed = false;
      if (!data.sessions) {
        data.sessions = [];
        changed = true;
      }
      if (!data.passwordResetTokens) {
        data.passwordResetTokens = [];
        changed = true;
      }
      if (!data.sequences.user) {
        data.sequences.user = (data.users || []).length;
        changed = true;
      }
      // Check user objects for status / authProvider fields
      if (data.users && Array.isArray(data.users)) {
        data.users.forEach((u) => {
          if (!u.status) {
            u.status = u.isActive === false ? 'DISABLED' : 'ACTIVE';
            changed = true;
          }
          if (!u.authProvider) {
            u.authProvider = u.googleId ? 'GOOGLE' : (u.passwordHash ? 'LOCAL' : 'BOTH');
            changed = true;
          }
          if (!u.name && (u.displayName || (u as any).username)) {
            u.name = u.displayName || (u as any).username;
            changed = true;
          }
        });
      }
      if (changed) {
        this.persistData(data);
      }
    }
  }

  private loadData(): DatabaseSchema {
    try {
      const raw = fs.readFileSync(this.dbPath, 'utf8');
      this.memoryCache = JSON.parse(raw);
      if (!this.memoryCache!.sessions) this.memoryCache!.sessions = [];
      if (!this.memoryCache!.passwordResetTokens) this.memoryCache!.passwordResetTokens = [];
      return this.memoryCache!;
    } catch (err) {
      console.error('Error loading rental database, restoring default:', err);
      this.initDatabase();
      const raw = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(raw);
    }
  }

  private persistData(data: DatabaseSchema): void {
    const tmpPath = `${this.dbPath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.dbPath);
    this.memoryCache = data;
  }

  // ── USER MANAGEMENT ────────────────────────────────────────────────────────
  findUserByFirebaseUid(firebaseUid: string): UserAccount | null {
    const db = this.loadData();
    return db.users.find((u) => u.firebaseUid === firebaseUid) || null;
  }

  findUserByEmail(email: string): UserAccount | null {
    const db = this.loadData();
    const clean = email.trim().toLowerCase();
    return db.users.find((u) => u.email.toLowerCase() === clean) || null;
  }

  findUserByUsernameOrEmail(identifier: string): UserAccount | null {
    const db = this.loadData();
    const clean = identifier.trim().toLowerCase();
    return (
      db.users.find(
        (u) =>
          u.email.toLowerCase() === clean ||
          ((u as any).username && (u as any).username.toLowerCase() === clean) ||
          u.name.toLowerCase() === clean
      ) || null
    );
  }

  findUserById(id: string): UserAccount | null {
    const db = this.loadData();
    return db.users.find((u) => u.id === id) || null;
  }

  getUsers(): UserAccount[] {
    const db = this.loadData();
    return [...db.users];
  }

  createUser(
    data: Omit<UserAccount, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & {
      id?: string;
      isActive?: boolean;
    }
  ): UserAccount {
    const db = this.loadData();
    db.sequences.user += 1;
    const id = data.id || `USR-${String(db.sequences.user).padStart(4, '0')}`;
    const now = new Date().toISOString();

    const newUser: UserAccount = {
      ...data,
      id,
      status: data.status || 'ACTIVE',
      isActive: data.status === 'ACTIVE' || data.isActive !== false,
      authProvider: data.authProvider || 'GOOGLE',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: data.lastLoginAt || null
    };

    db.users.push(newUser);
    this.persistData(db);
    return newUser;
  }

  updateUser(id: string, updates: Partial<UserAccount>): UserAccount | null {
    const db = this.loadData();
    const index = db.users.findIndex((u) => u.id === id || u.email.toLowerCase() === id.toLowerCase());
    if (index === -1) return null;

    const existing = db.users[index];
    const status = updates.status !== undefined ? updates.status : existing.status;
    const isActive = status === 'ACTIVE';

    const updated: UserAccount = {
      ...existing,
      ...updates,
      status,
      isActive,
      updatedAt: new Date().toISOString()
    };

    db.users[index] = updated;
    this.persistData(db);
    return updated;
  }

  deleteUser(id: string): boolean {
    const db = this.loadData();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return false;

    db.users.splice(index, 1);
    this.persistData(db);
    return true;
  }

  // ── SESSIONS ───────────────────────────────────────────────────────────────
  createSession(data: {
    userId: string;
    sessionToken: string;
    expiresAt: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): UserSession {
    const db = this.loadData();
    const session: UserSession = {
      id: crypto.randomUUID(),
      userId: data.userId,
      sessionToken: data.sessionToken,
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
      isValid: true,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null
    };

    db.sessions.push(session);
    this.persistData(db);
    return session;
  }

  findSessionByToken(sessionToken: string): UserSession | null {
    const db = this.loadData();
    const now = new Date().toISOString();
    return db.sessions.find((s) => s.sessionToken === sessionToken && s.isValid && s.expiresAt > now) || null;
  }

  invalidateSession(sessionToken: string): boolean {
    const db = this.loadData();
    const session = db.sessions.find((s) => s.sessionToken === sessionToken);
    if (!session) return false;

    session.isValid = false;
    this.persistData(db);
    return true;
  }

  invalidateAllUserSessions(userId: string): void {
    const db = this.loadData();
    let updated = false;
    db.sessions.forEach((s) => {
      if (s.userId === userId && s.isValid) {
        s.isValid = false;
        updated = true;
      }
    });
    if (updated) {
      this.persistData(db);
    }
  }

  // ── PASSWORD RESET TOKENS ──────────────────────────────────────────────────
  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: string;
  }): PasswordResetToken {
    const db = this.loadData();
    // Invalidate previous reset tokens for this user
    db.passwordResetTokens.forEach((t) => {
      if (t.userId === data.userId && !t.usedAt) {
        t.usedAt = new Date().toISOString();
      }
    });

    const resetToken: PasswordResetToken = {
      id: crypto.randomUUID(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date().toISOString()
    };

    db.passwordResetTokens.push(resetToken);
    this.persistData(db);
    return resetToken;
  }

  findPasswordResetTokenByHash(tokenHash: string): PasswordResetToken | null {
    const db = this.loadData();
    const now = new Date().toISOString();
    return (
      db.passwordResetTokens.find(
        (t) => t.tokenHash === tokenHash && !t.usedAt && t.expiresAt > now
      ) || null
    );
  }

  markPasswordResetTokenUsed(id: string): void {
    const db = this.loadData();
    const token = db.passwordResetTokens.find((t) => t.id === id);
    if (token) {
      token.usedAt = new Date().toISOString();
      this.persistData(db);
    }
  }

  // ── COMPLEXES ──────────────────────────────────────────────────────────────
  getComplexes(): RentalComplex[] {
    const db = this.loadData();
    return [...db.complexes];
  }

  getComplexById(complexId: string): RentalComplex | null {
    const db = this.loadData();
    return db.complexes.find((c) => c.complexId === complexId || c.id === complexId) || null;
  }

  createComplex(
    data: Omit<RentalComplex, 'id' | 'complexId' | 'createdAt' | 'updatedAt' | 'syncStatus'>
  ): RentalComplex {
    const db = this.loadData();
    db.sequences.complex += 1;
    const complexId = IdGenerator.formatId('CMP', db.sequences.complex);
    const now = new Date().toISOString();

    const complex: RentalComplex = {
      id: crypto.randomUUID(),
      complexId,
      ...data,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      syncAttempts: 0
    };

    db.complexes.push(complex);
    this.persistData(db);
    return complex;
  }

  updateComplex(complexId: string, updates: Partial<RentalComplex>): RentalComplex | null {
    const db = this.loadData();
    const index = db.complexes.findIndex((c) => c.complexId === complexId || c.id === complexId);
    if (index === -1) return null;

    const existing = db.complexes[index];
    const updated: RentalComplex = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    db.complexes[index] = updated;
    this.persistData(db);
    return updated;
  }

  // ── SHOPS ──────────────────────────────────────────────────────────────────
  getShops(): RentalShop[] {
    const db = this.loadData();
    return [...db.shops];
  }

  getShopById(shopId: string): RentalShop | null {
    const db = this.loadData();
    return db.shops.find((s) => s.shopId === shopId || s.id === shopId) || null;
  }

  getShopsByComplexId(complexId: string): RentalShop[] {
    const db = this.loadData();
    return db.shops.filter((s) => s.complexId === complexId);
  }

  createShop(
    data: Omit<RentalShop, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'availableAdvance'> & {
      availableAdvance?: number;
    }
  ): RentalShop {
    const db = this.loadData();
    db.sequences.shop += 1;
    const shopId = IdGenerator.formatId('SHOP', db.sequences.shop);
    const now = new Date().toISOString();

    const shop: RentalShop = {
      id: crypto.randomUUID(),
      shopId,
      ...data,
      availableAdvance: data.availableAdvance || 0,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      syncAttempts: 0
    };

    db.shops.push(shop);
    this.persistData(db);
    return shop;
  }

  updateShop(shopId: string, updates: Partial<RentalShop>): RentalShop | null {
    const db = this.loadData();
    const index = db.shops.findIndex((s) => s.shopId === shopId || s.id === shopId);
    if (index === -1) return null;

    const existing = db.shops[index];
    const updated: RentalShop = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    db.shops[index] = updated;
    this.persistData(db);
    return updated;
  }

  // ── PAYMENTS ───────────────────────────────────────────────────────────────
  getPayments(): RentalPayment[] {
    const db = this.loadData();
    return [...db.payments];
  }

  getPaymentById(paymentId: string): RentalPayment | null {
    const db = this.loadData();
    return db.payments.find((p) => p.paymentId === paymentId || p.id === paymentId) || null;
  }

  getPaymentsByShopId(shopId: string): RentalPayment[] {
    const db = this.loadData();
    return db.payments.filter((p) => p.shopId === shopId);
  }

  getPaymentsByMonth(paymentMonth: string): RentalPayment[] {
    const db = this.loadData();
    return db.payments.filter((p) => p.paymentMonth === paymentMonth);
  }

  getPaymentsByShopAndMonth(shopId: string, paymentMonth: string): RentalPayment[] {
    const db = this.loadData();
    return db.payments.filter((p) => p.shopId === shopId && p.paymentMonth === paymentMonth);
  }

  createPayment(
    data: Omit<RentalPayment, 'id' | 'paymentId' | 'createdAt' | 'updatedAt' | 'syncStatus'>
  ): RentalPayment {
    const db = this.loadData();
    db.sequences.payment += 1;
    const paymentId = IdGenerator.formatId('PAY', db.sequences.payment);
    const now = new Date().toISOString();

    const payment: RentalPayment = {
      id: crypto.randomUUID(),
      paymentId,
      ...data,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      syncAttempts: 0
    };

    db.payments.push(payment);
    this.persistData(db);
    return payment;
  }

  updatePayment(paymentId: string, updates: Partial<RentalPayment>): RentalPayment | null {
    const db = this.loadData();
    const index = db.payments.findIndex((p) => p.paymentId === paymentId || p.id === paymentId);
    if (index === -1) return null;

    const existing = db.payments[index];
    const updated: RentalPayment = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    db.payments[index] = updated;
    this.persistData(db);
    return updated;
  }

  // ── EXPENSES ───────────────────────────────────────────────────────────────
  getExpenses(): RentalExpense[] {
    const db = this.loadData();
    return [...db.expenses];
  }

  getExpenseById(expenseId: string): RentalExpense | null {
    const db = this.loadData();
    return db.expenses.find((e) => e.expenseId === expenseId || e.id === expenseId) || null;
  }

  createExpense(
    data: Omit<RentalExpense, 'id' | 'expenseId' | 'createdAt' | 'updatedAt' | 'syncStatus'>
  ): RentalExpense {
    const db = this.loadData();
    db.sequences.expense += 1;
    const expenseId = IdGenerator.formatId('EXP', db.sequences.expense);
    const now = new Date().toISOString();

    const expense: RentalExpense = {
      id: crypto.randomUUID(),
      expenseId,
      ...data,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      syncAttempts: 0
    };

    db.expenses.push(expense);
    this.persistData(db);
    return expense;
  }

  updateExpense(expenseId: string, updates: Partial<RentalExpense>): RentalExpense | null {
    const db = this.loadData();
    const index = db.expenses.findIndex((e) => e.expenseId === expenseId || e.id === expenseId);
    if (index === -1) return null;

    const existing = db.expenses[index];
    const updated: RentalExpense = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    db.expenses[index] = updated;
    this.persistData(db);
    return updated;
  }

  deleteExpense(expenseId: string): boolean {
    const db = this.loadData();
    const index = db.expenses.findIndex((e) => e.expenseId === expenseId || e.id === expenseId);
    if (index === -1) return false;

    db.expenses.splice(index, 1);
    this.persistData(db);
    return true;
  }

  // ── AUDIT LOGS ─────────────────────────────────────────────────────────────
  getAuditLogs(limit: number = 100): AuditLog[] {
    const db = this.loadData();
    return [...db.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  createAuditLog(data: Omit<AuditLog, 'id' | 'auditId' | 'timestamp'>): AuditLog {
    const db = this.loadData();
    db.sequences.audit += 1;
    const auditId = IdGenerator.formatId('AUD', db.sequences.audit);

    const log: AuditLog = {
      id: crypto.randomUUID(),
      auditId,
      ...data,
      timestamp: new Date().toISOString()
    };

    db.auditLogs.push(log);
    this.persistData(db);
    return log;
  }

  // ── SYNC QUEUE ─────────────────────────────────────────────────────────────
  getSyncQueue(status?: string): SyncQueueItem[] {
    const db = this.loadData();
    if (status) {
      return db.syncQueue.filter((q) => q.status === status);
    }
    return [...db.syncQueue];
  }

  createSyncQueueItem(
    entityType: any,
    entityId: string,
    operation: any = 'CREATE',
    payload: any = {}
  ): SyncQueueItem {
    const db = this.loadData();
    db.sequences.sync += 1;
    const now = new Date().toISOString();

    const item: SyncQueueItem = {
      id: IdGenerator.formatId('SYNC', db.sequences.sync),
      entityType,
      entityId,
      action: operation,
      operation,
      payload: payload || {},
      status: 'PENDING',
      attempts: 0,
      createdAt: now,
      updatedAt: now
    };

    db.syncQueue.push(item);
    this.persistData(db);
    return item;
  }

  updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): void {
    const db = this.loadData();
    const index = db.syncQueue.findIndex((q) => q.id === id);
    if (index !== -1) {
      db.syncQueue[index] = {
        ...db.syncQueue[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.persistData(db);
    }
  }
}

export const rentalRepository = new RentalRepository();
