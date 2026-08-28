import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, CreditCard, DollarSign, CheckCircle2, PiggyBank, Wallet, Building2, Bell, Database, X, ShieldCheck, Save } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const {
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
    resetAllData
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'fd-rates' | 'bulk-fd' | 'data-backup' | 'devices'>('overview');
  const [passwordInput, setPasswordInput] = useState('');
  const [masterSubTab, setMasterSubTab] = useState<'rates' | 'operations' | 'messaging' | 'security' | 'danger'>('rates');
  const [ratesSubChip, setRatesSubChip] = useState<'gold' | 'silver' | 'pronote' | 'hire' | 'card' | 'overdue' | 'upi'>('upi');

  // Rates & Payments Form State
  const [upiId, setUpiId] = useState(masterControlSettings.upiId);
  const [upiPayeeName, setUpiPayeeName] = useState(masterControlSettings.upiPayeeName);
  const [goldRate, setGoldRate] = useState(masterControlSettings.goldLoanMonthlyRate);
  const [silverRate] = useState(masterControlSettings.silverLoanMonthlyRate);
  const [overdueRate] = useState(masterControlSettings.overdueInterestRatePA);

  // Messaging Form State
  const [welcomeTpl, setWelcomeTpl] = useState(whatsAppTemplates.welcomeMessage);
  const [dueTpl, setDueTpl] = useState(whatsAppTemplates.dueReminderMessage);
  const [receiptTpl] = useState(whatsAppTemplates.receiptMessage);

  // Aggregates
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const totalDisbursed = loans.reduce((sum, l) => sum + l.principal, 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
  const totalCollected = receipts.filter((r) => r.kind !== 'NEW LOAN').reduce((sum, r) => sum + r.amount, 0);
  const activeFDs = fixedDeposits.filter((f) => f.status === 'ACTIVE');
  const totalRecords = loans.length + customers.length + receipts.length + fixedDeposits.length + dayBookEntries.length;

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    unlockMasterControl(passwordInput);
    setPasswordInput('');
  };

  const handleSaveMasterChanges = () => {
    updateMasterControlSettings({
      upiId,
      upiPayeeName,
      goldLoanMonthlyRate: goldRate,
      silverLoanMonthlyRate: silverRate,
      overdueInterestRatePA: overdueRate
    });
    updateWhatsAppTemplates({
      welcomeMessage: welcomeTpl,
      dueReminderMessage: dueTpl,
      receiptMessage: receiptTpl
    });
    setMasterControlOpen(false);
  };

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #163F35 0%, #285D4D 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src="/kkv-logo.png"
            alt="KKV Logo"
            style={{ height: '56px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
          />
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', opacity: 0.85, textTransform: 'uppercase' }}>
              ADMIN CONTROL CENTER
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '4px 0', letterSpacing: '0.5px' }}>
              KKV GOLD FINANCE
            </h1>
            <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>
              Manage companies, access, data &amp; danger-zone actions
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <ShieldCheck size={14} />
            <span>ADMIN SESSION</span>
          </div>
          <div style={{ fontSize: '11.5px', marginTop: '6px', opacity: 0.85 }}>
            27/08/2026 • App version 2026071872
          </div>
        </div>
      </div>

      {/* Admin Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'fd-rates', label: 'FD Interest Rates' },
          { key: 'bulk-fd', label: 'Bulk FD Date Change' },
          { key: 'data-backup', label: 'Data & Backup' },
          { key: 'devices', label: 'Devices' }
        ].map(t => (
          <button
            key={t.key}
            type="button"
            className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
            onClick={() => setActiveTab(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Master Control Launch Card */}
          <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Master Control</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Company roles &amp; passwords, bank &amp; UPI details, Telegram backup and danger-zone tools
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setMasterControlOpen(true)}>
              Open Master Control
            </button>
          </div>

          {/* 10 Stat Grid Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>CUSTOMERS</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>{customers.length}</span>
              </div>
              <div className="stat-card-icon"><Users size={16} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>ACTIVE LOANS</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>{activeLoans.length}</span>
              </div>
              <div className="stat-card-icon"><CreditCard size={16} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>TOTAL DISBURSED</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>₹{totalDisbursed.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon"><DollarSign size={16} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>OUTSTANDING</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>₹{totalOutstanding.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon"><Wallet size={16} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>COLLECTED</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>₹{totalCollected.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon"><CheckCircle2 size={16} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>ACTIVE FDS</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>{activeFDs.length}</span>
              </div>
              <div className="stat-card-icon"><PiggyBank size={16} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>CASH IN HAND</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>₹{cashInHand.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon"><Wallet size={16} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>CASH AT BANK</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>₹{cashAtBank.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon"><Building2 size={16} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>REMINDERS DUE</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>0</span>
              </div>
              <div className="stat-card-icon"><Bell size={16} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>RECORDS</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>{totalRecords}</span>
              </div>
              <div className="stat-card-icon"><Database size={16} /></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bulk-fd' && (
        <div className="card" style={{ padding: '24px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No fixed deposits in this company yet.</p>
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Devices</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>Computers and phones allowed to open KKV GOLD FINANCE</p>
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-secondary)' }}>
            A new computer must enter the activation code before it can sign in. Each browser counts on its own — Chrome and Edge on one computer use two places. Contact support to free a place or change how many devices are allowed.
          </div>
        </div>
      )}

      {/* MASTER CONTROL MODAL */}
      {masterControlOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative' }}>
            <button style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setMasterControlOpen(false)}>
              <X size={18} />
            </button>

            {!masterControlUnlocked ? (
              /* LOGIN PROMPT */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Master Control — Login</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Enter master password to access protected settings (Default: admin123)</p>
                <form onSubmit={handleUnlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label required">PASSWORD</label>
                    <input type="password" className="input-control" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" autoFocus />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary">Unlock</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setMasterControlOpen(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            ) : (
              /* UNLOCKED MASTER CONTROL TABS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Master Control</h2>

                <div style={{ padding: '10px 14px', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                  Changes here affect all NEW loans. Existing loans keep the rates they were issued at unless you also reset.
                </div>

                {/* Master Tabs */}
                <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                  {[
                    { key: 'rates', label: 'Rates & Payments' },
                    { key: 'operations', label: 'Operations' },
                    { key: 'messaging', label: 'Messaging' },
                    { key: 'security', label: 'Security & Access' },
                    { key: 'danger', label: 'Danger Zone' }
                  ].map(mt => (
                    <button
                      key={mt.key}
                      type="button"
                      style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: masterSubTab === mt.key ? 'var(--color-primary-dark)' : 'var(--text-muted)', borderBottom: masterSubTab === mt.key ? '2px solid var(--color-primary-dark)' : 'none', paddingBottom: '4px' }}
                      onClick={() => setMasterSubTab(mt.key as any)}
                    >
                      {mt.label}
                    </button>
                  ))}
                </div>

                {/* RATES & PAYMENTS SUBTAB */}
                {masterSubTab === 'rates' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Sub Chips */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { key: 'gold', label: 'Gold Loan' },
                        { key: 'silver', label: 'Silver Loan' },
                        { key: 'pronote', label: 'Pronote' },
                        { key: 'hire', label: 'Hire Purchase' },
                        { key: 'card', label: 'Card Fee' },
                        { key: 'overdue', label: 'Overdue Interest' },
                        { key: 'upi', label: 'UPI Payment' }
                      ].map(sc => (
                        <button
                          key={sc.key}
                          type="button"
                          className={`btn btn-sm ${ratesSubChip === sc.key ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ borderRadius: 'var(--radius-full)', fontSize: '12px' }}
                          onClick={() => setRatesSubChip(sc.key as any)}
                        >
                          {sc.label}
                        </button>
                      ))}
                    </div>

                    {ratesSubChip === 'upi' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700 }}>UPI Payment</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Used for payment QR code and the pay link in WhatsApp reminders</p>
                        <div className="form-group">
                          <label className="form-label">UPI ID</label>
                          <input type="text" className="input-control" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">PAYEE NAME (SHOWN IN UPI APP)</label>
                          <input type="text" className="input-control" value={upiPayeeName} onChange={(e) => setUpiPayeeName(e.target.value)} />
                        </div>
                      </div>
                    )}

                    {ratesSubChip === 'gold' && (
                      <div className="form-group">
                        <label className="form-label">GOLD LOAN MONTHLY INTEREST RATE (%)</label>
                        <input type="number" step="0.1" className="input-control" value={goldRate} onChange={(e) => setGoldRate(Number(e.target.value))} />
                      </div>
                    )}
                  </div>
                )}

                {/* MESSAGING SUBTAB */}
                {masterSubTab === 'messaging' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Custom WhatsApp Message Templates</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Placeholders you can use: &#123;name&#125; &#123;loanId&#125; &#123;principal&#125; &#123;dueDate&#125; &#123;amount&#125; &#123;upiId&#125; &#123;bankName&#125; &#123;billNo&#125; &#123;date&#125;
                    </p>

                    <div className="form-group">
                      <label className="form-label">WELCOME MESSAGE (SENT AFTER ISSUING A NEW LOAN)</label>
                      <textarea className="input-control" rows={3} value={welcomeTpl} onChange={(e) => setWelcomeTpl(e.target.value)} />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>READY-MADE:</span>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setWelcomeTpl('Dear {name}, Thank you for choosing {bankName}. Your loan {loanId} for ₹{principal} has been disbursed.')}>Professional</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setWelcomeTpl('{bankName}: Loan {loanId} ₹{principal} issued. Due date {dueDate}.')}>Short</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setWelcomeTpl('வணக்கம் {name}, உங்கள் கடன் {loanId} பெறப்பட்டது. நன்றி {bankName}.')}>Tamil</button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">DUE REMINDER (PENDING LOANS → WHATSAPP)</label>
                      <textarea className="input-control" rows={3} value={dueTpl} onChange={(e) => setDueTpl(e.target.value)} />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>READY-MADE:</span>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDueTpl('Dear {name}, your interest payment for Gold Loan {loanId} of ₹{amount} is pending. Due date: {dueDate}. UPI: {upiId}')}>Professional</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDueTpl('Reminder: Loan {loanId} interest ₹{amount} due on {dueDate}. Pay via UPI: {upiId}')}>With UPI</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* DANGER ZONE SUBTAB */}
                {masterSubTab === 'danger' && (
                  <div style={{ padding: '20px', backgroundColor: 'var(--badge-danger-bg)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--badge-danger-text)' }}>Danger Zone</h4>
                    <p style={{ fontSize: '12px', color: 'var(--badge-danger-text)' }}>
                      Resetting all data will wipe local storage and restore default mock dataset.
                    </p>
                    <button
                      type="button"
                      className="btn"
                      style={{ backgroundColor: '#DC2626', color: '#FFF', alignSelf: 'flex-start', padding: '10px 20px', fontWeight: 700 }}
                      onClick={() => {
                        resetAllData();
                        setMasterControlOpen(false);
                      }}
                    >
                      Reset All System Data
                    </button>
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
    </div>
  );
};
