export interface OrnamentItem {
  id: string;
  item: string;
  qty: number;
  purity: '22ct' | '24ct' | '18ct' | '20ct' | '14ct' | 'Silver 925' | 'Silver 999';
  grossWeight: number;
  netWeight: number;
}

export interface NomineeDetails {
  hasNominee: boolean;
  name: string;
  relationship: string;
  age?: number;
  phone: string;
  idProofNumber?: string;
  address: string;
}

export interface GuarantorDetails {
  hasGuarantor: boolean;
  name: string;
  relationship?: string;
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
  houseNumber?: string;
  street?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface LocationDetails {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  capturedAt?: string | null;
  googleMapsUrl?: string;
  locationMethod?: 'gps' | 'google_maps_url' | 'manual';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
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
  currentLocation?: LocationDetails | null;
  permanentLocation?: LocationDetails | null;
  idProof: string;
  idNumber: string;
  activeLoansCount: number;
  totalBorrowed: number;
  status: 'VERIFIED' | 'PENDING';
  joinedDate: string;
  profilePhotoDriveId?: string;
  kycDocumentDriveIds?: string[];
  driveFolderId?: string;
  customerId?: string | number;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  phoneNormalized?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CalculationStrategy = 'MONTHLY_INTEREST_ONLY' | 'EMI' | 'BULLET';

export interface LoanTypeConfig {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RepaymentSystemConfig {
  id: string;
  name: string;
  description?: string;
  calculationStrategy: CalculationStrategy;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
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
  loanType: string;
  repaymentSystem: string;
  loanTypeId?: string;
  loanTypeName?: string;
  repaymentSystemId?: string;
  repaymentSystemName?: string;
  calculationStrategy?: CalculationStrategy;
  area?: string;
  showroom?: string;
  principal: number;
  interestRate: number;
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
  documentDriveIds?: string[];
  receiptDriveIds?: string[];
  driveFolderId?: string;
}

export interface Receipt {
  id: string;
  receiptNo: number;
  loanId: string;
  loanNo: string;
  customerId: string;
  customerName: string;
  kind: 'REPAYMENT' | 'NEW LOAN' | 'INTEREST PAYMENT' | 'PART PAYMENT' | 'LOAN CLOSURE';
  loanType: string;
  amount: number;
  principalComponent: number;
  interestComponent: number;
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
  driveFileId?: string;
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
  interestRatePA: number;
  receivingMethod: 'Cash' | 'Bank' | 'UPI';
  monthlyPayout: number;
  status: 'ACTIVE' | 'MATURED' | 'WITHDRAWN';
  parentCustomerName?: string;
}

export interface FDInterestPayout {
  id: string;
  fdNo: string;
  depositorName: string;
  amount: number;
  date: string;
  mode: 'Cash' | 'Bank' | 'UPI';
  status: 'PAID' | 'PENDING';
}

export interface FDWithdrawal {
  id: string;
  fdNo: string;
  depositorName: string;
  principalAmount: number;
  interestPaid: number;
  totalAmount: number;
  withdrawalDate: string;
  mode: 'Cash' | 'Bank' | 'UPI';
  notes?: string;
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
  profilePhotoDriveId?: string;
  kycDocumentDriveIds?: string[];
  driveFolderId?: string;
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

export interface FDRateHistoryItem {
  id: string;
  rate: number;
  previousRate?: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  changedBy: string;
  changedAt: string;
  notes?: string;
}

export interface MasterControlSettings {
  loanTypes?: LoanTypeConfig[];
  repaymentSystems?: RepaymentSystemConfig[];
  goldLoanMonthlyRate: number;
  silverLoanMonthlyRate: number;
  pronoteMonthlyRate: number;
  hirePurchaseMonthlyRate: number;
  defaultCardFee: number;
  overdueInterestRatePA: number;
  overduePenaltyPerDayPercent?: number;
  graceDays?: number;
  upiId: string;
  upiPayeeName: string;
  showOnLoanIssue?: boolean;
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
  amountBands?: AmountBand[];
  areas?: string[];
  partners?: string[];
  vehicleDocuments?: string[];
  vehicleCompanies?: string[];
  insuranceCompanies?: string[];
  showrooms?: string[];
  lockersEnabled?: boolean;
  adminPassword?: string;
  managerPassword?: string;
  operatorPassword?: string;
  animationsEnabled?: boolean;
  performanceModeEnabled?: boolean;
  bulkFdDateChangeEnabled?: boolean;
  fdInterestRate?: number;
  fdInterestRateEffectiveFrom?: string;
  fdInterestRateHistory?: FDRateHistoryItem[];
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

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  customerName?: string;
  loanNo?: string;
  phone?: string;
  amount?: number;
  type: 'PLEDGE_DUE' | 'RC_RENEWAL' | 'INSURANCE_EXPIRE' | 'CUSTOM';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
}

export type UserRole = 'MASTER_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR';

export interface UserPermissions {
  customers: boolean;
  loans: boolean;
  loanReceipts: boolean;
  pendingLoans: boolean;
  fixedDeposits: boolean;
  fdInterest: boolean;
  fdWithdrawal: boolean;
  notifications: boolean;
  adminPanel: boolean;
  masterControl: boolean;
  fdInterestRates: boolean;
  bulkFdDateChange: boolean;
  devices: boolean;
  staffManagement: boolean;
  settings: boolean;
  permanentDelete: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  createdByUid?: string;
  createdByEmail?: string;
  permissions: UserPermissions;
}

export interface StaffAuditLog {
  id: string;
  timestamp: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetUid?: string;
  targetEmail?: string;
  details?: string;
  result: 'SUCCESS' | 'FAILED';
}

export interface AdminUser {
  id: string;
  username: string;
  role: UserRole;
  email: string;
  lastLogin?: string;
}

export interface DeviceSession {
  sessionId: string;
  userId: string;
  userRole: UserRole;
  userEmail?: string;
  deviceType: 'DESKTOP' | 'LAPTOP' | 'MOBILE' | 'TABLET';
  deviceName: string;
  operatingSystem: string;
  osVersion?: string;
  browser: string;
  browserVersion?: string;
  ipAddress?: string;
  location?: string;
  screenResolution?: string;
  timezone?: string;
  createdAt: string;
  lastActiveAt: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'REVOKED';
  isCurrent?: boolean;
}
