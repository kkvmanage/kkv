export type NavPage =
  | 'dashboard'
  | 'customers'
  | 'customers-add'
  | 'add-customer-form'
  | 'search-customer'
  | 'customer-profile'
  | 'loan-issue'
  | 'loan-display'
  | 'loan-receipts'
  | 'receipt-display'
  | 'all-receipts'
  | 'pending-loans'
  | 'total-loans'
  | 'rc-renewal-reminders'
  | 'bill-balance'
  | 'fd-customers'
  | 'new-deposit'
  | 'deposit-display'
  | 'deposit-interest'
  | 'interest-display'
  | 'interest-pending'
  | 'deposit-withdrawal'
  | 'withdrawal-display'
  | 'fd-customers-deposits'
  | 'day-book'
  | 'trial-balance'
  | 'profit-loss'
  | 'balance-sheet'
  | 'accounts'
  | 'daily-reminders'
  | 'notifications'
  | 'backup-restore'
  | 'admin-panel'
  | 'settings';

export type PurityOption = '24ct' | '22ct' | '20ct' | '18ct' | '14ct' | 'Silver 925' | 'Silver 999';

export interface OrnamentItem {
  id: string;
  item: string;
  qty: number;
  purity: PurityOption;
  grossWeight: number;
  netWeight: number;
}

export interface NomineeDetails {
  hasNominee: boolean;
  enabled?: boolean;
  name: string;
  fullName?: string;
  relationship: string;
  relation?: string;
  customRelation?: string | null;
  phone: string;
  gender?: 'Male' | 'Female' | 'Other';
  ageMode?: 'DOB' | 'AGE';
  dateOfBirth?: string;
  age?: number;
  occupation?: string;
  email?: string;
  photo?: string | null;
  idProofType?: string;
  idProofNumber?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  otherIdName?: string;
  otherIdNumber?: string;
  idProof?: {
    type: string;
    aadhaarNumber?: string;
    panNumber?: string;
    otherIdName?: string;
    otherIdNumber?: string;
    idNumber?: string;
  };
  address: string;
  currentAddress?: string;
  permanentAddress?: string;
  isSameAddress?: boolean;
  location?: CustomerLocationData | LocationDetails | null;
}

export interface GuarantorDetails {
  hasGuarantor: boolean;
  name: string;
  relationship?: string;
  relation?: string;
  customRelation?: string | null;
  age?: number;
  phone: string;
  idProof: string;
  address: string;
}

export interface CustomerLocation {
  captured: boolean;
  coordinates: string;
  mapsUrl: string;
  addressSummary: string;
}

export interface StructuredAddress {
  houseNumber: string;
  street: string;
  locality: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
}

export interface LocationDetails {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  capturedAt: string | null;
  googleMapsUrl: string;
  locationMethod: 'gps' | 'google_maps_url' | 'manual';
}

export interface CustomerLocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  source?: 'gps' | 'google_maps_link' | 'google_maps_url' | 'manual';
  locationMethod?: 'gps' | 'google_maps_url' | 'manual';
  googleMapsUrl: string;
  capturedAt: string | null;
}

export interface Loan {
  id: string;
  receiptBillNo: number;
  loanNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerGender: 'Male' | 'Female' | 'Other';
  customerAge: number;
  customerOccupation: string;
  customerEmail?: string;
  customerPhotoUrl?: string;
  customerCurrentAddress: string;
  customerPermanentAddress: string;
  customerLocation?: CustomerLocation;
  nominee?: NomineeDetails;
  guarantor?: GuarantorDetails;
  kycDocuments?: string[];
  date: string;
  loanType: 'GOLD LOAN' | 'SILVER LOAN' | 'PRONOTE' | 'HIRE PURCHASE';
  repaymentSystem: 'Monthly interest only' | 'EMI' | 'Bullet Repayment';
  area: string;
  showroom: string;
  principal: number;
  interestRate: number; // monthly %
  bankMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Split';
  splitBankMode?: string;
  cashAmount: number;
  bankAmount: number;
  deductAdvanceInterest: boolean;
  advanceDays: number;
  advanceInterestAmount: number;
  advanceInterestReceivingMethod?: 'Cash' | 'Bank' | 'Cash + Bank';
  cardFee: number;
  cardFeePaymentMode: 'Cash' | 'Bank';
  cardFeeBankMode?: string;
  items: OrnamentItem[];
  totalGrossWeight: number;
  totalNetWeight: number;
  marketValue: number;
  ltv: number;
  monthlyInterest: number;
  notes: string;
  photos: string[];
  status: 'ACTIVE' | 'CLOSED' | 'PENDING' | 'OVERDUE';
  disbursedAmount: number;
  outstandingPrincipal: number;
  accruedInterest: number;
  renewalDate: string;
  lastInterestPaidDate?: string;
  nextDueDate?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  rcNumber?: string;
  rcExpiryDate?: string;
  insuranceExpiryDate?: string;
  roadTaxExpiryDate?: string;
  permitExpiryDate?: string;
  fcExpiryDate?: string;
}

