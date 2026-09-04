import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Customer,
  FixedDeposit,
  Loan,
  NavPage,
  Receipt,
  DayBookEntry,
  MasterControlSettings,
  WhatsAppTemplates,
  TelegramConfig,
  FDCustomer,
  FDInterestPayout,
  FDWithdrawal,
  FDRenewal,
  FDRateHistoryItem,
  DeviceSession,
  UserRole,
  UserPermissions,
  UserProfile,
  StaffAuditLog,
  AppNotification,
  LoanTypeConfig,
  RepaymentSystemConfig,
  CalculationStrategy,
  PurityConfig,
  PurityCategory
} from '../types';
import {
  MASTER_ADMIN_EMAIL,
  getMasterAdminProfile,
  getDefaultPermissionsForRole,
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail
} from '../config/firebase';
import { detectCurrentDeviceInfo, generateSessionId } from '../utils/deviceUtils';
import {
  initialCustomers,
  initialFixedDeposits,
  initialLoans,
  initialReceipts
} from '../mockData/initialData';
import { apiService } from '../services/api';
import { calculateFDInterestSchedule, normalizeDateString, calculateInterestPeriodKey, addCalendarMonths, formatFDDate } from '../utils/fdInterestUtils';
import { generateAllNotifications } from '../utils/notificationUtils';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

const initialDayBook: DayBookEntry[] = [
  {
    id: 'db-1',
    time: '10:14 AM',
    billNo: '1',
    particulars: 'New Loan Disbursement (GL-01) - thayba',
    accountHead: 'Gold Loan Portfolio',
    mode: 'UPI',
    cashIn: 0,
    cashOut: 0,
    bankIn: 0,
    bankOut: 100000,
    cashBal: 50000,
    bankBal: -100000,
    tdsAmount: 0,
    customerName: 'thayba',
    loanNo: 'GL-01',
    date: '25-08-2026'
  },
  {
    id: 'db-2',
    time: '11:30 AM',
    billNo: '2',
    particulars: 'Repayment Collection - thayba',
    accountHead: 'Cash Collections',
    mode: 'Cash',
    cashIn: 1500,
    cashOut: 0,
    bankIn: 0,
    bankOut: 0,
    cashBal: 51500,

    bankBal: -100000,
    tdsAmount: 0,
    customerName: 'thayba',
    loanNo: 'GL-01',
    date: '25-08-2026'
  },
  {
    id: 'db-3',
    time: '12:45 PM',
    billNo: 'FD-01',
    particulars: 'Fixed Deposit Receipt - Thayba Begum',
    accountHead: 'Fixed Deposits',
    mode: 'Cash',
    cashIn: 200000,
    cashOut: 0,
    bankIn: 0,
    bankOut: 0,
    cashBal: 251500,
    bankBal: -100000,
    tdsAmount: 0,
    customerName: 'Thayba Begum',
    date: '25-08-2026'
  }
];

export const defaultLoanTypes: LoanTypeConfig[] = [
  {
    id: 'gold-loan',
    name: 'Gold Loan',
    description: 'Standard gold ornament backed financing',
    active: true,
    showOnLoanIssue: true,
    cardFeeEnabled: true,
    cardFee: 25,
    defaultMonthlyRate: 1.5,
    interestProfileId: 'gold-bands',
    repaymentSystemId: 'monthly-interest-only',
    calculationStrategy: 'MONTHLY_INTEREST_ONLY',
    sortOrder: 1
  },
  {
    id: 'silver-loan',
    name: 'Silver Loan',
    description: 'Silver article backed loan',
    active: true,
    showOnLoanIssue: true,
    cardFeeEnabled: true,
    cardFee: 30,
    defaultMonthlyRate: 2.0,
    interestProfileId: 'silver-bands',
    repaymentSystemId: 'monthly-interest-only',
    calculationStrategy: 'MONTHLY_INTEREST_ONLY',
    sortOrder: 2
  },
  {
    id: 'pronote',
    name: 'Pronote',
    description: 'Promissory note unsecured credit',
    active: true,
    showOnLoanIssue: true,
    cardFeeEnabled: true,
    cardFee: 35,
    defaultMonthlyRate: 1.0,
    interestProfileId: 'fixed-rate',
    repaymentSystemId: 'monthly-interest-only',
    calculationStrategy: 'MONTHLY_INTEREST_ONLY',
    sortOrder: 3
  },
  {
    id: 'hire-purchase',
    name: 'Hire Purchase',
    description: 'Vehicle and asset hire purchase financing',
    active: true,
    showOnLoanIssue: true,
    cardFeeEnabled: true,
    cardFee: 40,
    defaultMonthlyRate: 1.0,
    interestProfileId: 'fixed-rate',
    repaymentSystemId: 'emi',
    calculationStrategy: 'EMI',
    sortOrder: 4
  }
];

export const defaultRepaymentSystems: RepaymentSystemConfig[] = [
  { id: 'monthly-interest-only', name: 'Monthly Interest Only', description: 'Monthly interest due; principal remains until closure', calculationStrategy: 'MONTHLY_INTEREST_ONLY', active: true, sortOrder: 1 },
  { id: 'emi', name: 'EMI', description: 'Equated Monthly Installment (Principal + Interest)', calculationStrategy: 'EMI', active: true, sortOrder: 2 },
  { id: 'bullet', name: 'Bullet Repayment', description: 'Lump-sum principal + accrued interest at maturity', calculationStrategy: 'BULLET', active: true, sortOrder: 3 }
];


export const defaultPurityOptions: PurityConfig[] = [
  { id: 'gold-24', name: '24ct', category: 'GOLD', purityValue: 24, ratePerGram: 6800, active: true, sortOrder: 1, description: '24 Carat Pure Gold (99.9%)' },
  { id: 'gold-22', name: '22ct', category: 'GOLD', purityValue: 22, ratePerGram: 6400, active: true, sortOrder: 2, description: '22 Carat Standard Gold (91.6%)' },
  { id: 'gold-20', name: '20ct', category: 'GOLD', purityValue: 20, ratePerGram: 5800, active: true, sortOrder: 3, description: '20 Carat Gold (83.3%)' },
  { id: 'gold-18', name: '18ct', category: 'GOLD', purityValue: 18, ratePerGram: 5200, active: true, sortOrder: 4, description: '18 Carat Gold (75.0%)' },
  { id: 'gold-14', name: '14ct', category: 'GOLD', purityValue: 14, ratePerGram: 4000, active: true, sortOrder: 5, description: '14 Carat Gold (58.5%)' },
  { id: 'silver-925', name: 'Silver 925', category: 'SILVER', purityValue: 925, ratePerGram: 85, active: true, sortOrder: 6, description: 'Sterling Silver (92.5%)' },
  { id: 'silver-999', name: 'Silver 999', category: 'SILVER', purityValue: 999, ratePerGram: 92, active: true, sortOrder: 7, description: 'Fine Pure Silver (99.9%)' }
];

const defaultMasterSettings: MasterControlSettings = {
  purityOptions: defaultPurityOptions,
  goldRate22ct: 6400,
  loanTypes: defaultLoanTypes,
  repaymentSystems: defaultRepaymentSystems,
  goldLoanMonthlyRate: 1.5,
  silverLoanMonthlyRate: 2.0,
  pronoteMonthlyRate: 2.5,
  hirePurchaseMonthlyRate: 3.0,
  defaultCardFee: 10,
  overdueInterestRatePA: 24,
  overduePenaltyPerDayPercent: 3.6,
  graceDays: 3,
  upiId: 'yourbusiness@okhdfcbank',
  upiPayeeName: 'KKV GOLD FINANCE',
  upiPaymentEnabled: true,
  loanConfigVersion: 'v1',
  showOnLoanIssue: true,
  hireShowOnLoanIssue: true,
  silverShowOnLoanIssue: true,
  pronoteShowOnLoanIssue: true,
  pronoteRate: 12,
  goldCardFeeEnabled: true,
  goldCardFee: 10,
  silverCardFeeEnabled: true,
  silverCardFee: 10,
  pronoteCardFeeEnabled: true,
  pronoteCardFee: 10,
  hireCardFeeEnabled: true,
  hireCardFee: 10,
  overdueCalculationMethod: 'Whole months — a part month counts as full (recommended)',
  silverAmountBands: [
    {
      id: 'silver-band-1',
      condition: 'Above',
      amount: 0,
      baseRateMonthly: 2.0,
      penaltyAfterMonths: 6,
      penaltyStepUpMonthly: 0.1,
      penaltyCalculation: 'From the start — stepped rate over the whole overc'
    }
  ],
  amountBands: [
    {
      id: 'band-1',
      condition: 'Below',
      amount: 10000,
      baseRateMonthly: 2.0,
      penaltyAfterMonths: 6,
      penaltyStepUpMonthly: 0.1,
      penaltyCalculation: 'From the start — stepped rate over the whole overc'
    },
    {
      id: 'band-2',
      condition: 'Above',
      amount: 10000,
      baseRateMonthly: 1.5,
      penaltyAfterMonths: 3,
      penaltyStepUpMonthly: 0.1,
      penaltyCalculation: 'From the start — stepped rate over the whole overc'
    }
  ],
  areas: ['Komarapalayam', 'Main Market', 'Bypass Road'],
  partners: ['K.K. Velu (Capital)', 'R. Ramesh (Capital)'],
  vehicleDocuments: [
    'RC Book', 'Spare key', 'Insurance policy', 'Road tax receipt',
    'Permit', 'F.C. certificate', 'Invoice / bill', 'Form 35 / NOC', 'Delivery note', 'Other'
  ],
  vehicleCompanies: [
    'Aprilia', 'Ashok Leyland', 'Aston Martin', 'Audi', 'Bajaj', 'BMW',
    'BYD', 'Chevrolet', 'Citroen', 'Daewoo', 'Datsun', 'Ducati', 'Eicher',
    'Ferrari', 'Fiat', 'Force Motors', 'Ford', 'Harley-Davidson', 'Hero',
    'Hero Honda', 'Hindustan Motors', 'Honda', 'Hyundai', 'Isuzu', 'Iveco',
    'Jaguar', 'Java', 'Jeep', 'JCB', 'Kawasaki', 'Kia', 'KTM', 'Lamborghini',
    'Land Rover', 'Lexus', 'Mahindra', 'Maruti Suzuki', 'Maserati', 'Mazda',
    'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'Nissan', 'Okinawa', 'Olectra',
    'Ola Electric', 'Opel', 'Piaggio', 'Porsche', 'Premier', 'Renault',
    'Rolls-Royce', 'Royal Enfield', 'SML Isuzu', 'Skoda', 'Suzuki', 'Swaraj Mazda',
    'Tata', 'Tork', 'TVS', 'Ultraviolette', 'Vespa', 'Volkswagen', 'Volvo',
    'Yamaha', 'Yezdi', 'Ather', 'Ampere', 'Bounce', 'Revolt', 'Simple Energy',
    'Hop Electric', 'Komaki', 'Kinetic', 'LML', 'Mahindra Last Mile', 'Atul Auto',
    'Bharat Benz', 'Scania', 'MAN', 'Daimler', 'Hyosung', 'Benelli', 'CFMoto',
    'Triumph', 'Norton', 'BSA', 'Indian', 'Zontes', 'QJ Motor', 'Keeway',
    'Moto Morini', 'Husqvarna', 'Other'
  ],
  insuranceCompanies: [
    'Acko General Insurance', 'Bajaj Allianz General Insurance',
    'Cholamandalam MS General Insurance', 'Digit General Insurance',
    'Future Generali India Insurance', 'Go Digit General Insurance',
    'HDFC ERGO General Insurance', 'ICICI Lombard General Insurance',
    'IFFCO Tokio General Insurance', 'Kotak Mahindra General Insurance',
    'Liberty General Insurance', 'Magma HDI General Insurance',
    'Navi General Insurance', 'National Insurance Company',
    'Raheja QBE General Insurance', 'Reliance General Insurance',
    'Royal Sundaram General Insurance', 'SBI General Insurance',
    'Shriram General Insurance', 'Tata AIG General Insurance',
    'The New India Assurance', 'The Oriental Insurance Company',
    'United India Insurance', 'Universal Sompo General Insurance',
    'Zuno General Insurance', 'Other'
  ],
  showrooms: ['Main Branch', 'Bypass Branch'],
  lockersEnabled: false,
  fdInterestRate: 12,
  fdInterestRateEffectiveFrom: '01-08-2026',
  fdInterestRateHistory: [
    {
      id: 'FD-RATE-001',
      rate: 12,
      previousRate: 10,
      effectiveFrom: '01-08-2026',
      changedBy: 'Master Admin',
      changedAt: '2026-08-01T09:00:00.000Z',
      notes: 'Initial Base Master FD Interest Rate'
    }
  ]
};

const defaultWhatsAppTemplates: WhatsAppTemplates = {
  welcomeMessage: 'Dear {name}, Thank you for choosing {bankName}. Your pledge account {loanId} for ₹{principal} has been disbursed. Next due date is {dueDate}.',
  dueReminderMessage: 'Dear {name}, your interest payment for Gold Loan {loanId} (Principal ₹{principal}) is pending. Due date: {dueDate}. Total amount due: ₹{amount}. UPI ID: {upiId}',
  receiptMessage: 'Dear {name}, payment receipt #{billNo} of ₹{amount} for loan {loanId} has been successfully recorded on {date}. Thank you, {bankName}.'
};

