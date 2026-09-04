import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Search,
  CreditCard,
  Landmark,
  BookOpen,
  Bell,
  HardDriveDownload,
  Shield,
  Settings,
  ChevronDown,
  ChevronRight,
  Power,
  Moon,
  Sun,
  LogOut,
  X
} from 'lucide-react';

import { KKVLogo } from '../common/KKVLogo';
import { BackupCloseModal } from '../common/BackupCloseModal';

export const Sidebar: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    darkMode,
    toggleDarkMode,
    isMobileMenuOpen,
    closeMobileMenu,
    userRole,
    currentUser,
    hasPermission,
    logoutUser
  } = useApp();

  const [customersOpen, setCustomersOpen] = useState(true);
  const [loanDetailsOpen, setLoanDetailsOpen] = useState(true);
  const [fixedDepositsOpen, setFixedDepositsOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, closeMobileMenu]);

  useEffect(() => {
    if (['customers', 'customers-add', 'add-customer-form', 'search-customer'].includes(currentPage)) {
      setCustomersOpen(true);
    }
    if (
      [
        'loan-issue',
        'loan-display',
        'loan-receipts',
        'receipt-display',
        'all-receipts',
        'pending-loans',
        'total-loans',
        'rc-renewal-reminders',
        'bill-balance'
      ].includes(currentPage)
    ) {
      setLoanDetailsOpen(true);
    }
    if (
      [
        'fd-customers',
        'new-deposit',
        'deposit-display',
        'deposit-interest',
        'interest-display',
        'interest-pending',
        'deposit-withdrawal',
        'withdrawal-display',
        'fd-customers-deposits'
      ].includes(currentPage)
    ) {
      setFixedDepositsOpen(true);
    }
    if (
      ['day-book', 'trial-balance', 'profit-loss', 'balance-sheet', 'accounts'].includes(currentPage)
    ) {
      setAccountsOpen(true);
    }
  }, [currentPage]);

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const handleBackupAndClose = () => {
    setIsBackupModalOpen(true);
  };

  const handleFinishCloseSession = () => {
    logoutUser();
  };

  const roleLabel =
    userRole === 'MASTER_ADMIN'
      ? 'Master Admin'
      : userRole === 'ADMIN'
      ? 'Admin'
      : userRole === 'MANAGER'
      ? 'Branch Manager'
      : 'Operator';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMobileMenu}
          aria-label="Close menu"
        />
      )}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand" onClick={() => setCurrentPage('dashboard')}>
          <KKVLogo size={38} />
          <div className="sidebar-brand-text">
            <h2>KKV GOLD FINANCE</h2>
            <p>MAIN BRANCH</p>
          </div>
          {/* Mobile Close Button */}
          <button
            className="mobile-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              closeMobileMenu();
            }}
            aria-label="Close Navigation Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav">
          {/* OVERVIEW */}
          <div className="sidebar-section-label">OVERVIEW</div>
          <button
            className={`sidebar-link ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </button>

          {/* OPERATIONS */}
          <div className="sidebar-section-label">OPERATIONS</div>

          {/* Customers Section */}
          <div>
            <button
              className={`sidebar-link ${['customers', 'customers-add', 'add-customer-form', 'search-customer'].includes(currentPage) ? 'active' : ''}`}
              onClick={() => {
                setCustomersOpen(!customersOpen);
              }}
            >
              <Users size={17} />
              <span style={{ flex: 1, textAlign: 'left' }}>Customers</span>
              {customersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {customersOpen && (
              <div className="sidebar-submenu">
                <button
                  className={`sidebar-sublink ${['customers', 'customers-add', 'add-customer-form'].includes(currentPage) ? 'active' : ''}`}
                  onClick={() => setCurrentPage('customers-add')}
                >
                  <UserPlus size={14} style={{ marginRight: '6px' }} />
                  Add Customer
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'search-customer' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('search-customer')}
                >
                  <Search size={14} style={{ marginRight: '6px' }} />
                  Search Customer
                </button>
              </div>
            )}
          </div>

          {/* Loan Details */}
          <div>
            <button
              className={`sidebar-link ${[
                'loan-issue',
                'loan-display',
                'loan-receipts',
                'receipt-display',
                'all-receipts',
                'pending-loans',
                'total-loans',
                'rc-renewal-reminders',
                'bill-balance'
              ].includes(currentPage)
                ? 'active'
                : ''
                }`}
              onClick={() => setLoanDetailsOpen(!loanDetailsOpen)}
            >
              <CreditCard size={17} />
              <span style={{ flex: 1, textAlign: 'left' }}>Loan Details</span>
              {loanDetailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {loanDetailsOpen && (
              <div className="sidebar-submenu">
                <button
                  className={`sidebar-sublink ${currentPage === 'loan-issue' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('loan-issue')}
                >
                  Loan Issue
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'loan-display' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('loan-display')}
                >
                  Loan Display
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'loan-receipts' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('loan-receipts')}
                >
                  Loan Receipts
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'receipt-display' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('receipt-display')}
                >
                  Receipt Display
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'all-receipts' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('all-receipts')}
                >
                  All Receipts
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'pending-loans' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('pending-loans')}
                >
                  Pending Loans
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'total-loans' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('total-loans')}
                >
                  Total Loans
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'rc-renewal-reminders' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('rc-renewal-reminders')}
                >
                  RC &amp; Renewal Reminders
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'bill-balance' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('bill-balance')}
                >
                  Bill Balance
                </button>
              </div>
            )}
          </div>

          {/* Fixed Deposits */}
          <div>
            <button
              className={`sidebar-link ${[
                'new-deposit',
                'deposit-display',
                'deposit-interest',
                'interest-display',
                'interest-pending',
                'deposit-withdrawal',
                'withdrawal-display',
                'fd-customers-deposits'
              ].includes(currentPage)
                ? 'active'
                : ''
                }`}
              onClick={() => setFixedDepositsOpen(!fixedDepositsOpen)}
            >
              <Landmark size={17} />
              <span style={{ flex: 1, textAlign: 'left' }}>Fixed Deposits</span>
              {fixedDepositsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {fixedDepositsOpen && (
              <div className="sidebar-submenu">
                <button
                  className={`sidebar-sublink ${currentPage === 'new-deposit' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('new-deposit')}
                >
                  New Deposit
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'deposit-display' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('deposit-display')}
                >
                  Deposit Display
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'deposit-interest' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('deposit-interest')}
                >
                  Deposit Interest
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'interest-display' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('interest-display')}
                >
                  Interest Display
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'interest-pending' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('interest-pending')}
                >
                  Interest Pending
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'deposit-withdrawal' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('deposit-withdrawal')}
                >
                  Deposit Withdrawal
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'withdrawal-display' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('withdrawal-display')}
                >
                  Withdrawal Display
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'fd-customers-deposits' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('fd-customers-deposits')}
                >
                  FD Customers &amp; Deposits
                </button>
              </div>
            )}
          </div>

          {/* Accounts */}
          <div>
            <button
              className={`sidebar-link ${['day-book', 'trial-balance', 'profit-loss', 'balance-sheet', 'accounts'].includes(currentPage)
                ? 'active'
                : ''
                }`}
              onClick={() => setAccountsOpen(!accountsOpen)}
            >
              <BookOpen size={17} />
              <span style={{ flex: 1, textAlign: 'left' }}>Accounts</span>
              {accountsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {accountsOpen && (
              <div className="sidebar-submenu">
                <button
                  className={`sidebar-sublink ${currentPage === 'day-book' || currentPage === 'accounts' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('day-book')}
                >
                  Day Book
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'trial-balance' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('trial-balance')}
                >
                  Trial Balance
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'profit-loss' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('profit-loss')}
                >
                  Profit &amp; Loss
                </button>
                <button
                  className={`sidebar-sublink ${currentPage === 'balance-sheet' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('balance-sheet')}
                >
                  Balance Sheet
                </button>
              </div>
            )}
          </div>

          <button
            className={`sidebar-link ${currentPage === 'daily-reminders' ? 'active' : ''}`}
            onClick={() => setCurrentPage('daily-reminders')}
          >
            <Bell size={17} />
            <span>Daily Reminders</span>
          </button>

          {/* DATA - hidden if Operator */}
          {userRole !== 'OPERATOR' && (
            <>
              <div className="sidebar-section-label">DATA</div>
              <button
                className={`sidebar-link ${currentPage === 'backup-restore' ? 'active' : ''}`}
                onClick={() => setCurrentPage('backup-restore')}
              >
                <HardDriveDownload size={17} />
                <span>Backup &amp; Restore</span>
              </button>
            </>
          )}

          {/* SYSTEM - only if adminPanel or settings permission */}
          {(hasPermission('adminPanel') || hasPermission('settings')) && (
            <>
              <div className="sidebar-section-label">SYSTEM</div>
              {hasPermission('adminPanel') && (
                <button
                  className={`sidebar-link ${currentPage === 'admin-panel' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('admin-panel')}
                >
                  <Shield size={17} />
                  <span>Admin Panel</span>
                </button>
              )}
              {hasPermission('settings') && (
                <button
                  className={`sidebar-link ${currentPage === 'settings' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('settings')}
                >
                  <Settings size={17} />
                  <span>Settings</span>
                </button>
              )}
            </>
          )}
        </nav>

        {/* Footer Controls */}
        <div className="sidebar-footer" style={{ padding: '10px 10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', gap: '7px', fontSize: '12.5px', padding: '7px 12px', height: '34px' }}
            onClick={handleBackupAndClose}
          >
            <Power size={14} />
            <span>Backup &amp; Close</span>
          </button>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', gap: '7px', fontSize: '12.5px', padding: '7px 12px', height: '34px' }}
            onClick={toggleDarkMode}
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', marginTop: '2px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Signed in as</p>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {currentUser?.displayName || roleLabel}
              </p>
              <span style={{ fontSize: '10.5px', color: 'var(--color-gold-light)', fontWeight: 600 }}>
                {roleLabel}
              </span>
            </div>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Sign Out"
              onClick={logoutUser}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Backup & Close Workflow Modal */}
      <BackupCloseModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onFinishCloseSession={handleFinishCloseSession}
      />
    </>
  );
};
