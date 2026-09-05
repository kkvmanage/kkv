export type RentalStatus = 'ACTIVE' | 'INACTIVE';
export type PaymentMode = 'CASH' | 'GPAY' | 'BOTH';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';
export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';
export type ExpenseCategory =
  | 'Electricity'
  | 'Maintenance'
  | 'Cleaning'
  | 'Plumbing'
  | 'Repair'
  | 'Water'
  | 'Security'
  | 'Transport'
  | 'Other';

export type UserRole = 'RENTAL_ADMIN' | 'RENTAL_STAFF';
export type UserStatus = 'ACTIVE' | 'DISABLED';
export type AuthProvider = 'GOOGLE' | 'LOCAL' | 'BOTH';

export interface UserAccount {
  id: string; // USR-0001
  username?: string;
  firebaseUid?: string | null;
  googleId?: string | null;
  email: string;
  name: string;
  displayName?: string;
  profileImage?: string | null;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  authProvider: AuthProvider;
  passwordHash?: string | null;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  createdAt: string;
  expiresAt: string;
  isValid: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
}

export interface RentalComplex {
  id: string;
  complexId: string; // CMP-0001
  complexName: string;
  location: string;
  status: RentalStatus;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  syncAttempts?: number;
  lastSyncError?: string;
}

export interface RentalShop {
  id: string;
  shopId: string; // SHOP-0001
  complexId: string; // CMP-0001
  shopNumber: string;
  shopName: string;
  tenantName: string;
  mobileNumber: string;
  monthlyRent: number;
  availableAdvance: number;
  status: RentalStatus;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  syncAttempts?: number;
  lastSyncError?: string;
}

export interface RentalPayment {
  id: string;
  paymentId: string; // PAY-0001
  complexId: string;
  shopId: string;
  paymentMonth: string; // YYYY-MM
  monthlyRent: number;
  amountReceived: number;
  cashAmount: number;
  gpayAmount: number;
  paymentMode: PaymentMode;
  advanceUsed: number;
  advanceGenerated: number;
  balanceAfterPayment: number;
  paymentStatus: PaymentStatus;
  paymentDate: string; // YYYY-MM-DD
  mobileNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  syncAttempts?: number;
  lastSyncError?: string;
}

export interface RentalExpense {
  id: string;
  expenseId: string; // EXP-0001
  complexId: string;
  shopId?: string;
  expenseDate: string; // YYYY-MM-DD
  category: ExpenseCategory;
  expenseReason: string;
  expenseAmount: number;
  paymentMode: PaymentMode;
  cashAmount: number;
  gpayAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  syncAttempts?: number;
  lastSyncError?: string;
}

