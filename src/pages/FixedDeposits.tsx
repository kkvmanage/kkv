import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, User, Eye, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import { FixedDeposit, Customer } from '../types';
import { getCanonicalCustomerId, isMatchingCustomerId } from '../utils/customerUtils';

export const calculateMaturityDate = (startDateStr: string, tenureMos: number): string => {
  if (!startDateStr) return '';
  let day = 1, month = 1, year = 2026;
  const parts = startDateStr.split(/[-/]/).map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    if (parts[0] > 1000) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }
  } else {
    const today = new Date();
    day = today.getDate();
    month = today.getMonth() + 1;
    year = today.getFullYear();
  }

  const totalMonths = month - 1 + tenureMos;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const maxDaysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
  const targetDay = Math.min(day, maxDaysInTargetMonth);

  return `${String(targetDay).padStart(2, '0')}-${String(targetMonth).padStart(2, '0')}-${targetYear}`;
};

export const FixedDeposits: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    fixedDeposits,
    addFixedDeposit,
    customers,
    fdInterestPayouts,
    payFDInterest,
    fdWithdrawals,
    withdrawFD,
    deleteFixedDeposit,
    userRole,
    setSelectedProfileCustomerId,
    showToast
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<string>('new-deposit');

  // Sync sidebar route to sub-tab
  useEffect(() => {
    if ([
      'new-deposit',
      'deposit-display',
      'deposit-interest',
      'interest-display',
      'interest-pending',
      'deposit-withdrawal',
      'withdrawal-display',
      'fd-customers-deposits'
    ].includes(currentPage)) {
      setActiveSubTab(currentPage);
    }
  }, [currentPage]);

  // Customer Selection State for New Deposit
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New Deposit Form State
  const [depositDate, setDepositDate] = useState<string>(new Date().toLocaleDateString('en-GB').replace(/\//g, '-'));
  const [principal, setPrincipal] = useState<number | ''>(200000);
  const [interestRatePA, setInterestRatePA] = useState<number | ''>(12);
  const [tenureMonths, setTenureMonths] = useState<number | ''>(12);
  const [payoutFrequency, setPayoutFrequency] = useState<string>('Monthly');
  const [receivingMethod, setReceivingMethod] = useState<'Cash' | 'Bank' | 'UPI'>('Cash');
  const [nomineeName, setNomineeName] = useState<string>('');
  const [nomineeRelation, setNomineeRelation] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Register display filter state
  const [displaySearchText, setDisplaySearchText] = useState<string>('');
  const [displayStatusFilter, setDisplayStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MATURED' | 'WITHDRAWN'>('ALL');

  // Withdrawal & Interest Payout lookup state
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [selectedFD, setSelectedFD] = useState<FixedDeposit | null>(null);
  const [withdrawalAmountInput, setWithdrawalAmountInput] = useState<number | ''>('');
  const [withdrawalMode, setWithdrawalMode] = useState<'Cash' | 'Bank' | 'UPI'>('Cash');
  const [withdrawalNotes, setWithdrawalNotes] = useState<string>('');

  // Calculated values
  const numericPrincipal = typeof principal === 'number' ? principal : 0;
  const numericRate = typeof interestRatePA === 'number' ? interestRatePA : 0;
  const numericTenure = typeof tenureMonths === 'number' ? tenureMonths : 0;

  const monthlyPayout = Math.round((numericPrincipal * (numericRate / 100)) / 12);
  const expectedMaturityAmount = Math.round(numericPrincipal + (numericPrincipal * (numericRate / 100) * (numericTenure / 12)));
  const calculatedMaturityDatePreview = useMemo(() => calculateMaturityDate(depositDate, numericTenure || 12), [depositDate, numericTenure]);

  const maxSeq = useMemo(() => {
    return fixedDeposits.reduce((max, f) => {
      const match = f.fdNo ? f.fdNo.match(/\d+/) : null;
      const num = match ? parseInt(match[0], 10) : 0;
      return num > max ? num : max;
    }, 0);
  }, [fixedDeposits]);
  const nextFdNo = `FD-${(maxSeq + 1).toString().padStart(2, '0')}`;

  // Filter non-deleted active customers
  const activeCustomers = useMemo(() => customers.filter((c) => !c.isDeleted), [customers]);

  // Real-time matching customers based on query
  const matchingCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return [];
    const q = customerSearchQuery.toLowerCase().trim();
    return activeCustomers.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        (c.customerId && c.customerId.toString().toLowerCase().includes(q)) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q)
    );
  }, [activeCustomers, customerSearchQuery]);

  // Submission lock to prevent duplicate FD creation
  const [isSubmittingFD, setIsSubmittingFD] = useState<boolean>(false);

  // Handle Customer Selection
  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerSearchQuery(cust.name);
    showToast(`Selected Customer: ${cust.name} (${getCanonicalCustomerId(cust)})`, 'success');
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
  };

  // Submit Fixed Deposit
  const handleSubmitDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingFD) return;

    if (!selectedCustomer) {
      showToast('Please search and select an existing Customer first.', 'error');
      return;
    }

    if (!numericPrincipal || numericPrincipal <= 0) {
      showToast('Please enter a valid principal deposit amount greater than zero.', 'error');
      return;
    }

    if (!numericRate || numericRate <= 0 || numericRate > 100) {
      showToast('Please enter a valid annual interest rate (e.g. 12% p.a.).', 'error');
      return;
    }

    if (!numericTenure || numericTenure < 1) {
      showToast('Please enter a valid deposit tenure in months (min 1 month).', 'error');
      return;
    }

    setIsSubmittingFD(true);

    try {
      const calculatedMaturityDate = calculateMaturityDate(depositDate, numericTenure);
      const canonicalCustId = getCanonicalCustomerId(selectedCustomer);

      addFixedDeposit({
        customerId: canonicalCustId,
        depositorName: selectedCustomer.name,
        phone: selectedCustomer.phone,
        idProofType: selectedCustomer.idProof || 'Aadhaar Card',
        idProofNumber: selectedCustomer.idNumber || '',
        address: selectedCustomer.currentAddress || '',
        depositDate,
        maturityDate: calculatedMaturityDate,
        principal: numericPrincipal,
        remainingPrincipal: numericPrincipal,
        totalWithdrawnPrincipal: 0,
        tenureMonths: numericTenure,
        interestRatePA: numericRate,
        receivingMethod,
        monthlyPayout,
        status: 'ACTIVE',
        parentCustomerName: '',
        nomineeName,
        nomineeRelation,
        remarks
      });

      showToast(`Fixed Deposit ${nextFdNo} created successfully for ${selectedCustomer.name}!`, 'success');

      // Reset Form
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      setPrincipal(200000);
      setNomineeName('');
      setNomineeRelation('');
      setRemarks('');
    } finally {
      setIsSubmittingFD(false);
    }
  };

  const handleSearchFD = () => {
    if (!lookupQuery.trim()) {
      showToast('Please enter an FD Number, Customer ID, or Customer Name to search.', 'warning');
      return;
    }
    const q = lookupQuery.toLowerCase().trim();
    const found = fixedDeposits.find(
      (f) =>
        f.fdNo.toLowerCase() === q ||
        f.depositorName.toLowerCase().includes(q) ||
        f.phone.includes(q) ||
        isMatchingCustomerId(f.customerId, q)
    );
    if (found) {
      setSelectedFD(found);
      setWithdrawalAmountInput(found.remainingPrincipal ?? found.principal);
      showToast(`Found deposit: ${found.fdNo} - ${found.depositorName}`, 'success');
    } else {
      setSelectedFD(null);
      showToast('No deposit found matching query.', 'error');
    }
  };

  // Helper function to resolve customer object from FD
  const resolveCustomer = (customerId: string, defaultName: string, defaultPhone: string) => {
    const found = customers.find((c) => isMatchingCustomerId(customerId, c));
    return {
      name: found?.name || defaultName,
      phone: found?.phone || defaultPhone,
      id: found ? getCanonicalCustomerId(found) : customerId,
      photo: found?.customerPhoto
    };
  };

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)' }}>
            Fixed Deposit Management
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Issue and manage high-yield term deposits linked to master registered customers.
          </p>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '4px', flexWrap: 'wrap' }}>
        {[
          { key: 'new-deposit', label: '➕ New Deposit' },
          { key: 'deposit-display', label: '📋 Deposit Display' },
          { key: 'deposit-interest', label: '💰 Deposit Interest' },
          { key: 'interest-display', label: '📄 Interest Display' },
          { key: 'interest-pending', label: '⏳ Interest Pending' },
          { key: 'deposit-withdrawal', label: '💸 Deposit Withdrawal' },
          { key: 'withdrawal-display', label: '📑 Withdrawal Display' },
          { key: 'fd-customers-deposits', label: '👥 FD Customers & Deposits' }
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn btn-sm ${activeSubTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-sm)', fontWeight: 600 }}
            onClick={() => {
              setActiveSubTab(t.key);
              setCurrentPage(t.key as any);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SUBVIEW 1: NEW DEPOSIT */}
      {activeSubTab === 'new-deposit' && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Issue New Fixed Deposit</h2>
              <p className="card-description">Select an existing registered customer and configure term deposit details</p>
            </div>
          </div>

          {/* SECTION 1: MASTER CUSTOMER SELECTION */}
          <div
            style={{
              padding: '18px',
              backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
              borderRadius: '12px',
              border: '1px solid var(--border-light, #e2e8f0)',
              marginBottom: '20px'
            }}
          >
            <label className="form-label required" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
              1. SEARCH &amp; SELECT MASTER CUSTOMER *
            </label>
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <input
                type="text"
                className="input-control"
                style={{ height: '42px', paddingLeft: '38px', fontSize: '13px' }}
                placeholder="Search Customer ID, Name, or Mobile Number (e.g. CUST-006, Sanjai, 8637628773)..."
                value={customerSearchQuery}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  if (selectedCustomer) setSelectedCustomer(null);
                }}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
            </div>

            {/* Matching Customer Suggestions Dropdown */}
            {!selectedCustomer && customerSearchQuery.trim() !== '' && (
              <div
                style={{
                  marginTop: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '8px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                {matchingCustomers.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <AlertCircle size={16} color="var(--color-danger, #ef4444)" style={{ display: 'inline', marginRight: '6px' }} />
                    Customer not found. Please enter a valid existing Customer ID or Name.
                  </div>
                ) : (
                  matchingCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-secondary, #f8fafc)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {c.customerPhoto ? (
                          <img src={c.customerPhoto} alt={c.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-light-accent)', color: 'var(--color-primary-dark)', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-dark)' }}>{c.name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>+91 {c.phone}</span>
                        </div>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: '11px', fontWeight: 600 }}>{c.id}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SELECTED READ-ONLY CUSTOMER PREVIEW CARD */}
            {selectedCustomer && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1.5px solid var(--color-primary-accent, #059669)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {selectedCustomer.customerPhoto ? (
                      <img
                        src={selectedCustomer.customerPhoto}
                        alt={selectedCustomer.name}
                        style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary-accent)' }}
                      />
                    ) : (
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--color-light-accent)', color: 'var(--color-primary-dark)', fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)' }}>{selectedCustomer.name}</h3>
                        <span className="badge badge-success" style={{ fontSize: '10px' }}>✓ VERIFIED MASTER CUSTOMER</span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Customer ID: <strong style={{ color: 'var(--color-primary-dark)' }}>{selectedCustomer.id}</strong> | Phone: <strong>+91 {selectedCustomer.phone}</strong> | Gender: {selectedCustomer.gender} | Occupation: {selectedCustomer.occupation || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px', height: '32px', gap: '4px' }}
                      onClick={() => {
                        setSelectedProfileCustomerId(selectedCustomer.id);
                        setCurrentPage('customer-profile');
                      }}
                    >
                      <Eye size={13} />
                      <span>View Customer Profile</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px', height: '32px', gap: '4px', color: 'var(--color-danger, #ef4444)' }}
                      onClick={handleClearSelectedCustomer}
                    >
                      <RotateCcw size={13} />
                      <span>Change</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: FIXED DEPOSIT DETAILS FORM */}
          {selectedCustomer ? (
            <form onSubmit={handleSubmitDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-primary-dark)', margin: '4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                2. FIXED DEPOSIT TERMS &amp; FINANCIAL DETAILS
              </h3>

              <div className="grid-2">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label required">FD NUMBER</label>
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>✓ Auto Generated</span>
                  </div>
                  <input type="text" className="input-control readonly" readOnly value={nextFdNo} />
                </div>

                <div className="form-group">
                  <label className="form-label required">DEPOSIT START DATE</label>
                  <input type="text" className="input-control" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label required">PRINCIPAL AMOUNT (₹)</label>
                  <input
                    type="number"
                    className="input-control"
                    style={{ fontWeight: 700, fontSize: '15px' }}
                    value={principal}
                    onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">INTEREST RATE (% P.A.)</label>
                  <input
                    type="number"
                    step="0.25"
                    className="input-control"
                    style={{ fontWeight: 700, fontSize: '15px' }}
                    value={interestRatePA}
                    onChange={(e) => setInterestRatePA(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label required">TENURE (MONTHS)</label>
                  <input
                    type="number"
                    className="input-control"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(Number(e.target.value) || 12)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">PAYOUT FREQUENCY</label>
                  <select className="input-control" value={payoutFrequency} onChange={(e) => setPayoutFrequency(e.target.value)}>
                    <option value="Monthly">Monthly Dividend</option>
                    <option value="Quarterly">Quarterly Dividend</option>
                    <option value="Annual">Annual Dividend</option>
                    <option value="At Maturity">Cumulative (At Maturity)</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label required">RECEIVING METHOD</label>
                  <select className="input-control" value={receivingMethod} onChange={(e) => setReceivingMethod(e.target.value as any)}>
                    <option value="Cash">Cash Account</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="UPI">UPI Payment</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">NOMINEE NAME (OPTIONAL)</label>
                  <input type="text" className="input-control" placeholder="Nominee full name" value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">NOMINEE RELATION (OPTIONAL)</label>
                  <input type="text" className="input-control" placeholder="e.g. Spouse, Son, Daughter" value={nomineeRelation} onChange={(e) => setNomineeRelation(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">REMARKS / NOTES</label>
                  <input type="text" className="input-control" placeholder="Any special deposit notes" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </div>
              </div>

              {/* Financial Calculation Summary Box */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginTop: '8px'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>MONTHLY INTEREST PAYOUT</span>
                  <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary-dark)', margin: '4px 0' }}>
                    ₹{monthlyPayout.toLocaleString('en-IN')} / mo
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>Regular dividend commitment</p>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>EXPECTED MATURITY AMOUNT</span>
                  <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary-accent, #059669)', margin: '4px 0' }}>
                    ₹{expectedMaturityAmount.toLocaleString('en-IN')}
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>Maturity Date: {calculatedMaturityDatePreview} ({tenureMonths} mos)</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingFD} style={{ padding: '12px 28px', fontWeight: 800, fontSize: '14px' }}>
                  {isSubmittingFD ? 'Processing Deposit...' : `Issue Fixed Deposit ${nextFdNo}`}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleClearSelectedCustomer}>
                  Reset
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                padding: '30px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
                borderRadius: '10px',
                border: '1px dashed var(--border-light, #cbd5e1)',
                color: 'var(--text-muted)'
              }}
            >
              <User size={36} style={{ opacity: 0.4, margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)' }}>Please Select a Master Customer First</div>
              <p style={{ fontSize: '12.5px', margin: '4px 0 0 0' }}>Use the search box above to find and confirm an existing customer before issuing a Fixed Deposit.</p>
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 2: DEPOSIT DISPLAY & REGISTER */}
      {(activeSubTab === 'deposit-display' || activeSubTab === 'fd-customers-deposits') && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Fixed Deposit Register</h2>
              <p className="card-description">All active and historical Fixed Deposits linked to registered master customers</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-success">{fixedDeposits.filter((f) => f.status === 'ACTIVE').length} Active FDs</span>
              <span className="badge badge-info">{fixedDeposits.length} Total FDs</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <input
                type="text"
                className="input-control"
                style={{ height: '38px', paddingLeft: '34px', fontSize: '13px' }}
                placeholder="Filter by FD No, Customer ID, Name, or Mobile..."
                value={displaySearchText}
                onChange={(e) => setDisplaySearchText(e.target.value)}
              />
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
            </div>

            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface-secondary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {(['ALL', 'ACTIVE', 'MATURED', 'WITHDRAWN'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`btn btn-sm ${displayStatusFilter === st ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', padding: '4px 10px', fontWeight: 700 }}
                  onClick={() => setDisplayStatusFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>FD NO</th>
                  <th>CUSTOMER</th>
                  <th>CUSTOMER ID</th>
                  <th>PHONE</th>
                  <th>DEPOSIT DATE</th>
                  <th>MATURITY DATE</th>
                  <th>ORIGINAL PRINCIPAL</th>
                  <th>REMAINING BAL</th>
                  <th>RATE (% P.A.)</th>
                  <th>MONTHLY PAYOUT</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {fixedDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No Fixed Deposits recorded yet in the system.
                    </td>
                  </tr>
                ) : (
                  fixedDeposits
                    .filter((f) => {
                      if (displayStatusFilter !== 'ALL' && f.status !== displayStatusFilter) return false;
                      if (displaySearchText.trim()) {
                        const q = displaySearchText.toLowerCase().trim();
                        return (
                          f.fdNo.toLowerCase().includes(q) ||
                          f.depositorName.toLowerCase().includes(q) ||
                          f.customerId.toLowerCase().includes(q) ||
                          f.phone.includes(q)
                        );
                      }
                      return true;
                    })
                    .map((f) => {
                      const resolved = resolveCustomer(f.customerId, f.depositorName, f.phone);
                      const remaining = f.remainingPrincipal ?? f.principal;
                      return (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{f.fdNo}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {resolved.photo ? (
                                <img src={resolved.photo} alt={resolved.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-light-accent)', color: 'var(--color-primary-dark)', fontWeight: 800, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {resolved.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{resolved.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: '11px', fontWeight: 600 }}>{resolved.id}</span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>+91 {resolved.phone}</td>
                          <td>{f.depositDate}</td>
                          <td>{f.maturityDate}</td>
                          <td style={{ fontWeight: 700, color: 'var(--color-primary-accent, #059669)' }}>₹{f.principal.toLocaleString('en-IN')}</td>
                          <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>₹{remaining.toLocaleString('en-IN')}</td>
                          <td>{f.interestRatePA}%</td>
                          <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                            ₹{f.monthlyPayout.toLocaleString('en-IN')}
                          </td>
                          <td>
                            <span className={`badge ${f.status === 'ACTIVE' ? 'badge-success' : f.status === 'MATURED' ? 'badge-info' : 'badge-warning'}`}>
                              {f.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ height: '28px', padding: '0 8px', fontSize: '11px', gap: '4px', fontWeight: 600 }}
                                onClick={() => {
                                  setSelectedProfileCustomerId(resolved.id);
                                  setCurrentPage('customer-profile');
                                }}
                              >
                                <Eye size={12} />
                                <span>View Customer</span>
                              </button>
                              {userRole === 'ADMIN' && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ height: '28px', padding: '0 8px', fontSize: '11px', gap: '4px', fontWeight: 600, color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                  title="Delete Fixed Deposit (Admin Only)"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete Fixed Deposit ${f.fdNo}?`)) {
                                      deleteFixedDeposit(f.fdNo);
                                    }
                                  }}
                                >
                                  <Trash2 size={12} />
                                  <span>Delete FD</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: DEPOSIT INTEREST */}
      {activeSubTab === 'deposit-interest' && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Disburse FD Monthly Interest</h2>
              <p className="card-description">Select an active deposit and record dividend payout to customer</p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>FD NO</th>
                  <th>CUSTOMER</th>
                  <th>CUSTOMER ID</th>
                  <th>ORIGINAL PRINCIPAL</th>
                  <th>REMAINING BAL</th>
                  <th>MONTHLY PAYOUT</th>
                  <th>PAYMENT MODE</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {fixedDeposits.filter((f) => f.status === 'ACTIVE').length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No active Fixed Deposits available for interest disbursement.
                    </td>
                  </tr>
                ) : (
                  fixedDeposits.filter((f) => f.status === 'ACTIVE').map((f) => {
                    const resolved = resolveCustomer(f.customerId, f.depositorName, f.phone);
                    const remaining = f.remainingPrincipal ?? f.principal;
                    return (
                      <tr key={f.id}>
                        <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{f.fdNo}</td>
                        <td style={{ fontWeight: 700 }}>{resolved.name}</td>
                        <td><span className="badge badge-info" style={{ fontSize: '11px' }}>{resolved.id}</span></td>
                        <td>₹{f.principal.toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 700 }}>₹{remaining.toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>₹{f.monthlyPayout.toLocaleString('en-IN')}</td>
                        <td>
                          <select id={`mode-${f.id}`} className="input-control" style={{ padding: '4px 8px', fontSize: '12px' }}>
                            <option value="Cash">Cash Account</option>
                            <option value="Bank">Bank Transfer</option>
                            <option value="UPI">UPI Payment</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ height: '30px', padding: '0 12px', fontWeight: 700 }}
                            onClick={() => {
                              const mode = (document.getElementById(`mode-${f.id}`) as HTMLSelectElement)?.value || 'Cash';
                              payFDInterest(f.fdNo, f.monthlyPayout, mode as any);
                            }}
                          >
                            Disburse Interest
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 4: INTEREST DISPLAY & PENDING */}
      {(activeSubTab === 'interest-display' || activeSubTab === 'interest-pending') && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>
                {activeSubTab === 'interest-display' ? 'FD Interest Payout Ledger' : 'FD Monthly Interest Pending'}
              </h2>
              <p className="card-description">
                {activeSubTab === 'interest-display'
                  ? 'Historical ledger of processed monthly dividend payments to depositors'
                  : 'Active deposits with pending dividend payments for the current cycle'}
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{activeSubTab === 'interest-display' ? 'PAYOUT DATE' : 'DUE DATE'}</th>
                  <th>FD NO</th>
                  <th>CUSTOMER</th>
                  <th>{activeSubTab === 'interest-display' ? 'PAYOUT AMOUNT' : 'PENDING DIVIDEND'}</th>
                  <th>MODE / METHOD</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {activeSubTab === 'interest-display' ? (
                  fdInterestPayouts.length > 0 ? (
                    fdInterestPayouts.map((p) => (
                      <tr key={p.id}>
                        <td>{p.date}</td>
                        <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{p.fdNo}</td>
                        <td style={{ fontWeight: 700 }}>{p.depositorName}</td>
                        <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                        <td>{p.mode}</td>
                        <td><span className="badge badge-success">{p.status}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '35px', color: 'var(--text-muted)' }}>
                        No interest payouts recorded yet.
                      </td>
                    </tr>
                  )
                ) : (
                  fixedDeposits.filter((f) => f.status === 'ACTIVE').length > 0 ? (
                    fixedDeposits.filter((f) => f.status === 'ACTIVE').map((f) => {
                      const resolved = resolveCustomer(f.customerId, f.depositorName, f.phone);
                      return (
                        <tr key={`pending-${f.id}`}>
                          <td>{f.depositDate}</td>
                          <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{f.fdNo}</td>
                          <td style={{ fontWeight: 700 }}>{resolved.name}</td>
                          <td style={{ fontWeight: 800, color: '#d97706' }}>₹{f.monthlyPayout.toLocaleString('en-IN')}</td>
                          <td>Monthly Dividend</td>
                          <td><span className="badge badge-warning">PENDING DUE</span></td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '35px', color: 'var(--text-muted)' }}>
                        No pending interest payouts. All active deposits are up to date!
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 5: DEPOSIT WITHDRAWAL */}
      {activeSubTab === 'deposit-withdrawal' && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Fixed Deposit Withdrawal &amp; Settlement</h2>
              <p className="card-description">Process partial or full capital refund and update deposit status</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              className="input-control"
              placeholder="Enter FD No (e.g. FD-01), Customer ID, or customer name..."
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={handleSearchFD}>
              <Search size={16} />
              <span>Find Deposit</span>
            </button>
          </div>

          {selectedFD && (
            <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary-dark)', margin: 0 }}>
                  Deposit Contract: {selectedFD.fdNo}
                </h3>
                <span className={`badge ${selectedFD.status === 'ACTIVE' ? 'badge-success' : selectedFD.status === 'MATURED' ? 'badge-info' : 'badge-warning'}`}>
                  {selectedFD.status}
                </span>
              </div>

              <div className="grid-3" style={{ fontSize: '13px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Customer: </span><strong>{selectedFD.depositorName} ({selectedFD.customerId})</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Original Principal: </span><strong>₹{selectedFD.principal.toLocaleString('en-IN')}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Remaining Balance: </span><strong style={{ color: 'var(--color-primary-dark)' }}>₹{(selectedFD.remainingPrincipal ?? selectedFD.principal).toLocaleString('en-IN')}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Deposit Date: </span><strong>{selectedFD.depositDate}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Maturity Date: </span><strong>{selectedFD.maturityDate}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Annual Interest Rate: </span><strong>{selectedFD.interestRatePA}% p.a.</strong></div>
              </div>

              {selectedFD.status === 'WITHDRAWN' ? (
                <div style={{ padding: '12px 16px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', color: '#d46b08', fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>
                  ⚠️ This Fixed Deposit is already closed and fully withdrawn. No further refunds can be processed.
                </div>
              ) : (
                <>
                  <div className="grid-3" style={{ marginTop: '10px' }}>
                    <div className="form-group">
                      <label className="form-label required">WITHDRAWAL REFUND AMOUNT (₹)</label>
                      <input
                        type="number"
                        className="input-control"
                        placeholder="Enter refund amount"
                        value={withdrawalAmountInput}
                        onChange={(e) => setWithdrawalAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                        max={selectedFD.remainingPrincipal ?? selectedFD.principal}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label required">REFUND PAYMENT MODE</label>
                      <select className="input-control" value={withdrawalMode} onChange={(e) => setWithdrawalMode(e.target.value as any)}>
                        <option value="Cash">Cash Account</option>
                        <option value="Bank">Bank Transfer</option>
                        <option value="UPI">UPI Payment</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">REMARKS / NOTES</label>
                      <input type="text" className="input-control" placeholder="Maturity payout / Premature withdrawal" value={withdrawalNotes} onChange={(e) => setWithdrawalNotes(e.target.value)} />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', alignSelf: 'flex-start', fontWeight: 800 }}
                    onClick={() => {
                      const numAmount = typeof withdrawalAmountInput === 'number' ? withdrawalAmountInput : 0;
                      if (!numAmount || numAmount <= 0) {
                        showToast('Please enter a valid withdrawal refund amount.', 'error');
                        return;
                      }
                      withdrawFD(selectedFD.fdNo, withdrawalMode, withdrawalNotes, numAmount);
                      setSelectedFD(null);
                    }}
                  >
                    Process Refund ₹{(typeof withdrawalAmountInput === 'number' ? withdrawalAmountInput : 0).toLocaleString('en-IN')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 6: WITHDRAWAL DISPLAY */}
      {activeSubTab === 'withdrawal-display' && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Withdrawal &amp; Settlement Ledger</h2>
              <p className="card-description">Historical records of partial and full fixed deposit refunds</p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>WITHDRAWAL DATE</th>
                  <th>FD NO</th>
                  <th>CUSTOMER</th>
                  <th>REFUNDED AMOUNT</th>
                  <th>REMAINING BAL</th>
                  <th>PAYMENT MODE</th>
                  <th>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {fdWithdrawals.length > 0 ? (
                  fdWithdrawals.map((w) => (
                    <tr key={w.id}>
                      <td>{w.withdrawalDate}</td>
                      <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{w.fdNo}</td>
                      <td style={{ fontWeight: 700 }}>{w.depositorName}</td>
                      <td style={{ fontWeight: 800, color: 'var(--color-primary-accent, #059669)' }}>₹{w.principalAmount.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700 }}>₹{(w.remainingBalance ?? 0).toLocaleString('en-IN')}</td>
                      <td>{w.mode}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{w.notes || 'FD Refund'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No withdrawn deposits recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
