import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Mic, Search } from 'lucide-react';
import { FixedDeposit } from '../types';

export const FixedDeposits: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    fixedDeposits,
    addFixedDeposit,
    customers,
    fdCustomers,
    addFDCustomer,
    fdInterestPayouts,
    payFDInterest,
    fdWithdrawals,
    withdrawFD,
    showToast
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<string>('new-deposit');

  // Sync sidebar route to sub-tab
  useEffect(() => {
    if ([
      'fd-customers',
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

  // FD Customer Form State
  const [fdCustName, setFdCustName] = useState('');
  const [fdCustPhone, setFdCustPhone] = useState('');
  const [fdCustEmail, setFdCustEmail] = useState('');
  const [fdCustDob, setFdCustDob] = useState('');
  const [fdCustOccupation, setFdCustOccupation] = useState('');
  const [fdCustNotes, setFdCustNotes] = useState('');
  const [fdCustIdProof, setFdCustIdProof] = useState('Aadhaar Card');
  const [fdCustAddress, setFdCustAddress] = useState('');

  // New Deposit Form State
  const [depositorName, setDepositorName] = useState('');
  const [phone, setPhone] = useState('');
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [principal, setPrincipal] = useState<number>(200000);
  const [interestRatePA, setInterestRatePA] = useState<number>(12);
  const [receivingMethod, setReceivingMethod] = useState<'Cash' | 'Bank' | 'UPI'>('Cash');

  // Withdrawal & Interest Payout lookup state
  const [lookupQuery, setLookupQuery] = useState('');
  const [selectedFD, setSelectedFD] = useState<FixedDeposit | null>(null);
  const [withdrawalMode, setWithdrawalMode] = useState<'Cash' | 'Bank' | 'UPI'>('Cash');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');

  const monthlyPayout = Math.round((principal * (interestRatePA / 100)) / 12);
  const nextFdNo = `FD-${(fixedDeposits.length + 1).toString().padStart(2, '0')}`;

  const handleAddFDCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdCustName.trim()) {
      showToast('Please enter deposit customer name.', 'error');
      return;
    }
    addFDCustomer({
      name: fdCustName,
      phone: fdCustPhone,
      email: fdCustEmail,
      dob: fdCustDob,
      occupation: fdCustOccupation,
      notes: fdCustNotes,
      idProofType: fdCustIdProof,
      address: fdCustAddress
    });
    setFdCustName('');
    setFdCustPhone('');
    setFdCustEmail('');
    setFdCustDob('');
    setFdCustOccupation('');
    setFdCustNotes('');
    setFdCustAddress('');
  };

  const handleSelectCustomer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    const cust = customers.find((c) => c.id === custId);
    const fdCust = fdCustomers.find(c => c.id === custId);
    if (cust) {
      setDepositorName(cust.name);
      setPhone(cust.phone);
      setAddress(cust.currentAddress);
    } else if (fdCust) {
      setDepositorName(fdCust.name);
      setPhone(fdCust.phone);
      setAddress(fdCust.address || '');
    }
  };

  const handleSubmitDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositorName || principal <= 0) {
      showToast('Please enter valid depositor name and principal amount.', 'error');
      return;
    }

    addFixedDeposit({
      customerId: `CUST-${Date.now().toString().slice(-3)}`,
      depositorName,
      phone,
      idProofType,
      idProofNumber: idNumber,
      address,
      depositDate,
      maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
      principal,
      interestRatePA,
      receivingMethod,
      monthlyPayout,
      status: 'ACTIVE',
      parentCustomerName: ''
    });

    setDepositorName('');
    setPhone('');
    setIdNumber('');
    setAddress('');
    setPrincipal(200000);
  };

  const handleSearchFD = () => {
    const found = fixedDeposits.find(
      (f) =>
        f.fdNo.toLowerCase() === lookupQuery.toLowerCase() ||
        f.depositorName.toLowerCase().includes(lookupQuery.toLowerCase()) ||
        f.phone.includes(lookupQuery)
    );
    if (found) {
      setSelectedFD(found);
      showToast(`Found deposit: ${found.fdNo} - ${found.depositorName}`, 'success');
    } else {
      setSelectedFD(null);
      showToast('No deposit found matching query.', 'error');
    }
  };

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sub Navigation Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '4px', flexWrap: 'wrap' }}>
        {[
          { key: 'fd-customers', label: 'Add FD Customers' },
          { key: 'new-deposit', label: 'New Deposit' },
          { key: 'deposit-display', label: 'Deposit Display' },
          { key: 'deposit-interest', label: 'Deposit Interest' },
          { key: 'interest-display', label: 'Interest Display' },
          { key: 'interest-pending', label: 'Interest Pending' },
          { key: 'deposit-withdrawal', label: 'Deposit Withdrawal' },
          { key: 'withdrawal-display', label: 'Withdrawal Display' },
          { key: 'fd-customers-deposits', label: 'FD Customers & Deposits' }
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

      {/* SUBVIEW 1: ADD FD CUSTOMERS */}
      {activeSubTab === 'fd-customers' && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Add New Deposit Customer</h2>
              <p className="card-description">Deposit customers are people under whom depositors are added. Create them here first, then assign during deposit issue.</p>
            </div>
          </div>

          <form onSubmit={handleAddFDCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">CUSTOMER NAME</label>
                <input type="text" className="input-control" placeholder="e.g. Ramesh Kumar" value={fdCustName} onChange={(e) => setFdCustName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">PHONE (OPTIONAL)</label>
                <input type="text" className="input-control" placeholder="Mobile number" value={fdCustPhone} onChange={(e) => setFdCustPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">EMAIL (OPTIONAL)</label>
                <input type="email" className="input-control" placeholder="email@example.com" value={fdCustEmail} onChange={(e) => setFdCustEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">AGE / DATE OF BIRTH (OPTIONAL)</label>
                <input type="text" className="input-control" placeholder="dd-mm-yyyy" value={fdCustDob} onChange={(e) => setFdCustDob(e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">OCCUPATION (OPTIONAL)</label>
                <input type="text" className="input-control" placeholder="e.g. Business, Salaried" value={fdCustOccupation} onChange={(e) => setFdCustOccupation(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">NOTES (OPTIONAL)</label>
                <input type="text" className="input-control" placeholder="Any reference / commission info" value={fdCustNotes} onChange={(e) => setFdCustNotes(e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">ID PROOF TYPE</label>
                <select className="input-control" value={fdCustIdProof} onChange={(e) => setFdCustIdProof(e.target.value)}>
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ADDRESS (OPTIONAL)</label>
                <input type="text" className="input-control" placeholder="Full address" value={fdCustAddress} onChange={(e) => setFdCustAddress(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: 700 }}>
                Save Customer
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => showToast('Form reset', 'info')}>
                Clear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBVIEW 2: NEW DEPOSIT */}
      {activeSubTab === 'new-deposit' && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Issue New Fixed Deposit</h2>
              <p className="card-description">Existing or new depositor; monthly interest payout</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => showToast('Voice fill assistant listening...', 'info')}
            >
              <Mic size={14} />
              <span>Voice Fill (Alt+V)</span>
            </button>
          </div>

          <form onSubmit={handleSubmitDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-2">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label required">FD NO</label>
                  <span className="badge badge-success" style={{ fontSize: '10px' }}>✓ Available</span>
                </div>
                <input type="text" className="input-control readonly" readOnly value={nextFdNo} />
              </div>

              <div className="form-group">
                <label className="form-label required">DEPOSIT DATE</label>
                <input type="text" className="input-control" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">DEPOSIT CUSTOMER (OPTIONAL - SELECT EXISTING)</label>
              <select className="input-control" onChange={handleSelectCustomer}>
                <option value="">-- Select from saved customers --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                {fdCustomers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || 'FD Cust'})</option>)}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">DEPOSITOR NAME</label>
                <input type="text" className="input-control" placeholder="Depositor name" value={depositorName} onChange={(e) => setDepositorName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">PHONE</label>
                <input type="text" className="input-control" placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">ID PROOF TYPE</label>
                <select className="input-control" value={idProofType} onChange={(e) => setIdProofType(e.target.value)}>
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ADDRESS</label>
                <input type="text" className="input-control" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">PRINCIPAL (₹)</label>
                <input type="number" className="input-control" value={principal} onChange={(e) => setPrincipal(Number(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label required">INTEREST RATE (% P.A.)</label>
                <input type="number" step="0.5" className="input-control" value={interestRatePA} onChange={(e) => setInterestRatePA(Number(e.target.value) || 0)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">RECEIVING METHOD</label>
              <select className="input-control" value={receivingMethod} onChange={(e) => setReceivingMethod(e.target.value as any)}>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            {/* Monthly Payout Highlight */}
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>MONTHLY INTEREST PAYOUT</span>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary-dark)', margin: '4px 0' }}>
                ₹{monthlyPayout.toLocaleString('en-IN')} / month
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Guaranteed yield paid on monthly cycle</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontWeight: 700 }}>
                Issue FD &amp; Print Certificate
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => showToast('Form reset', 'info')}>
                Clear Form
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBVIEW 3: DEPOSIT DISPLAY */}
      {(activeSubTab === 'deposit-display' || activeSubTab === 'fd-customers-deposits') && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title">Active Fixed Deposits</h2>
              <p className="card-description">All active fixed deposits, principal balances, and interest payout commitments</p>
            </div>
            <span className="badge badge-success">{fixedDeposits.filter(f => f.status === 'ACTIVE').length} Active FDs</span>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>FD NO</th>
                  <th>DEPOSITOR</th>
                  <th>PHONE</th>
                  <th>DEPOSIT DATE</th>
                  <th>MATURITY DATE</th>
                  <th>PRINCIPAL</th>
                  <th>RATE (% P.A.)</th>
                  <th>MONTHLY PAYOUT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {fixedDeposits.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{f.fdNo}</td>
                    <td style={{ fontWeight: 600 }}>{f.depositorName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{f.phone}</td>
                    <td>{f.depositDate}</td>
                    <td>{f.maturityDate}</td>
                    <td style={{ fontWeight: 700 }}>₹{f.principal.toLocaleString('en-IN')}</td>
                    <td>{f.interestRatePA}%</td>
                    <td style={{ fontWeight: 700, color: 'var(--badge-success-text)' }}>
                      ₹{f.monthlyPayout.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${f.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 4: DEPOSIT INTEREST */}
      {activeSubTab === 'deposit-interest' && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title">Disburse FD Monthly Interest</h2>
              <p className="card-description">Select an active deposit and record dividend payout</p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>FD NO</th>
                  <th>DEPOSITOR</th>
                  <th>PRINCIPAL</th>
                  <th>MONTHLY PAYOUT</th>
                  <th>PAYMENT MODE</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {fixedDeposits.filter(f => f.status === 'ACTIVE').map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{f.fdNo}</td>
                    <td style={{ fontWeight: 600 }}>{f.depositorName}</td>
                    <td>₹{f.principal.toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 700, color: 'var(--badge-success-text)' }}>₹{f.monthlyPayout.toLocaleString('en-IN')}</td>
                    <td>
                      <select id={`mode-${f.id}`} className="input-control" style={{ padding: '4px 8px', fontSize: '12px' }}>
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          const mode = (document.getElementById(`mode-${f.id}`) as HTMLSelectElement)?.value || 'Cash';
                          payFDInterest(f.fdNo, f.monthlyPayout, mode as any);
                        }}
                      >
                        Pay Interest
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 5: INTEREST DISPLAY & PENDING */}
      {(activeSubTab === 'interest-display' || activeSubTab === 'interest-pending') && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title">FD Interest Payout History</h2>
              <p className="card-description">Ledger of processed monthly dividend payments to depositors</p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>FD NO</th>
                  <th>DEPOSITOR</th>
                  <th>PAYOUT AMOUNT</th>
                  <th>MODE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {fdInterestPayouts.length > 0 ? (
                  fdInterestPayouts.map(p => (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{p.fdNo}</td>
                      <td style={{ fontWeight: 600 }}>{p.depositorName}</td>
                      <td style={{ fontWeight: 700 }}>₹{p.amount.toLocaleString('en-IN')}</td>
                      <td>{p.mode}</td>
                      <td><span className="badge badge-success">{p.status}</span></td>
                    </tr>
                  ))
                ) : (
                  fixedDeposits.slice(0, 3).map(f => (
                    <tr key={f.id}>
                      <td>25-08-2026</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{f.fdNo}</td>
                      <td style={{ fontWeight: 600 }}>{f.depositorName}</td>
                      <td style={{ fontWeight: 700 }}>₹{f.monthlyPayout.toLocaleString('en-IN')}</td>
                      <td>Cash</td>
                      <td><span className="badge badge-success">PAID</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 6: DEPOSIT WITHDRAWAL */}
      {activeSubTab === 'deposit-withdrawal' && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title">Fixed Deposit Withdrawal &amp; Settlement</h2>
              <p className="card-description">Process capital refund and close fixed deposit account</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              className="input-control"
              placeholder="Enter FD No (e.g. FD-01) or depositor name..."
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={handleSearchFD}>
              <Search size={16} />
              <span>Find FD</span>
            </button>
          </div>

          {selectedFD && (
            <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>Deposit Details: {selectedFD.fdNo}</h3>
              <div className="grid-3" style={{ fontSize: '13px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Depositor: </span><strong>{selectedFD.depositorName}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Principal: </span><strong>₹{selectedFD.principal.toLocaleString('en-IN')}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Maturity Date: </span><strong>{selectedFD.maturityDate}</strong></div>
              </div>

              <div className="grid-2" style={{ marginTop: '10px' }}>
                <div className="form-group">
                  <label className="form-label required">REFUND PAYMENT MODE</label>
                  <select className="input-control" value={withdrawalMode} onChange={(e) => setWithdrawalMode(e.target.value as any)}>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="UPI">UPI</option>
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
                style={{ padding: '10px 20px', alignSelf: 'flex-start', fontWeight: 700 }}
                onClick={() => {
                  withdrawFD(selectedFD.fdNo, withdrawalMode, withdrawalNotes);
                  setSelectedFD(null);
                }}
              >
                Close &amp; Refund ₹{selectedFD.principal.toLocaleString('en-IN')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 7: WITHDRAWAL DISPLAY */}
      {activeSubTab === 'withdrawal-display' && (
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title">Withdrawal &amp; Settlement Ledger</h2>
              <p className="card-description">Historical records of closed and withdrawn fixed deposits</p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>WITHDRAWAL DATE</th>
                  <th>FD NO</th>
                  <th>DEPOSITOR</th>
                  <th>PRINCIPAL REFUNDED</th>
                  <th>PAYMENT MODE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {fdWithdrawals.length > 0 ? (
                  fdWithdrawals.map(w => (
                    <tr key={w.id}>
                      <td>{w.withdrawalDate}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{w.fdNo}</td>
                      <td style={{ fontWeight: 600 }}>{w.depositorName}</td>
                      <td style={{ fontWeight: 700 }}>₹{w.principalAmount.toLocaleString('en-IN')}</td>
                      <td>{w.mode}</td>
                      <td><span className="badge badge-warning">WITHDRAWN</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No withdrawn deposits recorded.
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