export interface Receipt {
  id: string;
  receiptNo: number;
  loanId: string;
  loanNo: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  kind:
    | 'REPAYMENT'
    | 'NEW LOAN'
    | 'INTEREST PAYMENT'
    | 'PART PAYMENT'
    | 'LOAN CLOSURE'
    | 'EMI PAYMENT'
    | 'INTEREST + PRINCIPAL'
    | 'OTHER';
  loanType: 'GOLD LOAN' | 'SILVER LOAN' | 'PRONOTE' | 'HIRE PURCHASE';
  amount: number;
  principalComponent: number;
  interestComponent: number;
  penaltyComponent?: number;
  odCharges?: number;
  otherCharges?: number;
  discount?: number;
  tdsAmount?: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank';
  date: string;
  currentDueDate?: string;
  nextDueDate?: string;
  daysLate?: number;
  notes?: string;
  bankName?: string;
  transactionReference?: string;
  upiId?: string;
  outstandingBefore?: number;
  outstandingAfter?: number;
  processedBy?: string;
  createdAt?: string;
}

export interface DayBookEntry {
  id: string;
  time: string;
  billNo: string;
  particulars: string;
  accountHead: string;
  mode: 'Cash' | 'Bank' | 'UPI';
  cashIn: number;
  cashOut: number;
  bankIn: number;
  bankOut: number;
  cashBal: number;
  bankBal: number;
  tdsAmount?: number;
  customerName?: string;
  loanNo?: string;
  date: string;
}

export interface FDPaymentBreakdownItem {
  id: string;
  method: 'Cash' | 'Bank Transfer' | 'UPI';
  amount: number;
  bankName?: string;
  transactionReference?: string;
  upiId?: string;
  paymentDate: string;
  notes?: string;
}

export interface FDPaymentDetails {
  totalReceived: number;
  balanceToReceive: number;
  paymentStatus: 'FULLY_RECEIVED' | 'PARTIALLY_RECEIVED' | 'NOT_RECEIVED';
  payments: FDPaymentBreakdownItem[];
}

export interface FixedDeposit {
  id: string;
  fdNo: string;
  customerId: string;
  depositorName: string;
  phone: string;
  idProofType: string;
  idProofNumber: string;
  idNumber?: string;
  address: string;
  depositDate: string;
  maturityDate: string;
  principal: number;
  remainingPrincipal?: number;
  totalWithdrawnPrincipal?: number;
  tenureMonths?: number;
  interestRatePA: number;
  receivingMethod: 'Cash' | 'Bank' | 'UPI' | 'Bank Transfer' | 'Split' | string;
  paymentDetails?: FDPaymentDetails;
  payoutFrequency?: string;
  monthlyPayout: number;
  status: 'ACTIVE' | 'MATURED' | 'WITHDRAWN';
  parentCustomerName?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nominee?: NomineeDetails;
  remarks?: string;
  items?: OrnamentItem[];
  photos?: string[];
}

export interface FDInterestPayout {
  id: string;
  fdId?: string;
  fdNo: string;
  customerId?: string;
  depositorName: string;
  amount: number;
  dueDate?: string;
  date: string;
  periodKey?: string;
  payoutFrequency?: string;
  mode: 'Cash' | 'Bank' | 'UPI' | string;
  status: 'PAID' | 'PENDING';
}

export interface FDWithdrawal {
  id: string;
  withdrawalId?: string;        // Sequential "WD-001" display ID
  receiptNo?: string;           // Sequential "FDR-001" display ID
  receiptId?: string;           // Linked receipt ID
  withdrawalType?: 'PARTIAL' | 'FULL';
  fdId?: string;
  fdNo: string;
  customerId?: string;
  customerPhone?: string;
  depositorName: string;
  originalPrincipal?: number;
  balanceBefore?: number;
  principalAmount: number;
  remainingBalance?: number;
  interestPaid: number;
  totalAmount: number;
  withdrawalDate: string;
  mode: 'Cash' | 'Bank' | 'UPI';
  transactionReference?: string; // UTR / UPI ref
  bankName?: string;
  upiId?: string;
  notes?: string;
  status?: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  processedBy?: string;
  createdAt?: string;
  items?: OrnamentItem[];
  photos?: string[];
}

