import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';

// Page Views
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { SearchCustomer } from './pages/SearchCustomer';
import { CustomerProfile } from './pages/CustomerProfile';
import { LoanIssue } from './pages/LoanIssue';
import { LoanDisplay } from './pages/LoanDisplay';
import { LoanReceipts } from './pages/LoanReceipts';
import { ReceiptDisplay } from './pages/ReceiptDisplay';
import { AllReceipts } from './pages/AllReceipts';
import { PendingLoans } from './pages/PendingLoans';
import { TotalLoans } from './pages/TotalLoans';
import { RCRenewalReminders } from './pages/RCRenewalReminders';
import { BillBalance } from './pages/BillBalance';
import { FixedDeposits } from './pages/FixedDeposits';
import { Accounts } from './pages/Accounts';
import { DailyReminders } from './pages/DailyReminders';
import { AdminPanel } from './pages/AdminPanel';
import { Settings } from './pages/Settings';
import { NotificationCenter } from './components/notifications/NotificationCenter';

import { ShieldAlert } from 'lucide-react';
import { LoginView } from './components/auth/LoginView';

export const App: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    toasts,
    userRole,
    currentUser,
    authLoading,
    hasPermission,
    loginWithCredentials,
    loginWithGoogle,
    resetPasswordEmail,
    isNotificationOpen,
    setIsNotificationOpen
  } = useApp();

  // Login Form State — Production Ready (No Hardcoded Test Credentials)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both email address and password.');
      return;
    }

    setIsLoggingIn(true);
    const res = await loginWithCredentials(loginEmail.trim(), loginPassword.trim());
    setIsLoggingIn(false);

    if (!res.success) {
      setLoginError(res.message || 'Incorrect email or password.');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    setIsGoogleLoggingIn(true);
    const res = await loginWithGoogle();
    setIsGoogleLoggingIn(false);

    if (!res.success) {
      setLoginError(res.message || 'Google authentication failed.');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    await resetPasswordEmail(resetEmail.trim());
    setIsForgotPasswordOpen(false);
  };

  // ── Access Denied View for Unauthorized Direct Navigation ──────────────────
  const renderAccessDenied = (moduleName: string) => (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '65vh' }}>
      <div
        className="card"
        style={{
          maxWidth: '480px',
          textAlign: 'center',
          padding: '36px 28px',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          backgroundColor: 'rgba(239, 68, 68, 0.04)'
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <ShieldAlert size={28} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          ACCESS DENIED
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
          You do not have permission to access <strong>{moduleName}</strong>. Your assigned role is <strong>{userRole || 'OPERATOR'}</strong>. Please contact the Master Admin if you require access.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ margin: '0 auto', minWidth: '180px', justifyContent: 'center' }}
          onClick={() => setCurrentPage('dashboard')}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  // ── Route & Permission Guard ───────────────────────────────────────────────
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;

      case 'customers':
      case 'customers-add':
      case 'add-customer-form':
      case 'search-customer':
      case 'customer-profile':
        if (!hasPermission('customers')) return renderAccessDenied('Customer Management');
        if (currentPage === 'customers' || currentPage === 'customers-add' || currentPage === 'add-customer-form') return <Customers />;
        if (currentPage === 'search-customer') return <SearchCustomer />;
        return <CustomerProfile />;

      case 'loan-issue':
      case 'loan-display':
      case 'all-receipts':
      case 'total-loans':
      case 'rc-renewal-reminders':
      case 'bill-balance':
        if (!hasPermission('loans')) return renderAccessDenied('Loan Management');
        if (currentPage === 'loan-issue') return <LoanIssue />;
        if (currentPage === 'loan-display') return <LoanDisplay />;
        if (currentPage === 'all-receipts') return <AllReceipts />;
        if (currentPage === 'total-loans') return <TotalLoans />;
        if (currentPage === 'rc-renewal-reminders') return <RCRenewalReminders />;
        return <BillBalance />;

      case 'loan-receipts':
      case 'receipt-display':
        if (!hasPermission('loanReceipts')) return renderAccessDenied('Loan Receipts');
        if (currentPage === 'loan-receipts') return <LoanReceipts />;
        return <ReceiptDisplay />;

      case 'pending-loans':
        if (!hasPermission('pendingLoans')) return renderAccessDenied('Pending Loans Approval');
        return <PendingLoans />;

      case 'new-deposit':
      case 'deposit-display':
      case 'fd-customers':
      case 'fd-customers-deposits':
        if (!hasPermission('fixedDeposits')) return renderAccessDenied('Fixed Deposits');
        return <FixedDeposits />;

      case 'deposit-interest':
      case 'interest-display':
      case 'interest-pending':
        if (!hasPermission('fdInterest')) return renderAccessDenied('Fixed Deposit Interest');
        return <FixedDeposits />;

      case 'deposit-withdrawal':
      case 'withdrawal-display':
        if (!hasPermission('fdWithdrawal')) return renderAccessDenied('Fixed Deposit Withdrawal');
        return <FixedDeposits />;

      case 'day-book':
      case 'trial-balance':
      case 'profit-loss':
      case 'balance-sheet':
      case 'accounts':
        return <Accounts />;

      case 'daily-reminders':
        if (!hasPermission('notifications')) return renderAccessDenied('Daily Reminders');
        return <DailyReminders />;

      case 'notifications':
        return <NotificationCenter isFullPage={true} />;

      case 'backup-restore':
      case 'admin-panel':
        if (!hasPermission('adminPanel')) return renderAccessDenied('Admin Panel');
        return <AdminPanel />;

      case 'settings':
        if (!hasPermission('settings')) return renderAccessDenied('Branch Settings');
        return <Settings />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      {/* Toast Notification Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 9999,
          maxWidth: '380px'
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              backgroundColor:
                t.type === 'error'
                  ? 'rgba(201, 106, 106, 0.12)'
                  : t.type === 'warning'
                    ? 'rgba(210, 168, 74, 0.12)'
                    : t.type === 'success'
                      ? 'rgba(47, 111, 91, 0.15)'
                      : 'var(--bg-card)',
              color:
                t.type === 'error'
                  ? '#C96A6A'
                  : t.type === 'warning'
                    ? '#D2A84A'
                    : t.type === 'success'
                      ? '#4FAF86'
                      : 'var(--text-primary)',
              border: `1px solid ${t.type === 'error'
                ? 'rgba(201, 106, 106, 0.4)'
                : t.type === 'warning'
                  ? 'rgba(210, 168, 74, 0.4)'
                  : t.type === 'success'
                    ? 'rgba(47, 111, 91, 0.4)'
                    : 'var(--border-light)'
                }`,
              borderRadius: 'var(--radius-md)',
              padding: '11px 18px',
              boxShadow: 'var(--shadow-lg)',
              fontSize: '13.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backdropFilter: 'blur(8px)',
              animation: 'slideInRight 0.2s ease'
            }}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* ── PRODUCTION FIREBASE AUTHENTICATION SCREEN ── */}
      {(!userRole || !currentUser) && (
        <LoginView
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          loginError={loginError}
          isLoggingIn={isLoggingIn}
          isGoogleLoggingIn={isGoogleLoggingIn}
          authLoading={authLoading}
          handleLogin={handleLogin}
          handleGoogleSignIn={handleGoogleSignIn}
          isForgotPasswordOpen={isForgotPasswordOpen}
          setIsForgotPasswordOpen={setIsForgotPasswordOpen}
          resetEmail={resetEmail}
          setResetEmail={setResetEmail}
          handlePasswordReset={handlePasswordReset}
        />
      )}

      {/* ── AUTHENTICATED APP WORKSPACE ── */}
      {userRole !== null && currentUser !== null && (
        <>
          {/* Main Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="main-content">
            <Topbar />
            <main style={{ minHeight: 'calc(100vh - var(--topbar-height))', display: 'flex', flexDirection: 'column' }}>
              {renderPage()}
            </main>
          </div>

          {/* Centralized Notification Center Modal / Flyout */}
          {isNotificationOpen && (
            <NotificationCenter isFullPage={false} onClose={() => setIsNotificationOpen(false)} />
          )}
        </>
      )}
    </div>
  );
};

export const AppContent = App;
export default App;
