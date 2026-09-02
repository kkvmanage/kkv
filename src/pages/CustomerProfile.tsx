import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  User,
  ShieldCheck,
  MapPin,
  Eye,
  Edit3,
  Plus,
  FileSpreadsheet,
  Receipt as ReceiptIcon,
  Coins,
  Clock,
  AlertCircle,
  ExternalLink,
  Landmark
} from 'lucide-react';
import { formatIdProofDisplay } from '../utils/kycValidation';
import { EditCustomerModal } from '../components/common/EditCustomerModal';
import { isMatchingCustomerId } from '../utils/customerUtils';

type ActiveTab = 'overview' | 'loans' | 'fixed-deposits' | 'pledged-items' | 'payments' | 'activity';

export const CustomerProfile: React.FC = () => {
  const {
    customers,
    loans,
    fixedDeposits,
    receipts,
    selectedProfileCustomerId,
    setSelectedLoan,
    setCurrentPage,
    updateCustomer,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Find customer by id or customerId
  const customer = customers.find(
    (c) => c.id === selectedProfileCustomerId || (c.customerId && c.customerId.toString() === selectedProfileCustomerId)
  ) || customers[0];

  if (!customer) {
    return (
      <div className="page-content" style={{ padding: '40px', textAlign: 'center' }}>
        <button className="btn btn-secondary" onClick={() => setCurrentPage('search-customer')} style={{ marginBottom: '20px' }}>
          <ArrowLeft size={16} />
          <span>Back to Search Customers</span>
        </button>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={48} color="var(--color-danger, #ef4444)" style={{ margin: '0 auto 16px' }} />
          <h2>Customer Profile Not Found</h2>
          <p style={{ color: 'var(--text-muted)' }}>The requested customer profile could not be located.</p>
        </div>
      </div>
    );
  }

  // Open Edit Modal with current data
  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  // Get all loans belonging to this customer
  const customerLoans = loans.filter((l) => isMatchingCustomerId(l.customerId, customer));

  const activeLoansCount = customerLoans.filter((l) => l.status === 'ACTIVE').length;
  const closedLoansCount = customerLoans.filter((l) => l.status === 'CLOSED').length;

  // Get all Fixed Deposits belonging to this customer
  const customerFDs = fixedDeposits.filter((fd) => isMatchingCustomerId(fd.customerId, customer));
  const activeFDsCount = customerFDs.filter((fd) => fd.status === 'ACTIVE').length;
  const totalFdBalance = customerFDs.filter((fd) => fd.status === 'ACTIVE').reduce((sum, fd) => sum + (fd.remainingPrincipal ?? fd.principal ?? 0), 0);
  const totalOutstandingLoans = customerLoans.filter((l) => l.status === 'ACTIVE').reduce((sum, l) => sum + (l.outstandingPrincipal ?? l.principal ?? 0), 0);
  const totalFinancialExposure = totalOutstandingLoans + totalFdBalance;
  const totalPrincipalBorrowed = customerLoans.reduce((sum, l) => sum + (l.principal || 0), 0);

  // All Pledged Items across customer loans
  const allPledgedItems = customerLoans.flatMap((l) =>
    (l.items || []).map((item) => ({
      ...item,
      loanNo: l.loanNo,
      loanId: l.id,
      loanDate: l.date,
      loanStatus: l.status
    }))
  );

  const totalGrossWt = allPledgedItems.reduce((sum, i) => sum + (i.grossWeight || 0), 0);
  const totalNetWt = allPledgedItems.reduce((sum, i) => sum + (i.netWeight || 0), 0);
  const totalValuation = customerLoans.reduce((sum, l) => sum + (l.marketValue || l.principal * 1.3), 0);

  // All Payment Receipts for this customer
  const customerReceipts = receipts.filter(
    (r) =>
      r.customerId === customer.id ||
      (customer.customerId && r.customerId === customer.customerId.toString()) ||
      customerLoans.some((l) => l.loanNo === r.loanNo)
  );

  const totalPaid = customerReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);

  const handleViewLoan = (loan: any) => {
    setSelectedLoan(loan);
    setCurrentPage('loan-display');
    showToast(`Viewing loan details for ${loan.loanNo}`, 'info');
  };

  const loc: any = customer.currentLocation;
  const mapsUrl = loc?.googleMapsUrl || loc?.mapsUrl || (loc?.coordinates ? `https://maps.google.com/?q=${loc.coordinates}` : null);

  // Activity Timeline Events
  const activityEvents = [
    {
      id: 'act-1',
      date: customer.joinedDate || '01/08/2026',
      title: 'Customer Onboarded & Profile Created',
      desc: `Registered customer ${customer.name} with Master ID ${customer.id}`,
      type: 'user'
    },
    ...customerLoans.map((l) => ({
      id: `act-loan-${l.id}`,
      date: l.date,
      title: `Loan ${l.loanNo} Issued`,
      desc: `${l.loanType} principal of ₹${l.principal.toLocaleString('en-IN')} issued @ ${l.interestRate}% interest/mo`,
      type: 'loan'
    })),
    ...customerFDs.map((fd) => ({
      id: `act-fd-${fd.id}`,
      date: fd.depositDate,
      title: `Fixed Deposit ${fd.fdNo} Created`,
      desc: `Term deposit of ₹${fd.principal.toLocaleString('en-IN')} issued @ ${fd.interestRatePA}% p.a.`,
      type: 'fd'
    })),
    ...customerReceipts.map((r) => ({
      id: `act-rc-${r.id}`,
      date: r.date,
      title: `Payment Receipt #${r.receiptNo} Recorded`,
      desc: `Received ₹${r.amount.toLocaleString('en-IN')} via ${r.paymentMode} for Loan ${r.loanNo} (${r.kind})`,
      type: 'receipt'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* TOP BAR: NAVIGATION & ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setCurrentPage('search-customer')}
          style={{ gap: '8px', fontWeight: 600, fontSize: '13px' }}
        >
          <ArrowLeft size={16} />
          <span>← Back to Search Customers</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleOpenEditModal}
            style={{ gap: '6px', fontSize: '13px', padding: '8px 16px', fontWeight: 600 }}
          >
            <Edit3 size={15} />
            <span>Edit Customer Profile</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => {
              setCurrentPage('loan-issue');
              showToast(`Pre-selected customer ${customer.name} for Loan Issue`, 'info');
            }}
            style={{ gap: '6px', fontSize: '13px', padding: '8px 16px', fontWeight: 700 }}
          >
            <Plus size={15} />
            <span>+ Issue New Loan</span>
          </button>
        </div>
      </div>

      {/* PAGE TITLE */}
      <div>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)' }}>
          Customer Details
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
          Complete master profile, KYC verification, loans, fixed deposits and activity history.
        </p>
      </div>

      {/* HERO PROFILE HEADER CARD */}
      <div
        className="card"
        style={{
          padding: '24px',
          border: '1px solid var(--border-light, #e2e8f0)',
          borderRadius: '14px',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 8px rgba(15, 60, 45, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: '1 1 300px', minWidth: '260px' }}>
            {/* PHOTO / AVATAR */}
            {customer.customerPhoto ? (
              <img
                src={customer.customerPhoto}
                alt={customer.name}
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--color-primary-accent, #059669)',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.15)',
                  flexShrink: 0
                }}
              />
            ) : (
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-light-accent, #e6f4f1)',
                  color: 'var(--color-primary-dark, #163f35)',
                  fontWeight: 800,
                  fontSize: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid var(--color-primary-accent, #059669)',
                  flexShrink: 0
                }}
              >
                {customer.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* NAME & PRIMARY METADATA */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)' }}>
                  {customer.name}
                </h1>
                <span className={`badge ${customer.status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
                  {customer.status === 'VERIFIED' ? '✓ Verified Borrower' : '🟡 Pending KYC'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>
                <span style={{ color: 'var(--color-primary-dark)', fontWeight: 800, backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', padding: '2px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  Customer ID: {customer.id}
                </span>
                <span>📱 +91 {customer.phone}</span>
                {customer.email && <span>✉️ {customer.email}</span>}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                📍 {customer.currentAddress ? customer.currentAddress.slice(0, 45) + (customer.currentAddress.length > 45 ? '...' : '') : 'Registered Borrower'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-CARD FINANCIAL SUMMARY METRICS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div className="card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL LOANS</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '6px' }}>{customerLoans.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>All issued pledges</div>
        </div>

        <div className="card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--badge-success-text, #166534)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIVE LOANS</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--badge-success-text, #166534)', marginTop: '6px' }}>{activeLoansCount}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Currently open</div>
        </div>

        <div className="card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL FD BALANCE</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '6px', whiteSpace: 'nowrap' }}>₹{totalFdBalance.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Active deposits</div>
        </div>

        <div className="card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-accent, #059669)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIVE DEPOSITS</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary-accent, #059669)', marginTop: '6px' }}>{activeFDsCount}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Currently active</div>
        </div>

        <div className="card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-accent, #059669)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FINANCIAL EXPOSURE</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary-accent, #059669)', marginTop: '6px', whiteSpace: 'nowrap' }}>₹{totalFinancialExposure.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Loans + deposits</div>
        </div>
      </div>

      {/* MODERN SEGMENTED TAB BAR */}
      <div
        style={{
          display: 'flex',
          backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-light, #e2e8f0)',
          gap: '4px',
          overflowX: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {[
          { id: 'overview', label: 'Overview & KYC', icon: User, count: null },
          { id: 'loans', label: 'Loans', icon: FileSpreadsheet, count: customerLoans.length },
          { id: 'fixed-deposits', label: 'Fixed Deposits', icon: Landmark, count: customerFDs.length },
          { id: 'pledged-items', label: 'Pledged Items', icon: Coins, count: allPledgedItems.length },
          { id: 'payments', label: 'Payments', icon: ReceiptIcon, count: customerReceipts.length },
          { id: 'activity', label: 'Activity', icon: Clock, count: activityEvents.length }
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              style={{
                flex: '1 0 auto',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                color: isActive ? 'var(--color-primary-dark, #163f35)' : 'var(--text-muted, #64748b)',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2.5px solid var(--color-primary-accent, #059669)' : '2.5px solid transparent',
                boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.05)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <IconComp size={15} color={isActive ? 'var(--color-primary-accent)' : 'var(--text-muted)'} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'var(--color-light-accent, #e6f4f1)' : 'var(--border-subtle, #e2e8f0)',
                    color: isActive ? 'var(--color-primary-dark)' : 'var(--text-muted)'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & KYC */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* LEFT COLUMN: PERSONAL & CONTACT INFORMATION */}
          <div className="card" style={{ padding: '22px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={18} color="var(--color-primary-accent, #059669)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)' }}>
                  PERSONAL &amp; CONTACT INFORMATION
                </h3>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleOpenEditModal}
                style={{ fontSize: '11.5px', padding: '3px 10px', gap: '4px', fontWeight: 600 }}
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>FULL NAME</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark)' }}>{customer.name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CUSTOMER ID</span>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{customer.id}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PHONE</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark)' }}>+91 {customer.phone}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>GENDER</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark)' }}>{customer.gender || 'Male'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AGE / DOB</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  {customer.dateOfBirth ? `${customer.dateOfBirth} (${customer.age || 30} yrs)` : `${customer.age || 30} Years`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>OCCUPATION</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark)' }}>{customer.occupation || 'Self Employed'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>EMAIL</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark)' }}>{customer.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: KYC & ADDRESS VERIFICATION */}
          <div className="card" style={{ padding: '22px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} color="var(--color-primary-accent, #059669)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)' }}>
                  KYC &amp; ADDRESS VERIFICATION
                </h3>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleOpenEditModal}
                style={{ fontSize: '11.5px', padding: '3px 10px', gap: '4px', fontWeight: 600 }}
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ID PROOF TYPE</span>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{customer.idProof || 'Aadhaar Card'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>MASKED ID NUMBER</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark)', fontFamily: 'monospace' }}>
                  {formatIdProofDisplay(customer.idProof, customer.idNumber)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CURRENT ADDRESS</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.4 }}>
                  {customer.currentAddress || 'No current address details recorded'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PERMANENT ADDRESS</span>
                  {(!customer.permanentAddress || customer.permanentAddress === customer.currentAddress) && (
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>
                      ✓ Same as Current
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.4 }}>
                  {customer.permanentAddress || customer.currentAddress || 'Same as current address'}
                </span>
              </div>

              {mapsUrl && (
                <div style={{ marginTop: '4px' }}>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '6px', width: '100%', justifyContent: 'center', fontWeight: 600, fontSize: '12px' }}
                  >
                    <MapPin size={14} color="var(--color-primary-accent)" />
                    <span>View Saved GPS Location on Google Maps</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOANS */}
      {activeTab === 'loans' && (
        <div className="card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)' }}>
                LOANS &amp; BORROWING HISTORY
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                All gold loans, silver loans, and pledge agreements issued for {customer.name} ({customer.id})
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setCurrentPage('loan-issue');
                showToast(`Pre-selected customer ${customer.name} for Loan Issue`, 'info');
              }}
              style={{ gap: '6px', fontSize: '13px', padding: '8px 16px' }}
            >
              <Plus size={15} />
              <span>Issue New Loan</span>
            </button>
          </div>

          {/* LOANS SUMMARY BAR */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL LOANS</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{customerLoans.length}</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--badge-success-text, #166534)', textTransform: 'uppercase' }}>ACTIVE LOANS</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--badge-success-text, #166534)' }}>{activeLoansCount}</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CLOSED LOANS</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-secondary)' }}>{closedLoansCount}</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary-dark)', textTransform: 'uppercase' }}>TOTAL PRINCIPAL</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary-accent, #059669)' }}>₹{totalPrincipalBorrowed.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* LOAN HISTORY TABLE */}
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>LOAN NO</th>
                  <th>LOAN TYPE</th>
                  <th>ISSUE DATE</th>
                  <th>LOAN AMOUNT</th>
                  <th>INTEREST RATE</th>
                  <th>OUTSTANDING</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {customerLoans.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No loans issued yet for this customer.
                    </td>
                  </tr>
                ) : (
                  customerLoans.map((l, idx) => (
                    <tr key={`profile-loan-${l.id}-${idx}`}>
                      <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{l.loanNo}</td>
                      <td>
                        <span className="badge badge-gold">{l.loanType}</span>
                      </td>
                      <td>{l.date}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-accent, #059669)' }}>
                        ₹{l.principal.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{l.interestRate}% / mo</td>
                      <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                        ₹{(l.status === 'CLOSED' ? 0 : (l.outstandingPrincipal ?? l.principal)).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`badge ${l.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ height: '28px', padding: '0 10px', fontSize: '11.5px', gap: '4px', fontWeight: 600 }}
                          onClick={() => handleViewLoan(l)}
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FIXED DEPOSITS */}
      {activeTab === 'fixed-deposits' && (
        <div className="card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)' }}>
                FIXED DEPOSITS REGISTER
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                All term deposits, investment certificates, and maturity details for {customer.name} ({customer.id})
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setCurrentPage('new-deposit');
                showToast(`Pre-selected customer ${customer.name} for Fixed Deposit issue`, 'info');
              }}
              style={{ gap: '6px', fontSize: '13px', padding: '8px 16px' }}
            >
              <Plus size={15} />
              <span>Issue New Deposit</span>
            </button>
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>FD NUMBER</th>
                  <th>DEPOSIT DATE</th>
                  <th>PRINCIPAL AMOUNT</th>
                  <th>INTEREST RATE</th>
                  <th>MONTHLY PAYOUT</th>
                  <th>MATURITY DATE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {customerFDs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No Fixed Deposits recorded yet for this customer.
                    </td>
                  </tr>
                ) : (
                  customerFDs.map((fd, idx) => (
                    <tr key={`profile-fd-${fd.id}-${idx}`}>
                      <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{fd.fdNo}</td>
                      <td>{fd.depositDate}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-accent, #059669)' }}>
                        ₹{fd.principal.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{fd.interestRatePA}% p.a.</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                        ₹{fd.monthlyPayout.toLocaleString('en-IN')} / mo
                      </td>
                      <td>{fd.maturityDate}</td>
                      <td>
                        <span
                          className={`badge ${
                            fd.status === 'ACTIVE'
                              ? 'badge-success'
                              : fd.status === 'MATURED'
                              ? 'badge-info'
                              : 'badge-warning'
                          }`}
                        >
                          {fd.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ height: '28px', padding: '0 10px', fontSize: '11.5px', gap: '4px', fontWeight: 600 }}
                          onClick={() => {
                            setCurrentPage('deposit-display');
                            showToast(`Viewing deposit details for ${fd.fdNo}`, 'info');
                          }}
                        >
                          <Eye size={13} />
                          <span>View FD</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PLEDGED ITEMS */}
      {activeTab === 'pledged-items' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* PLEDGED SUMMARY METRICS */}
          <div className="card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <Coins size={18} color="var(--color-primary-accent, #059669)" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)' }}>
                PLEDGED COLLATERAL &amp; ORNAMENTS SUMMARY
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL ITEMS PLEDGED</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{allPledgedItems.length} Items</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL GROSS WEIGHT</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)' }}>{totalGrossWt.toFixed(2)} g</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL NET WEIGHT</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{totalNetWt.toFixed(2)} g</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ESTIMATED MARKET VALUATION</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary-accent, #059669)' }}>₹{totalValuation.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* ITEMS GROUPED BY LOAN */}
          {customerLoans.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '12px' }}>
              No pledged items found for this customer.
            </div>
          ) : (
            customerLoans.map((l, lIdx) => (
              <div key={`loan-pledge-${l.id}-${lIdx}`} className="card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>🪙</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                        Pledged Collateral for Loan: {l.loanNo}
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Issued: {l.date} · {l.loanType}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${l.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                      {l.status}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleViewLoan(l)}
                      style={{ fontSize: '11.5px', padding: '3px 10px', gap: '4px', fontWeight: 600 }}
                    >
                      <Eye size={13} />
                      <span>View Loan</span>
                    </button>
                  </div>
                </div>

                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>ITEM NAME</th>
                        <th>QTY</th>
                        <th>PURITY</th>
                        <th>GROSS WT (G)</th>
                        <th>NET WT (G)</th>
                        <th>ESTIMATED VALUATION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!l.items || l.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                            No ornament items recorded for this loan.
                          </td>
                        </tr>
                      ) : (
                        l.items.map((item, iIdx) => (
                          <tr key={`item-${l.id}-${item.id || iIdx}`}>
                            <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{item.item}</td>
                            <td>{item.qty}</td>
                            <td><span className="badge badge-gold">{item.purity}</span></td>
                            <td>{item.grossWeight} g</td>
                            <td style={{ fontWeight: 700 }}>{item.netWeight} g</td>
                            <td style={{ fontWeight: 700, color: 'var(--color-primary-accent, #059669)' }}>
                              ₹{((item.netWeight || 1) * 4500).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: PAYMENTS & RECEIPTS */}
      {activeTab === 'payments' && (
        <div className="card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)' }}>
                PAYMENT &amp; RECEIPT HISTORY
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                All repayment and interest receipts recorded for {customer.name}
              </p>
            </div>

            <div style={{ padding: '8px 16px', backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Paid: </span>
              <strong style={{ fontSize: '16px', color: 'var(--color-primary-accent, #059669)' }}>₹{totalPaid.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>RECEIPT NO</th>
                  <th>PAYMENT DATE</th>
                  <th>LOAN NO</th>
                  <th>PAYMENT TYPE</th>
                  <th>AMOUNT PAID</th>
                  <th>PAYMENT MODE</th>
                  <th>COLLECTED BY</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {customerReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No payment receipts recorded yet for this customer.
                    </td>
                  </tr>
                ) : (
                  customerReceipts.map((r, idx) => (
                    <tr key={`profile-rc-${r.id}-${idx}`}>
                      <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>RC-#{r.receiptNo}</td>
                      <td>{r.date}</td>
                      <td style={{ fontWeight: 700 }}>{r.loanNo}</td>
                      <td><span className="badge badge-info">{r.kind}</span></td>
                      <td style={{ fontWeight: 800, color: 'var(--color-primary-accent, #059669)' }}>
                        ₹{r.amount.toLocaleString('en-IN')}
                      </td>
                      <td><span className="badge badge-gold">{r.paymentMode}</span></td>
                      <td>Admin Operator</td>
                      <td><span className="badge badge-success">Completed</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: ACTIVITY TIMELINE */}
      {activeTab === 'activity' && (
        <div className="card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)' }}>
            CUSTOMER ACTIVITY &amp; AUDIT TIMELINE
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border-light, #cbd5e1)' }}>
            {activityEvents.map((evt) => (
              <div key={evt.id} style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-29px',
                    top: '4px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: evt.type === 'loan' ? 'var(--color-primary-accent)' : evt.type === 'receipt' ? '#3b82f6' : evt.type === 'fd' ? '#eab308' : '#8b5cf6',
                    border: '3px solid #ffffff',
                    boxShadow: '0 0 0 2px var(--border-light)'
                  }}
                />
                <div style={{ backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-dark)' }}>{evt.title}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{evt.date}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>{evt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER PROFILE MODAL */}
      <EditCustomerModal
        isOpen={isEditModalOpen}
        customer={customer}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(id, updates) => {
          updateCustomer(id, updates);
        }}
      />
    </div>
  );
};
