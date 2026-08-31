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

export interface LoanTopUpRecord {
  id: string;
  date: string;
  topUpAmount: number;
  previousPrincipal: number;
  newPrincipal: number;
  previousMonthlyInterest: number;
  newMonthlyInterest: number;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  age?: number;
  occupation: string;
  email?: string;
  currentAddress: string;
  permanentAddress: string;
  idProof: string;
  idNumber: string;
  activeLoansCount: number;
  totalBorrowed: number;
  status: 'VERIFIED' | 'PENDING';
  joinedDate: string;
  profilePhotoDriveId?: string;
  kycDocumentDriveIds?: string[];
  driveFolderId?: string;
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
  topUps?: LoanTopUpRecord[];
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
  kind: 'REPAYMENT' | 'NEW LOAN' | 'INTEREST PAYMENT' | 'PART PAYMENT' | 'LOAN CLOSURE' | 'TOP-UP';
  loanType: 'GOLD LOAN' | 'SILVER LOAN' | 'PRONOTE' | 'HIRE PURCHASE';
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

export interface MasterControlSettings {
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

export interface AdminUser {
  id: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
  email: string;
  lastLogin?: string;
}
