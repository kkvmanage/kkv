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
  id: string;
  username?: string;
  firebaseUid?: string | null;
  googleId?: string | null;
  email: string;
  name?: string;
  displayName?: string;
  profileImage?: string | null;
  role: UserRole;
  status?: UserStatus;
  isActive: boolean;
  authProvider?: AuthProvider;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface RentalComplex {
  id: string;
  complexId: string;
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
  shopId: string;
  complexId: string;
  complexName?: string;
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
  paymentId: string;
  complexId: string;
  complexName?: string;
  shopId: string;
  shopNumber?: string;
  shopName?: string;
  tenantName?: string;
  paymentMonth: string;
  monthlyRent: number;
  amountReceived: number;
  cashAmount: number;
  gpayAmount: number;
  paymentMode: PaymentMode;
  advanceUsed: number;
  advanceGenerated: number;
  balanceAfterPayment: number;
  paymentStatus: PaymentStatus;
  paymentDate: string;
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
  expenseId: string;
  complexId: string;
  complexName?: string;
  shopId?: string;
  shopNumber?: string;
  expenseDate: string;
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
  auditId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
}

export interface RentalDashboardData {
  totalComplexes: number;
  totalShops: number;
  expectedMonthlyRent: number;
  collectedThisMonth: number;
  pendingRent: number;
  availableAdvance: number;
  todaysCollection: number;
  todaysExpenses: number;
  thisMonthExpenses: number;
  netCollection: number;
  recentPayments: RentalPayment[];
  recentExpenses: RentalExpense[];
  complexStats: {
    complexId: string;
    complexName: string;
    location: string;
    totalShops: number;
    expectedRent: number;
    collected: number;
    pending: number;
    expenses: number;
    net: number;
  }[];
  monthlyTrend: {
    month: string;
    expected: number;
    collected: number;
    pending: number;
    expenses: number;
    net: number;
  }[];
  paymentModeSplit: {
    cashTotal: number;
    gpayTotal: number;
    total: number;
  };
}

export interface MonthlyRentReportItem {
  complexId: string;
  complexName: string;
  location: string;
  totalShops: number;
  expectedRent: number;
  collected: number;
  pending: number;
  advance: number;
  expenses: number;
  netCollection: number;
}

export interface PaymentModeReportData {
  cashTotal: number;
  gpayTotal: number;
  totalPayments: number;
  cashCount: number;
  gpayCount: number;
  bothCount: number;
  transactions: {
    paymentId: string;
    shopNumber: string;
    tenantName: string;
    amountReceived: number;
    cashAmount: number;
    gpayAmount: number;
    paymentMode: PaymentMode;
    paymentDate: string;
  }[];
}

export interface SyncSummary {
  total: number;
  synced: number;
  pending: number;
  failed: number;
  lastSyncedAt?: string;
  isConfigured: boolean;
}

export interface ShopMonthlyStatus {
  shopId: string;
  month: string;
  monthlyRent: number;
  amountPaid: number;
  advanceUsed: number;
  advanceGenerated: number;
  outstandingBalance: number;
  availableAdvanceCredit: number;
  paymentStatus: PaymentStatus;
  payments: RentalPayment[];
}
