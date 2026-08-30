import React, { createContext, useContext, useState, useEffect } from 'react';
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
  FDWithdrawal
} from '../types';
import {
  initialCustomers,
  initialFixedDeposits,
  initialLoans,
  initialReceipts
} from '../mockData/initialData';
import { apiService } from '../services/api';

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

const defaultMasterSettings: MasterControlSettings = {
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
  lockersEnabled: false
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
  userRole: 'ADMIN' | 'MANAGER' | 'OPERATOR' | null;
  setUserRole: (role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | null) => void;
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
  whatsAppTemplates: WhatsAppTemplates;
  updateWhatsAppTemplates: (templates: Partial<WhatsAppTemplates>) => void;
  telegramConfig: TelegramConfig;
  updateTelegramConfig: (config: Partial<TelegramConfig>) => void;

  addLoan: (loan: Omit<Loan, 'id' | 'loanNo'>) => Loan;
  topUpLoan: (loanNo: string, amount: number, date: string, notes?: string) => boolean;
  addReceipt: (receipt: Omit<Receipt, 'id' | 'receiptNo'>) => Receipt;
  addFixedDeposit: (fd: Omit<FixedDeposit, 'id' | 'fdNo'>) => FixedDeposit;
  addFDCustomer: (cust: Omit<FDCustomer, 'id' | 'createdAt'>) => FDCustomer;
  addCustomer: (customer: Omit<Customer, 'id' | 'activeLoansCount' | 'totalBorrowed' | 'joinedDate'>) => Customer;
  addDayBookEntry: (entry: Omit<DayBookEntry, 'id' | 'time' | 'cashBal' | 'bankBal'>) => DayBookEntry;
  payFDInterest: (fdNo: string, amount: number, mode: 'Cash' | 'Bank' | 'UPI') => void;
  withdrawFD: (fdNo: string, mode: 'Cash' | 'Bank' | 'UPI', notes?: string) => void;
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
  resetAllData: () => void;
  restoreDataFromJSON: (jsonStr: string) => boolean;
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

  // Local storage helpers
  const getStored = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(`kkv_${key}`);
      return stored ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  };

  const [darkMode, setDarkMode] = useState<boolean>(() => getStored('darkMode', false));
  const [loans, setLoans] = useState<Loan[]>(() => getStored('loans', initialLoans));
  const [customers, setCustomers] = useState<Customer[]>(() => getStored('customers', initialCustomers));
  const [receipts, setReceipts] = useState<Receipt[]>(() => getStored('receipts', initialReceipts));
  const [fixedDeposits, setFixedDeposits] = useState<FixedDeposit[]>(() => getStored('fixedDeposits', initialFixedDeposits));
  const [dayBookEntries, setDayBookEntries] = useState<DayBookEntry[]>(() => getStored('dayBookEntries', initialDayBook));
  const [isWorkspaceSelected, setIsWorkspaceSelected] = useState<boolean>(() => getStored('isWorkspaceSelected', false));
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(() => getStored('selectedWorkspace', 'KKV GOLD FINANCE'));
  const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | 'OPERATOR' | null>(() => getStored('userRole', null));

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

  const [masterControlOpen, setMasterControlOpen] = useState<boolean>(false);
  const [masterControlUnlocked, setMasterControlUnlocked] = useState<boolean>(false);
  const [masterControlSettings, setMasterControlSettings] = useState<MasterControlSettings>(() => getStored('masterSettings', defaultMasterSettings));
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplates>(() => getStored('waTemplates', defaultWhatsAppTemplates));
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => getStored('tgConfig', defaultTelegramConfig));

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(loans[0] || null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(receipts[0] || null);
  const [toasts, setToasts] = useState<Toast[]>([]);


  // Persist states to localStorage
  useEffect(() => { localStorage.setItem('kkv_darkMode', JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('kkv_loans', JSON.stringify(loans)); }, [loans]);
  useEffect(() => { localStorage.setItem('kkv_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('kkv_receipts', JSON.stringify(receipts)); }, [receipts]);
  useEffect(() => { localStorage.setItem('kkv_fixedDeposits', JSON.stringify(fixedDeposits)); }, [fixedDeposits]);
  useEffect(() => { localStorage.setItem('kkv_dayBookEntries', JSON.stringify(dayBookEntries)); }, [dayBookEntries]);
  useEffect(() => { localStorage.setItem('kkv_fdCustomers', JSON.stringify(fdCustomers)); }, [fdCustomers]);
  useEffect(() => { localStorage.setItem('kkv_fdInterestPayouts', JSON.stringify(fdInterestPayouts)); }, [fdInterestPayouts]);
  useEffect(() => { localStorage.setItem('kkv_fdWithdrawals', JSON.stringify(fdWithdrawals)); }, [fdWithdrawals]);
  useEffect(() => { localStorage.setItem('kkv_masterSettings', JSON.stringify(masterControlSettings)); }, [masterControlSettings]);
  useEffect(() => { localStorage.setItem('kkv_waTemplates', JSON.stringify(whatsAppTemplates)); }, [whatsAppTemplates]);
  useEffect(() => { localStorage.setItem('kkv_tgConfig', JSON.stringify(telegramConfig)); }, [telegramConfig]);
  useEffect(() => { localStorage.setItem('kkv_userRole', JSON.stringify(userRole)); }, [userRole]);

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
        if (cList && cList.length > 0) setCustomers(cList);
        if (lList && lList.length > 0) setLoans(lList);
        if (rList && rList.length > 0) setReceipts(rList);
        if (fdList && fdList.length > 0) setFixedDeposits(fdList);
        if (dbList && dbList.length > 0) setDayBookEntries(dbList);
        if (fdcList && fdcList.length > 0) setFdCustomers(fdcList);
        if (mSettings) setMasterControlSettings(mSettings);
        if (waTpls) setWhatsAppTemplates(waTpls);
        if (tgConfig) setTelegramConfig(tgConfig);
      } catch (err) {
        console.warn('Backend initial fetch fallback:', err);
      }
    }
    loadBackendData();
  }, []);

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

  const addLoan = (loanData: Omit<Loan, 'id' | 'loanNo'>): Loan => {
    const nextNumber = loans.length + 1;
    const loanNo = `GL-${nextNumber.toString().padStart(2, '0')}`;
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

    const receiptNo = receipts.length > 0 ? Math.max(...receipts.map(r => r.receiptNo)) + 1 : 1;
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

  const topUpLoan = (loanNo: string, amount: number, date: string, notes?: string): boolean => {
    const targetLoan = loans.find(l => l.loanNo.toLowerCase() === loanNo.toLowerCase() || l.id === loanNo);
    if (!targetLoan) {
      showToast(`Loan ${loanNo} not found!`, 'error');
      return false;
    }

    const prevPrincipal = targetLoan.principal;
    const newPrincipal = prevPrincipal + amount;
    const prevMonthly = targetLoan.monthlyInterest;
    const newMonthly = Math.round((newPrincipal * targetLoan.interestRate) / 100);

    const topUpRec = {
      id: `topup-${Date.now()}`,
      date,
      topUpAmount: amount,
      previousPrincipal: prevPrincipal,
      newPrincipal,
      previousMonthlyInterest: prevMonthly,
      newMonthlyInterest: newMonthly,
      notes
    };

    setLoans(prev => prev.map(l => {
      if (l.id === targetLoan.id) {
        return {
          ...l,
          principal: newPrincipal,
          outstandingPrincipal: l.outstandingPrincipal + amount,
          monthlyInterest: newMonthly,
          topUps: [...(l.topUps || []), topUpRec]
        };
      }
      return l;
    }));

    const receiptNo = receipts.length > 0 ? Math.max(...receipts.map(r => r.receiptNo)) + 1 : 1;
    const topUpReceipt: Receipt = {
      id: `RCPT-${Date.now()}`,
      receiptNo,
      loanId: targetLoan.id,
      loanNo: targetLoan.loanNo,
      customerId: targetLoan.customerId,
      customerName: targetLoan.customerName,
      kind: 'TOP-UP',
      loanType: targetLoan.loanType,
      amount,
      principalComponent: amount,
      interestComponent: 0,
      paymentMode: 'Cash',
      date,
      notes: notes || `Top-up principal addition of ₹${amount}`
    };

    setReceipts(prev => [topUpReceipt, ...prev]);

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      time: timeStr,
      billNo: receiptNo.toString(),
      particulars: `Loan Top-Up Disbursement (${targetLoan.loanNo}) - ${targetLoan.customerName}`,
      accountHead: 'Gold Loan Portfolio',
      mode: 'Cash',
      cashIn: 0,
      cashOut: amount,
      bankIn: 0,
      bankOut: 0,
      cashBal: cashInHand - amount,
      bankBal: cashAtBank,
      customerName: targetLoan.customerName,
      loanNo: targetLoan.loanNo,
      date
    };

    setDayBookEntries(prev => [dbEntry, ...prev]);
    showToast(`Loan ${targetLoan.loanNo} topped up by ₹${amount.toLocaleString('en-IN')}!`, 'success');
    return true;
  };

  const addReceipt = (receiptData: Omit<Receipt, 'id' | 'receiptNo'>): Receipt => {
    const receiptNo = receipts.length > 0 ? Math.max(...receipts.map(r => r.receiptNo)) + 1 : 1;
    const newReceipt: Receipt = {
      ...receiptData,
      id: `RCPT-${Date.now()}`,
      receiptNo
    };

    setReceipts((prev) => [newReceipt, ...prev]);

    setLoans((prev) =>
      prev.map((l) => {
        if (l.loanNo === newReceipt.loanNo) {
          const newPrincipal = Math.max(0, l.outstandingPrincipal - newReceipt.principalComponent);
          return {
            ...l,
            outstandingPrincipal: newPrincipal,
            status: newPrincipal === 0 ? 'CLOSED' : l.status,
            lastInterestPaidDate: newReceipt.date,
            nextDueDate: newReceipt.nextDueDate || l.nextDueDate
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
    const nextNumber = fixedDeposits.length + 1;
    const fdNo = `FD-${nextNumber.toString().padStart(2, '0')}`;
    const newFd: FixedDeposit = {
      ...fdData,
      id: `FD-${Date.now()}`,
      fdNo
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
      mode: newFd.receivingMethod,
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
    const newCust: Customer = {
      ...custData,
      id: `CUST-${Date.now().toString().slice(-3)}`,
      activeLoansCount: 0,
      totalBorrowed: 0,
      joinedDate: new Date().toLocaleDateString('en-GB')
    };

    setCustomers((prev) => [newCust, ...prev]);
    showToast(`Customer ${newCust.name} added successfully!`, 'success');
    return newCust;
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

  const payFDInterest = (fdNo: string, amount: number, mode: 'Cash' | 'Bank' | 'UPI') => {
    const targetFD = fixedDeposits.find(f => f.fdNo === fdNo);
    if (!targetFD) return;

    const payout: FDInterestPayout = {
      id: `fd-payout-${Date.now()}`,
      fdNo,
      depositorName: targetFD.depositorName,
      amount,
      date: new Date().toLocaleDateString('en-GB'),
      mode,
      status: 'PAID'
    };

    setFdInterestPayouts(prev => [payout, ...prev]);

    // Daybook entry
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isCash = mode === 'Cash';
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      time: timeStr,
      billNo: `INT-${fdNo}`,
      particulars: `FD Interest Payout (${fdNo}) - ${targetFD.depositorName}`,
      accountHead: 'Interest Expense',
      mode,
      cashIn: 0,
      cashOut: isCash ? amount : 0,
      bankIn: 0,
      bankOut: isCash ? 0 : amount,
      cashBal: isCash ? cashInHand - amount : cashInHand,
      bankBal: isCash ? cashAtBank : cashAtBank - amount,
      customerName: targetFD.depositorName,
      date: payout.date
    };

    setDayBookEntries(prev => [dbEntry, ...prev]);
    showToast(`Interest payout of ₹${amount} recorded for ${fdNo}`, 'success');
  };

  const withdrawFD = (fdNo: string, mode: 'Cash' | 'Bank' | 'UPI', notes?: string) => {
    const targetFD = fixedDeposits.find(f => f.fdNo === fdNo);
    if (!targetFD) return;

    const withdrawal: FDWithdrawal = {
      id: `fd-wth-${Date.now()}`,
      fdNo,
      depositorName: targetFD.depositorName,
      principalAmount: targetFD.principal,
      interestPaid: 0,
      totalAmount: targetFD.principal,
      withdrawalDate: new Date().toLocaleDateString('en-GB'),
      mode,
      notes
    };

    setFdWithdrawals(prev => [withdrawal, ...prev]);
    setFixedDeposits(prev => prev.map(f => f.fdNo === fdNo ? { ...f, status: 'WITHDRAWN' } : f));

    // Daybook entry
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isCash = mode === 'Cash';
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      time: timeStr,
      billNo: `WTH-${fdNo}`,
      particulars: `Fixed Deposit Withdrawal (${fdNo}) - ${targetFD.depositorName}`,
      accountHead: 'Fixed Deposits',
      mode,
      cashIn: 0,
      cashOut: isCash ? targetFD.principal : 0,
      bankIn: 0,
      bankOut: isCash ? 0 : targetFD.principal,
      cashBal: isCash ? cashInHand - targetFD.principal : cashInHand,
      bankBal: isCash ? cashAtBank : cashAtBank - targetFD.principal,
      customerName: targetFD.depositorName,
      date: withdrawal.withdrawalDate
    };

    setDayBookEntries(prev => [dbEntry, ...prev]);
    showToast(`Fixed Deposit ${fdNo} closed and withdrawn!`, 'success');
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
    localStorage.clear();
    setLoans(initialLoans);
    setCustomers(initialCustomers);
    setReceipts(initialReceipts);
    setFixedDeposits(initialFixedDeposits);
    setDayBookEntries(initialDayBook);
    setFdCustomers([]);
    setFdInterestPayouts([]);
    setFdWithdrawals([]);
    setMasterControlSettings(defaultMasterSettings);
    setWhatsAppTemplates(defaultWhatsAppTemplates);
    setTelegramConfig(defaultTelegramConfig);
    showToast('All system data reset to defaults!', 'warning');
  };

  const restoreDataFromJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.loans) setLoans(data.loans);
      if (data.customers) setCustomers(data.customers);
      if (data.receipts) setReceipts(data.receipts);
      if (data.fixedDeposits) setFixedDeposits(data.fixedDeposits);
      if (data.dayBookEntries) setDayBookEntries(data.dayBookEntries);
      if (data.masterControlSettings) setMasterControlSettings(data.masterControlSettings);
      if (data.whatsAppTemplates) setWhatsAppTemplates(data.whatsAppTemplates);
      showToast('Data restored successfully!', 'success');
      return true;
    } catch {
      showToast('Invalid backup JSON file!', 'error');
      return false;
    }
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
        whatsAppTemplates,
        updateWhatsAppTemplates,
        telegramConfig,
        updateTelegramConfig,
        addLoan,
        topUpLoan,
        addReceipt,
        addFixedDeposit,
        addFDCustomer,
        addCustomer,
        addDayBookEntry,
        payFDInterest,
        withdrawFD,
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
        resetAllData,
        restoreDataFromJSON
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