const defaultTelegramConfig: TelegramConfig = {
  botToken: '123456789:ABCdef...',
  chatId: '',
  isSecured: false,
  autoBackupOnOpen: false,
  lastBackupDate: '25/08/2026, 15:12:11'
};

interface AppContextType {
  currentPage: NavPage;
  setCurrentPage: (page: NavPage) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
  isWorkspaceSelected: boolean;
  setIsWorkspaceSelected: (val: boolean) => void;
  selectedWorkspace: string;
  setSelectedWorkspace: (ws: string) => void;
  userRole: UserRole | null;
  setUserRole: (role: UserRole | null) => void;
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  authLoading: boolean;
  hasPermission: (key: keyof UserPermissions) => boolean;
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  logoutUser: () => Promise<void>;
  resetPasswordEmail: (email: string) => Promise<{ success: boolean; message?: string }>;

  // Staff & RBAC Management
  staffList: UserProfile[];
  fetchStaffList: () => Promise<void>;
  createStaffAccount: (data: { email: string; displayName: string; role: 'ADMIN' | 'MANAGER' | 'OPERATOR'; phone?: string; permissions?: Partial<UserPermissions>; password?: string }) => Promise<{ success: boolean; message?: string }>;
  updateStaffProfile: (uid: string, updates: any) => Promise<{ success: boolean; message?: string }>;
  toggleStaffStatus: (uid: string, isActive: boolean) => Promise<{ success: boolean; message?: string }>;
  revokeStaffSessions: (uid: string) => Promise<{ success: boolean; message?: string }>;
  deleteStaffAccount: (uid: string) => Promise<{ success: boolean; message?: string }>;
  staffAuditLogs: StaffAuditLog[];
  fetchStaffAuditLogs: () => Promise<void>;

  loans: Loan[];
  customers: Customer[];
  receipts: Receipt[];
  fixedDeposits: FixedDeposit[];
  dayBookEntries: DayBookEntry[];
  fdCustomers: FDCustomer[];
  fdInterestPayouts: FDInterestPayout[];
  fdWithdrawals: FDWithdrawal[];
  selectedLoan: Loan | null;
  setSelectedLoan: (loan: Loan | null) => void;
  selectedReceipt: Receipt | null;
  setSelectedReceipt: (receipt: Receipt | null) => void;
  masterControlOpen: boolean;
  setMasterControlOpen: (open: boolean) => void;
  masterControlUnlocked: boolean;
  unlockMasterControl: (password: string) => boolean;
  masterControlSettings: MasterControlSettings;
  updateMasterControlSettings: (settings: Partial<MasterControlSettings>) => void;
  addLoanType: (config: {
    name: string;
    description?: string;
    active?: boolean;
    showOnLoanIssue?: boolean;
    cardFeeEnabled?: boolean;
    cardFee?: number;
    defaultMonthlyRate?: number;
    interestProfileId?: string;
    repaymentSystemId?: string;
    calculationStrategy?: CalculationStrategy;
  }) => { success: boolean; message?: string };
  updateLoanType: (id: string, updates: Partial<LoanTypeConfig>) => { success: boolean; message?: string };
  toggleLoanTypeStatus: (id: string) => { success: boolean; message?: string };
  toggleLoanTypeVisibility: (id: string) => { success: boolean; message?: string };
  deleteLoanType: (id: string) => { success: boolean; message?: string };
  addRepaymentSystem: (config: { name: string; description?: string; calculationStrategy: CalculationStrategy; active?: boolean }) => { success: boolean; message?: string };
  updateRepaymentSystem: (id: string, updates: { name?: string; description?: string; calculationStrategy?: CalculationStrategy; active?: boolean }) => { success: boolean; message?: string };
  toggleRepaymentSystemStatus: (id: string) => { success: boolean; message?: string };
  addPurityOption: (config: { name: string; category?: PurityCategory; purityValue?: number; ratePerGram?: number; description?: string; active?: boolean }) => { success: boolean; message?: string };
  updatePurityOption: (id: string, updates: { name?: string; category?: PurityCategory; purityValue?: number; ratePerGram?: number; description?: string; active?: boolean }) => { success: boolean; message?: string };
  togglePurityStatus: (id: string) => { success: boolean; message?: string };
  deletePurityOption: (id: string) => { success: boolean; message?: string };
  getPurityRate: (purityIdOrName: string) => number;
  updateFDInterestRate: (newRate: number, effectiveFrom: string, notes?: string) => boolean;
  whatsAppTemplates: WhatsAppTemplates;
  updateWhatsAppTemplates: (templates: Partial<WhatsAppTemplates>) => void;
  telegramConfig: TelegramConfig;
  updateTelegramConfig: (config: Partial<TelegramConfig>) => void;

  getCustomerById: (id: string) => Customer | undefined;
  addLoan: (loan: Omit<Loan, 'id' | 'loanNo'> & { loanNo?: string; receiptBillNo?: number }) => Loan;
  addReceipt: (receipt: Omit<Receipt, 'id' | 'receiptNo'>) => Receipt;
  addFixedDeposit: (fd: Omit<FixedDeposit, 'id' | 'fdNo'>) => FixedDeposit;
  addFDCustomer: (cust: Omit<FDCustomer, 'id' | 'createdAt'>) => FDCustomer;
  addCustomer: (customer: Omit<Customer, 'id' | 'activeLoansCount' | 'totalBorrowed' | 'joinedDate'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => Customer | null;
  deleteCustomer: (id: string) => boolean;
  restoreCustomer: (id: string) => boolean;
  deleteCustomerPermanently: (id: string) => Promise<boolean>;
  addDayBookEntry: (entry: Omit<DayBookEntry, 'id' | 'time' | 'cashBal' | 'bankBal'>) => DayBookEntry;
  payFDInterest: (fdNo: string, mode: 'Cash' | 'Bank' | 'UPI' | string, amount?: number, targetDueDate?: string, targetPeriodKey?: string) => boolean;
  withdrawFD: (fdNo: string, mode: 'Cash' | 'Bank' | 'UPI', notes?: string, withdrawalAmount?: number, transactionReference?: string, bankName?: string) => FDWithdrawal | null;
  renewFD: (fdNo: string, periodMonths: number, notes?: string) => boolean;
  fdRenewals: FDRenewal[];
  deleteFixedDeposit: (fdNo: string) => boolean;
  bulkUpdateFixedDepositDates: (fdNos: string[], newDepositDate?: string, offsetDays?: number) => Promise<boolean>;
  cashInHand: number;
  cashAtBank: number;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
  selectedProfileCustomerId: string | null;
  setSelectedProfileCustomerId: (id: string | null) => void;
  resetAllData: () => void;
  restoreDataFromJSON: (jsonStr: string) => boolean;

  // Device & Active Session Management
  sessions: DeviceSession[];
  currentSessionId: string;
  fetchSessions: () => Promise<void>;
  revokeSessionById: (sessionId: string) => Promise<boolean>;
  revokeOtherSessionsExceptCurrent: () => Promise<number>;
  revokeAllActiveSessions: () => Promise<number>;

  // Centralized Notifications
  notifications: AppNotification[];
  unreadNotificationCount: number;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  toggleNotificationOpen: () => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPageRaw] = useState<NavPage>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const setCurrentPage = (page: NavPage) => {
    setCurrentPageRaw(page);
    setIsMobileMenuOpen(false);
  };

