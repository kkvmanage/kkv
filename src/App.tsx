import React from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
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
import { BackupRestore } from './pages/BackupRestore';
import { AdminPanel } from './pages/AdminPanel';
import { Settings } from './pages/Settings';

import { KKVLogo } from './components/common/KKVLogo';

export const App: React.FC = () => {
  const {
    currentPage,
    toasts,
    isWorkspaceSelected,
    setIsWorkspaceSelected,
    setSelectedWorkspace
  } = useApp();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'loan-issue':
        return <LoanIssue />;
      case 'loan-display':
        return <LoanDisplay />;
      case 'loan-receipts':
        return <LoanReceipts />;
      case 'receipt-display':
        return <ReceiptDisplay />;
      case 'all-receipts':
        return <AllReceipts />;
      case 'pending-loans':
        return <PendingLoans />;
      case 'total-loans':
        return <TotalLoans />;
      case 'rc-renewal-reminders':
        return <RCRenewalReminders />;
      case 'bill-balance':
        return <BillBalance />;
      case 'fd-customers':
      case 'new-deposit':
      case 'deposit-display':
      case 'deposit-interest':
      case 'interest-display':
      case 'interest-pending':
      case 'deposit-withdrawal':
      case 'withdrawal-display':
      case 'fd-customers-deposits':
        return <FixedDeposits />;
      case 'day-book':
      case 'trial-balance':
      case 'profit-loss':
      case 'balance-sheet':
      case 'accounts':
        return <Accounts />;
      case 'daily-reminders':
        return <DailyReminders />;
      case 'backup-restore':
        return <BackupRestore />;
      case 'admin-panel':
        return <AdminPanel />;
      case 'settings':
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
              border: `1px solid ${
                t.type === 'error'
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



      {/* Workspace Selection Modal (Frame 1261) */}
      {!isWorkspaceSelected && (
        <div className="workspace-overlay">
          <div className="workspace-card">
            <div className="workspace-header">
              <KKVLogo size={36} />
              <div className="user-details">
                <h3>Welcome back.</h3>
                <span>kkvgoldfinance@gmail.com</span>
              </div>
              <button
                className="btn-signout"
                onClick={() => {
                  setIsWorkspaceSelected(false);
                }}
              >
                Sign out
              </button>
            </div>

            <div className="workspace-section-title">
              <span className="pill-dot"></span> WORKSPACE
            </div>
            <h2>Choose a company</h2>
            <p className="workspace-subtitle">Pick one to continue, or create a brand-new workspace.</p>

            <div
              className="company-select-item"
              onClick={() => {
                setSelectedWorkspace('KKV GOLD FINANCE');
                setIsWorkspaceSelected(true);
              }}
            >
              <KKVLogo size={36} />
              <div className="company-info">
                <strong>KKV GOLD FINANCE</strong>
                <span>🏠 Main Branch</span>
              </div>
              <span className="arrow-icon">›</span>
            </div>

            <div className="workspace-tags">
              <span>• Isolated data</span>
              <span>• Role-based access</span>
              <span>• Switch anytime</span>
            </div>

            <div className="workspace-footer">
              <span>🛡 Each workspace stays private & encrypted</span>
              <small>Customers · Loans · Deposits · Receipts · Reports</small>
            </div>
          </div>
        </div>
      )}

      {/* Main Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-content">
        <Topbar />
        <main>{renderPage()}</main>
      </div>
    </div>
  );
};

export const AppContent = App;
export default App;

