import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Download, FileSpreadsheet, Plus, X, ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react';

export const Accounts: React.FC = () => {
  const { currentPage, dayBookEntries, cashInHand, cashAtBank, addDayBookEntry, loans, fixedDeposits, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'day-book' | 'trial-balance' | 'profit-loss' | 'balance-sheet'>('day-book');

  React.useEffect(() => {
    if (['day-book', 'trial-balance', 'profit-loss', 'balance-sheet'].includes(currentPage)) {
      setActiveTab(currentPage as any);
    }
  }, [currentPage]);
  const todayISO = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayISO);
  const [toDate, setToDate] = useState(todayISO);
  const [pnlPeriod, setPnlPeriod] = useState<'this-month' | 'last-month' | 'this-year' | 'all-time'>('this-month');
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);

  // New manual entry modal state
  const [particulars, setParticulars] = useState('');
  const [accountHead, setAccountHead] = useState('Office Expenses');
  const [entryType, setEntryType] = useState<'CASH_IN' | 'CASH_OUT' | 'BANK_IN' | 'BANK_OUT'>('CASH_OUT');
  const [amount, setAmount] = useState<number>(500);
  const [entryDate, setEntryDate] = useState(new Date().toLocaleDateString('en-GB').replace(/\//g, '-'));

  // Calculations for Today In / Out
  const todayIn = dayBookEntries.reduce((acc, e) => acc + (e.cashIn + e.bankIn), 0);
  const todayOut = dayBookEntries.reduce((acc, e) => acc + (e.cashOut + e.bankOut), 0);

  // Financial aggregates
  const totalGoldLoansOutstanding = loans.reduce((acc, l) => acc + l.outstandingPrincipal, 0);
  const totalInterestEarned = dayBookEntries
    .filter((e) => e.accountHead === 'Interest Income')
    .reduce((acc, e) => acc + e.cashIn + e.bankIn, 0);
  const cardFeesEarned = loans.length * 10;
  const totalIncome = totalInterestEarned + cardFeesEarned;
  const interestPaidOnDeposits = fixedDeposits.reduce((acc, f) => acc + f.monthlyPayout, 0);
  const totalExpenses = interestPaidOnDeposits;
  const netProfit = totalIncome - totalExpenses;
  const totalFDPrincipal = fixedDeposits.reduce((acc, f) => acc + f.principal, 0);

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!particulars.trim() || amount <= 0) {
      showToast('Please enter valid particulars and amount', 'error');
      return;
    }

    const billNo = `MAN-${Date.now().toString().slice(-4)}`;
    addDayBookEntry({
      billNo,
      particulars,
      accountHead,
      mode: entryType.startsWith('CASH') ? 'Cash' : 'Bank',
      cashIn: entryType === 'CASH_IN' ? amount : 0,
      cashOut: entryType === 'CASH_OUT' ? amount : 0,
      bankIn: entryType === 'BANK_IN' ? amount : 0,
      bankOut: entryType === 'BANK_OUT' ? amount : 0,
      date: entryDate
    });

    setParticulars('');
    setAmount(500);
    setShowAddEntryModal(false);
  };

  const handleExportExcel = () => {
    showToast('Exporting accounting statement to Excel (.xlsx)...', 'info');
  };

  const handleExportPDF = () => {
    showToast('Generating official PDF statement...', 'info');
  };

  const [showPaise, setShowPaise] = useState(true);
  const [showTdsModal, setShowTdsModal] = useState(false);

  const formatMoney = (num: number) => {
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: showPaise ? 2 : 0,
      maximumFractionDigits: showPaise ? 2 : 0
    });
  };

  return (
    <div className="page-content">
      {/* Top Accounts Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'day-book' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('day-book')}
          >
            Day Book
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'trial-balance' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('trial-balance')}
          >
            Trial Balance
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'profit-loss' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('profit-loss')}
          >
            Profit &amp; Loss
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'balance-sheet' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('balance-sheet')}
          >
            Balance Sheet
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowTdsModal(true)}>
            <span>TDS Ledger</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={13} />
            <span>Export Excel</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportPDF}>
            <Download size={13} />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* TDS LEDGER MODAL */}
      {showTdsModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '24px', position: 'relative' }}>
            <button style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowTdsModal(false)}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>TDS Deductions Ledger</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Section 194A Tax Deducted at Source on Interest Payments</p>
            <div className="table-container" style={{ marginBottom: '16px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>BILL NO</th>
                    <th>CUSTOMER</th>
                    <th>GROSS INTEREST</th>
                    <th>TDS (10%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>25-08-2026</td>
                    <td>RCPT-104</td>
                    <td>Thayba Begum</td>
                    <td>₹1,500.00</td>
                    <td>₹150.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setShowTdsModal(false)}>Close</button>
          </div>
        </div>
      )}

      {activeTab === 'day-book' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 4 Summary Metric Cards */}
          <div className="grid-4">
            <div className="stat-card">
              <div className="stat-label">CASH IN HAND</div>
              <div className="stat-value" style={{ color: cashInHand >= 0 ? 'var(--color-primary-dark)' : 'var(--badge-danger-text)' }}>
                ₹{formatMoney(cashInHand)}
              </div>
              <div className="stat-helper">Physical counter vault balance</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">CASH AT BANK</div>
              <div className="stat-value" style={{ color: cashAtBank >= 0 ? 'var(--color-primary-dark)' : 'var(--badge-danger-text)' }}>
                ₹{formatMoney(cashAtBank)}
              </div>
              <div className="stat-helper">HDFC Branch Current A/c</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">TODAY IN</div>
              <div className="stat-value" style={{ color: 'var(--badge-success-text)' }}>
                <ArrowDownLeft size={20} style={{ display: 'inline', marginRight: '4px' }} />
                ₹{formatMoney(todayIn)}
              </div>
              <div className="stat-helper">Total receipts &amp; credits</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">TODAY OUT</div>
              <div className="stat-value" style={{ color: 'var(--badge-danger-text)' }}>
                <ArrowUpRight size={20} style={{ display: 'inline', marginRight: '4px' }} />
                ₹{formatMoney(todayOut)}
              </div>
              <div className="stat-helper">Total disbursements &amp; debits</div>
            </div>
          </div>

          {/* Main Day Book Card */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="card-title">Day Book</h2>
                <p className="card-description">Cash in hand, cash at bank, and daily ledger</p>
              </div>

              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>SHOW PAISE</span>
                  <button
                    type="button"
                    className={`btn btn-sm ${showPaise ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: '11px' }}
                    onClick={() => setShowPaise(!showPaise)}
                  >
                    {showPaise ? 'On' : 'Off'}
                  </button>
                </div>

                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>FROM</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ width: '135px', padding: '6px 10px', height: '34px', fontSize: '12px' }}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TO</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ width: '135px', padding: '6px 10px', height: '34px', fontSize: '12px' }}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
                <button className="btn btn-secondary btn-sm" onClick={() => { setFromDate(todayISO); setToDate(todayISO); }}>
                  Today
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddEntryModal(true)}>
                  <Plus size={14} />
                  <span>+ Add Entry</span>
                </button>
              </div>
            </div>

            {/* Day Book Table */}
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>BILL #</th>
                    <th>PARTICULARS</th>
                    <th style={{ textAlign: 'right' }}>CASH IN</th>
                    <th style={{ textAlign: 'right' }}>CASH OUT</th>
                    <th style={{ textAlign: 'right' }}>BANK IN</th>
                    <th style={{ textAlign: 'right' }}>BANK OUT</th>
                    <th style={{ textAlign: 'right' }}>CASH BAL</th>
                    <th style={{ textAlign: 'right' }}>BANK BAL</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', fontWeight: 700 }}>
                    <td>-</td>
                    <td>-</td>
                    <td style={{ color: 'var(--color-primary-dark)' }}>Opening Balance</td>
                    <td style={{ textAlign: 'right' }}>-</td>
                    <td style={{ textAlign: 'right' }}>-</td>
                    <td style={{ textAlign: 'right' }}>-</td>
                    <td style={{ textAlign: 'right' }}>-</td>
                    <td style={{ textAlign: 'right' }}>₹0.00</td>
                    <td style={{ textAlign: 'right' }}>₹0.00</td>
                  </tr>

                  {/* Transaction Entries */}
                  {dayBookEntries.map((e) => (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{e.time}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{e.billNo}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{e.particulars}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.accountHead} &bull; {e.mode}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: e.cashIn > 0 ? 'var(--badge-success-text)' : 'inherit' }}>
                        {e.cashIn > 0 ? `₹${e.cashIn.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: e.cashOut > 0 ? 'var(--badge-danger-text)' : 'inherit' }}>
                        {e.cashOut > 0 ? `₹${e.cashOut.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: e.bankIn > 0 ? 'var(--badge-success-text)' : 'inherit' }}>
                        {e.bankIn > 0 ? `₹${e.bankIn.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: e.bankOut > 0 ? 'var(--badge-danger-text)' : 'inherit' }}>
                        {e.bankOut > 0 ? `₹${e.bankOut.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                        ₹{e.cashBal.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                        ₹{e.bankBal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}

                  {/* Closing Balance Row */}
                  <tr style={{ backgroundColor: 'var(--color-light-accent)', fontWeight: 800 }}>
                    <td>-</td>
                    <td>-</td>
                    <td style={{ color: 'var(--color-primary-dark)' }}>Closing Balance</td>
                    <td style={{ textAlign: 'right' }}>-</td>
                    <td style={{ textAlign: 'right' }}>-</td>
                    <td style={{ textAlign: 'right' }}>-</td>
                    <td style={{ textAlign: 'right' }}>-</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-primary-dark)', fontSize: '14px' }}>
                      ₹{cashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-primary-dark)', fontSize: '14px' }}>
                      ₹{cashAtBank.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* TDS Ledger Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">TDS Ledger</h3>
                <p className="card-description">TDS noted on receipts &mdash; for your claim. NOT part of the Day Book cash flow.</p>
              </div>
              <span className="badge badge-info">Tax Compliance</span>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>BILL #</th>
                    <th>LOAN NO</th>
                    <th>CUSTOMER</th>
                    <th style={{ textAlign: 'right' }}>TDS AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {dayBookEntries.filter(e => (e.tdsAmount || 0) > 0).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No TDS recorded in this period
                      </td>
                    </tr>
                  ) : (
                    dayBookEntries
                      .filter(e => (e.tdsAmount || 0) > 0)
                      .map(e => (
                        <tr key={e.id}>
                          <td>{e.date}</td>
                          <td style={{ fontWeight: 700 }}>{e.billNo}</td>
                          <td>{e.loanNo || '-'}</td>
                          <td>{e.customerName || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                            ₹{(e.tdsAmount || 0).toLocaleString('en-IN')}
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

      {/* Trial Balance */}
      {activeTab === 'trial-balance' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Trial Balance</h2>
              <p className="card-description">Summary of all debit and credit ledger balances</p>
            </div>
            <span className="badge badge-success">
              <ShieldCheck size={14} />
              <span>Balanced</span>
            </span>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ACCOUNT HEAD</th>
                  <th>GROUP</th>
                  <th style={{ textAlign: 'right' }}>DEBIT (₹)</th>
                  <th style={{ textAlign: 'right' }}>CREDIT (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Gold Loan Principal Portfolio</td>
                  <td>Current Assets</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{totalGoldLoansOutstanding.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Cash In Hand (Vault)</td>
                  <td>Current Assets</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{Math.max(0, cashInHand).toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Fixed Deposits Liability</td>
                  <td>Current Liabilities</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{totalFDPrincipal.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Interest &amp; Processing Income</td>
                  <td>Revenue</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{totalIncome.toLocaleString('en-IN')}</td>
                </tr>
                <tr style={{ backgroundColor: 'var(--color-light-accent)', fontWeight: 800 }}>
                  <td colSpan={2} style={{ color: 'var(--color-primary-dark)' }}>TOTAL TRIAL BALANCE</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-primary-dark)' }}>
                    ₹{(totalGoldLoansOutstanding + Math.max(0, cashInHand)).toLocaleString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-primary-dark)' }}>
                    ₹{(totalFDPrincipal + totalIncome).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profit & Loss - Modeled Exactly after Demo1 Frame 5 */}
      {activeTab === 'profit-loss' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="card-title">Profit &amp; Loss</h2>
                <p className="card-description">Trial balance, profit &amp; loss and balance sheet &mdash; built automatically from your day book</p>
              </div>

              {/* Date filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>FROM</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ width: '130px', padding: '5px 8px', height: '32px', fontSize: '12px' }}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TO</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ width: '130px', padding: '5px 8px', height: '32px', fontSize: '12px' }}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['this-month', 'last-month', 'this-year', 'all-time'] as const).map((p) => (
                    <button
                      key={p}
                      className={`btn btn-xs ${pnlPeriod === p ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ textTransform: 'capitalize' }}
                      onClick={() => setPnlPeriod(p)}
                    >
                      {p.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ gap: '20px' }}>
              {/* Left: Income */}
              <div style={{ padding: '20px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--badge-success-text)', margin: 0 }}>
                    Income
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>all recorded transactions</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                  <span>Interest Earned on Loans (incl. advance interest)</span>
                  <strong style={{ fontWeight: 700 }}>₹{totalInterestEarned.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                  <span>Card Fees Earned</span>
                  <strong style={{ fontWeight: 700 }}>₹{cardFeesEarned.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 6px', fontSize: '14px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                  <span>Total Income</span>
                  <span style={{ color: 'var(--badge-success-text)' }}>₹{totalIncome.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Right: Expenses */}
              <div style={{ padding: '20px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--badge-danger-text)', margin: 0 }}>
                    Expenses
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>all recorded transactions</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                  <span>Interest Paid on Deposits</span>
                  <strong style={{ fontWeight: 700 }}>₹{interestPaidOnDeposits.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 6px', fontSize: '14px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                  <span>Total Expenses</span>
                  <span style={{ color: 'var(--badge-danger-text)' }}>₹{totalExpenses.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Bottom Net Profit Banner */}
            <div
              style={{
                marginTop: '20px',
                padding: '18px 24px',
                backgroundColor: 'var(--color-light-accent)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1.5px solid var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary-dark)', letterSpacing: '0.5px' }}>
                  NET PROFIT
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Total income minus total expenses, everything up to 25/08/2026
                </div>
              </div>

              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--badge-success-text)' }}>
                ₹{netProfit.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {activeTab === 'balance-sheet' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Balance Sheet</h2>
              <p className="card-description">Assets, liabilities, and equity structure</p>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '20px' }}>
            <div style={{ padding: '18px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ color: 'var(--color-primary-dark)', marginBottom: '14px', fontWeight: 800 }}>ASSETS</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Active Gold Loan Advances</span>
                <strong>₹{totalGoldLoansOutstanding.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Cash In Vault</span>
                <strong>₹{Math.max(0, cashInHand).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Pledged Gold Value (@ ₹6,400/g)</span>
                <strong>₹{loans.reduce((acc, l) => acc + l.marketValue, 0).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div style={{ padding: '18px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ color: 'var(--color-primary-dark)', marginBottom: '14px', fontWeight: 800 }}>LIABILITIES &amp; CAPITAL</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Depositor Fixed Deposits</span>
                <strong>₹{totalFDPrincipal.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Branch Capital &amp; Reserves</span>
                <strong>₹5,00,000</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Day Book Entry Modal */}
      {showAddEntryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(22, 63, 53, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)'
          }}
        >
          <div className="card" style={{ width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header">
              <h3 className="card-title">Add Day Book Entry</h3>
              <button className="icon-button" onClick={() => setShowAddEntryModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label required">Transaction Type</label>
                <select
                  className="select-control"
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as any)}
                >
                  <option value="CASH_IN">Cash In (Credit Vault)</option>
                  <option value="CASH_OUT">Cash Out (Expense / Debit Vault)</option>
                  <option value="BANK_IN">Bank In (Bank Credit)</option>
                  <option value="BANK_OUT">Bank Out (Bank Transfer / Debit)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Particulars / Description</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. Tea & Refreshments / Office Rent / Bank Deposit"
                  value={particulars}
                  onChange={(e) => setParticulars(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Account Head</label>
                <select
                  className="select-control"
                  value={accountHead}
                  onChange={(e) => setAccountHead(e.target.value)}
                >
                  <option value="Office Expenses">Office Expenses</option>
                  <option value="Staff Salary">Staff Salary</option>
                  <option value="Stationery & Printing">Stationery &amp; Printing</option>
                  <option value="Rent & Maintenance">Rent &amp; Maintenance</option>
                  <option value="Owner Capital">Owner Capital Inflow</option>
                  <option value="Bank Contra Transfer">Bank Contra Transfer</option>
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label required">Amount (₹)</label>
                  <input
                    type="number"
                    className="input-control"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">Date</label>
                  <input
                    type="text"
                    className="input-control"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEntryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