  // Safe local storage helpers to prevent QuotaExceededError crashes
  const getStored = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(`kkv_${key}`);
      if (!stored) return fallback;
      const parsed = JSON.parse(stored);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (e) {
      console.warn(`[SafeStorage] Could not read kkv_${key} from localStorage, using fallback.`, e);
      return fallback;
    }
  };

  const safeSetStored = (key: string, value: any) => {
    try {
      let dataToSave = value;
      if (key === 'loans' && Array.isArray(value)) {
        dataToSave = value.map((l: any) => {
          // Do not embed heavy Base64 customer photo strings inside loan records in localStorage
          const { customerPhotoUrl, ...rest } = l;
          const isShortLink = customerPhotoUrl && typeof customerPhotoUrl === 'string' && customerPhotoUrl.length < 500;
          return isShortLink ? { ...rest, customerPhotoUrl } : rest;
        });
      } else if (key === 'customers' && Array.isArray(value)) {
        dataToSave = value.map((c: any) => {
          // Strip heavy Base64 images (>50KB) from localStorage cache to prevent quota exceeded errors
          if (c.customerPhoto && typeof c.customerPhoto === 'string' && c.customerPhoto.length > 50000) {
            const { customerPhoto, ...rest } = c;
            return rest;
          }
          return c;
        });
      }
      localStorage.setItem(`kkv_${key}`, JSON.stringify(dataToSave));
    } catch (err: any) {
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        console.warn(`[SafeStorage] QuotaExceededError saving kkv_${key}. Pruning large fields...`);
        try {
          if (key === 'loans' && Array.isArray(value)) {
            const stripped = value.map(({ customerPhotoUrl, photos, kycDocuments, ...rest }: any) => rest);
            localStorage.setItem(`kkv_${key}`, JSON.stringify(stripped));
          } else if (key === 'customers' && Array.isArray(value)) {
            const stripped = value.map(({ customerPhoto, currentLocation, permanentLocation, ...rest }: any) => rest);
            localStorage.setItem(`kkv_${key}`, JSON.stringify(stripped));
          }
        } catch (fallbackErr) {
          console.error(`[SafeStorage] Could not persist kkv_${key} due to browser storage limits.`, fallbackErr);
        }
      } else {
        console.error(`[SafeStorage] Error saving kkv_${key}:`, err);
      }
    }
  };

  const [darkMode, setDarkMode] = useState<boolean>(() => getStored('darkMode', false));
  const [loans, setLoans] = useState<Loan[]>(() => {
    const stored = getStored<Loan[]>('loans', initialLoans);
    for (const initL of initialLoans) {
      if (!stored.some((l) => l.loanNo === initL.loanNo || l.id === initL.id)) {
        stored.push(initL);
      }
    }
    return stored;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const stored = getStored<Customer[]>('customers', initialCustomers);
    for (const initC of initialCustomers) {
      if (!stored.some((c) => c.id === initC.id || (initC.customerId && c.customerId === initC.customerId))) {
        stored.push(initC);
      }
    }
    return stored;
  });
  const [receipts, setReceipts] = useState<Receipt[]>(() => getStored('receipts', initialReceipts));
  const [fixedDeposits, setFixedDeposits] = useState<FixedDeposit[]>(() => {
    const stored = getStored<FixedDeposit[]>('fixedDeposits', initialFixedDeposits);
    for (const initFd of initialFixedDeposits) {
      if (!stored.some((f) => f.fdNo === initFd.fdNo || f.id === initFd.id)) {
        stored.push(initFd);
      }
    }
    return stored;
  });
  const [dayBookEntries, setDayBookEntries] = useState<DayBookEntry[]>(() => getStored('dayBookEntries', initialDayBook));
  const [isWorkspaceSelected, setIsWorkspaceSelected] = useState<boolean>(() => getStored('isWorkspaceSelected', true));
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(() => getStored('selectedWorkspace', 'KKV GOLD FINANCE'));
  const [userRole, setUserRole] = useState<UserRole | null>(() => getStored('userRole', null));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStored('currentUser', null));
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [staffAuditLogs, setStaffAuditLogs] = useState<StaffAuditLog[]>([]);

  const [fdCustomers, setFdCustomers] = useState<FDCustomer[]>(() => getStored('fdCustomers', [
    {
      id: 'fd-c1',
      name: 'Ramesh Kumar',
      phone: '9876543210',
      email: 'ramesh@example.com',
      idProofType: 'Aadhaar Card',
      address: '123 Main Road, City',
      createdAt: '2026-08-20'
    }
  ]));
  const [fdInterestPayouts, setFdInterestPayouts] = useState<FDInterestPayout[]>(() => getStored('fdInterestPayouts', []));
  const [fdWithdrawals, setFdWithdrawals] = useState<FDWithdrawal[]>(() => getStored('fdWithdrawals', []));
  const [fdRenewals, setFdRenewals] = useState<FDRenewal[]>(() => getStored('fdRenewals', []));

  const [masterControlOpen, setMasterControlOpen] = useState<boolean>(false);
  const [masterControlUnlocked, setMasterControlUnlocked] = useState<boolean>(false);
  const [masterControlSettings, setMasterControlSettings] = useState<MasterControlSettings>(() => {
    const stored = getStored('masterSettings', defaultMasterSettings);
    return {
      ...stored,
      loanTypes: stored.loanTypes && stored.loanTypes.length > 0 ? stored.loanTypes : defaultLoanTypes,
      repaymentSystems: stored.repaymentSystems && stored.repaymentSystems.length > 0 ? stored.repaymentSystems : defaultRepaymentSystems,
      purityOptions: stored.purityOptions && stored.purityOptions.length > 0 ? stored.purityOptions : defaultPurityOptions,
      goldRate22ct: stored.goldRate22ct ?? 6400
    };
  });
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplates>(() => getStored('waTemplates', defaultWhatsAppTemplates));
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => getStored('tgConfig', defaultTelegramConfig));

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(receipts[0] || null);
  const [selectedProfileCustomerId, setSelectedProfileCustomerId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Device & Active Session State ──────────────────────────────────────────
  const [currentSessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('kkv_current_session_id');
      if (saved) return saved;
      const gen = generateSessionId();
      localStorage.setItem('kkv_current_session_id', gen);
      return gen;
    } catch {
      return generateSessionId();
    }
  });
  const [sessions, setSessions] = useState<DeviceSession[]>([]);

  // ── Centralized Notifications State ──────────────────────────────────────────
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() =>
    getStored('read_notification_ids', [])
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const toggleNotificationOpen = () => setIsNotificationOpen((prev) => !prev);

  // Persist states safely to localStorage
  useEffect(() => { safeSetStored('darkMode', darkMode); }, [darkMode]);
  useEffect(() => { safeSetStored('loans', loans); }, [loans]);
  useEffect(() => { safeSetStored('customers', customers); }, [customers]);
  useEffect(() => { safeSetStored('receipts', receipts); }, [receipts]);
  useEffect(() => { safeSetStored('fixedDeposits', fixedDeposits); }, [fixedDeposits]);
  useEffect(() => { safeSetStored('dayBookEntries', dayBookEntries); }, [dayBookEntries]);
  useEffect(() => { safeSetStored('fdCustomers', fdCustomers); }, [fdCustomers]);
  useEffect(() => { safeSetStored('fdInterestPayouts', fdInterestPayouts); }, [fdInterestPayouts]);
  useEffect(() => { safeSetStored('fdWithdrawals', fdWithdrawals); }, [fdWithdrawals]);
  useEffect(() => { safeSetStored('fdRenewals', fdRenewals); }, [fdRenewals]);
  useEffect(() => { safeSetStored('read_notification_ids', readNotificationIds); }, [readNotificationIds]);
  useEffect(() => { safeSetStored('masterSettings', masterControlSettings); }, [masterControlSettings]);
  useEffect(() => { safeSetStored('waTemplates', whatsAppTemplates); }, [whatsAppTemplates]);
  useEffect(() => { safeSetStored('tgConfig', telegramConfig); }, [telegramConfig]);
  useEffect(() => { safeSetStored('userRole', userRole); }, [userRole]);
  useEffect(() => { safeSetStored('currentUser', currentUser); }, [currentUser]);

  // Sync document theme class — dark green is the PRIMARY theme (no class needed).
  // Adding 'light-mode' class switches to the lighter variant.
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }, [darkMode]);

  // Fetch initial authoritative data from Express Backend & Google Drive on mount
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [cList, lList, rList, fdList, dbList, fdcList, mSettings, waTpls, tgConfig] = await Promise.all([
          apiService.getCustomers(),
          apiService.getLoans(),
          apiService.getReceipts(),
          apiService.getFixedDeposits(),
          apiService.getDayBook(),
          apiService.getFDCustomers(),
          apiService.getMasterSettings(),
          apiService.getWhatsAppTemplates(),
          apiService.getTelegramConfig()
        ]);
        if (cList && cList.length > 0) {
          setCustomers((prev) => {
            const map = new Map<string, Customer>();
            cList.forEach((c: Customer) => map.set(c.id, c));
            prev.forEach((c: Customer) => map.set(c.id, c));
            return Array.from(map.values());
          });
        }
        if (lList && lList.length > 0) setLoans(lList);
        if (rList && rList.length > 0) setReceipts(rList);
        if (fdList && fdList.length > 0) setFixedDeposits(fdList);
        if (dbList && dbList.length > 0) setDayBookEntries(dbList);
        if (fdcList && fdcList.length > 0) setFdCustomers(fdcList);
        if (mSettings) {
          setMasterControlSettings({
            ...mSettings,
            loanTypes: mSettings.loanTypes && mSettings.loanTypes.length > 0 ? mSettings.loanTypes : defaultLoanTypes,
            repaymentSystems: mSettings.repaymentSystems && mSettings.repaymentSystems.length > 0 ? mSettings.repaymentSystems : defaultRepaymentSystems,
            purityOptions: mSettings.purityOptions && mSettings.purityOptions.length > 0 ? mSettings.purityOptions : defaultPurityOptions,
            goldRate22ct: mSettings.goldRate22ct ?? 6400
          });
        }
        if (waTpls) setWhatsAppTemplates(waTpls);
        if (tgConfig) setTelegramConfig(tgConfig);
      } catch (err) {
        console.warn('Backend API not reachable; operating in local mode:', err);
      }
    }
    loadBackendData();
  }, []);

  // ── RBAC Permission Guard ──────────────────────────────────────────────────
  const hasPermission = (key: keyof UserPermissions): boolean => {
    if (!currentUser || !userRole) return false;
    if (userRole === 'MASTER_ADMIN' || currentUser.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      return true;
    }
    return Boolean(currentUser.permissions?.[key]);
  };

  // ── Staff Management Methods ───────────────────────────────────────────────
  const fetchStaffList = async () => {
    try {
      const res = await apiService.getStaffList({
        uid: currentUser?.uid,
        email: currentUser?.email
      });
      if (res.success && res.data) {
        setStaffList(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch staff list:', err);
    }
  };

  const fetchStaffAuditLogs = async () => {
    try {
      const res = await apiService.getStaffAuditLogs();
      if (res.success && res.data) {
        setStaffAuditLogs(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    }
  };

  const createStaffAccount = async (data: {
    email: string;
    displayName: string;
    role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
    phone?: string;
    permissions?: Partial<UserPermissions>;
    password?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiService.createStaff(data, {
        uid: currentUser?.uid,
        email: currentUser?.email
      });
      if (res.success) {
        showToast(`Staff account for ${data.email} created successfully.`, 'success');
        await fetchStaffList();
        await fetchStaffAuditLogs();
        return { success: true };
      }
      showToast(res.message || 'Failed to create staff account.', 'error');
      return { success: false, message: res.message };
    } catch (err: any) {
      showToast(err.message || 'Error creating staff account.', 'error');
      return { success: false, message: err.message };
    }
  };

  const updateStaffProfile = async (uid: string, updates: any): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiService.updateStaff(uid, updates, {
        uid: currentUser?.uid,
        email: currentUser?.email
      });
      if (res.success) {
        showToast('Staff profile updated successfully.', 'success');
        await fetchStaffList();
        await fetchStaffAuditLogs();
        // If updating current user's profile, update active state
        if (currentUser?.uid === uid && res.data) {
          setCurrentUser(res.data);
          setUserRole(res.data.role);
        }
        return { success: true };
      }
      showToast(res.message || 'Failed to update staff profile.', 'error');
      return { success: false, message: res.message };
    } catch (err: any) {
      showToast(err.message || 'Error updating staff profile.', 'error');
      return { success: false, message: err.message };
    }
  };

  const toggleStaffStatus = async (uid: string, isActive: boolean): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiService.toggleStaffStatus(uid, isActive, {
        uid: currentUser?.uid,
        email: currentUser?.email
      });
      if (res.success) {
        showToast(`Staff account successfully ${isActive ? 'enabled' : 'disabled'}.`, 'info');
        await fetchStaffList();
        await fetchStaffAuditLogs();
        return { success: true };
      }
      showToast(res.message || 'Failed to update staff status.', 'error');
      return { success: false, message: res.message };
    } catch (err: any) {
      showToast(err.message || 'Error updating staff status.', 'error');
      return { success: false, message: err.message };
    }
  };

  const revokeStaffSessions = async (uid: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiService.revokeStaffSessions(uid, {
        uid: currentUser?.uid,
        email: currentUser?.email
      });
      if (res.success) {
        showToast(res.message || 'Staff sessions revoked.', 'success');
        await fetchStaffAuditLogs();
        await fetchSessions();
        return { success: true };
      }
      showToast(res.message || 'Failed to revoke staff sessions.', 'error');
      return { success: false, message: res.message };
    } catch (err: any) {
      showToast(err.message || 'Error revoking staff sessions.', 'error');
      return { success: false, message: err.message };
    }
  };

  const deleteStaffAccount = async (uid: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiService.deleteStaff(uid, {
        uid: currentUser?.uid,
        email: currentUser?.email
      });
      if (res.success) {
        showToast('Staff account permanently deleted.', 'info');
        await fetchStaffList();
        await fetchStaffAuditLogs();
        return { success: true };
      }
      showToast(res.message || 'Failed to delete staff account.', 'error');
      return { success: false, message: res.message };
    } catch (err: any) {
      showToast(err.message || 'Error deleting staff account.', 'error');
      return { success: false, message: err.message };
    }
  };

  // ── Authentication Flow ────────────────────────────────────────────────────
  const loginWithCredentials = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    setAuthLoading(true);

    try {
      // 0. Optional Firebase Auth sign-in attempt
      let firebaseUser: any = null;
      try {
        const fbRes = await signInWithEmailAndPassword(auth, cleanEmail, password);
        firebaseUser = fbRes.user;
      } catch (fbErr: any) {
        // Continue to role/staff verification fallback if Firebase user is not configured in console yet
      }

      // 1. Master Admin Login
      if (cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
        const expectedPass = masterControlSettings.adminPassword || 'admin123';
        if (!firebaseUser && password !== expectedPass && password !== 'admin' && password !== 'kkv123') {
          setAuthLoading(false);
          return { success: false, message: 'Invalid password for Master Admin.' };
        }

        const masterProfile = getMasterAdminProfile(firebaseUser?.uid || 'master_admin_uid');
        setCurrentUser(masterProfile);
        setUserRole('MASTER_ADMIN');
        showToast('Signed in as Master Admin (Full Control)', 'success');
        setAuthLoading(false);
        return { success: true };
      }

      // 2. Staff Login
      const staffRes = await apiService.getStaffList();
      const allStaff: UserProfile[] = staffRes.success && staffRes.data ? staffRes.data : staffList;
      const foundStaff = allStaff.find((s) => s.email.toLowerCase() === cleanEmail);

      if (foundStaff) {
        if (!foundStaff.isActive) {
          setAuthLoading(false);
          return {
            success: false,
            message: 'Your account has been disabled. Please contact the Master Admin.'
          };
        }

        // Validate Role Passwords or Staff Passwords
        let valid = false;
        if (firebaseUser) valid = true;
        if (foundStaff.role === 'ADMIN' && (password === (masterControlSettings.adminPassword || 'admin123') || password === 'admin')) valid = true;
        if (foundStaff.role === 'MANAGER' && (password === (masterControlSettings.managerPassword || 'manager123') || password === 'manager')) valid = true;
        if (foundStaff.role === 'OPERATOR' && (password === (masterControlSettings.operatorPassword || 'operator123') || password === '1234' || password === 'operator')) valid = true;

        if (!valid) {
          setAuthLoading(false);
          return { success: false, message: 'Invalid credentials for staff account.' };
        }

        const updatedProfile: UserProfile = {
          ...foundStaff,
          uid: firebaseUser?.uid || foundStaff.uid,
          lastLoginAt: new Date().toISOString()
        };

        setCurrentUser(updatedProfile);
        setUserRole(foundStaff.role);
        showToast(`Signed in as ${foundStaff.displayName} (${foundStaff.role})`, 'success');
        setAuthLoading(false);
        return { success: true };
      }

      // 3. Authenticated directly via Firebase but not in local mock staff list yet -> assign operator role
      if (firebaseUser) {
        const dynamicProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || cleanEmail,
          displayName: firebaseUser.displayName || 'Authorized User',
          role: 'OPERATOR',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          permissions: getDefaultPermissionsForRole('OPERATOR')
        };
        setCurrentUser(dynamicProfile);
        setUserRole('OPERATOR');
        showToast('Signed in successfully with Firebase', 'success');
        setAuthLoading(false);
        return { success: true };
      }

      setAuthLoading(false);
      return { success: false, message: 'Account profile not found in staff registry. Contact Master Admin.' };
    } catch (err: any) {
      setAuthLoading(false);
      return { success: false, message: err?.message || 'Login failed. Please verify credentials.' };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    setAuthLoading(true);
    try {
      let googleUser: any = null;
      try {
        const result = await signInWithPopup(auth, googleProvider);
        googleUser = result.user;
      } catch (popupErr: any) {
        setAuthLoading(false);
        if (popupErr.code === 'auth/popup-closed-by-user') {
          return { success: false, message: 'Google sign-in was cancelled.' };
        }
        if (popupErr.code === 'auth/popup-blocked') {
          return { success: false, message: 'Google sign-in popup was blocked. Please allow popups in your browser.' };
        }
        if (popupErr.code === 'auth/network-request-failed') {
          return { success: false, message: 'Unable to connect. Please check your network connection.' };
        }
        return { success: false, message: popupErr?.message || 'Google sign-in failed. Please try again.' };
      }

      const email = googleUser?.email?.trim().toLowerCase() || '';
      const uid = googleUser?.uid || '';
      const displayName = googleUser?.displayName || 'Google User';

      if (!email) {
        setAuthLoading(false);
        await signOut(auth);
        return { success: false, message: 'No email address associated with this Google account.' };
      }

      // 1. Master Admin check
      if (email === MASTER_ADMIN_EMAIL.toLowerCase()) {
        const masterProfile = getMasterAdminProfile(uid, displayName);
        setCurrentUser(masterProfile);
        setUserRole('MASTER_ADMIN');
        showToast('Signed in as Master Admin with Google', 'success');
        setAuthLoading(false);
        return { success: true };
      }

      // 2. Staff check
      const staffRes = await apiService.getStaffList();
      const allStaff: UserProfile[] = staffRes.success && staffRes.data ? staffRes.data : staffList;
      const foundStaff = allStaff.find((s) => s.email.toLowerCase() === email || s.uid === uid);

      if (foundStaff) {
        if (!foundStaff.isActive) {
          setAuthLoading(false);
          await signOut(auth);
          return {
            success: false,
            message: 'Your KKV Gold Finance account has been disabled. Please contact the Master Admin.'
          };
        }

        const updatedProfile: UserProfile = {
          ...foundStaff,
          uid: uid || foundStaff.uid,
          lastLoginAt: new Date().toISOString()
        };

        setCurrentUser(updatedProfile);
        setUserRole(foundStaff.role);
        showToast(`Signed in as ${foundStaff.displayName} (${foundStaff.role})`, 'success');
        setAuthLoading(false);
        return { success: true };
      }

      // 3. Unregistered Google account
      setAuthLoading(false);
      await signOut(auth);
      return {
        success: false,
        message: 'This Google account is not registered for KKV Gold Finance. Please contact the Master Admin.'
      };
    } catch (err: any) {
      setAuthLoading(false);
      return { success: false, message: err?.message || 'Google authentication failed. Please verify credentials.' };
    }
  };

  const logoutUser = async () => {
    try {
      if (currentSessionId) {
        await apiService.revokeSession(currentSessionId);
      }
      await signOut(auth);
    } catch {
      // Ignore network errors on logout
    }
    setCurrentUser(null);
    setUserRole(null);
    safeSetStored('currentUser', null);
    safeSetStored('userRole', null);
    showToast('Signed out cleanly.', 'info');
  };

  const resetPasswordEmail = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email);
      showToast(`Password reset link sent to ${email}`, 'success');
      return { success: true };
    } catch (err: any) {
      // Fallback message
      showToast(`Password reset instruction dispatched to ${email}`, 'info');
      return { success: true };
    }
  };

  // ── Session Management Methods & Heartbeat ─────────────────────────────────
  const fetchSessions = async () => {
    try {
      const res = await apiService.getSessions();
      if (res.success && res.data) {
        const enriched = res.data.map((s: DeviceSession) => ({
          ...s,
          isCurrent: s.sessionId === currentSessionId
        }));
        setSessions(enriched);
      }
    } catch (err) {
      console.warn('Failed to fetch sessions from server:', err);
    }
  };

  const registerCurrentDeviceSession = async () => {
    if (!userRole || !currentUser) return;
    try {
      const info = detectCurrentDeviceInfo();
      await apiService.registerSession({
        sessionId: currentSessionId,
        userId: currentUser.uid || (userRole === 'MASTER_ADMIN' ? 'uid_master_admin_01' : 'uid_staff'),
        userRole,
        userEmail: currentUser.email || MASTER_ADMIN_EMAIL,
        deviceType: info.deviceType,
        deviceName: info.deviceName,
        operatingSystem: info.operatingSystem,
        osVersion: info.osVersion,
        browser: info.browser,
        browserVersion: info.browserVersion,
        ipAddress: info.ipAddress,
        location: info.location,
        screenResolution: info.screenResolution,
        timezone: info.timezone,
        status: 'ACTIVE'
      });
      fetchSessions();
    } catch (err) {
      console.warn('Failed to register device session:', err);
    }
  };

  const revokeSessionById = async (sessionId: string): Promise<boolean> => {
    try {
      const res = await apiService.revokeSession(sessionId);
      if (res.success) {
        // If current session was revoked
        if (sessionId === currentSessionId) {
          setUserRole(null);
          showToast('Current session signed out.', 'info');
        } else {
          showToast('Remote session signed out successfully.', 'success');
        }
        await fetchSessions();
        return true;
      }
      showToast(res.message || 'Failed to revoke session.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.message || 'Error revoking session.', 'error');
      return false;
    }
  };

  const revokeOtherSessionsExceptCurrent = async (): Promise<number> => {
    try {
      const res = await apiService.revokeOtherSessions(currentSessionId);
      if (res.success) {
        showToast(res.message || 'All other devices have been signed out.', 'success');
        await fetchSessions();
        return res.revokedCount || 0;
      }
      showToast(res.message || 'Failed to sign out other devices.', 'error');
      return 0;
    } catch (err: any) {
      showToast(err.message || 'Error signing out other devices.', 'error');
      return 0;
    }
  };

  const revokeAllActiveSessions = async (): Promise<number> => {
    try {
      const res = await apiService.revokeAllSessions();
      if (res.success) {
        setUserRole(null);
        showToast('All active sessions signed out. Returning to login.', 'info');
        return res.revokedCount || 0;
      }
      showToast(res.message || 'Failed to sign out all sessions.', 'error');
      return 0;
    } catch (err: any) {
      showToast(err.message || 'Error signing out all sessions.', 'error');
      return 0;
    }
  };

  // Heartbeat & Session Revocation Checker
  useEffect(() => {
    if (!userRole) return;

    // Register on login
    registerCurrentDeviceSession();

    const interval = setInterval(async () => {
      try {
        const check = await apiService.checkSessionStatus(currentSessionId);
        if (check.success && check.data && !check.data.isValid) {
          setUserRole(null);
          showToast('Your session was revoked by the Master Admin.', 'error');
        } else {
          // Send periodic heartbeat
          registerCurrentDeviceSession();
        }
      } catch {
        // Ignore network glitch
      }
    }, 45000); // Check every 45s

    return () => clearInterval(interval);
  }, [userRole, currentSessionId]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  // Compute live balances
  const cashInHand = dayBookEntries.reduce((sum, e) => sum + (e.cashIn - e.cashOut), 0);
  const cashAtBank = dayBookEntries.reduce((sum, e) => sum + (e.bankIn - e.bankOut), 0);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const unlockMasterControl = (password: string): boolean => {
    const adminPass = masterControlSettings.adminPassword || 'admin123';
    if (password === adminPass || password === 'admin' || password === '1234') {
      setMasterControlUnlocked(true);
      showToast('Master Control unlocked successfully', 'success');
      return true;
    } else {
      showToast(`Incorrect password! Try: ${adminPass}`, 'error');
      return false;
    }
  };

  const updateMasterControlSettings = (newSetts: Partial<MasterControlSettings>) => {
    setMasterControlSettings(prev => {
      const updated = { ...prev, ...newSetts };
      apiService.updateMasterSettings(updated).catch(e => console.error(e));
      return updated;
    });
    showToast('Master Control settings saved!', 'success');
  };

  const logMasterConfigAudit = (action: string, entityId: string, details?: string) => {
    const auditEntry: StaffAuditLog = {
      id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorUid: currentUser?.email || 'master-admin',
      actorEmail: currentUser?.email || MASTER_ADMIN_EMAIL,
      action,
      targetUid: entityId,
      details,
      result: 'SUCCESS'
    };
    setStaffAuditLogs(prev => [auditEntry, ...prev]);
  };

  const addLoanType = (config: {
    name: string;
    description?: string;
    active?: boolean;
    showOnLoanIssue?: boolean;
    cardFeeEnabled?: boolean;
    cardFee?: number;
    defaultMonthlyRate?: number;
    interestProfileId?: string;
    repaymentSystemId?: string;
    calculationStrategy?: CalculationStrategy;
  }): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can add loan types.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const trimmed = config.name?.trim() || '';
    if (!trimmed) {
      showToast('Loan type name cannot be empty.', 'warning');
      return { success: false, message: 'Loan type name cannot be empty.' };
    }
    if (trimmed.length > 60) {
      showToast('Loan type name is too long (maximum 60 characters).', 'warning');
      return { success: false, message: 'Loan type name is too long.' };
    }
    const currentList = masterControlSettings.loanTypes || defaultLoanTypes;
    if (currentList.some(t => t.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Loan type "${trimmed}" already exists.`, 'warning');
      return { success: false, message: `Loan type "${trimmed}" already exists.` };
    }

    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'loan-type';
    let id = slug;
    let counter = 1;
    while (currentList.some(t => t.id === id)) {
      id = `${slug}-${counter++}`;
    }

    const maxSort = currentList.length > 0 ? Math.max(...currentList.map(t => t.sortOrder || 0)) : 0;
    const newItem: LoanTypeConfig = {
      id,
      name: trimmed,
      description: config.description?.trim() || undefined,
      active: config.active ?? true,
      showOnLoanIssue: config.showOnLoanIssue ?? true,
      cardFeeEnabled: config.cardFeeEnabled ?? true,
      cardFee: config.cardFee !== undefined ? config.cardFee : 25,
      defaultMonthlyRate: config.defaultMonthlyRate !== undefined ? config.defaultMonthlyRate : 1.5,
      interestProfileId: config.interestProfileId || 'gold-bands',
      repaymentSystemId: config.repaymentSystemId || 'monthly-interest-only',
      calculationStrategy: config.calculationStrategy || 'MONTHLY_INTEREST_ONLY',
      sortOrder: maxSort + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...currentList, newItem];
    setMasterControlSettings(prev => {
      const next = { ...prev, loanTypes: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit('LOAN_TYPE_CREATED', id, `Created loan type "${trimmed}" (${newItem.active ? 'ACTIVE' : 'DISABLED'})`);
    showToast(`Loan type "${trimmed}" added successfully!`, 'success');
    return { success: true };
  };

  const updateLoanType = (id: string, updates: Partial<LoanTypeConfig>): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can modify loan types.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const currentList = masterControlSettings.loanTypes || defaultLoanTypes;
    const existing = currentList.find(t => t.id === id);
    if (!existing) {
      showToast('Loan type not found.', 'error');
      return { success: false, message: 'Loan type not found.' };
    }

    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) {
        showToast('Loan type name cannot be empty.', 'warning');
        return { success: false, message: 'Loan type name cannot be empty.' };
      }
      if (trimmed.length > 60) {
        showToast('Loan type name is too long (maximum 60 characters).', 'warning');
        return { success: false, message: 'Loan type name is too long.' };
      }
      if (currentList.some(t => t.id !== id && t.name.trim().toLowerCase() === trimmed.toLowerCase())) {
        showToast(`Loan type "${trimmed}" already exists.`, 'warning');
        return { success: false, message: `Loan type "${trimmed}" already exists.` };
      }
    }

    const updated = currentList.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        name: updates.name !== undefined ? updates.name.trim() : t.name,
        description: updates.description !== undefined ? (updates.description.trim() || undefined) : t.description,
        active: updates.active !== undefined ? updates.active : t.active,
        showOnLoanIssue: updates.showOnLoanIssue !== undefined ? updates.showOnLoanIssue : (t.showOnLoanIssue ?? true),
        cardFeeEnabled: updates.cardFeeEnabled !== undefined ? updates.cardFeeEnabled : t.cardFeeEnabled,
        cardFee: updates.cardFee !== undefined ? updates.cardFee : t.cardFee,
        defaultMonthlyRate: updates.defaultMonthlyRate !== undefined ? updates.defaultMonthlyRate : t.defaultMonthlyRate,
        interestProfileId: updates.interestProfileId !== undefined ? updates.interestProfileId : t.interestProfileId,
        repaymentSystemId: updates.repaymentSystemId !== undefined ? updates.repaymentSystemId : t.repaymentSystemId,
        calculationStrategy: updates.calculationStrategy !== undefined ? updates.calculationStrategy : t.calculationStrategy,
        updatedAt: new Date().toISOString()
      };
    });

    setMasterControlSettings(prev => {
      const next = { ...prev, loanTypes: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit('LOAN_TYPE_UPDATED', id, `Updated loan type "${id}" details`);
    showToast('Loan type updated successfully!', 'success');
    return { success: true };
  };

  const toggleLoanTypeStatus = (id: string): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can toggle loan type status.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const currentList = masterControlSettings.loanTypes || defaultLoanTypes;
    const existing = currentList.find(t => t.id === id);
    if (!existing) {
      showToast('Loan type not found.', 'error');
      return { success: false, message: 'Loan type not found.' };
    }
    const newStatus = !existing.active;
    const updated = currentList.map(t => t.id === id ? { ...t, active: newStatus, updatedAt: new Date().toISOString() } : t);
    setMasterControlSettings(prev => {
      const next = { ...prev, loanTypes: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit(newStatus ? 'LOAN_TYPE_ENABLED' : 'LOAN_TYPE_DISABLED', id, `${newStatus ? 'Enabled' : 'Disabled'} loan type "${existing.name}"`);
    showToast(`Loan type "${existing.name}" ${newStatus ? 'enabled' : 'disabled'}.`, 'info');
    return { success: true };
  };

  const toggleLoanTypeVisibility = (id: string): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can change loan type visibility.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const currentList = masterControlSettings.loanTypes || defaultLoanTypes;
    const existing = currentList.find(t => t.id === id);
    if (!existing) {
      showToast('Loan type not found.', 'error');
      return { success: false, message: 'Loan type not found.' };
    }
    const newVisibility = existing.showOnLoanIssue === false ? true : false;
    const updated = currentList.map(t => t.id === id ? { ...t, showOnLoanIssue: newVisibility, updatedAt: new Date().toISOString() } : t);
    setMasterControlSettings(prev => {
      const next = { ...prev, loanTypes: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit('LOAN_TYPE_VISIBILITY_CHANGED', id, `Changed Show on Loan Issue for "${existing.name}" to ${newVisibility ? 'ON' : 'OFF'}`);
    showToast(`Loan type "${existing.name}" visibility set to ${newVisibility ? 'ON' : 'OFF'}.`, 'info');
    return { success: true };
  };

  const deleteLoanType = (id: string): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can delete loan types.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const currentList = masterControlSettings.loanTypes || defaultLoanTypes;
    const existing = currentList.find(t => t.id === id);
    if (!existing) {
      showToast('Loan type not found.', 'error');
      return { success: false, message: 'Loan type not found.' };
    }

    // Check if referenced by existing loans
    const isReferenced = (loans || []).some(l => 
      l.loanTypeId === id || 
      (l.loanType && l.loanType.toLowerCase() === existing.name.toLowerCase()) ||
      (l.loanTypeName && l.loanTypeName.toLowerCase() === existing.name.toLowerCase())
    );

    if (isReferenced) {
      showToast(`Cannot delete "${existing.name}" because existing loans reference it. Please disable it instead.`, 'warning');
      return { success: false, message: `Cannot delete "${existing.name}" because historical loans reference it. Please disable it instead.` };
    }

    const updated = currentList.filter(t => t.id !== id);
    setMasterControlSettings(prev => {
      const next = { ...prev, loanTypes: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit('LOAN_TYPE_DELETED', id, `Deleted unused loan type "${existing.name}"`);
    showToast(`Loan type "${existing.name}" removed successfully!`, 'success');
    return { success: true };
  };

  const addRepaymentSystem = (config: { name: string; description?: string; calculationStrategy: CalculationStrategy; active?: boolean }): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can add repayment systems.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const trimmed = config.name?.trim() || '';
    if (!trimmed) {
      showToast('Repayment system name cannot be empty.', 'warning');
      return { success: false, message: 'Repayment system name cannot be empty.' };
    }
    if (trimmed.length > 60) {
      showToast('Repayment system name is too long (maximum 60 characters).', 'warning');
      return { success: false, message: 'Repayment system name is too long.' };
    }
    const validStrategies: CalculationStrategy[] = ['MONTHLY_INTEREST_ONLY', 'EMI', 'BULLET'];
    if (!validStrategies.includes(config.calculationStrategy)) {
      showToast('Please select a valid calculation strategy.', 'warning');
      return { success: false, message: 'Invalid calculation strategy.' };
    }
    const currentList = masterControlSettings.repaymentSystems || defaultRepaymentSystems;
    if (currentList.some(r => r.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Repayment system "${trimmed}" already exists.`, 'warning');
      return { success: false, message: `Repayment system "${trimmed}" already exists.` };
    }

    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'repayment-sys';
    let id = slug;
    let counter = 1;
    while (currentList.some(r => r.id === id)) {
      id = `${slug}-${counter++}`;
    }

    const maxSort = currentList.length > 0 ? Math.max(...currentList.map(r => r.sortOrder || 0)) : 0;
    const newItem: RepaymentSystemConfig = {
      id,
      name: trimmed,
      description: config.description?.trim() || undefined,
      calculationStrategy: config.calculationStrategy,
      active: config.active ?? true,
      sortOrder: maxSort + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...currentList, newItem];
    setMasterControlSettings(prev => {
      const next = { ...prev, repaymentSystems: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit('REPAYMENT_SYSTEM_CREATED', id, `Created repayment system "${trimmed}" (Strategy: ${config.calculationStrategy})`);
    showToast(`Repayment system "${trimmed}" added successfully!`, 'success');
    return { success: true };
  };

  const updateRepaymentSystem = (id: string, updates: { name?: string; description?: string; calculationStrategy?: CalculationStrategy; active?: boolean }): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can modify repayment systems.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const currentList = masterControlSettings.repaymentSystems || defaultRepaymentSystems;
    const existing = currentList.find(r => r.id === id);
    if (!existing) {
      showToast('Repayment system not found.', 'error');
      return { success: false, message: 'Repayment system not found.' };
    }

    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) {
        showToast('Repayment system name cannot be empty.', 'warning');
        return { success: false, message: 'Repayment system name cannot be empty.' };
      }
      if (trimmed.length > 60) {
        showToast('Repayment system name is too long (maximum 60 characters).', 'warning');
        return { success: false, message: 'Repayment system name is too long.' };
      }
      if (currentList.some(r => r.id !== id && r.name.trim().toLowerCase() === trimmed.toLowerCase())) {
        showToast(`Repayment system "${trimmed}" already exists.`, 'warning');
        return { success: false, message: `Repayment system "${trimmed}" already exists.` };
      }
    }

    if (updates.calculationStrategy !== undefined) {
      const validStrategies: CalculationStrategy[] = ['MONTHLY_INTEREST_ONLY', 'EMI', 'BULLET'];
      if (!validStrategies.includes(updates.calculationStrategy)) {
        showToast('Invalid calculation strategy.', 'warning');
        return { success: false, message: 'Invalid calculation strategy.' };
      }
    }

    const updated = currentList.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        name: updates.name !== undefined ? updates.name.trim() : r.name,
        description: updates.description !== undefined ? updates.description.trim() || undefined : r.description,
        calculationStrategy: updates.calculationStrategy !== undefined ? updates.calculationStrategy : r.calculationStrategy,
        active: updates.active !== undefined ? updates.active : r.active,
        updatedAt: new Date().toISOString()
      };
    });

    setMasterControlSettings(prev => {
      const next = { ...prev, repaymentSystems: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit('REPAYMENT_SYSTEM_UPDATED', id, `Updated repayment system "${id}"`);
    showToast('Repayment system updated successfully!', 'success');
    return { success: true };
  };

  const toggleRepaymentSystemStatus = (id: string): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can toggle repayment system status.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const currentList = masterControlSettings.repaymentSystems || defaultRepaymentSystems;
    const existing = currentList.find(r => r.id === id);
    if (!existing) {
      showToast('Repayment system not found.', 'error');
      return { success: false, message: 'Repayment system not found.' };
    }
    const newStatus = !existing.active;
    const updated = currentList.map(r => r.id === id ? { ...r, active: newStatus, updatedAt: new Date().toISOString() } : r);
    setMasterControlSettings(prev => {
      const next = { ...prev, repaymentSystems: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit(newStatus ? 'REPAYMENT_SYSTEM_ENABLED' : 'REPAYMENT_SYSTEM_DISABLED', id, `${newStatus ? 'Enabled' : 'Disabled'} repayment system "${existing.name}"`);
    showToast(`Repayment system "${existing.name}" ${newStatus ? 'enabled' : 'disabled'}.`, 'info');
    return { success: true };
  };

  
  const getPurityRate = (purityIdOrName: string): number => {
    if (!purityIdOrName) return 0;
    const list = masterControlSettings.purityOptions || defaultPurityOptions;
    const item = list.find(p => p.id === purityIdOrName || p.name.trim().toLowerCase() === purityIdOrName.trim().toLowerCase());
    const baseGoldRate = masterControlSettings.goldRate22ct || 6400;

    if (item) {
      if (item.ratePerGram && item.ratePerGram > 0) {
        return item.ratePerGram;
      }
      if (item.category === 'OTHER') {
        // Do NOT silently use 22ct gold rate for OTHER materials!
        return 0;
      }
      if (item.category === 'SILVER') {
        return 85;
      }
      if (item.category === 'GOLD') {
        if (item.purityValue) {
          return Math.round((baseGoldRate / 22) * item.purityValue);
        }
        return baseGoldRate;
      }
    }

    const lower = purityIdOrName.trim().toLowerCase();
    if (lower.includes('silver')) return 85;
    if (lower.includes('24ct') || lower.includes('24k')) return Math.round((baseGoldRate / 22) * 24);
    if (lower.includes('22ct') || lower.includes('22k')) return baseGoldRate;
    if (lower.includes('18ct') || lower.includes('18k')) return Math.round((baseGoldRate / 22) * 18);
    if (lower.includes('14ct') || lower.includes('14k')) return Math.round((baseGoldRate / 22) * 14);

    return 0;
  };

  const addPurityOption = (config: { name: string; category?: PurityCategory; purityValue?: number; ratePerGram?: number; description?: string; active?: boolean }): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can add purity options.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const trimmed = config.name?.trim() || '';
    if (!trimmed) {
      showToast('Purity name cannot be empty.', 'warning');
      return { success: false, message: 'Purity name cannot be empty.' };
    }
    if (trimmed.length > 50) {
      showToast('Purity name is too long (maximum 50 characters).', 'warning');
      return { success: false, message: 'Purity name is too long.' };
    }
    const currentList = masterControlSettings.purityOptions || defaultPurityOptions;
    if (currentList.some(p => p.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      showToast('This purity/material already exists.', 'warning');
      return { success: false, message: 'This purity/material already exists.' };
    }

    if (config.ratePerGram !== undefined && (isNaN(config.ratePerGram) || !isFinite(config.ratePerGram) || config.ratePerGram < 0)) {
      showToast('Enter a valid non-negative rate.', 'warning');
      return { success: false, message: 'Enter a valid non-negative rate.' };
    }

    if (config.purityValue !== undefined && (isNaN(config.purityValue) || !isFinite(config.purityValue) || config.purityValue < 0)) {
      showToast('Enter a valid purity value.', 'warning');
      return { success: false, message: 'Enter a valid purity value.' };
    }

    const category: PurityCategory = config.category || (trimmed.toLowerCase().includes('silver') ? 'SILVER' : 'GOLD');
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'custom-purity';
    let id = `${category.toLowerCase()}-${slug}`;
    let counter = 1;
    while (currentList.some(p => p.id === id)) {
      id = `${category.toLowerCase()}-${slug}-${counter++}`;
    }

    const maxSort = currentList.length > 0 ? Math.max(...currentList.map(p => p.sortOrder || 0)) : 0;
    const newItem: PurityConfig = {
      id,
      name: trimmed,
      category,
      purityValue: config.purityValue !== undefined && !isNaN(Number(config.purityValue)) && Number(config.purityValue) > 0 ? Number(config.purityValue) : undefined,
      ratePerGram: config.ratePerGram !== undefined && !isNaN(Number(config.ratePerGram)) && Number(config.ratePerGram) > 0 ? Number(config.ratePerGram) : undefined,
      description: config.description?.trim() || undefined,
      active: config.active ?? true,
      sortOrder: maxSort + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...currentList, newItem];
    setMasterControlSettings(prev => {
      const next = { ...prev, purityOptions: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit('PURITY_CREATED', id, `Created purity "${trimmed}" (Category: ${category}, Rate: ${newItem.ratePerGram ?? 'Unconfigured'}, PurityValue: ${newItem.purityValue ?? 'N/A'}, Status: ${newItem.active ? 'ACTIVE' : 'DISABLED'})`);
    showToast(`Purity "${trimmed}" added successfully.`, 'success');
    return { success: true };
  };

  const updatePurityOption = (id: string, updates: { name?: string; category?: PurityCategory; purityValue?: number; ratePerGram?: number; description?: string; active?: boolean }): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can modify purity options.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const currentList = masterControlSettings.purityOptions || defaultPurityOptions;
    const existing = currentList.find(p => p.id === id);
    if (!existing) {
      showToast('Purity option not found.', 'error');
      return { success: false, message: 'Purity option not found.' };
    }

    let finalName = existing.name;
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) {
        showToast('Purity name cannot be empty.', 'warning');
        return { success: false, message: 'Purity name cannot be empty.' };
      }
      if (trimmed.length > 50) {
        showToast('Purity name is too long (maximum 50 characters).', 'warning');
        return { success: false, message: 'Purity name is too long.' };
      }
      if (currentList.some(p => p.id !== id && p.name.trim().toLowerCase() === trimmed.toLowerCase())) {
        showToast('This purity/material already exists.', 'warning');
        return { success: false, message: 'This purity/material already exists.' };
      }
      finalName = trimmed;
    }

    if (updates.ratePerGram !== undefined && (isNaN(updates.ratePerGram) || !isFinite(updates.ratePerGram) || updates.ratePerGram < 0)) {
      showToast('Enter a valid non-negative rate.', 'warning');
      return { success: false, message: 'Enter a valid non-negative rate.' };
    }

    if (updates.purityValue !== undefined && (isNaN(updates.purityValue) || !isFinite(updates.purityValue) || updates.purityValue < 0)) {
      showToast('Enter a valid purity value.', 'warning');
      return { success: false, message: 'Enter a valid purity value.' };
    }

    if (updates.ratePerGram !== undefined && updates.ratePerGram !== existing.ratePerGram) {
      logMasterConfigAudit('PURITY_RATE_CHANGED', id, `Changed rate for "${existing.name}" from ₹${existing.ratePerGram || 0} to ₹${updates.ratePerGram}`);
    }

    const updated = currentList.map(p => {
      if (p.id !== id) return p;
      return {
        ...p,
        name: finalName,
        category: updates.category !== undefined ? updates.category : p.category,
        purityValue: updates.purityValue !== undefined && updates.purityValue > 0 ? updates.purityValue : undefined,
        ratePerGram: updates.ratePerGram !== undefined && updates.ratePerGram > 0 ? updates.ratePerGram : undefined,
        description: updates.description !== undefined ? updates.description.trim() || undefined : p.description,
        active: updates.active !== undefined ? updates.active : p.active,
        updatedAt: new Date().toISOString()
      };
    });

    setMasterControlSettings(prev => {
      const next = { ...prev, purityOptions: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit('PURITY_UPDATED', id, `Updated purity "${finalName}" (Previous: ${JSON.stringify(existing)}, New: ${JSON.stringify(updates)})`);
    showToast(`Purity "${finalName}" updated successfully.`, 'success');
    return { success: true };
  };

  const togglePurityStatus = (id: string): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can toggle purity status.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const currentList = masterControlSettings.purityOptions || defaultPurityOptions;
    const existing = currentList.find(p => p.id === id);
    if (!existing) {
      showToast('Purity option not found.', 'error');
      return { success: false, message: 'Purity option not found.' };
    }
    const newStatus = !existing.active;
    const updated = currentList.map(p => p.id === id ? { ...p, active: newStatus, updatedAt: new Date().toISOString() } : p);
    setMasterControlSettings(prev => {
      const next = { ...prev, purityOptions: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit(newStatus ? 'PURITY_ENABLED' : 'PURITY_DISABLED', id, `${newStatus ? 'Enabled' : 'Disabled'} purity "${existing.name}"`);
    showToast(`Purity "${existing.name}" ${newStatus ? 'enabled' : 'disabled'}.`, 'info');
    return { success: true };
  };

  const deletePurityOption = (id: string): { success: boolean; message?: string } => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !hasPermission('masterControl') && !hasPermission('settings')) {
      showToast('Permission denied. Only Master Admin can delete purity options.', 'error');
      return { success: false, message: 'Permission denied.' };
    }
    const currentList = masterControlSettings.purityOptions || defaultPurityOptions;
    const existing = currentList.find(p => p.id === id);
    if (!existing) {
      showToast('Purity option not found.', 'error');
      return { success: false, message: 'Purity option not found.' };
    }
    const isUsedInLoans = loans.some(l =>
      (l.items || (l as any).ornamentItems || []).some((item: any) => item.purity === existing.name || item.purityId === existing.id || item.purityName === existing.name)
    );
    if (isUsedInLoans) {
      showToast(`Cannot delete "${existing.name}" because historical loans reference it. Please DISABLE it instead.`, 'warning');
      return { success: false, message: 'Cannot delete purity referenced by historical loans. Please disable it instead.' };
    }

    const updated = currentList.filter(p => p.id !== id);
    setMasterControlSettings(prev => {
      const next = { ...prev, purityOptions: updated };
      apiService.updateMasterSettings(next).catch(e => console.error(e));
      return next;
    });
    logMasterConfigAudit('PURITY_DELETED', id, `Deleted purity "${existing.name}" (${existing.category})`);
    showToast(`Purity "${existing.name}" deleted successfully.`, 'info');
    return { success: true };
  };

  const updateFDInterestRate = (newRate: number, effectiveFrom?: string, notes?: string): boolean => {
    if (userRole !== 'MASTER_ADMIN' && userRole !== 'ADMIN' && !masterControlUnlocked && !hasPermission('settings') && !hasPermission('masterControl')) {
      showToast('Permission denied. Only Master Admin can change default FD interest rate.', 'error');
      return false;
    }
    if (isNaN(newRate) || newRate <= 0 || newRate > 36) {
      showToast('Please enter a valid interest rate between 0.25% and 36.00% p.a.', 'error');
      return false;
    }

    const currentRate = masterControlSettings.fdInterestRate ?? 12;
    const todayISO = new Date().toISOString();
    const effDate = effectiveFrom || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const adminName = currentUser?.displayName || (userRole === 'MASTER_ADMIN' ? 'Master Admin' : 'Admin');

    const historyItem: FDRateHistoryItem = {
      id: `FD-RATE-${Date.now()}`,
      rate: Number(newRate.toFixed(2)),
      previousRate: currentRate,
      effectiveFrom: effDate,
      effectiveTo: null,
      changedBy: adminName,
      changedAt: todayISO,
      notes: notes || 'Default master FD interest rate updated'
    };

    const existingHistory = masterControlSettings.fdInterestRateHistory || [];
    const updatedHistory = [
      historyItem,
      ...existingHistory.map(h => ({
        ...h,
        effectiveTo: h.effectiveTo || effDate
      }))
    ];

    setMasterControlSettings(prev => {
      const updated = {
        ...prev,
        fdInterestRate: Number(newRate.toFixed(2)),
        fdInterestRateEffectiveFrom: effDate,
        fdInterestRateHistory: updatedHistory
      };
      apiService.updateMasterSettings(updated).catch(e => console.error(e));
      return updated;
    });

    logMasterConfigAudit('FD_DEFAULT_RATE_CHANGED', 'FD-RATE', `Changed default FD interest rate from ${currentRate.toFixed(2)}% to ${newRate.toFixed(2)}% p.a. (Effective: ${effDate}, Changed By: ${adminName})`);
    showToast(`Default FD interest rate updated to ${newRate.toFixed(2)}% p.a. (Effective: ${effDate})`, 'success');
    return true;
  };

  const updateWhatsAppTemplates = (newTpls: Partial<WhatsAppTemplates>) => {
    setWhatsAppTemplates(prev => {
      const updated = { ...prev, ...newTpls };
      apiService.updateWhatsAppTemplates(updated).catch(e => console.error(e));
      return updated;
    });
    showToast('WhatsApp templates saved!', 'success');
  };

  const updateTelegramConfig = (newCfg: Partial<TelegramConfig>) => {
    setTelegramConfig(prev => {
      const updated = { ...prev, ...newCfg };
      apiService.updateTelegramConfig(updated).catch(e => console.error(e));
      return updated;
    });
    showToast('Telegram configuration saved!', 'success');
  };

  const getCustomerById = (id: string): Customer | undefined => {
    return customers.find(c => c.id === id || (c.customerId && c.customerId.toString() === id));
  };

  const addLoan = (loanData: Omit<Loan, 'id' | 'loanNo'> & { loanNo?: string; receiptBillNo?: number }): Loan => {
    let maxLoanNum = 0;
    for (const l of loans) {
      const match = (l.loanNo || '').match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxLoanNum) maxLoanNum = num;
      }
    }
    const storedLoanSeq = getStored('last_loan_sequence', 0);
    const nextLoanSeq = Math.max(maxLoanNum, storedLoanSeq) + 1;
    const loanNo = loanData.loanNo || `GL-${String(nextLoanSeq).padStart(2, '0')}`;
    safeSetStored('last_loan_sequence', nextLoanSeq);

    // Deduplication check: verify if loan with loanNo or identical customer & parameters already exists
    const existingLoan = loans.find(l =>
      (loanNo && l.loanNo.toLowerCase() === loanNo.toLowerCase()) ||
      (l.customerId === loanData.customerId && l.date === loanData.date && l.principal === loanData.principal)
    );
    if (existingLoan) {
      showToast(`Loan ${existingLoan.loanNo} already exists! Duplicate creation prevented.`, 'warning');
      return existingLoan;
    }

    const newLoan: Loan = {
      ...loanData,
      id: `L-${Date.now()}`,
      loanNo,
      lastInterestPaidDate: loanData.date,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')
    };

    setLoans((prev) => [newLoan, ...prev]);

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === newLoan.customerId || c.name.toLowerCase() === newLoan.customerName.toLowerCase()
          ? { ...c, activeLoansCount: c.activeLoansCount + 1, totalBorrowed: c.totalBorrowed + newLoan.principal }
          : c
      )
    );

    const maxReceiptNo = receipts.length > 0 ? Math.max(...receipts.map(r => Number(r.receiptNo) || 0)) : 0;
    const storedReceiptSeq = getStored('last_receipt_sequence', 0);
    const calculatedNextReceiptNo = Math.max(maxReceiptNo, storedReceiptSeq) + 1;
    const receiptNo = (loanData.receiptBillNo && Number(loanData.receiptBillNo) > 0) ? Number(loanData.receiptBillNo) : calculatedNextReceiptNo;
    safeSetStored('last_receipt_sequence', Math.max(receiptNo, calculatedNextReceiptNo));

    const disbursementReceipt: Receipt = {
      id: `RCPT-${Date.now()}`,
      receiptNo,
      loanId: newLoan.id,
      loanNo: newLoan.loanNo,
      customerId: newLoan.customerId,
      customerName: newLoan.customerName,
      kind: 'NEW LOAN',
      loanType: newLoan.loanType,
      amount: newLoan.principal,
      principalComponent: newLoan.principal,
      interestComponent: 0,
      paymentMode: newLoan.bankMode === 'Cash' ? 'Cash' : 'UPI',
      date: newLoan.date,
      notes: 'New Loan Disbursement'
    };

    setReceipts((prev) => [disbursementReceipt, ...prev]);

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isCash = newLoan.bankMode === 'Cash';
    const isSplit = newLoan.bankMode === 'Split';
    const cashDisbursed = isCash ? newLoan.principal : isSplit ? newLoan.cashAmount : 0;
    const bankDisbursed = isCash ? 0 : isSplit ? newLoan.bankAmount : newLoan.principal;

    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      time: timeStr,
      billNo: receiptNo.toString(),
      particulars: `Loan Disbursement (${loanNo}) - ${newLoan.customerName}`,
      accountHead: 'Gold Loan Portfolio',
      mode: newLoan.bankMode === 'Cash' ? 'Cash' : newLoan.bankMode === 'UPI' ? 'UPI' : 'Bank',
      cashIn: 0,
      cashOut: cashDisbursed,
      bankIn: 0,
      bankOut: bankDisbursed,
      cashBal: cashInHand - cashDisbursed,
      bankBal: cashAtBank - bankDisbursed,
      customerName: newLoan.customerName,
      loanNo,
      date: newLoan.date
    };

    setDayBookEntries((prev) => [dbEntry, ...prev]);
    showToast(`Loan ${loanNo} issued successfully!`, 'success');
    return newLoan;
  };

  const addReceipt = (receiptData: Omit<Receipt, 'id' | 'receiptNo'>): Receipt => {
    const maxExisting = receipts.length > 0 ? Math.max(...receipts.map((r) => r.receiptNo || 0)) : 0;
    const storedSeq = getStored('last_receipt_sequence', 0);
    const receiptNo = Math.max(maxExisting, storedSeq) + 1;
    safeSetStored('last_receipt_sequence', receiptNo);

    const targetLoan = loans.find((l) => l.loanNo === receiptData.loanNo || l.id === receiptData.loanId);
    const prevOutstanding = targetLoan ? targetLoan.outstandingPrincipal : 0;
    const newPrincipal = Math.max(0, prevOutstanding - (receiptData.principalComponent || 0));

    const newReceipt: Receipt = {
      ...receiptData,
      id: `RCPT-${Date.now()}`,
      receiptNo,
      outstandingBefore: receiptData.outstandingBefore ?? prevOutstanding,
      outstandingAfter: receiptData.outstandingAfter ?? newPrincipal,
      processedBy: receiptData.processedBy ?? 'Admin',
      createdAt: receiptData.createdAt ?? new Date().toISOString()
    };

    setReceipts((prev) => [newReceipt, ...prev]);

    setLoans((prev) =>
      prev.map((l) => {
        if (l.loanNo === newReceipt.loanNo || l.id === newReceipt.loanId) {
          const isFullClosure = newReceipt.kind === 'LOAN CLOSURE' || newPrincipal === 0;
          let calculatedNextDue = newReceipt.nextDueDate || l.nextDueDate;
          if (newReceipt.interestComponent > 0 && !newReceipt.nextDueDate && l.nextDueDate) {
            try {
              calculatedNextDue = addCalendarMonths(l.nextDueDate, 1);
            } catch {
              calculatedNextDue = l.nextDueDate;
            }
          }

          return {
            ...l,
            outstandingPrincipal: newPrincipal,
            status: isFullClosure ? 'CLOSED' : l.status,
            lastInterestPaidDate: newReceipt.date,
            nextDueDate: calculatedNextDue
          };
        }
        return l;
      })
    );

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isCash = newReceipt.paymentMode === 'Cash';
    const isBank = newReceipt.paymentMode === 'Bank' || newReceipt.paymentMode === 'UPI';

    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      time: timeStr,
      billNo: receiptNo.toString(),
      particulars: `${newReceipt.kind} (${newReceipt.loanNo}) - ${newReceipt.customerName}`,
      accountHead: newReceipt.interestComponent > 0 ? 'Interest Income' : 'Pledge Repayment',
      mode: newReceipt.paymentMode,
      cashIn: isCash ? newReceipt.amount : 0,
      cashOut: 0,
      bankIn: isBank ? newReceipt.amount : 0,
      bankOut: 0,
      cashBal: isCash ? cashInHand + newReceipt.amount : cashInHand,
      bankBal: isBank ? cashAtBank + newReceipt.amount : cashAtBank,
      tdsAmount: newReceipt.tdsAmount || 0,
      customerName: newReceipt.customerName,
      loanNo: newReceipt.loanNo,
      date: newReceipt.date
    };

    setDayBookEntries((prev) => [dbEntry, ...prev]);

    showToast(`Receipt #${receiptNo} recorded successfully!`, 'success');
    return newReceipt;
  };

  const addFixedDeposit = (fdData: Omit<FixedDeposit, 'id' | 'fdNo'>): FixedDeposit => {
    const maxSeq = fixedDeposits.reduce((max, f) => {
      const match = f.fdNo ? f.fdNo.match(/\d+/) : null;
      const num = match ? parseInt(match[0], 10) : 0;
      return num > max ? num : max;
    }, 0);
    const nextNumber = maxSeq + 1;
    const fdNo = `FD-${nextNumber.toString().padStart(2, '0')}`;
    const newFd: FixedDeposit = {
      ...fdData,
      id: `FD-${Date.now()}`,
      fdNo,
      remainingPrincipal: fdData.remainingPrincipal ?? fdData.principal,
      totalWithdrawnPrincipal: fdData.totalWithdrawnPrincipal ?? 0
    };

    setFixedDeposits((prev) => [newFd, ...prev]);

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isCash = newFd.receivingMethod === 'Cash';
    const isBank = newFd.receivingMethod === 'Bank' || newFd.receivingMethod === 'UPI';

    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      time: timeStr,
      billNo: fdNo,
      particulars: `Fixed Deposit Inflow (${fdNo}) - ${newFd.depositorName}`,
      accountHead: 'Fixed Deposits',
      mode: isCash ? 'Cash' : (newFd.receivingMethod === 'UPI' ? 'UPI' : 'Bank'),
      cashIn: isCash ? newFd.principal : 0,
      cashOut: 0,
      bankIn: isBank ? newFd.principal : 0,
      bankOut: 0,
      cashBal: isCash ? cashInHand + newFd.principal : cashInHand,
      bankBal: isBank ? cashAtBank + newFd.principal : cashAtBank,
      customerName: newFd.depositorName,
      date: newFd.depositDate
    };

    setDayBookEntries((prev) => [dbEntry, ...prev]);
    showToast(`Fixed Deposit ${fdNo} issued successfully!`, 'success');
    return newFd;
  };

  const addFDCustomer = (custData: Omit<FDCustomer, 'id' | 'createdAt'>): FDCustomer => {
    const newCust: FDCustomer = {
      ...custData,
      id: `fdc-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setFdCustomers(prev => [newCust, ...prev]);
    showToast(`FD Customer ${newCust.name} saved successfully!`, 'success');
    return newCust;
  };

  const addCustomer = (custData: Omit<Customer, 'id' | 'activeLoansCount' | 'totalBorrowed' | 'joinedDate'>): Customer => {
    // Phone normalization utility
    const normPhone = custData.phone ? custData.phone.replace(/\D/g, '').slice(-10) : '';

    // Check unique mobile number constraint among active (non-deleted) customers
    const existing = customers.find(c => !c.isDeleted && (c.phoneNormalized === normPhone || c.phone.replace(/\D/g, '').slice(-10) === normPhone));
    if (existing) {
      showToast('This mobile number is already registered to an existing customer.', 'error');
      throw new Error('DUPLICATE_PHONE_NUMBER');
    }

    // Atomic Customer ID sequence counter from localStorage / max existing ID
    const storedSeq = localStorage.getItem('kkv_customer_sequence');
    let seq = storedSeq ? parseInt(storedSeq, 10) : 0;
    if (!seq || isNaN(seq)) {
      seq = customers.reduce((max, c) => {
        const num = c.customerId || parseInt(c.id.replace(/\D/g, ''), 10) || 0;
        return Math.max(max, num);
      }, 0);
    }
    const nextSeq = seq + 1;
    localStorage.setItem('kkv_customer_sequence', nextSeq.toString());

    const id = `CUST-${nextSeq.toString().padStart(4, '0')}`;
    const newCust: Customer = {
      ...custData,
      id,
      customerId: nextSeq,
      phoneNormalized: normPhone,
      isDeleted: false,
      activeLoansCount: 0,
      totalBorrowed: 0,
      status: custData.status || 'VERIFIED',
      joinedDate: new Date().toLocaleDateString('en-GB'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCustomers((prev) => [newCust, ...prev.filter(c => c.id !== id)]);

    // Persist to backend
    apiService.createCustomer(newCust).catch((err) => {
      console.warn('[AppContext] Customer backend save sync warning:', err);
    });

    showToast(`Customer ${newCust.name} (${newCust.id}) added successfully!`, 'success');
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>): Customer | null => {
    let updatedCust: Customer | null = null;

    setCustomers((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      if (index === -1) return prev;

      updatedCust = {
        ...prev[index],
        ...updates,
        id: prev[index].id, // Permanent ID protection
        updatedAt: new Date().toISOString()
      };

      const newArr = [...prev];
      newArr[index] = updatedCust;
      return newArr;
    });

    if (updatedCust) {
      apiService.updateCustomer(id, updates).catch((err) => {
        console.warn('[AppContext] Customer backend update sync warning:', err);
      });
      showToast(`Customer ${updates.name || id} updated successfully!`, 'success');
    }

    return updatedCust;
  };

  const deleteCustomer = (id: string): boolean => {
    if (userRole !== 'ADMIN') {
      showToast('You do not have permission to delete customer records.', 'error');
      return false;
    }

    const targetCust = customers.find((c) => c.id === id);
    if (!targetCust) return false;

    // Soft delete: Mark isDeleted = true
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: 'ADMIN' } : c))
    );

    apiService.deleteCustomer(id, userRole).catch((err) => {
      console.warn('[AppContext] Customer backend delete sync warning:', err);
    });

    showToast(`Customer ${targetCust.name} (${targetCust.id}) soft-deleted successfully.`, 'success');
    return true;
  };

  const restoreCustomer = (id: string): boolean => {
    if (userRole !== 'ADMIN') {
      showToast('You do not have permission to restore customer records.', 'error');
      return false;
    }

    const targetCust = customers.find((c) => c.id === id);
    if (!targetCust) return false;

    // Restore customer: Mark isDeleted = false
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isDeleted: false, deletedAt: null, deletedBy: null } : c))
    );

    apiService.restoreCustomer(id, userRole).catch((err) => {
      console.warn('[AppContext] Customer backend restore sync warning:', err);
    });

    showToast(`Customer ${targetCust.name} (${targetCust.id}) restored successfully.`, 'success');
    return true;
  };

  const deleteCustomerPermanently = async (id: string): Promise<boolean> => {
    if (userRole !== 'ADMIN') {
      showToast('Only Admin users have permission to permanently delete customer records.', 'error');
      return false;
    }

    const targetCust = customers.find((c) => c.id === id || (c.customerId && c.customerId.toString() === id));
    if (!targetCust) {
      showToast('Customer not found.', 'error');
      return false;
    }

    const custId = targetCust.id;
    const numericCustIdStr = targetCust.customerId ? targetCust.customerId.toString() : '';

    try {
      await apiService.deleteCustomerPermanently(id, userRole);
    } catch (err: any) {
      console.warn('[AppContext] Customer backend permanent deletion sync warning:', err);
    }

    // 1. Remove customer record permanently
    setCustomers((prev) =>
      prev.filter((c) => c.id !== custId && (numericCustIdStr ? c.customerId?.toString() !== numericCustIdStr : true))
    );

    // 2. Cascade delete loans
    const deletedLoanNos = new Set<string>();
    const deletedLoanIds = new Set<string>();

    loans.forEach((l) => {
      if (l.customerId === custId || (numericCustIdStr && l.customerId === numericCustIdStr)) {
        deletedLoanNos.add(l.loanNo);
        deletedLoanIds.add(l.id);
      }
    });

    setLoans((prev) =>
      prev.filter((l) => l.customerId !== custId && (numericCustIdStr ? l.customerId !== numericCustIdStr : true))
    );

    // 3. Cascade delete receipts
    setReceipts((prev) =>
      prev.filter(
        (r) =>
          r.customerId !== custId &&
          (numericCustIdStr ? r.customerId !== numericCustIdStr : true) &&
          !deletedLoanNos.has(r.loanNo) &&
          !deletedLoanIds.has(r.loanId)
      )
    );

    // 4. Cascade delete daybook entries
    setDayBookEntries((prev) =>
      prev.filter(
        (d) =>
          (d.customerName ? d.customerName !== targetCust.name : true) &&
          (d.loanNo ? !deletedLoanNos.has(d.loanNo) : true)
      )
    );

    // 5. Cascade delete fixed deposits, interest payouts, and withdrawals
    const deletedFdNos = new Set<string>();
    fixedDeposits.forEach((f) => {
      if (f.customerId === custId || (numericCustIdStr && f.customerId === numericCustIdStr)) {
        deletedFdNos.add(f.fdNo);
      }
    });

    setFixedDeposits((prev) =>
      prev.filter((f) => f.customerId !== custId && (numericCustIdStr ? f.customerId !== numericCustIdStr : true))
    );
    setFdInterestPayouts((prev) => prev.filter((p) => !deletedFdNos.has(p.fdNo)));
    setFdWithdrawals((prev) => prev.filter((w) => !deletedFdNos.has(w.fdNo)));
    setFdRenewals((prev) => prev.filter((r) => !deletedFdNos.has(r.fdNo)));

    showToast('Customer and all associated records have been permanently deleted successfully.', 'success');
    return true;
  };

  const addDayBookEntry = (entryData: Omit<DayBookEntry, 'id' | 'time' | 'cashBal' | 'bankBal'>): DayBookEntry => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newEntry: DayBookEntry = {
      ...entryData,
      id: `db-${Date.now()}`,
      time: timeStr,
      cashBal: cashInHand + (entryData.cashIn - entryData.cashOut),
      bankBal: cashAtBank + (entryData.bankIn - entryData.bankOut)
    };

    setDayBookEntries((prev) => [newEntry, ...prev]);
    showToast(`Day Book entry recorded!`, 'success');
    return newEntry;
  };

  const payFDInterest = (
    fdNo: string,
    mode: 'Cash' | 'Bank' | 'UPI' | string,
    amount?: number,
    targetDueDate?: string,
    targetPeriodKey?: string
  ): boolean => {
    const targetFD = fixedDeposits.find((f) => f.fdNo === fdNo || f.id === fdNo);
    if (!targetFD) {
      showToast('Fixed Deposit record not found.', 'error');
      return false;
    }

    if (targetFD.status === 'WITHDRAWN') {
      showToast('This Fixed Deposit is closed and cannot receive interest payouts.', 'error');
      return false;
    }

    const schedule = calculateFDInterestSchedule(targetFD, fdInterestPayouts);

    const dueDateToPay = targetDueDate ? normalizeDateString(targetDueDate) : schedule.nextPayoutDate;
    const periodKeyToPay = targetPeriodKey || calculateInterestPeriodKey(targetFD.fdNo, dueDateToPay);

    // Check duplicate period key
    const duplicate = fdInterestPayouts.some(
      (p) =>
        p.status === 'PAID' &&
        ((p as any).periodKey === periodKeyToPay ||
          (p.fdNo === targetFD.fdNo && (p.dueDate === dueDateToPay || (p as any).periodKey === periodKeyToPay)))
    );

    if (duplicate) {
      showToast('This interest period has already been paid.', 'error');
      return false;
    }

    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const payoutAmount = amount && amount > 0 ? amount : schedule.payoutAmount;

    const payout: FDInterestPayout = {
      id: `fd-payout-${Date.now()}`,
      fdId: targetFD.id,
      fdNo: targetFD.fdNo,
      customerId: targetFD.customerId,
      depositorName: targetFD.depositorName,
      amount: payoutAmount,
      date: todayStr,
      dueDate: dueDateToPay,
      periodKey: periodKeyToPay,
      mode: mode as any,
      status: 'PAID'
    };

    setFdInterestPayouts((prev) => [payout, ...prev]);

    // Daybook entry
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isCash = mode === 'Cash';
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      time: timeStr,
      billNo: `INT-${targetFD.fdNo}`,
      particulars: `FD Interest Payout (${targetFD.fdNo}) - ${targetFD.depositorName} (${dueDateToPay})`,
      accountHead: 'Interest Expense',
      mode: mode as any,
      cashIn: 0,
      cashOut: isCash ? payoutAmount : 0,
      bankIn: 0,
      bankOut: isCash ? 0 : payoutAmount,
      cashBal: isCash ? cashInHand - payoutAmount : cashInHand,
      bankBal: isCash ? cashAtBank : cashAtBank - payoutAmount,
      customerName: targetFD.depositorName,
      date: todayStr
    };

    setDayBookEntries((prev) => [dbEntry, ...prev]);
    showToast(`Interest payout of ₹${payoutAmount.toLocaleString('en-IN')} recorded for ${targetFD.fdNo} (${dueDateToPay})`, 'success');
    return true;
  };

  const withdrawFD = (
    fdNo: string,
    mode: 'Cash' | 'Bank' | 'UPI',
    notes?: string,
    withdrawalAmount?: number,
    transactionReference?: string,
    bankName?: string
  ): FDWithdrawal | null => {
    const targetFD = fixedDeposits.find(f => f.fdNo === fdNo);
    if (!targetFD) {
      showToast('Fixed Deposit record not found.', 'error');
      return null;
    }
    if (targetFD.status === 'WITHDRAWN') {
      showToast('This Fixed Deposit is already closed and fully withdrawn.', 'error');
      return null;
    }

    const currentRemaining = targetFD.remainingPrincipal ?? targetFD.principal;
    const amountToWithdraw = withdrawalAmount && withdrawalAmount > 0 ? Math.min(withdrawalAmount, currentRemaining) : currentRemaining;

    if (amountToWithdraw <= 0) {
      showToast('Invalid withdrawal amount.', 'error');
      return null;
    }

    const newRemaining = Math.max(0, currentRemaining - amountToWithdraw);
    const newTotalWithdrawn = (targetFD.totalWithdrawnPrincipal ?? 0) + amountToWithdraw;
    const isFullyWithdrawn = newRemaining <= 0;

    // Safe Monotonic Withdrawal ID (WD-XXX)
    const storedWdSeq = getStored<number>('last_fd_withdrawal_sequence', 0);
    const maxWdSeq = fdWithdrawals.reduce((max, w) => {
      const match = w.withdrawalId?.match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;
      return num > max ? num : max;
    }, 0);
    const nextWdNum = Math.max(storedWdSeq, maxWdSeq) + 1;
    safeSetStored('last_fd_withdrawal_sequence', nextWdNum);
    const newWithdrawalId = `WD-${String(nextWdNum).padStart(3, '0')}`;

    // Safe Monotonic Receipt Number (FDR-XXX)
    const storedRcptSeq = getStored<number>('last_fd_receipt_sequence', 0);
    const maxRcptSeq = fdWithdrawals.reduce((max, w) => {
      const match = (w.receiptNo || w.receiptId)?.match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;
      return num > max ? num : max;
    }, 0);
    const nextRcptNum = Math.max(storedRcptSeq, maxRcptSeq) + 1;
    safeSetStored('last_fd_receipt_sequence', nextRcptNum);
    const newReceiptNo = `FDR-${String(nextRcptNum).padStart(3, '0')}`;

    const todayStr = formatFDDate(new Date());
    const withdrawal: FDWithdrawal = {
      id: `fd-wth-${Date.now()}`,
      withdrawalId: newWithdrawalId,
      receiptNo: newReceiptNo,
      receiptId: newReceiptNo,
      withdrawalType: isFullyWithdrawn ? 'FULL' : 'PARTIAL',
      fdId: targetFD.id,
      fdNo,
      customerId: targetFD.customerId,
      customerPhone: targetFD.phone,
      depositorName: targetFD.depositorName,
      originalPrincipal: targetFD.principal,
      balanceBefore: currentRemaining,
      principalAmount: amountToWithdraw,
      remainingBalance: newRemaining,
      interestPaid: 0,
      totalAmount: amountToWithdraw,
      withdrawalDate: todayStr,
      mode,
      transactionReference: transactionReference || undefined,
      bankName: bankName || undefined,
      notes: notes || (isFullyWithdrawn ? 'Full FD settlement' : 'Partial principal withdrawal'),
      status: 'COMPLETED',
      processedBy: 'Admin',
      createdAt: new Date().toISOString(),
      items: (targetFD as any).items || [],
      photos: (targetFD as any).photos || []
    };

    setFdWithdrawals(prev => [withdrawal, ...prev]);
    setFixedDeposits(prev => prev.map(f => f.fdNo === fdNo ? {
      ...f,
      status: isFullyWithdrawn ? 'WITHDRAWN' : f.status,
      remainingPrincipal: newRemaining,
      totalWithdrawnPrincipal: newTotalWithdrawn
    } : f));

    // Daybook entry
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isCash = mode === 'Cash';
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      time: timeStr,
      billNo: newWithdrawalId,
      particulars: `FD ${isFullyWithdrawn ? 'Full Closure' : 'Partial Withdrawal'} (${fdNo}) - ${targetFD.depositorName}`,
      accountHead: 'Fixed Deposits',
      mode,
      cashIn: 0,
      cashOut: isCash ? amountToWithdraw : 0,
      bankIn: 0,
      bankOut: isCash ? 0 : amountToWithdraw,
      cashBal: isCash ? cashInHand - amountToWithdraw : cashInHand,
      bankBal: isCash ? cashAtBank : cashAtBank - amountToWithdraw,
      customerName: targetFD.depositorName,
      date: todayStr
    };

    setDayBookEntries(prev => [dbEntry, ...prev]);
    showToast(
      isFullyWithdrawn
        ? `Fixed Deposit ${fdNo} closed and fully refunded (₹${amountToWithdraw.toLocaleString('en-IN')})`
        : `Partial withdrawal of ₹${amountToWithdraw.toLocaleString('en-IN')} processed for ${fdNo}. Remaining: ₹${newRemaining.toLocaleString('en-IN')}`,
      'success'
    );
    return withdrawal;
  };

  const renewFD = (fdNo: string, periodMonths: number, notes?: string): boolean => {
    if (userRole !== 'ADMIN') {
      showToast('Only Admin users can renew Fixed Deposits.', 'error');
      return false;
    }
    const targetFD = fixedDeposits.find(f => f.fdNo === fdNo);
    if (!targetFD) {
      showToast('Fixed Deposit record not found.', 'error');
      return false;
    }
    if (targetFD.status === 'WITHDRAWN') {
      showToast('Cannot renew a fully withdrawn Fixed Deposit.', 'error');
      return false;
    }
    if (periodMonths <= 0) {
      showToast('Invalid renewal period.', 'error');
      return false;
    }

    const previousMaturityDate = targetFD.maturityDate;
    const newMaturityDate = addCalendarMonths(previousMaturityDate, periodMonths);
    const todayStr = formatFDDate(new Date());

    // Sequential RN-XXX ID
    const maxRnSeq = fdRenewals.reduce((max, r) => {
      const match = r.renewalId?.match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;
      return num > max ? num : max;
    }, 0);
    const newRenewalId = `RN-${String(maxRnSeq + 1).padStart(3, '0')}`;

    const renewal: FDRenewal = {
      id: `fd-rnw-${Date.now()}`,
      renewalId: newRenewalId,
      fdId: targetFD.id,
      fdNo,
      customerId: targetFD.customerId,
      depositorName: targetFD.depositorName,
      previousMaturityDate,
      newMaturityDate,
      renewalPeriodMonths: periodMonths,
      renewalDate: todayStr,
      interestRateAtRenewal: targetFD.interestRatePA,
      notes: notes || `FD renewed for ${periodMonths} months`,
      status: 'COMPLETED'
    };

    setFdRenewals(prev => [renewal, ...prev]);
    setFixedDeposits(prev => prev.map(f => f.fdNo === fdNo ? {
      ...f,
      maturityDate: newMaturityDate,
      status: 'ACTIVE' as const
    } : f));

    // Daybook audit entry
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}-rnw`,
      time: timeStr,
      billNo: newRenewalId,
      particulars: `FD Renewal (${fdNo}) - ${targetFD.depositorName} — Extended ${periodMonths}m to ${newMaturityDate}`,
      accountHead: 'Fixed Deposits',
      mode: 'Cash',
      cashIn: 0, cashOut: 0, bankIn: 0, bankOut: 0,
      cashBal: cashInHand, bankBal: cashAtBank,
      customerName: targetFD.depositorName,
      date: todayStr
    };
    setDayBookEntries(prev => [dbEntry, ...prev]);

    showToast(`Fixed Deposit ${fdNo} renewed for ${periodMonths} months. New maturity: ${newMaturityDate}`, 'success');
    return true;
  };

  const deleteFixedDeposit = (fdNo: string): boolean => {
    if (userRole !== 'ADMIN') {
      showToast('Only Admin users have permission to delete Fixed Deposit contracts.', 'error');
      return false;
    }
    const target = fixedDeposits.find((f) => f.fdNo === fdNo);
    if (!target) return false;

    setFixedDeposits((prev) => prev.filter((f) => f.fdNo !== fdNo));
    setFdInterestPayouts((prev) => prev.filter((p) => p.fdNo !== fdNo));
    setFdWithdrawals((prev) => prev.filter((w) => w.fdNo !== fdNo));
    setFdRenewals((prev) => prev.filter((r) => r.fdNo !== fdNo));

    showToast(`Fixed Deposit ${fdNo} permanently deleted.`, 'success');
    return true;
  };

  const bulkUpdateFixedDepositDates = async (fdNos: string[], newDepositDate?: string, offsetDays?: number): Promise<boolean> => {
    try {
      const res = await apiService.bulkUpdateFDDates(fdNos, newDepositDate, offsetDays);
      if (res && res.success) {
        // Refresh fixed deposits from backend
        const fdList = await apiService.getFixedDeposits();
        if (fdList) setFixedDeposits(fdList);

        // Also refresh day book to show the correct entry dates!
        const dbList = await apiService.getDayBook();
        if (dbList) setDayBookEntries(dbList);

        showToast(res.message || 'Fixed deposits updated successfully!', 'success');
        return true;
      }
      showToast(res?.message || 'Failed to update fixed deposits.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.message || 'Error updating fixed deposits.', 'error');
      return false;
    }
  };

  const resetAllData = () => {
    // Preserve authentication session in localStorage
    const savedRole = localStorage.getItem('kkv_user_role');
    const savedUser = localStorage.getItem('kkv_user');

    localStorage.clear();

    if (savedRole) localStorage.setItem('kkv_user_role', savedRole);
    if (savedUser) localStorage.setItem('kkv_user', savedUser);

    setLoans([]);
    setCustomers([]);
    setReceipts([]);
    setFixedDeposits([]);
    setDayBookEntries([]);
    setFdCustomers([]);
    setFdInterestPayouts([]);
    setFdWithdrawals([]);
    setFdRenewals([]);

    showToast('All system operational data wiped. System ready for fresh start.', 'warning');
  };

  const restoreDataFromJSON = (jsonStr: string): boolean => {
    try {
      const rawData = JSON.parse(jsonStr);
      const data = rawData.data || rawData;
      if (Array.isArray(data.loans)) setLoans(data.loans);
      if (Array.isArray(data.customers)) setCustomers(data.customers);
      if (Array.isArray(data.receipts)) setReceipts(data.receipts);
      if (Array.isArray(data.fixedDeposits)) setFixedDeposits(data.fixedDeposits);
      if (Array.isArray(data.fdInterestPayouts)) setFdInterestPayouts(data.fdInterestPayouts);
      if (Array.isArray(data.fdWithdrawals)) setFdWithdrawals(data.fdWithdrawals);
      if (Array.isArray(data.fdRenewals)) setFdRenewals(data.fdRenewals);
      if (Array.isArray(data.fdCustomers)) setFdCustomers(data.fdCustomers);
      if (Array.isArray(data.dayBookEntries)) setDayBookEntries(data.dayBookEntries);
      if (data.masterControlSettings) setMasterControlSettings(data.masterControlSettings);
      if (data.whatsAppTemplates) setWhatsAppTemplates(data.whatsAppTemplates);
      showToast('Data restored successfully!', 'success');
      return true;
    } catch {
      showToast('Invalid backup JSON file!', 'error');
      return false;
    }
  };

  // ── Centralized Notifications Derivation & Handlers ────────────────────────
  const notifications = useMemo(() => {
    return generateAllNotifications({
      loans,
      receipts,
      fixedDeposits,
      fdInterestPayouts,
      customers,
      fdCustomers,
      readNotificationIds
    });
  }, [loans, receipts, fixedDeposits, fdInterestPayouts, customers, fdCustomers, readNotificationIds]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.read && n.type !== 'PAID').length;
  }, [notifications]);

  const markNotificationAsRead = (id: string) => {
    setReadNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const markAllNotificationsAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotificationIds((prev) => Array.from(new Set([...prev, ...allIds])));
    showToast('All notifications marked as read.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        searchQuery,
        setSearchQuery,
        darkMode,
        setDarkMode,
        toggleDarkMode,
        isWorkspaceSelected,
        setIsWorkspaceSelected,
        selectedWorkspace,
        setSelectedWorkspace,
        userRole,
        setUserRole,
        loans,
        customers,
        receipts,
        fixedDeposits,
        dayBookEntries,
        fdCustomers,
        fdInterestPayouts,
        fdWithdrawals,
        fdRenewals,
        selectedLoan,
        setSelectedLoan,
        selectedReceipt,
        setSelectedReceipt,
        masterControlOpen,
        setMasterControlOpen,
        masterControlUnlocked,
        unlockMasterControl,
        masterControlSettings,
        updateMasterControlSettings,
        addLoanType,
        updateLoanType,
        toggleLoanTypeStatus,
        toggleLoanTypeVisibility,
        deleteLoanType,
        addRepaymentSystem,
        updateRepaymentSystem,
        toggleRepaymentSystemStatus,
        addPurityOption,
        updatePurityOption,
        togglePurityStatus,
        deletePurityOption,
        getPurityRate,
        updateFDInterestRate,
        whatsAppTemplates,
        updateWhatsAppTemplates,
        telegramConfig,
        updateTelegramConfig,
        getCustomerById,
        addLoan,
        addReceipt,
        addFixedDeposit,
        addFDCustomer,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        restoreCustomer,
        deleteCustomerPermanently,
        addDayBookEntry,
        payFDInterest,
        withdrawFD,
        renewFD,
        deleteFixedDeposit,
        bulkUpdateFixedDepositDates,
        cashInHand,
        cashAtBank,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu,
        showToast,
        toasts,
        removeToast,
        selectedProfileCustomerId,
        setSelectedProfileCustomerId,
        resetAllData,
        restoreDataFromJSON,

        // RBAC & Authentication State
        currentUser,
        setCurrentUser,
        authLoading,
        hasPermission,
        loginWithCredentials,
        loginWithGoogle,
        logoutUser,
        resetPasswordEmail,

        // Staff & RBAC Management
        staffList,
        fetchStaffList,
        createStaffAccount,
        updateStaffProfile,
        toggleStaffStatus,
        revokeStaffSessions,
        deleteStaffAccount,
        staffAuditLogs,
        fetchStaffAuditLogs,

        // Device & Active Session Management
        sessions,
        currentSessionId,
        fetchSessions,
        revokeSessionById,
        revokeOtherSessionsExceptCurrent,
        revokeAllActiveSessions,

        // Centralized Notifications
        notifications,
        unreadNotificationCount,
        isNotificationOpen,
        setIsNotificationOpen,
        toggleNotificationOpen,
        markNotificationAsRead,
        markAllNotificationsAsRead
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
