import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, Plus, Menu } from 'lucide-react';
import { NavPage } from '../../types';
import { KKVLogo } from '../common/KKVLogo';
import { GlobalSearch } from '../common/GlobalSearch';

interface PageMetadata {
  title: string;
  subtitle: string;
}

const pageTitles: Record<NavPage, PageMetadata> = {
  dashboard: {
    title: 'Dashboard Overview',
    subtitle: 'Real-time vault gold weight, active pledges, and monthly interest accrual'
  },
  customers: {
    title: 'Customers',
    subtitle: 'Manage borrowers and KYC details.'
  },
  'loan-issue': {
    title: 'Issue New Loan',
    subtitle: 'Issue new loans and review recent loan list.'
  },
  'loan-display': {
    title: 'Loan Display',
    subtitle: 'Active gold loan book, customer pledges, interest rates, and loan statuses'
  },
  'loan-receipts': {
    title: 'Loan Receipts',
    subtitle: 'Record borrower repayments, interest credits, and closure receipts'
  },
  'receipt-display': {
    title: 'Receipt Display',
    subtitle: 'Official printable payment voucher and customer acknowledgment'
  },
  'all-receipts': {
    title: 'All Receipts',
    subtitle: 'Loan disbursements and payment receipts only.'
  },
  'pending-loans': {
    title: 'Pending Loans',
    subtitle: 'Approval queue for high-value pledges, document verifications & renewals'
  },
  'total-loans': {
    title: 'Total Loans',
    subtitle: 'Comprehensive ledger of historical and active gold loan portfolio'
  },
  'rc-renewal-reminders': {
    title: 'RC & Renewal Reminders',
    subtitle: 'Pledge maturity notices, annual renewals, and collection alerts'
  },
  'bill-balance': {
    title: 'Bill Balance',
    subtitle: 'Borrower statement of account, principal dues, paid ledger, and net balances'
  },
  'fd-customers': {
    title: 'Add FD Customers',
    subtitle: 'Register fixed deposit depositors and KYC documents.'
  },
  'new-deposit': {
    title: 'Issue New Fixed Deposit',
    subtitle: 'Existing or new deposit, monthly interest payout.'
  },
  'deposit-display': {
    title: 'Deposit Display',
    subtitle: 'Active fixed deposit contracts and monthly yield commitments'
  },
  'deposit-interest': {
    title: 'Deposit Interest',
    subtitle: 'Calculate and disburse guaranteed monthly deposit dividend payouts'
  },
  'interest-display': {
    title: 'Interest Display',
    subtitle: 'Itemized historical interest payouts ledger for depositors'
  },
  'interest-pending': {
    title: 'Interest Pending',
    subtitle: 'Upcoming monthly interest dividend obligations schedule'
  },
  'deposit-withdrawal': {
    title: 'Deposit Withdrawal',
    subtitle: 'Matured fixed deposit settlement and capital payout'
  },
  'withdrawal-display': {
    title: 'Withdrawal Display',
    subtitle: 'Historical record of withdrawn and matured fixed deposits'
  },
  'fd-customers-deposits': {
    title: 'FD Customers & Deposits',
    subtitle: 'Unified directory of deposit holders and active deposit portfolios'
  },
  'day-book': {
    title: 'Day Book',
    subtitle: 'Daily cash and bank transactions chronologically summarized'
  },
  'trial-balance': {
    title: 'Trial Balance',
    subtitle: 'Double-entry trial balance ledger verifying branch accounts'
  },
  'profit-loss': {
    title: 'Profit & Loss',
    subtitle: 'Interest spread, processing fee revenue, and operational expenses'
  },
  'balance-sheet': {
    title: 'Balance Sheet',
    subtitle: 'Position of assets (gold pledges, vault cash) and liabilities'
  },
  accounts: {
    title: 'Day Book & Accounts',
    subtitle: 'Financial statements, general ledger, and cash positions'
  },
  'daily-reminders': {
    title: 'Daily Reminders',
    subtitle: 'Customer collection calls, interest follow-ups, and operational tasks'
  },
  'backup-restore': {
    title: 'Backup & Restore',
    subtitle: 'Encrypted offline database snapshot export and recovery'
  },
  'admin-panel': {
    title: 'Admin Panel',
    subtitle: 'Authorized administrative controls, role permissions, and audit logs'
  },
  settings: {
    title: 'Settings',
    subtitle: 'Branch configuration, 22ct gold rate valuation, and printer setup'
  },
  lockers: {
    title: 'Locker Management',
    subtitle: 'Track cabinet allocations, issue lockers, and record rent payouts'
  }
};

export const Topbar: React.FC = () => {
  const { currentPage, setCurrentPage, showToast, toggleMobileMenu } = useApp();

  const meta = pageTitles[currentPage] || {
    title: 'KKV Gold Finance',
    subtitle: 'Branch Management System'
  };

  return (
    <header className="topbar">
      {/* Left: Mobile Hamburger + Official Logo + Dynamic Page Title & Subtitle */}
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="mobile-hamburger-btn"
          onClick={toggleMobileMenu}
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <KKVLogo size={32} />
          <div>
            <h1 className="page-header-title">{meta.title}</h1>
            <p className="page-header-subtitle">{meta.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Right: Search, Notification Icon, + New Loan Button */}
      <div className="topbar-right">
        {/* Global Search Bar */}
        <GlobalSearch />

        {/* Notification Icon */}
        <button
          className="topbar-action-btn"
          title="Notifications"
          onClick={() => showToast('All daily alerts and reminder notifications up to date.', 'info')}
        >
          <Bell size={17} />
          <span className="notification-dot"></span>
        </button>

        {/* + New Loan Button */}
        <button
          className="btn btn-primary topbar-new-loan-btn"
          onClick={() => setCurrentPage('loan-issue')}
        >
          <Plus size={15} />
          <span className="btn-label-desktop">New Loan</span>
        </button>
      </div>
    </header>
  );
};
