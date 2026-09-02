import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Users, CreditCard, DollarSign, CheckCircle2, PiggyBank, Wallet, Building2, Bell, Database, X, Save, Lock, Plus, Trash2, Search, CloudDownload, Eye, Edit3, RotateCcw, AlertTriangle } from 'lucide-react';
import { AmountBand, Customer } from '../types';

import { KKVLogo } from '../components/common/KKVLogo';
import { WipeAllDataModal } from '../components/admin/WipeAllDataModal';
import { SystemRestoreModal } from '../components/admin/SystemRestoreModal';
import { ViewCustomerModal } from '../components/common/ViewCustomerModal';
import { EditCustomerModal } from '../components/common/EditCustomerModal';
import { formatIdProofDisplay } from '../utils/kycValidation';

export const AdminPanel: React.FC = () => {
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showHiddenRestoreSection, setShowHiddenRestoreSection] = useState(false);
  const [dangerClickCount, setDangerClickCount] = useState(0);
  const [dangerClickTimer, setDangerClickTimer] = useState<any>(null);
  const {
    userRole,
    loans,
    customers,
    receipts,
    fixedDeposits,
    dayBookEntries,
    cashInHand,
    cashAtBank,
    masterControlOpen,
    setMasterControlOpen,
    masterControlUnlocked,
    unlockMasterControl,
    masterControlSettings,
    updateMasterControlSettings,
    whatsAppTemplates,
    updateWhatsAppTemplates,
    resetAllData,
    bulkUpdateFixedDepositDates,
    deleteCustomer,
    restoreCustomer,
    deleteCustomerPermanently,
    updateCustomer,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'fd-rates' | 'bulk-fd' | 'data-backup' | 'devices'>('overview');
  const [custSubTab, setCustSubTab] = useState<'active' | 'deleted'>('active');
  const [adminCustSearch, setAdminCustSearch] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Customer | null>(null);
  const [permanentDeleteInput, setPermanentDeleteInput] = useState('');
  const [isDeletingPermanently, setIsDeletingPermanently] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [masterSubTab, setMasterSubTab] = useState<'rates' | 'operations' | 'messaging' | 'security' | 'danger'>('rates');
  const [ratesSubChip, setRatesSubChip] = useState<'gold' | 'silver' | 'pronote' | 'hire' | 'card' | 'overdue' | 'upi'>('gold');

  // Rates & Payments Form State with safe fallbacks
  const [goldShowOnIssue, setGoldShowOnIssue] = useState<boolean>(masterControlSettings?.showOnLoanIssue ?? true);
  const [hireShowOnIssue, setHireShowOnIssue] = useState<boolean>(masterControlSettings?.hireShowOnLoanIssue ?? true);
  const [silverShowOnIssue, setSilverShowOnIssue] = useState<boolean>(masterControlSettings?.silverShowOnLoanIssue ?? true);
  const [pronoteShowOnIssue, setPronoteShowOnIssue] = useState<boolean>(masterControlSettings?.pronoteShowOnLoanIssue ?? true);
  const [amountBands, setAmountBands] = useState<AmountBand[]>(masterControlSettings?.amountBands || []);
  const [silverAmountBands, setSilverAmountBands] = useState<AmountBand[]>(masterControlSettings?.silverAmountBands || []);

  // Additional rates states
  const [silverRate, setSilverRate] = useState<number>(masterControlSettings?.silverLoanMonthlyRate ?? 2.0);
  const [pronoteRate, setPronoteRate] = useState<number>(masterControlSettings?.pronoteRate ?? 12);
  const [hireRate, setHireRate] = useState<number>(masterControlSettings?.hirePurchaseMonthlyRate ?? 12);
  const [cardFee, setCardFee] = useState<number>(masterControlSettings?.defaultCardFee ?? 10);
  const [overdueRate, setOverdueRate] = useState<number>(masterControlSettings?.overdueInterestRatePA ?? 24);
  const [overduePenalty, setOverduePenalty] = useState<number>(masterControlSettings?.overduePenaltyPerDayPercent ?? 3.6);
  const [graceDaysVal, setGraceDaysVal] = useState<number>(masterControlSettings?.graceDays ?? 3);
  const [upiIdVal, setUpiIdVal] = useState<string>(masterControlSettings?.upiId || '');
  const [upiPayeeVal, setUpiPayeeVal] = useState<string>(masterControlSettings?.upiPayeeName || '');

  // Card Fee configs per loan type
  const [goldCardFeeEnabled, setGoldCardFeeEnabled] = useState<boolean>(masterControlSettings?.goldCardFeeEnabled ?? true);
  const [goldCardFeeVal, setGoldCardFeeVal] = useState<number>(masterControlSettings?.goldCardFee ?? 10);
  const [silverCardFeeEnabled, setSilverCardFeeEnabled] = useState<boolean>(masterControlSettings?.silverCardFeeEnabled ?? true);
  const [silverCardFeeVal, setSilverCardFeeVal] = useState<number>(masterControlSettings?.silverCardFee ?? 10);
  const [pronoteCardFeeEnabled, setPronoteCardFeeEnabled] = useState<boolean>(masterControlSettings?.pronoteCardFeeEnabled ?? true);
  const [pronoteCardFeeVal, setPronoteCardFeeVal] = useState<number>(masterControlSettings?.pronoteCardFee ?? 10);
  const [hireCardFeeEnabled, setHireCardFeeEnabled] = useState<boolean>(masterControlSettings?.hireCardFeeEnabled ?? true);
  const [hireCardFeeVal, setHireCardFeeVal] = useState<number>(masterControlSettings?.hireCardFee ?? 10);

  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteTarget || permanentDeleteInput !== 'DELETE') return;
    setIsDeletingPermanently(true);
    try {
      const success = await deleteCustomerPermanently(permanentDeleteTarget.id);
      if (success) {
        setPermanentDeleteTarget(null);
        setPermanentDeleteInput('');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting customer permanently.', 'error');
    } finally {
      setIsDeletingPermanently(false);
    }
  };

  const handleDangerZoneTabClick = () => {
    setMasterSubTab('danger');

    const nextCount = dangerClickCount + 1;
    setDangerClickCount(nextCount);

    if (dangerClickTimer) clearTimeout(dangerClickTimer);

    if (nextCount >= 5) {
      setShowHiddenRestoreSection(true);
      setDangerClickCount(0);
      showToast('System Restore interface unlocked.', 'info');
    } else {
      const timer = setTimeout(() => {
        setDangerClickCount(0);
      }, 5000);
      setDangerClickTimer(timer);
    }
  };

  // Overdue calculation method description selection
  const [overdueCalMethod, setOverdueCalMethod] = useState<string>(masterControlSettings?.overdueCalculationMethod || 'Whole months — a part month counts as full (recommended)');

  // Messaging Form State with safe fallbacks
  const [welcomeTpl, setWelcomeTpl] = useState<string>(whatsAppTemplates?.welcomeMessage || '');
  const [dueTpl, setDueTpl] = useState<string>(whatsAppTemplates?.dueReminderMessage || '');
  const [receiptTpl, setReceiptTpl] = useState<string>(whatsAppTemplates?.receiptMessage || '');

  // Security Form State
  const [adminPass, setAdminPass] = useState<string>(masterControlSettings?.adminPassword || 'admin123');
  const [managerPass, setManagerPass] = useState<string>(masterControlSettings?.managerPassword || 'manager123');
  const [operatorPass, setOperatorPass] = useState<string>(masterControlSettings?.operatorPassword || 'operator123');

  // Operations Feature Toggles
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(masterControlSettings?.animationsEnabled ?? true);
  const [performanceModeEnabled, setPerformanceModeEnabled] = useState<boolean>(masterControlSettings?.performanceModeEnabled ?? false);
  const [bulkFdDateChangeEnabled, setBulkFdDateChangeEnabled] = useState<boolean>(masterControlSettings?.bulkFdDateChangeEnabled ?? true);
  const [lockersEnabled, setLockersEnabled] = useState<boolean>(masterControlSettings?.lockersEnabled ?? false);

  // Operations lists states
  const [areasVal, setAreasVal] = useState<string[]>(masterControlSettings?.areas || []);
  const [partnersVal, setPartnersVal] = useState<string[]>(masterControlSettings?.partners || []);
  const [vehicleDocsVal, setVehicleDocsVal] = useState<string[]>(masterControlSettings?.vehicleDocuments || []);
  const [vehicleCompaniesVal, setVehicleCompaniesVal] = useState<string[]>(masterControlSettings?.vehicleCompanies || []);
  const [insuranceCompaniesVal, setInsuranceCompaniesVal] = useState<string[]>(masterControlSettings?.insuranceCompanies || []);
  const [showroomsVal, setShowroomsVal] = useState<string[]>(masterControlSettings?.showrooms || []);

  // Sub-tabs navigation states inside master control
  const [operationsSubTab, setOperationsSubTab] = useState<'areas-showrooms' | 'toggles' | 'backup-restore'>('areas-showrooms');
  const [securitySubTab, setSecuritySubTab] = useState<'account' | 'change-pass' | 'roles'>('roles');

  // Stored password change states
  const [currentMasterPass, setCurrentMasterPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');

  // Operations inputs state
  const [newAreaInput, setNewAreaInput] = useState('');
  const [newPartnerInput, setNewPartnerInput] = useState('');
  const [newDocInput, setNewDocInput] = useState('');
  const [newCompanyInput, setNewCompanyInput] = useState('');
  const [newInsCompanyInput, setNewInsCompanyInput] = useState('');
  const [newShowroomInput, setNewShowroomInput] = useState('');

  // Bulk FD Date Change states
  const [selectedFdNos, setSelectedFdNos] = useState<string[]>([]);
  const [dateMode, setDateMode] = useState<'shift' | 'set'>('shift');
  const [offsetDaysValue, setOffsetDaysValue] = useState<number>(0);
  const [newDepDateVal, setNewDepDateVal] = useState<string>('');
  const [fdSearchText, setFdSearchText] = useState('');

  useEffect(() => {
    if (masterControlSettings) {
      setGoldShowOnIssue(masterControlSettings.showOnLoanIssue ?? true);
      setHireShowOnIssue(masterControlSettings.hireShowOnLoanIssue ?? true);
      setSilverShowOnIssue(masterControlSettings.silverShowOnLoanIssue ?? true);
      setPronoteShowOnIssue(masterControlSettings.pronoteShowOnLoanIssue ?? true);
      setAmountBands(masterControlSettings.amountBands || []);
      setSilverAmountBands(masterControlSettings.silverAmountBands || []);
      setAdminPass(masterControlSettings.adminPassword || 'admin123');
      setManagerPass(masterControlSettings.managerPassword || 'manager123');
      setOperatorPass(masterControlSettings.operatorPassword || 'operator123');
      setAnimationsEnabled(masterControlSettings.animationsEnabled ?? true);
      setPerformanceModeEnabled(masterControlSettings.performanceModeEnabled ?? false);
      setBulkFdDateChangeEnabled(masterControlSettings.bulkFdDateChangeEnabled ?? true);
      setLockersEnabled(masterControlSettings.lockersEnabled ?? false);

      setSilverRate(masterControlSettings.silverLoanMonthlyRate ?? 2.0);
      setPronoteRate(masterControlSettings.pronoteRate ?? 12);
      setHireRate(masterControlSettings.hirePurchaseMonthlyRate ?? 12);
      setCardFee(masterControlSettings.defaultCardFee ?? 10);
      setOverdueRate(masterControlSettings.overdueInterestRatePA ?? 24);
      setOverduePenalty(masterControlSettings.overduePenaltyPerDayPercent ?? 3.6);
      setGraceDaysVal(masterControlSettings.graceDays ?? 3);
      setUpiIdVal(masterControlSettings.upiId || '');
      setUpiPayeeVal(masterControlSettings.upiPayeeName || '');

      setGoldCardFeeEnabled(masterControlSettings.goldCardFeeEnabled ?? true);
      setGoldCardFeeVal(masterControlSettings.goldCardFee ?? 10);
      setSilverCardFeeEnabled(masterControlSettings.silverCardFeeEnabled ?? true);
      setSilverCardFeeVal(masterControlSettings.silverCardFee ?? 10);
      setPronoteCardFeeEnabled(masterControlSettings.pronoteCardFeeEnabled ?? true);
      setPronoteCardFeeVal(masterControlSettings.pronoteCardFee ?? 10);
      setHireCardFeeEnabled(masterControlSettings.hireCardFeeEnabled ?? true);
      setHireCardFeeVal(masterControlSettings.hireCardFee ?? 10);

      setOverdueCalMethod(masterControlSettings.overdueCalculationMethod || 'Whole months — a part month counts as full (recommended)');

      setAreasVal(masterControlSettings.areas || []);
      setPartnersVal(masterControlSettings.partners || []);
      setVehicleDocsVal(masterControlSettings.vehicleDocuments || []);
      setVehicleCompaniesVal(masterControlSettings.vehicleCompanies || []);
      setInsuranceCompaniesVal(masterControlSettings.insuranceCompanies || []);
      setShowroomsVal(masterControlSettings.showrooms || []);
    }
  }, [masterControlSettings]);

  useEffect(() => {
    if (whatsAppTemplates) {
      setWelcomeTpl(whatsAppTemplates.welcomeMessage || '');
      setDueTpl(whatsAppTemplates.dueReminderMessage || '');
      setReceiptTpl(whatsAppTemplates.receiptMessage || '');
    }
  }, [whatsAppTemplates]);

  // Redirect away from bulk-fd tab if disabled
  useEffect(() => {
    if (masterControlSettings && !masterControlSettings.bulkFdDateChangeEnabled && activeTab === 'bulk-fd') {
      setActiveTab('overview');
    }
  }, [masterControlSettings, activeTab]);

  // Defensive Aggregates with safe array checks
  const safeLoans = loans || [];
  const safeCustomers = customers || [];
  const safeReceipts = receipts || [];
  const safeFixedDeposits = fixedDeposits || [];
  const safeDayBookEntries = dayBookEntries || [];

  const activeLoans = safeLoans.filter((l) => l?.status === 'ACTIVE');
  const totalDisbursed = safeLoans.reduce((sum, l) => sum + (l?.principal || 0), 0);
  const totalOutstanding = safeLoans.reduce((sum, l) => sum + (l?.outstandingPrincipal || 0), 0);
  const totalCollected = safeReceipts.filter((r) => r?.kind !== 'NEW LOAN').reduce((sum, r) => sum + (r?.amount || 0), 0);
  const activeFDs = safeFixedDeposits.filter((f) => f?.status === 'ACTIVE');
  const totalRecords = safeLoans.length + safeCustomers.length + safeReceipts.length + safeFixedDeposits.length + safeDayBookEntries.length;

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    unlockMasterControl(passwordInput);
    setPasswordInput('');
  };

  const handleSaveMasterChanges = () => {
    updateMasterControlSettings({
      showOnLoanIssue: goldShowOnIssue,
      hireShowOnLoanIssue: hireShowOnIssue,
      silverShowOnLoanIssue: silverShowOnIssue,
      pronoteShowOnLoanIssue: pronoteShowOnIssue,
      pronoteRate,
      amountBands: amountBands || [],
      silverAmountBands: silverAmountBands || [],
      goldCardFeeEnabled,
      goldCardFee: goldCardFeeVal,
      silverCardFeeEnabled,
      silverCardFee: silverCardFeeVal,
      pronoteCardFeeEnabled,
      pronoteCardFee: pronoteCardFeeVal,
      hireCardFeeEnabled,
      hireCardFee: hireCardFeeVal,
      overdueCalculationMethod: overdueCalMethod,
      adminPassword: adminPass,
      managerPassword: managerPass,
      operatorPassword: operatorPass,
      animationsEnabled,
      performanceModeEnabled,
      bulkFdDateChangeEnabled,
      lockersEnabled,
      silverLoanMonthlyRate: silverRate,
      pronoteMonthlyRate: pronoteRate, // keep in sync
      hirePurchaseMonthlyRate: hireRate,
      defaultCardFee: cardFee,
      overdueInterestRatePA: overdueRate,
      overduePenaltyPerDayPercent: overduePenalty,
      graceDays: graceDaysVal,
      upiId: upiIdVal,
      upiPayeeName: upiPayeeVal,
      areas: areasVal,
      partners: partnersVal,
      vehicleDocuments: vehicleDocsVal,
      vehicleCompanies: vehicleCompaniesVal,
      insuranceCompanies: insuranceCompaniesVal,
      showrooms: showroomsVal
    });
    updateWhatsAppTemplates({
      welcomeMessage: welcomeTpl,
      dueReminderMessage: dueTpl,
      receiptMessage: receiptTpl
    });
    setMasterControlOpen(false);
  };

  const handleAddArea = () => {
    if (newAreaInput.trim()) {
      setAreasVal(prev => [...prev, newAreaInput.trim()]);
      setNewAreaInput('');
    }
  };
  const handleRemoveArea = (index: number) => {
    setAreasVal(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPartner = () => {
    if (newPartnerInput.trim()) {
      setPartnersVal(prev => [...prev, newPartnerInput.trim()]);
      setNewPartnerInput('');
    }
  };
  const handleRemovePartner = (index: number) => {
    setPartnersVal(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddDoc = () => {
    if (newDocInput.trim()) {
      setVehicleDocsVal(prev => [...prev, newDocInput.trim()]);
      setNewDocInput('');
    }
  };
  const handleRemoveDoc = (index: number) => {
    setVehicleDocsVal(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCompany = () => {
    if (newCompanyInput.trim()) {
      setVehicleCompaniesVal(prev => [...prev, newCompanyInput.trim()]);
      setNewCompanyInput('');
    }
  };
  const handleRemoveCompany = (index: number) => {
    setVehicleCompaniesVal(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddInsCompany = () => {
    if (newInsCompanyInput.trim()) {
      setInsuranceCompaniesVal(prev => [...prev, newInsCompanyInput.trim()]);
      setNewInsCompanyInput('');
    }
  };
  const handleRemoveInsCompany = (index: number) => {
    setInsuranceCompaniesVal(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddShowroom = () => {
    if (newShowroomInput.trim()) {
      setShowroomsVal(prev => [...prev, newShowroomInput.trim()]);
      setNewShowroomInput('');
    }
  };
  const handleRemoveShowroom = (index: number) => {
    setShowroomsVal(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddAmountBand = () => {
    const newBand: AmountBand = {
      id: `band-${Date.now()}`,
      condition: 'Above',
      amount: 10000,
      baseRateMonthly: 1.5,
      penaltyAfterMonths: 3,
      penaltyStepUpMonthly: 0.1,
      penaltyCalculation: 'From the start — stepped rate over the whole overc'
    };
    setAmountBands([...(amountBands || []), newBand]);
  };

  const handleAddSilverAmountBand = () => {
    const newBand: AmountBand = {
      id: `silver-band-${Date.now()}`,
      condition: 'Above',
      amount: 10000,
      baseRateMonthly: 2.0,
      penaltyAfterMonths: 6,
      penaltyStepUpMonthly: 0.1,
      penaltyCalculation: 'From the start — stepped rate over the whole overc'
    };
    setSilverAmountBands([...(silverAmountBands || []), newBand]);
  };

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hero Banner */}
      <div className="admin-hero-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <KKVLogo size={52} />
          <div>
            <div className="admin-session-badge" style={{ marginBottom: '6px' }}>⚡ Admin Control Center</div>
            <h1 style={{ fontSize: '22px', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>KKV GOLD FINANCE</h1>
            <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-secondary)' }}>Manage companies, access, data &amp; danger-zone actions</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', background: 'var(--color-gold-subtle)', color: 'var(--color-gold-light)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontWeight: 700, border: '1px solid rgba(201, 162, 39, 0.25)' }}>🟢 ADMIN SESSION ACTIVE</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '10px', paddingBottom: '4px', flexWrap: 'wrap' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'customers', label: 'Customer Management' },
          { key: 'fd-rates', label: 'FD Interest Rates' },
          masterControlSettings?.bulkFdDateChangeEnabled && { key: 'bulk-fd', label: 'Bulk FD Date Change' },
          { key: 'data-backup', label: 'Data & Backup' },
          { key: 'devices', label: 'Devices' }
        ].filter((x): x is { key: string; label: string } => !!x).map((t) => (
          <button
            key={t.key}
            type="button"
            style={{
              borderRadius: '10px',
              fontSize: '13.5px',
              padding: '8px 18px',
              fontWeight: activeTab === t.key ? 700 : 600,
              backgroundColor: activeTab === t.key ? '#176B52' : '#FFFFFF',
              color: activeTab === t.key ? '#FFFFFF' : '#4B5E54',
              border: activeTab === t.key ? '1px solid #176B52' : '1px solid #D8E0DA',
              boxShadow: activeTab === t.key ? '0 4px 12px rgba(23, 107, 82, 0.28)' : '0 2px 4px rgba(15, 60, 45, 0.04)',
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
            onClick={() => setActiveTab(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #DDE5DF', boxShadow: '0 6px 20px rgba(15, 60, 45, 0.08)', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(23, 107, 82, 0.12)', color: '#176B52', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1F2D26', margin: 0 }}>Master Control</h3>
                <p style={{ fontSize: '13px', color: '#66756D', margin: '3px 0 0' }}>Company roles &amp; passwords, bank &amp; UPI details, Telegram backup and danger-zone tools.</p>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setMasterControlOpen(true)} style={{ backgroundColor: '#176B52', color: '#FFFFFF', fontWeight: 700, borderRadius: '10px', height: '42px', padding: '0 20px', boxShadow: '0 2px 8px rgba(23, 107, 82, 0.25)', gap: '8px' }}>
              <span>Open Master Control</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">CUSTOMERS</span>
                <span className="stat-card-value">{safeCustomers.length}</span>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: 'rgba(23, 107, 82, 0.12)', color: '#176B52' }}><Users size={20} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">ACTIVE LOANS</span>
                <span className="stat-card-value">{activeLoans.length}</span>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: 'rgba(13, 148, 136, 0.12)', color: '#0D9488' }}><CreditCard size={20} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">TOTAL DISBURSED</span>
                <span className="stat-card-value">₹{totalDisbursed.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: 'rgba(201, 162, 39, 0.15)', color: '#B48909' }}><DollarSign size={20} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">OUTSTANDING</span>
                <span className="stat-card-value">₹{totalOutstanding.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: 'rgba(23, 107, 82, 0.12)', color: '#176B52' }}><Wallet size={20} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">COLLECTED</span>
                <span className="stat-card-value">₹{totalCollected.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.14)', color: '#059669' }}><CheckCircle2 size={20} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">ACTIVE FDS</span>
                <span className="stat-card-value">{activeFDs.length}</span>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: 'rgba(201, 162, 39, 0.15)', color: '#B48909' }}><PiggyBank size={20} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">CASH IN HAND</span>
                <span className="stat-card-value">₹{(cashInHand || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: 'rgba(23, 107, 82, 0.12)', color: '#176B52' }}><Wallet size={20} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">CASH AT BANK</span>
                <span className="stat-card-value">₹{(cashAtBank || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: 'rgba(13, 148, 136, 0.12)', color: '#0D9488' }}><Building2 size={20} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">REMINDERS DUE</span>
                <span className="stat-card-value">0</span>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#D97706' }}><Bell size={20} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">RECORDS</span>
                <span className="stat-card-value">{totalRecords}</span>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: 'rgba(23, 107, 82, 0.12)', color: '#176B52' }}><Database size={20} /></div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Management Tab Content */}
      {activeTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Bar: Subtabs & Search */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${custSubTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '13px', padding: '6px 16px' }}
                  onClick={() => setCustSubTab('active')}
                >
                  Active Customers ({customers.filter(c => !c.isDeleted).length})
                </button>
                <button
                  type="button"
                  className={`btn ${custSubTab === 'deleted' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '13px', padding: '6px 16px' }}
                  onClick={() => setCustSubTab('deleted')}
                >
                  Deleted Customers ({customers.filter(c => c.isDeleted).length})
                </button>
              </div>

              <div style={{ position: 'relative', width: '320px' }}>
                <input
                  type="text"
                  className="input-control"
                  style={{ paddingLeft: '38px', height: '38px', fontSize: '13px' }}
                  placeholder="Search ID, name, phone..."
                  value={adminCustSearch}
                  onChange={(e) => setAdminCustSearch(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {/* Customer Table Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>CUSTOMER ID</th>
                    <th>PROFILE PHOTO</th>
                    <th>CUSTOMER NAME</th>
                    <th>MOBILE NUMBER</th>
                    <th>GENDER</th>
                    <th>ID PROOF</th>
                    <th>CREATED DATE</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'center', width: '140px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.filter(c => (custSubTab === 'deleted' ? Boolean(c.isDeleted) : !c.isDeleted)).filter(c => {
                    const q = adminCustSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      c.name.toLowerCase().includes(q) ||
                      c.phone.includes(q) ||
                      c.id.toLowerCase().includes(q) ||
                      (c.customerId && c.customerId.toString() === q)
                    );
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No {custSubTab === 'deleted' ? 'deleted' : 'active'} customer records found.
                      </td>
                    </tr>
                  ) : (
                    customers
                      .filter(c => (custSubTab === 'deleted' ? Boolean(c.isDeleted) : !c.isDeleted))
                      .filter(c => {
                        const q = adminCustSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          c.name.toLowerCase().includes(q) ||
                          c.phone.includes(q) ||
                          c.id.toLowerCase().includes(q) ||
                          (c.customerId && c.customerId.toString() === q)
                        );
                      })
                      .map((c) => (
                        <tr key={c.id}>
                          <td>
                            <strong style={{ color: 'var(--color-primary-dark)', fontSize: '13px' }}>
                              {c.id}
                            </strong>
                          </td>
                          <td>
                            {c.customerPhoto ? (
                              <img
                                src={c.customerPhoto}
                                alt={c.name}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1.5px solid var(--color-primary-accent)'
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--color-light-accent)',
                                  color: 'var(--color-primary-dark)',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{c.name}</td>
                          <td style={{ fontWeight: 600 }}>+91 {c.phone}</td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: '11px' }}>{c.gender}</span>
                          </td>
                          <td style={{ fontSize: '12px' }}>
                            <strong>{c.idProof}:</strong> {formatIdProofDisplay(c.idProof, c.idNumber)}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.joinedDate || 'Recent'}</td>
                          <td>
                            {c.isDeleted ? (
                              <span className="badge badge-danger" style={{ fontSize: '11px' }}>DELETED</span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: '11px' }}>VERIFIED</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {custSubTab === 'deleted' ? (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ height: '28px', padding: '0 8px', fontSize: '11px', gap: '4px' }}
                                    title="Restore Customer"
                                    onClick={() => restoreCustomer(c.id)}
                                  >
                                    <RotateCcw size={12} />
                                    <span>Restore</span>
                                  </button>
                                  {userRole === 'ADMIN' && (
                                    <button
                                      className="btn btn-sm"
                                      style={{
                                        height: '28px',
                                        padding: '0 8px',
                                        fontSize: '11px',
                                        gap: '4px',
                                        backgroundColor: '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                      title="Delete Completely (Admin Only)"
                                      onClick={() => {
                                        setPermanentDeleteTarget(c);
                                        setPermanentDeleteInput('');
                                      }}
                                    >
                                      <Trash2 size={12} />
                                      <span>🗑 Delete Completely</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <button
                                    className="icon-button"
                                    style={{ width: '28px', height: '28px' }}
                                    title="View Customer"
                                    onClick={() => setViewingCustomer(c)}
                                  >
                                    <Eye size={13} />
                                  </button>
                                  <button
                                    className="icon-button"
                                    style={{ width: '28px', height: '28px' }}
                                    title="Edit Customer"
                                    onClick={() => setEditingCustomer(c)}
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  {userRole === 'ADMIN' && (
                                    <button
                                      className="icon-button"
                                      style={{ width: '28px', height: '28px', color: 'var(--color-danger, #ef4444)' }}
                                      title="Delete Customer (Admin Only)"
                                      onClick={() => setDeletingCustomer(c)}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bulk-fd' && masterControlSettings?.bulkFdDateChangeEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Bulk Fixed Deposit Date Change</h2>
                <p className="card-description">Modify deposit dates in bulk for selected Fixed Deposits. Daybook entry dates will automatically synchronize.</p>
              </div>
              {safeFixedDeposits.length > 0 && (
                <span className="badge badge-success">
                  {safeFixedDeposits.filter((f) => f.status === 'ACTIVE').length} Active FDs
                </span>
              )}
            </div>

            {safeFixedDeposits.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No fixed deposits in this company yet.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search deposits by name, FD no, or phone..."
                      className="input-control"
                      style={{ paddingLeft: '36px', width: '100%' }}
                      value={fdSearchText}
                      onChange={(e) => setFdSearchText(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${dateMode === 'shift' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ height: '38px', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
                      onClick={() => setDateMode('shift')}
                    >
                      Shift by Days
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${dateMode === 'set' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ height: '38px', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
                      onClick={() => setDateMode('set')}
                    >
                      Set Specific Date
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', backgroundColor: 'var(--bg-surface-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                  {dateMode === 'shift' ? (
                    <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                      <label className="form-label required">DAYS TO SHIFT (+/-)</label>
                      <input
                        type="number"
                        className="input-control"
                        placeholder="e.g. 5 or -10"
                        value={offsetDaysValue || ''}
                        onChange={(e) => setOffsetDaysValue(Number(e.target.value))}
                      />
                    </div>
                  ) : (
                    <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                      <label className="form-label required">NEW DEPOSIT DATE</label>
                      <input
                        type="date"
                        className="input-control"
                        value={newDepDateVal}
                        onChange={(e) => setNewDepDateVal(e.target.value)}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ height: '38px', fontWeight: 700 }}
                    disabled={selectedFdNos.length === 0 || (dateMode === 'shift' && !offsetDaysValue) || (dateMode === 'set' && !newDepDateVal)}
                    onClick={async () => {
                      let formattedDate: string | undefined = undefined;
                      if (dateMode === 'set' && newDepDateVal) {
                        const [yyyy, mm, dd] = newDepDateVal.split('-');
                        formattedDate = `${dd}/${mm}/${yyyy}`;
                      }

                      const success = await bulkUpdateFixedDepositDates(
                        selectedFdNos,
                        formattedDate,
                        dateMode === 'shift' ? offsetDaysValue : undefined
                      );
                      if (success) {
                        setSelectedFdNos([]);
                        setOffsetDaysValue(0);
                        setNewDepDateVal('');
                      }
                    }}
                  >
                    Apply Change ({selectedFdNos.length} Selected)
                  </button>
                </div>

                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedFdNos.length === safeFixedDeposits.filter((f) => f.status === 'ACTIVE').length && safeFixedDeposits.filter((f) => f.status === 'ACTIVE').length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFdNos(safeFixedDeposits.filter((f) => f.status === 'ACTIVE').map((f) => f.fdNo));
                              } else {
                                setSelectedFdNos([]);
                              }
                            }}
                          />
                        </th>
                        <th>FD NO</th>
                        <th>DEPOSITOR</th>
                        <th>PRINCIPAL</th>
                        <th>RATE (% P.A.)</th>
                        <th>DEPOSIT DATE</th>
                        <th>MATURITY DATE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeFixedDeposits
                        .filter((f) => {
                          const search = fdSearchText.toLowerCase();
                          return (
                            f.fdNo.toLowerCase().includes(search) ||
                            f.depositorName.toLowerCase().includes(search) ||
                            f.phone.includes(search)
                          );
                        })
                        .map((f) => {
                          const isSelected = selectedFdNos.includes(f.fdNo);
                          const isChangeable = f.status === 'ACTIVE';
                          return (
                            <tr key={f.id} style={{ opacity: isChangeable ? 1 : 0.6 }}>
                              <td>
                                <input
                                  type="checkbox"
                                  disabled={!isChangeable}
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedFdNos((prev) => [...prev, f.fdNo]);
                                    } else {
                                      setSelectedFdNos((prev) => prev.filter((no) => no !== f.fdNo));
                                    }
                                  }}
                                />
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{f.fdNo}</td>
                              <td style={{ fontWeight: 600 }}>{f.depositorName}</td>
                              <td style={{ fontWeight: 700 }}>₹{f.principal.toLocaleString('en-IN')}</td>
                              <td>{f.interestRatePA}%</td>
                              <td>{f.depositDate}</td>
                              <td>{f.maturityDate}</td>
                              <td>
                                <span className={`badge ${f.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                                  {f.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Master Control Modal Overlay */}
      {masterControlOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative' }}>
            <button
              type="button"
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              onClick={() => setMasterControlOpen(false)}
              aria-label="Close Master Control"
            >
              <X size={18} />
            </button>

            {!masterControlUnlocked ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Master Control – Login</h3>
                <form onSubmit={handleUnlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label required">PASSWORD</label>
                    <input
                      type="password"
                      className="input-control"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary">Unlock</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setMasterControlOpen(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Master Control</h2>
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderRadius: 'var(--radius-sm)', fontSize: '12px', border: '1px solid rgba(210, 168, 74, 0.25)' }}>
                  Changes here affect all NEW loans. Existing loans keep the rates they were issued at.
                </div>

                <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'rates', label: 'Rates & Payments' },
                    { key: 'operations', label: 'Operations' },
                    { key: 'messaging', label: 'Messaging' },
                    { key: 'security', label: 'Security & Access' },
                    { key: 'danger', label: 'Danger Zone' }
                  ].map((mt) => (
                    <button
                      key={mt.key}
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: masterSubTab === mt.key ? (mt.key === 'danger' ? '#DC2626' : 'var(--color-primary-dark)') : 'var(--text-muted)',
                        borderBottom: masterSubTab === mt.key ? `2px solid ${mt.key === 'danger' ? '#DC2626' : 'var(--color-primary-dark)'}` : 'none',
                        paddingBottom: '4px'
                      }}
                      onClick={() => {
                        if (mt.key === 'danger') {
                          handleDangerZoneTabClick();
                        } else {
                          setMasterSubTab(mt.key as any);
                        }
                      }}
                    >
                      {mt.label}
                    </button>
                  ))}
                </div>

                {masterSubTab === 'rates' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { key: 'gold', label: '↗️ Gold Loan' },
                        { key: 'silver', label: '↗️ Silver Loan' },
                        { key: 'pronote', label: '📄 Pronote' },
                        { key: 'hire', label: '🚗 Hire Purchase' },
                        { key: 'card', label: '💳 Card Fee' },
                        { key: 'overdue', label: '🕐 Overdue Interest' },
                        { key: 'upi', label: '💳 UPI Payment' }
                      ].map((sc) => (
                        <button
                          key={sc.key}
                          type="button"
                          className={`btn btn-sm ${ratesSubChip === sc.key ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ borderRadius: 'var(--radius-full)', fontSize: '11.5px', padding: '4px 12px' }}
                          onClick={() => setRatesSubChip(sc.key as any)}
                        >
                          {sc.label}
                        </button>
                      ))}
                    </div>

                    {ratesSubChip === 'gold' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>SHOW ON LOAN ISSUE</span>
                          <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-secondary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${goldShowOnIssue ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setGoldShowOnIssue(true)}
                              style={{ padding: '2px 10px', fontSize: '11px' }}
                            >
                              On
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${!goldShowOnIssue ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setGoldShowOnIssue(false)}
                              style={{ padding: '2px 10px', fontSize: '11px' }}
                            >
                              Off
                            </button>
                          </div>
                        </div>

                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                              <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                                MONTHLY INTEREST AMOUNT BANDS
                              </h4>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Rate is % per month, pre-filled by loan size.</span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ gap: '4px', fontSize: '11px', padding: '4px 10px', borderRadius: 'var(--radius-md)' }}
                              onClick={handleAddAmountBand}
                            >
                              <Plus size={13} />
                              <span>Add Amount Band</span>
                            </button>
                          </div>

                          {(!amountBands || amountBands.length === 0) ? (
                            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                              No interest rate bands configured. Click "+ Add Amount Band" to add one.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              {(amountBands || []).map((band, idx) => (
                                <div key={band.id || idx} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '10px', alignItems: 'end' }}>
                                  <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>CONDITION</label>
                                    <select
                                      className="input-control"
                                      value={band.condition}
                                      onChange={(e) => {
                                        const u = [...(amountBands || [])];
                                        u[idx] = { ...u[idx], condition: e.target.value as any };
                                        setAmountBands(u);
                                      }}
                                      style={{ width: '100%', height: '36px', padding: '4px 8px' }}
                                    >
                                      <option value="Below">Below</option>
                                      <option value="Above">Above</option>
                                    </select>
                                  </div>
                                  <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>AMOUNT (₹)</label>
                                    <input
                                      type="number"
                                      className="input-control"
                                      value={band.amount}
                                      onChange={(e) => {
                                        const u = [...(amountBands || [])];
                                        u[idx] = { ...u[idx], amount: Number(e.target.value) };
                                        setAmountBands(u);
                                      }}
                                    />
                                  </div>
                                  <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>BASE %/MO</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      className="input-control"
                                      value={band.baseRateMonthly}
                                      onChange={(e) => {
                                        const u = [...(amountBands || [])];
                                        u[idx] = { ...u[idx], baseRateMonthly: Number(e.target.value) };
                                        setAmountBands(u);
                                      }}
                                    />
                                  </div>
                                  <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>PENALTY AFTER (MO)</label>
                                    <input
                                      type="number"
                                      className="input-control"
                                      value={band.penaltyAfterMonths}
                                      onChange={(e) => {
                                        const u = [...(amountBands || [])];
                                        u[idx] = { ...u[idx], penaltyAfterMonths: Number(e.target.value) };
                                        setAmountBands(u);
                                      }}
                                    />
                                  </div>
                                  <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>STEP-UP %/MO</label>
                                    <input
                                      type="number"
                                      step="0.05"
                                      className="input-control"
                                      value={band.penaltyStepUpMonthly}
                                      onChange={(e) => {
                                        const u = [...(amountBands || [])];
                                        u[idx] = { ...u[idx], penaltyStepUpMonthly: Number(e.target.value) };
                                        setAmountBands(u);
                                      }}
                                    />
                                  </div>
                                  <div style={{ gridColumn: 'span 1.5' }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>CALCULATION</label>
                                    <select
                                      className="input-control"
                                      value={band.penaltyCalculation}
                                      onChange={(e) => {
                                        const u = [...(amountBands || [])];
                                        u[idx] = { ...u[idx], penaltyCalculation: e.target.value as any };
                                        setAmountBands(u);
                                      }}
                                      style={{ width: '100%', height: '36px', padding: '4px 4px', fontSize: '11px' }}
                                    >
                                      <option value="From the start — stepped rate over the whole overc">Stepped period</option>
                                      <option value="After threshold">After threshold</option>
                                    </select>
                                  </div>
                                  <div style={{ gridColumn: 'span 0.5', textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '6px' }}
                                      onClick={() => setAmountBands((amountBands || []).filter((_, bIdx) => bIdx !== idx))}
                                      title="Delete Band"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                💡 <strong>Evaluation order:</strong> Amount bands are checked in order from top to bottom. The first match will determine the interest rates.
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                          <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                            DUE SYSTEM SETTINGS
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '11px' }}>PENALTY %/DAY ON OVERDUE EMI</label>
                              <input
                                type="number"
                                step="0.1"
                                className="input-control"
                                value={overduePenalty}
                                onChange={(e) => setOverduePenalty(Number(e.target.value))}
                              />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '11px' }}>GRACE DAYS FROM DUE DATE</label>
                              <input
                                type="number"
                                className="input-control"
                                value={graceDaysVal}
                                onChange={(e) => setGraceDaysVal(Number(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {ratesSubChip === 'silver' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>🥈</span>
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Silver Loan</h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rate is % per month. One rate for every silver loan.</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>SHOW ON LOAN ISSUE</span>
                          <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-secondary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${silverShowOnIssue ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setSilverShowOnIssue(true)}
                              style={{ padding: '2px 10px', fontSize: '11px' }}
                            >
                              On
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${!silverShowOnIssue ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setSilverShowOnIssue(false)}
                              style={{ padding: '2px 10px', fontSize: '11px' }}
                            >
                              Off
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                          {/* MONTHLY INTEREST (Amount Bands) */}
                          <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                                MONTHLY INTEREST
                              </h4>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ gap: '4px', fontSize: '11px', padding: '4px 10px', borderRadius: 'var(--radius-md)' }}
                                onClick={handleAddSilverAmountBand}
                              >
                                <Plus size={13} />
                                <span>Add amount band</span>
                              </button>
                            </div>

                            {(!silverAmountBands || silverAmountBands.length === 0) ? (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                                No interest rate bands configured. Click "+ Add amount band" to add one.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {(silverAmountBands || []).map((band, idx) => (
                                  <div key={band.id || idx} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr', gap: '8px', alignItems: 'center' }}>
                                      <div>
                                        <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>AMOUNT IS</label>
                                        <select
                                          className="input-control"
                                          value={band.condition}
                                          onChange={(e) => {
                                            const u = [...(silverAmountBands || [])];
                                            u[idx] = { ...u[idx], condition: e.target.value as any };
                                            setSilverAmountBands(u);
                                          }}
                                          style={{ width: '100%', height: '36px', padding: '4px 8px', fontSize: '11px' }}
                                        >
                                          <option value="Below">Below</option>
                                          <option value="Above">Above</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>₹ AMOUNT</label>
                                        <input
                                          type="number"
                                          className="input-control"
                                          value={band.amount}
                                          onChange={(e) => {
                                            const u = [...(silverAmountBands || [])];
                                            u[idx] = { ...u[idx], amount: Number(e.target.value) };
                                            setSilverAmountBands(u);
                                          }}
                                          style={{ fontSize: '11.5px', height: '36px' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>BASE %/MONTH</label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          className="input-control"
                                          value={band.baseRateMonthly}
                                          onChange={(e) => {
                                            const u = [...(silverAmountBands || [])];
                                            u[idx] = { ...u[idx], baseRateMonthly: Number(e.target.value) };
                                            setSilverAmountBands(u);
                                          }}
                                          style={{ fontSize: '11.5px', height: '36px' }}
                                        />
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <label style={{ display: 'block', height: '14px' }}></label>
                                        <button
                                          type="button"
                                          style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px' }}
                                          onClick={() => setSilverAmountBands((silverAmountBands || []).filter((_, bIdx) => bIdx !== idx))}
                                          title="Delete Band"
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 4fr', gap: '8px' }}>
                                      <div>
                                        <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>PENALTY AFTER (MONTHS)</label>
                                        <input
                                          type="number"
                                          className="input-control"
                                          value={band.penaltyAfterMonths}
                                          onChange={(e) => {
                                            const u = [...(silverAmountBands || [])];
                                            u[idx] = { ...u[idx], penaltyAfterMonths: Number(e.target.value) };
                                            setSilverAmountBands(u);
                                          }}
                                          style={{ fontSize: '11.5px', height: '36px' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>PENALTY STEP-UP %/MONTH</label>
                                        <input
                                          type="number"
                                          step="0.05"
                                          className="input-control"
                                          value={band.penaltyStepUpMonthly}
                                          onChange={(e) => {
                                            const u = [...(silverAmountBands || [])];
                                            u[idx] = { ...u[idx], penaltyStepUpMonthly: Number(e.target.value) };
                                            setSilverAmountBands(u);
                                          }}
                                          style={{ fontSize: '11.5px', height: '36px' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>PENALTY IS COUNTED</label>
                                        <select
                                          className="input-control"
                                          value={band.penaltyCalculation}
                                          onChange={(e) => {
                                            const u = [...(silverAmountBands || [])];
                                            u[idx] = { ...u[idx], penaltyCalculation: e.target.value as any };
                                            setSilverAmountBands(u);
                                          }}
                                          style={{ width: '100%', height: '36px', padding: '4px 8px', fontSize: '11px' }}
                                        >
                                          <option value="From the start — stepped rate over the whole overc">From the start — stepped rate over the whole overc</option>
                                          <option value="After threshold">After threshold</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                  The first band that matches is the one used, so the order here is the order they are checked. Make sure the last band catches everything else — usually Above 0.
                                </div>
                              </div>
                            )}
                          </div>

                          {/* DUE SYSTEM */}
                          <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                              DUE SYSTEM
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label required" style={{ fontSize: '11px' }}>PENALTY %/DAY ON OVERDUE EMI</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="input-control"
                                  value={overduePenalty}
                                  onChange={(e) => setOverduePenalty(Number(e.target.value))}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label required" style={{ fontSize: '11px' }}>GRACE DAYS FROM DUE DATE</label>
                                <input
                                  type="number"
                                  className="input-control"
                                  value={graceDaysVal}
                                  onChange={(e) => setGraceDaysVal(Number(e.target.value))}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {ratesSubChip === 'pronote' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>📝</span>
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Pronote</h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rate is % per year — unchanged from how every existing Pronote loan was issued.</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>SHOW ON LOAN ISSUE</span>
                          <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-secondary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${pronoteShowOnIssue ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setPronoteShowOnIssue(true)}
                              style={{ padding: '2px 10px', fontSize: '11px' }}
                            >
                              On
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${!pronoteShowOnIssue ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setPronoteShowOnIssue(false)}
                              style={{ padding: '2px 10px', fontSize: '11px' }}
                            >
                              Off
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                          {/* MONTHLY INTEREST */}
                          <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                                MONTHLY INTEREST
                              </h4>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label required" style={{ fontSize: '11px' }}>DEFAULT RATE %/YEAR</label>
                                <input
                                  type="number"
                                  className="input-control"
                                  value={pronoteRate}
                                  onChange={(e) => setPronoteRate(Number(e.target.value))}
                                />
                              </div>
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '12px' }}>
                              How far behind a loan is counted is set under Overdue Interest below.
                            </span>
                          </div>

                          {/* DUE SYSTEM */}
                          <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                              DUE SYSTEM
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label required" style={{ fontSize: '11px' }}>PENALTY %/DAY ON OVERDUE EMI</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="input-control"
                                  value={overduePenalty}
                                  onChange={(e) => setOverduePenalty(Number(e.target.value))}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label required" style={{ fontSize: '11px' }}>GRACE DAYS FROM DUE DATE</label>
                                <input
                                  type="number"
                                  className="input-control"
                                  value={graceDaysVal}
                                  onChange={(e) => setGraceDaysVal(Number(e.target.value))}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {ratesSubChip === 'hire' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>🚗</span>
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Hire Purchase</h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rate is % per year — unchanged from how every existing Hire Purchase loan was issued.</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>SHOW ON LOAN ISSUE</span>
                          <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-secondary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${hireShowOnIssue ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setHireShowOnIssue(true)}
                              style={{ padding: '2px 10px', fontSize: '11px' }}
                            >
                              On
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${!hireShowOnIssue ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setHireShowOnIssue(false)}
                              style={{ padding: '2px 10px', fontSize: '11px' }}
                            >
                              Off
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                          {/* MONTHLY INTEREST */}
                          <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                              MONTHLY INTEREST
                            </h4>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label required" style={{ fontSize: '11px' }}>DEFAULT RATE %/YEAR</label>
                              <input
                                type="number"
                                className="input-control"
                                value={hireRate}
                                onChange={(e) => setHireRate(Number(e.target.value))}
                              />
                            </div>
                          </div>

                          {/* DUE SYSTEM */}
                          <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                              DUE SYSTEM
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label required" style={{ fontSize: '11px' }}>PENALTY %/DAY ON OVERDUE EMI</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="input-control"
                                  value={overduePenalty}
                                  onChange={(e) => setOverduePenalty(Number(e.target.value))}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label required" style={{ fontSize: '11px' }}>GRACE DAYS FROM DUE DATE</label>
                                <input
                                  type="number"
                                  className="input-control"
                                  value={graceDaysVal}
                                  onChange={(e) => setGraceDaysVal(Number(e.target.value))}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {ratesSubChip === 'card' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>💳</span>
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Card Fee</h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Charged at issue when the card fee box is ticked. Each loan type carries its own fee — switch one off and the box does not appear on Loan Issue for that type at all.
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                          {/* Gold Loan */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, width: '120px' }}>Gold Loan</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-secondary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${goldCardFeeEnabled ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setGoldCardFeeEnabled(true)}
                                  style={{ padding: '2px 10px', fontSize: '11px' }}
                                >
                                  On
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${!goldCardFeeEnabled ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setGoldCardFeeEnabled(false)}
                                  style={{ padding: '2px 10px', fontSize: '11px' }}
                                >
                                  Off
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>₹</span>
                                <input
                                  type="number"
                                  className="input-control"
                                  value={goldCardFeeVal}
                                  onChange={(e) => setGoldCardFeeVal(Number(e.target.value))}
                                  style={{ width: '80px', height: '30px', fontSize: '12px', padding: '4px 8px' }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Silver Loan */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, width: '120px' }}>Silver Loan</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-secondary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${silverCardFeeEnabled ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setSilverCardFeeEnabled(true)}
                                  style={{ padding: '2px 10px', fontSize: '11px' }}
                                >
                                  On
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${!silverCardFeeEnabled ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setSilverCardFeeEnabled(false)}
                                  style={{ padding: '2px 10px', fontSize: '11px' }}
                                >
                                  Off
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>₹</span>
                                <input
                                  type="number"
                                  className="input-control"
                                  value={silverCardFeeVal}
                                  onChange={(e) => setSilverCardFeeVal(Number(e.target.value))}
                                  style={{ width: '80px', height: '30px', fontSize: '12px', padding: '4px 8px' }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Pronote */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, width: '120px' }}>Pronote</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-secondary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${pronoteCardFeeEnabled ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setPronoteCardFeeEnabled(true)}
                                  style={{ padding: '2px 10px', fontSize: '11px' }}
                                >
                                  On
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${!pronoteCardFeeEnabled ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setPronoteCardFeeEnabled(false)}
                                  style={{ padding: '2px 10px', fontSize: '11px' }}
                                >
                                  Off
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>₹</span>
                                <input
                                  type="number"
                                  className="input-control"
                                  value={pronoteCardFeeVal}
                                  onChange={(e) => setPronoteCardFeeVal(Number(e.target.value))}
                                  style={{ width: '80px', height: '30px', fontSize: '12px', padding: '4px 8px' }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Hire Purchase */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, width: '120px' }}>Hire Purchase</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-secondary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${hireCardFeeEnabled ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setHireCardFeeEnabled(true)}
                                  style={{ padding: '2px 10px', fontSize: '11px' }}
                                >
                                  On
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${!hireCardFeeEnabled ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setHireCardFeeEnabled(false)}
                                  style={{ padding: '2px 10px', fontSize: '11px' }}
                                >
                                  Off
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>₹</span>
                                <input
                                  type="number"
                                  className="input-control"
                                  value={hireCardFeeVal}
                                  onChange={(e) => setHireCardFeeVal(Number(e.target.value))}
                                  style={{ width: '80px', height: '30px', fontSize: '12px', padding: '4px 8px' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {ratesSubChip === 'overdue' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>🕐</span>
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Overdue Interest</h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              For Pronote and Hire Purchase loans on Monthly Interest: what the Loan Receipt screen fills in when the loan is behind. Gold and silver are not affected — they already work the months out from the amount you type.
                            </span>
                          </div>
                        </div>

                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                            WHEN A LOAN IS OVERDUE, FILL IN
                          </h4>
                          <div className="form-group" style={{ margin: 0 }}>
                            <select
                              className="input-control"
                              value={overdueCalMethod}
                              onChange={(e) => setOverdueCalMethod(e.target.value)}
                              style={{ width: '100%', height: '38px', padding: '4px 8px', fontSize: '12.5px' }}
                            >
                              <option value="Whole months — a part month counts as full (recommended)">
                                Whole months — a part month counts as full (recommended)
                              </option>
                              <option value="Exact days — calculation based on actual days late">
                                Exact days — calculation based on actual days late
                              </option>
                            </select>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Only the starting figure. You can still change the days on any receipt, and anything left over carries to the next one.
                          </span>
                        </div>
                      </div>
                    )}

                    {ratesSubChip === 'upi' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>UPI SETTINGS</h4>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label required">UPI ID VIRTUAL ADDRESS</label>
                          <input
                            type="text"
                            placeholder="e.g. kkvgold@okaxis"
                            className="input-control"
                            value={upiIdVal}
                            onChange={(e) => setUpiIdVal(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label required">UPI ACCOUNT PAYEE NAME</label>
                          <input
                            type="text"
                            placeholder="e.g. KKV Gold Finance"
                            className="input-control"
                            value={upiPayeeVal}
                            onChange={(e) => setUpiPayeeVal(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {masterSubTab === 'messaging' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <strong>Allowed placeholders:</strong>
                      <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {"{name}, {loanId}, {loanType}, {principal}, {interest}, {dueDate}, {amount}, {emi}, {bankName}, {phone}, {upiId}, {upiPayee}, {advance}, {advanceLine}, {billNo}, {date}"}
                      </span>
                    </div>

                    <div className="form-group" style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px', margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>WELCOME MESSAGE (SENT AFTER ISSUING A NEW LOAN)</label>
                      <textarea
                        className="input-control"
                        rows={3}
                        value={welcomeTpl}
                        onChange={(e) => setWelcomeTpl(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Predefined:</span>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setWelcomeTpl("Dear {name}, Thank you for choosing KKV GOLD FINANCE. Your pledge account {loanId} for ₹{principal} has been disbursed. Next due date is {dueDate}. Thank you.")}>Professional</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setWelcomeTpl("KKV GOLD FINANCE: Loan {loanId} for ₹{principal} disbursed to {name}. Next due: {dueDate}.")}>Short</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setWelcomeTpl("Hi {name}! Your loan {loanId} of ₹{principal} is active. Next due: {dueDate}. Thanks!")}>Friendly</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setWelcomeTpl("Dear {name}, thank you for choosing us. Gold Loan {loanId} of principal ₹{principal} is disbursed under KKV Gold. Overdue penalty: 3.6% per day after 3 grace days.")}>Detailed</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setWelcomeTpl("அன்புள்ள {name}, கே.கே.வி கோல்டு பைனான்ஸை தேர்வு செய்ததற்கு நன்றி. உங்கள் கடன் {loanId} தொகை ₹{principal} வழங்கப்பட்டது.")}>Tamil</button>
                      </div>
                    </div>

                    <div className="form-group" style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px', margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>{"DUE REMINDER (PENDING LOANS -> WHATSAPP)"}</label>
                      <textarea
                        className="input-control"
                        rows={3}
                        value={dueTpl}
                        onChange={(e) => setDueTpl(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Predefined:</span>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setDueTpl("Dear {name}, your interest payment for Gold Loan {loanId} (Principal ₹{principal}) is pending. Due date: {dueDate}. Total amount due: ₹{amount}. UPI ID: {upiId}")}>Professional</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setDueTpl("Pending interest for Loan {loanId}: ₹{amount}. UPI: {upiId}.")}>Short</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setDueTpl("Hi {name}, interest for your Loan {loanId} was due on {dueDate}. Amount: ₹{amount}. UPI: {upiId}")}>Friendly</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setDueTpl("WARNING: Interest for loan {loanId} is overdue. Please settle ₹{amount} immediately on UPI {upiId} to avoid penalty charges.")}>Firm</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setDueTpl("Please pay your pending interest of ₹{amount} for Loan {loanId} via UPI {upiId} (Payee: {upiPayee}).")}>With UPI</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setDueTpl("Loan {loanId} interest due: ₹{amount}.")}>Very short</button>
                      </div>
                    </div>

                    <div className="form-group" style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px', margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>RECEIPT MESSAGE (SENT UPON INTEREST PAYMENT/COLLECTIONS)</label>
                      <textarea
                        className="input-control"
                        rows={3}
                        value={receiptTpl}
                        onChange={(e) => setReceiptTpl(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Predefined:</span>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setReceiptTpl("Dear {name}, payment receipt #{billNo} of ₹{amount} for loan {loanId} has been successfully recorded on {date}. Thank you, KKV GOLD FINANCE.")}>Professional</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setReceiptTpl("Receipt #{billNo} of ₹{amount} received for loan {loanId} on {date}. Thank you.")}>Short</button>
                        <button type="button" className="btn btn-xs" style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--bg-surface-secondary)' }} onClick={() => setReceiptTpl("Hi {name}! Staged payment receipt #{billNo} of ₹{amount} for loan {loanId} has been successfully completed on {date}. Thanks!")}>Friendly</button>
                      </div>
                    </div>
                  </div>
                )}

                {masterSubTab === 'operations' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {[
                        { key: 'areas-showrooms', label: '🏙️ Areas & Showrooms' },
                        { key: 'toggles', label: '⚙️ System Toggles' },
                        { key: 'backup-restore', label: '💾 Backup & Restore' }
                      ].map((sub) => (
                        <button
                          key={sub.key}
                          type="button"
                          className={`btn btn-sm ${operationsSubTab === sub.key ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ borderRadius: 'var(--radius-full)', fontSize: '12px' }}
                          onClick={() => setOperationsSubTab(sub.key as any)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>

                    {operationsSubTab === 'areas-showrooms' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                        {/* Areas */}
                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>AREAS CONFIG</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="e.g. Komarapalayam"
                              value={newAreaInput}
                              onChange={(e) => setNewAreaInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
                              style={{ flex: 1 }}
                            />
                            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddArea} style={{ padding: '0 12px' }}>+ Add</button>
                          </div>
                          <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid var(--border-light)', padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: '6px', backgroundColor: 'var(--bg-surface-secondary)' }}>
                            {areasVal.length === 0 ? <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No areas added</span> :
                              areasVal.map((item, idx) => (
                                <span key={idx} className="badge badge-success" style={{ gap: '4px', fontSize: '10px', padding: '3px 8px', border: '1px solid rgba(201,162,39,0.2)' }}>
                                  {item}
                                  <button type="button" onClick={() => handleRemoveArea(idx)} style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', padding: 0 }}>×</button>
                                </span>
                              ))}
                          </div>
                        </div>

                        {/* Partners */}
                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>PARTNERS (CAPITAL ACCOUNTS)</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="Partner name"
                              value={newPartnerInput}
                              onChange={(e) => setNewPartnerInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddPartner()}
                              style={{ flex: 1 }}
                            />
                            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddPartner} style={{ padding: '0 12px' }}>Add</button>
                          </div>
                          <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid var(--border-light)', padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: '6px', backgroundColor: 'var(--bg-surface-secondary)' }}>
                            {partnersVal.length === 0 ? <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No partners added</span> :
                              partnersVal.map((item, idx) => (
                                <span key={idx} className="badge badge-success" style={{ gap: '4px', fontSize: '10px', padding: '3px 8px' }}>
                                  {item}
                                  <button type="button" onClick={() => handleRemovePartner(idx)} style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', padding: 0 }}>×</button>
                                </span>
                              ))}
                          </div>
                        </div>

                        {/* Vehicle Documents */}
                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>VEHICLE DOCUMENTS</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="e.g. Hypothecation letter"
                              value={newDocInput}
                              onChange={(e) => setNewDocInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddDoc()}
                              style={{ flex: 1 }}
                            />
                            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddDoc} style={{ padding: '0 12px' }}>Add</button>
                          </div>
                          <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid var(--border-light)', padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: '6px', backgroundColor: 'var(--bg-surface-secondary)' }}>
                            {vehicleDocsVal.length === 0 ? <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No documents added</span> :
                              vehicleDocsVal.map((item, idx) => (
                                <span key={idx} className="badge badge-success" style={{ gap: '4px', fontSize: '10px', padding: '3px 8px' }}>
                                  {item}
                                  <button type="button" onClick={() => handleRemoveDoc(idx)} style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', padding: 0 }}>×</button>
                                </span>
                              ))}
                          </div>
                        </div>

                        {/* Vehicle Companies */}
                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>VEHICLE COMPANIES</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="e.g. Honda"
                              value={newCompanyInput}
                              onChange={(e) => setNewCompanyInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddCompany()}
                              style={{ flex: 1 }}
                            />
                            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddCompany} style={{ padding: '0 12px' }}>Add</button>
                          </div>
                          <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid var(--border-light)', padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: '6px', backgroundColor: 'var(--bg-surface-secondary)' }}>
                            {vehicleCompaniesVal.length === 0 ? <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No companies added</span> :
                              vehicleCompaniesVal.map((item, idx) => (
                                <span key={idx} className="badge badge-success" style={{ gap: '4px', fontSize: '10px', padding: '3px 8px' }}>
                                  {item}
                                  <button type="button" onClick={() => handleRemoveCompany(idx)} style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', padding: 0 }}>×</button>
                                </span>
                              ))}
                          </div>
                        </div>

                        {/* Insurance Companies */}
                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>INSURANCE COMPANIES</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="e.g. Tata AIG"
                              value={newInsCompanyInput}
                              onChange={(e) => setNewInsCompanyInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddInsCompany()}
                              style={{ flex: 1 }}
                            />
                            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddInsCompany} style={{ padding: '0 12px' }}>Add</button>
                          </div>
                          <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid var(--border-light)', padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: '6px', backgroundColor: 'var(--bg-surface-secondary)' }}>
                            {insuranceCompaniesVal.length === 0 ? <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No insurance companies added</span> :
                              insuranceCompaniesVal.map((item, idx) => (
                                <span key={idx} className="badge badge-success" style={{ gap: '4px', fontSize: '10px', padding: '3px 8px' }}>
                                  {item}
                                  <button type="button" onClick={() => handleRemoveInsCompany(idx)} style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', padding: 0 }}>×</button>
                                </span>
                              ))}
                          </div>
                        </div>

                        {/* Showrooms */}
                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>SHOWROOMS</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="Showroom branch"
                              value={newShowroomInput}
                              onChange={(e) => setNewShowroomInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddShowroom()}
                              style={{ flex: 1 }}
                            />
                            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddShowroom} style={{ padding: '0 12px' }}>+ Add</button>
                          </div>
                          <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid var(--border-light)', padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex', flexWrap: 'wrap', gap: '6px', backgroundColor: 'var(--bg-surface-secondary)' }}>
                            {showroomsVal.length === 0 ? <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No showrooms added</span> :
                              showroomsVal.map((item, idx) => (
                                <span key={idx} className="badge badge-success" style={{ gap: '4px', fontSize: '10px', padding: '3px 8px' }}>
                                  {item}
                                  <button type="button" onClick={() => handleRemoveShowroom(idx)} style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', padding: 0 }}>×</button>
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {operationsSubTab === 'toggles' && (
                      <div>
                        <h3 style={{ fontSize: '12px', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--text-muted)', textTransform: 'uppercase' }}>System Feature Toggles</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                          <div className="card" style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                            <div>
                              <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>Interface Animations</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Enable sidebar transition animations</span>
                            </div>
                            <input
                              type="checkbox"
                              style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-dark)', cursor: 'pointer' }}
                              checked={animationsEnabled}
                              onChange={(e) => setAnimationsEnabled(e.target.checked)}
                            />
                          </div>

                          <div className="card" style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                            <div>
                              <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>Performance Mode</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Disable heavy effects for low-spec PCs</span>
                            </div>
                            <input
                              type="checkbox"
                              style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-dark)', cursor: 'pointer' }}
                              checked={performanceModeEnabled}
                              onChange={(e) => setPerformanceModeEnabled(e.target.checked)}
                            />
                          </div>

                          <div className="card" style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                            <div>
                              <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>Bulk FD Date Shifting</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Enable multi-FD calendar edit features</span>
                            </div>
                            <input
                              type="checkbox"
                              style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-dark)', cursor: 'pointer' }}
                              checked={bulkFdDateChangeEnabled}
                              onChange={(e) => setBulkFdDateChangeEnabled(e.target.checked)}
                            />
                          </div>

                          <div className="card" style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                            <div>
                              <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>Cabinet Lockers</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Track safe deposits cabinets A &amp; B</span>
                            </div>
                            <input
                              type="checkbox"
                              style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-dark)', cursor: 'pointer' }}
                              checked={lockersEnabled}
                              onChange={(e) => setLockersEnabled(e.target.checked)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {operationsSubTab === 'backup-restore' && (
                      <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-surface-secondary)' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>DATA BACKUP SYSTEM</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                          Telegram backup, auto-save to your PC, and restore now live on their own page.
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ width: 'fit-content' }}
                          onClick={() => {
                            setActiveTab('data-backup');
                            setMasterControlOpen(false);
                          }}
                        >
                          Open Backup & Restore
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {masterSubTab === 'security' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {[
                        { key: 'account', label: '👤 Account' },
                        { key: 'change-pass', label: '🔐 Change Master Password' },
                        { key: 'roles', label: '🏢 Company Roles & Passwords' }
                      ].map((sub) => (
                        <button
                          key={sub.key}
                          type="button"
                          className={`btn btn-sm ${securitySubTab === sub.key ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ borderRadius: 'var(--radius-full)', fontSize: '12px' }}
                          onClick={() => setSecuritySubTab(sub.key as any)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>

                    {securitySubTab === 'account' && (
                      <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>GOOGLE DRIVE ACCOUNT SYNC</span>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SIGNED IN AS</label>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>kkvgoldfinance@gmail.com</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: 'fit-content', marginTop: '8px' }}
                          onClick={() => showToast('Google account cannot be signed out from this local offline build.', 'info')}
                        >
                          Sign Out
                        </button>
                      </div>
                    )}

                    {securitySubTab === 'change-pass' && (
                      <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>RESET MASTER ACCESS PASSWORD</span>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>CURRENT PASSWORD</label>
                          <input
                            type="password"
                            className="input-control"
                            value={currentMasterPass}
                            onChange={(e) => setCurrentMasterPass(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>NEW PASSWORD</label>
                          <input
                            type="password"
                            className="input-control"
                            value={newMasterPass}
                            onChange={(e) => setNewMasterPass(e.target.value)}
                          />
                        </div>
                        <div style={{ padding: '10px 14px', border: '1px solid #DC2626', color: '#DC2626', backgroundColor: 'rgba(220,38,38,0.05)', borderRadius: 'var(--radius-sm)', fontSize: '11.5px' }}>
                          ⚠️ Stored password safety: 3 passwords are still readable in plain text on this device.
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ width: 'fit-content' }}
                          onClick={() => {
                            if (!currentMasterPass || !newMasterPass) {
                              showToast('Please enter both current and new passwords.', 'warning');
                              return;
                            }
                            if (currentMasterPass !== adminPass) {
                              showToast('Current password does not match.', 'error');
                              return;
                            }
                            setAdminPass(newMasterPass);
                            setCurrentMasterPass('');
                            setNewMasterPass('');
                            showToast('Stored password successfully secured!', 'success');
                          }}
                        >
                          Secure stored passwords
                        </button>
                      </div>
                    )}

                    {securitySubTab === 'roles' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company Role Passwords</h3>
                        <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '0 0 10.5px 0' }}>Configure default sign-in passwords for workspace roles.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="form-group">
                            <label className="form-label required">ADMIN PASSWORD</label>
                            <input
                              type="text"
                              className="input-control"
                              value={adminPass}
                              onChange={(e) => setAdminPass(e.target.value)}
                              required
                            />
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Unlocks Master Control overrides. Default: admin123</span>
                          </div>

                          <div className="form-group">
                            <label className="form-label required">BRANCH MANAGER PASSWORD</label>
                            <input
                              type="text"
                              className="input-control"
                              value={managerPass}
                              onChange={(e) => setManagerPass(e.target.value)}
                              required
                            />
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Full operational control access. Default: manager123</span>
                          </div>

                          <div className="form-group">
                            <label className="form-label required">OPERATOR PASSWORD</label>
                            <input
                              type="text"
                              className="input-control"
                              value={operatorPass}
                              onChange={(e) => setOperatorPass(e.target.value)}
                              required
                            />
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Restricted counter entry access (Hides core settings/backups). Default: operator123</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {masterSubTab === 'danger' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '20px', backgroundColor: 'rgba(201, 106, 106, 0.08)', border: '1px solid rgba(201, 106, 106, 0.35)', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#991B1B' }}>WIPE ALL DATA</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                        Warning: Permanently delete all customer, loan, payment, and financial ledger data. Requires verified Google Drive backup before deletion.
                      </p>
                      <button
                        type="button"
                        className="btn"
                        style={{ backgroundColor: '#DC2626', color: '#FFF', fontWeight: 800 }}
                        onClick={() => setShowWipeModal(true)}
                      >
                        Wipe All Data
                      </button>
                    </div>

                    {/* HIDDEN SYSTEM RESTORE SECTION (Unlocked after 5 clicks on Danger Zone) */}
                    {showHiddenRestoreSection && (
                      <div style={{ padding: '20px', backgroundColor: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.35)', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#1E3A8A', margin: '0 0 6px' }}>SYSTEM RESTORE</h4>
                        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                          Restore the complete KKV Gold Finance system from a previously verified Google Drive backup.
                        </p>
                        <div style={{ padding: '10px 14px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#92400E', borderRadius: '6px', fontSize: '12px', marginBottom: '14px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          ⚠️ Warning: Restoring a backup will replace the current application business data with the selected backup.
                        </div>
                        <button
                          type="button"
                          className="btn"
                          style={{ backgroundColor: '#2563EB', color: '#FFF', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                          onClick={() => setShowRestoreModal(true)}
                        >
                          <CloudDownload size={16} />
                          <span>☁ Restore From Google Drive</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                  <button type="button" className="btn btn-primary" onClick={handleSaveMasterChanges}>
                    <Save size={15} />
                    <span>Save Changes</span>
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setMasterControlOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fail-Safe Wipe All Data Modal */}
      <WipeAllDataModal
        isOpen={showWipeModal}
        onClose={() => setShowWipeModal(false)}
        onSuccessReset={() => {
          resetAllData();
          setMasterControlOpen(false);
        }}
      />

      {/* Hidden Fail-Safe System Restore Modal */}
      <SystemRestoreModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onSuccessReload={() => {
          resetAllData();
          setMasterControlOpen(false);
        }}
      />

      {/* View Customer Details Modal */}
      <ViewCustomerModal
        isOpen={!!viewingCustomer}
        customer={viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        onEdit={(cust) => setEditingCustomer(cust)}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={!!editingCustomer}
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSave={(id, updates) => {
          updateCustomer(id, updates);
        }}
      />

      {/* Admin Delete Confirmation Modal */}
      {deletingCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-xl)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--color-danger, #ef4444)' }}>
                Delete Customer?
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                You are about to permanently delete this customer record.
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
                border: '1px solid var(--border-light, #cbd5e1)',
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '16px',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div><strong>Customer Name:</strong> {deletingCustomer.name}</div>
              <div><strong>Customer ID:</strong> {deletingCustomer.id}</div>
              <div><strong>Mobile Number:</strong> +91 {deletingCustomer.phone}</div>
            </div>

            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', color: '#991b1b', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
              ⚠ This action cannot be undone.
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setDeletingCustomer(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ backgroundColor: 'var(--color-danger, #ef4444)', color: '#fff', fontWeight: 700 }}
                onClick={() => {
                  deleteCustomer(deletingCustomer.id);
                  setDeletingCustomer(null);
                }}
              >
                🗑 Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE DANGER CONFIRMATION MODAL */}
      {permanentDeleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3500,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '24px',
              borderRadius: '16px',
              border: '2px solid #ef4444',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 40px rgba(239, 68, 68, 0.25)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={24} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#991b1b' }}>
                  ⚠ Permanently Delete Customer?
                </h3>
                <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>
                  Admin Authorization Required · Cannot be undone
                </span>
              </div>
            </div>

            {/* Warning Message */}
            <p style={{ fontSize: '13.5px', color: '#4b5563', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              You are about to permanently delete this customer and all associated records. This action cannot be undone.
            </p>

            {/* Customer Details Box */}
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#7f1d1d', fontWeight: 600 }}>Customer Name:</span>
                <strong style={{ color: '#991b1b', fontSize: '14px' }}>{permanentDeleteTarget.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#7f1d1d', fontWeight: 600 }}>Customer ID:</span>
                <span
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '12px',
                    padding: '2px 10px',
                    borderRadius: '6px',
                    letterSpacing: '0.5px'
                  }}
                >
                  {permanentDeleteTarget.id}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#7f1d1d', fontWeight: 600 }}>Mobile Number:</span>
                <strong style={{ color: '#991b1b' }}>+91 {permanentDeleteTarget.phone}</strong>
              </div>
            </div>

            {/* Type DELETE Instruction & Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1f2937', marginBottom: '6px' }}>
                To permanently delete this customer and all associated records, type <strong style={{ color: '#dc2626' }}>DELETE</strong> below to confirm.
              </label>
              <input
                type="text"
                className="input-control"
                placeholder="Type DELETE to confirm"
                value={permanentDeleteInput}
                onChange={(e) => setPermanentDeleteInput(e.target.value)}
                style={{
                  borderColor: permanentDeleteInput === 'DELETE' ? '#dc2626' : '#cbd5e1',
                  backgroundColor: permanentDeleteInput === 'DELETE' ? '#fef2f2' : '#ffffff',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  fontSize: '14px'
                }}
              />
              {permanentDeleteInput && permanentDeleteInput !== 'DELETE' && (
                <span style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                  ⚠ Type DELETE in capital letters to confirm.
                </span>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isDeletingPermanently}
                onClick={() => {
                  setPermanentDeleteTarget(null);
                  setPermanentDeleteInput('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                disabled={permanentDeleteInput !== 'DELETE' || isDeletingPermanently}
                onClick={handleConfirmPermanentDelete}
                style={{
                  backgroundColor: permanentDeleteInput === 'DELETE' && !isDeletingPermanently ? '#dc2626' : '#9ca3af',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '8px 20px',
                  borderRadius: '8px',
                  cursor: permanentDeleteInput === 'DELETE' && !isDeletingPermanently ? 'pointer' : 'not-allowed',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isDeletingPermanently ? (
                  <>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