export interface AuditLog {
  id: string;
  auditId: string; // AUD-0001
  userId?: string;
  userEmail?: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'SYNC_SUCCESS'
    | 'SYNC_FAILED'
    | 'GOOGLE_LOGIN_SUCCESS'
    | 'GOOGLE_LOGIN_FAILED'
    | 'UNAUTHORIZED_LOGIN'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'PASSWORD_RESET_REQUEST'
    | 'PASSWORD_RESET_SUCCESS'
    | 'PASSWORD_RESET_FAILED'
    | 'USER_CREATED'
    | 'USER_DISABLED'
    | 'USER_ROLE_CHANGED'
    | 'CREATE_COMPLEX'
    | 'UPDATE_COMPLEX'
    | 'CREATE_SHOP'
    | 'UPDATE_SHOP'
    | 'CREATE_RENT_PAYMENT'
    | 'UPDATE_RENT_PAYMENT'
    | 'CREATE_EXPENSE'
    | 'UPDATE_EXPENSE'
    | 'DELETE_EXPENSE'
    | 'ADVANCE_GENERATED'
    | 'ADVANCE_USED'
    | string;
  entityType: 'COMPLEX' | 'SHOP' | 'PAYMENT' | 'EXPENSE' | 'AUTH' | 'USER' | 'Complex' | 'Shop' | 'RentPayment' | 'Expense' | string;
  entityId: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  timestamp: string;
  ipAddress?: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'COMPLEX' | 'SHOP' | 'PAYMENT' | 'EXPENSE' | 'Complex' | 'Shop' | 'RentPayment' | 'Expense';
  entityId: string;
  action?: 'INSERT' | 'UPDATE' | 'CREATE' | 'DELETE';
  operation?: 'INSERT' | 'UPDATE' | 'CREATE' | 'DELETE';
  payload?: Record<string, any>;
  status: SyncStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalDashboardData {
  totalComplexes: number;
  totalShops: number;
  expectedMonthlyRent: number;
  collectedThisMonth: number;
  pendingRent: number;
  availableAdvance: number;
  todayCollection?: number;
  todaysCollection?: number;
  todayExpenses?: number;
  todaysExpenses?: number;
  thisMonthExpenses: number;
  netRentalCollection?: number;
  netCollection?: number;
  complexStats?: any;
  monthlyTrend?: any;
  paymentModeSplit?: any;
  monthlyCollectionTrends?: { month: string; collected: number; target: number }[];
  pendingRentBreakdown?: { complexName: string; pendingAmount: number }[];
  paymentModeBreakdown?: { cash: number; gpay: number; both: number };
  monthlyExpensesTrends?: { month: string; amount: number }[];
  complexPerformance?: {
    complexId: string;
    complexName: string;
    totalShops?: number;
    expectedRent: number;
    collected: number;
    pending: number;
    expenses: number;
    net?: number;
    netCollection?: number;
  }[];
  recentPayments: RentalPayment[];
  recentExpenses: RentalExpense[];
  [key: string]: any;
}

export interface AdminRentalSummary {
  totalComplexes: number;
  totalShops: number;
  expectedMonthlyRent: number;
  collectedThisMonth: number;
  pendingRent: number;
  advanceAmount: number;
  totalExpenses: number;
  netCollection: number;
  complexPerformance: {
    complexId: string;
    complexName: string;
    totalShops?: number;
    expectedRent: number;
    collected: number;
    pending: number;
    expenses: number;
    net?: number;
    netCollection?: number;
  }[];
  complexBreakdown?: {
    complexId: string;
    complexName: string;
    totalShops: number;
    expectedRent: number;
    collected: number;
    pending: number;
    expenses: number;
    netCollection: number;
  }[];
  [key: string]: any;
}

export interface MonthlyRentReportItem {
  shopId?: string;
  shopNumber?: string;
  shopName?: string;
  tenantName?: string;
  mobileNumber?: string;
  complexId: string;
  complexName: string;
  location?: string;
  totalShops?: number;
  expectedRent?: number;
  collected?: number;
  pending?: number;
  advance?: number;
  monthlyRent?: number;
  amountReceived?: number;
  advanceUsed?: number;
  advanceGenerated?: number;
  balance?: number;
  expenses?: number;
  netCollection?: number;
  status?: PaymentStatus;
  lastPaymentDate?: string;
  [key: string]: any;
}

export interface PaymentModeReportData {
  month?: string;
  totalCollected?: number;
  cashTotal: number;
  gpayTotal: number;
  cashPercentage?: number;
  gpayPercentage?: number;
  transactionsCount?: number;
  totalPayments?: number;
  cashCount?: number;
  gpayCount?: number;
  bothCount?: number;
  transactions: {
    paymentId: string;
    shopNumber: string;
    tenantName: string;
    paymentDate: string;
    paymentMode: PaymentMode;
    cashAmount: number;
    gpayAmount: number;
    totalAmount?: number;
    amountReceived?: number;
  }[];
  [key: string]: any;
}

export interface SyncSummary {
  spreadsheetId?: string;
  driveFolderId?: string;
  lastSyncedAt?: string;
  totalSynced?: number;
  totalPending?: number;
  totalFailed?: number;
  synced?: number;
  pending?: number;
  failed?: number;
  isConfigured?: boolean;
  total?: number | { synced: number; pending: number; failed: number };
  entities?: {
    complexes: { synced: number; pending: number; failed: number };
    shops: { synced: number; pending: number; failed: number };
    payments: { synced: number; pending: number; failed: number };
    expenses: { synced: number; pending: number; failed: number };
  };
  [key: string]: any;
}

export interface ShopMonthlyStatus {
  shop: RentalShop;
  complex: RentalComplex;
  paymentMonth: string;
  expectedRent: number;
  amountReceived: number;
  advanceUsed: number;
  advanceGenerated: number;
  currentAdvance: number;
  balance: number;
  paymentStatus: PaymentStatus;
  payments: RentalPayment[];
}