export interface FDRenewal {
  id: string;                   // Internal unique ID
  renewalId: string;            // Sequential "RN-001" display ID
  fdId?: string;
  fdNo: string;
  customerId: string;
  depositorName: string;
  previousMaturityDate: string;
  newMaturityDate: string;
  renewalPeriodMonths: number;
  renewalDate: string;
  interestRateAtRenewal: number;
  notes?: string;
  status: 'COMPLETED';
}

export interface FDCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  occupation?: string;
  notes?: string;
  idProofType: string;
  address?: string;
  documents?: string[];
  photoUrl?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  customerId?: number;
  name: string;
  phone: string;
  phoneNormalized?: string;
  gender: 'Male' | 'Female' | 'Other';
  age?: number;
  dateOfBirth?: string;
  occupation: string;
  email?: string;
  currentAddress: string;
  permanentAddress: string;
  currentAddressDetails?: StructuredAddress;
  permanentAddressDetails?: StructuredAddress;
  customerPhoto?: string | null;
  photoSource?: 'upload' | 'webcam' | null;
  currentLocation?: LocationDetails | CustomerLocationData | null;
  permanentLocation?: LocationDetails | CustomerLocationData | null;
  idProof: string;
  idNumber: string;
  aadhaarNumber?: string;
  panNumber?: string;
  extraPan?: string;
  otherIdName?: string;
  docName?: string;
  activeLoansCount: number;
  totalBorrowed: number;
  status: 'VERIFIED' | 'PENDING';
  joinedDate: string;
  location?: CustomerLocationData;
  profilePhotoDriveId?: string | null;
  kycDocumentDriveIds?: string[];
  nominee?: NomineeDetails | null;
  guarantor?: GuarantorDetails | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AmountBand {
  id: string;
  condition: 'Below' | 'Above';
  amount: number;
  baseRateMonthly: number;
  penaltyAfterMonths: number;
  penaltyStepUpMonthly: number;
  penaltyCalculation: 'From the start — stepped rate over the whole overc' | 'After threshold';
}

export interface MasterControlSettings {
  goldLoanMonthlyRate: number;
  silverLoanMonthlyRate: number;
  pronoteMonthlyRate: number;
  hirePurchaseMonthlyRate: number;
  defaultCardFee: number;
  overdueInterestRatePA: number;
  overduePenaltyPerDayPercent: number;
  graceDays: number;
  upiId: string;
  upiPayeeName: string;
  showOnLoanIssue: boolean;
  hireShowOnLoanIssue?: boolean;
  silverShowOnLoanIssue?: boolean;
  pronoteShowOnLoanIssue?: boolean;
  pronoteRate?: number;
  silverAmountBands?: AmountBand[];
  goldCardFeeEnabled?: boolean;
  goldCardFee?: number;
  silverCardFeeEnabled?: boolean;
  silverCardFee?: number;
  pronoteCardFeeEnabled?: boolean;
  pronoteCardFee?: number;
  hireCardFeeEnabled?: boolean;
  hireCardFee?: number;
  overdueCalculationMethod?: string;
  amountBands: AmountBand[];
  areas: string[];
  partners: string[];
  vehicleDocuments: string[];
  vehicleCompanies: string[];
  insuranceCompanies: string[];
  showrooms: string[];
  lockersEnabled: boolean;
  adminPassword?: string;
  managerPassword?: string;
  operatorPassword?: string;
  animationsEnabled?: boolean;
  performanceModeEnabled?: boolean;
  bulkFdDateChangeEnabled?: boolean;
}

export interface WhatsAppTemplates {
  welcomeMessage: string;
  dueReminderMessage: string;
  receiptMessage: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isSecured: boolean;
  autoBackupOnOpen: boolean;
  lastBackupDate?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  browser: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

// ── Notification Center Models ────────────────────────────────────────────────

export type NotificationCategory = 'LOAN' | 'FIXED_DEPOSIT';

export type NotificationEventType =
  | 'UPCOMING'
  | 'DUE'
  | 'OVERDUE'
  | 'PAID'
  | 'MATURITY'
  | 'RENEWAL';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AppNotification {
  id: string; // e.g. "loan_GL-001_due_2026-10", "fd_FD-001_interest_2026-10"
  category: NotificationCategory;
  type: NotificationEventType;
  priority: NotificationPriority;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  entityId: string; // Loan No (e.g. "GL-001") or FD No (e.g. "FD-001")
  entityDbId?: string;
  title: string;
  message: string;
  amount?: number;
  dueDate?: string; // DD-MM-YYYY
  periodKey?: string; // e.g. "2026-10"
  daysOverdue?: number;
  daysRemaining?: number;
  read: boolean;
  actionLabel: string;
  createdAt: string;
}



