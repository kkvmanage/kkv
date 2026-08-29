import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Users, CreditCard, DollarSign, CheckCircle2, PiggyBank, Wallet, Building2, Bell, Database, X, Save, Lock, Plus, Trash2 } from 'lucide-react';
import { AmountBand } from '../types';

import { KKVLogo } from '../components/common/KKVLogo';

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
  const [ratesSubChip, setRatesSubChip] = useState<'gold' | 'silver' | 'pronote' | 'hire' | 'card' | 'overdue' | 'upi'>('gold');

  // Rates & Payments Form State with safe fallbacks
  const [goldShowOnIssue, setGoldShowOnIssue] = useState<boolean>(masterControlSettings?.showOnLoanIssue ?? true);
  const [amountBands, setAmountBands] = useState<AmountBand[]>(masterControlSettings?.amountBands || []);

  // Messaging Form State with safe fallbacks
  const [welcomeTpl, setWelcomeTpl] = useState<string>(whatsAppTemplates?.welcomeMessage || '');
  const [dueTpl, setDueTpl] = useState<string>(whatsAppTemplates?.dueReminderMessage || '');

  // Security Form State
  const [adminPass, setAdminPass] = useState<string>(masterControlSettings?.adminPassword || 'admin123');
  const [managerPass, setManagerPass] = useState<string>(masterControlSettings?.managerPassword || 'manager123');
  const [operatorPass, setOperatorPass] = useState<string>(masterControlSettings?.operatorPassword || 'operator123');

  // Operations Feature Toggles
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(masterControlSettings?.animationsEnabled ?? true);
  const [performanceModeEnabled, setPerformanceModeEnabled] = useState<boolean>(masterControlSettings?.performanceModeEnabled ?? false);
  const [bulkFdDateChangeEnabled, setBulkFdDateChangeEnabled] = useState<boolean>(masterControlSettings?.bulkFdDateChangeEnabled ?? true);
  const [lockersEnabled, setLockersEnabled] = useState<boolean>(masterControlSettings?.lockersEnabled ?? false);

  // Synchronize local form states when context data updates asynchronously
  useEffect(() => {
    if (masterControlSettings) {
      setGoldShowOnIssue(masterControlSettings.showOnLoanIssue ?? true);
      setAmountBands(masterControlSettings.amountBands || []);
      setAdminPass(masterControlSettings.adminPassword || 'admin123');
      setManagerPass(masterControlSettings.managerPassword || 'manager123');
      setOperatorPass(masterControlSettings.operatorPassword || 'operator123');
      setAnimationsEnabled(masterControlSettings.animationsEnabled ?? true);
      setPerformanceModeEnabled(masterControlSettings.performanceModeEnabled ?? false);
      setBulkFdDateChangeEnabled(masterControlSettings.bulkFdDateChangeEnabled ?? true);
      setLockersEnabled(masterControlSettings.lockersEnabled ?? false);
    }
  }, [masterControlSettings]);

  useEffect(() => {
    if (whatsAppTemplates) {
      setWelcomeTpl(whatsAppTemplates.welcomeMessage || '');
      setDueTpl(whatsAppTemplates.dueReminderMessage || '');
    }
  }, [whatsAppTemplates]);

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
      amountBands: amountBands || [],
      adminPassword: adminPass,
      managerPassword: managerPass,
      operatorPassword: operatorPass,
      animationsEnabled,
      performanceModeEnabled,
      bulkFdDateChangeEnabled,
      lockersEnabled
    });
    updateWhatsAppTemplates({
      welcomeMessage: welcomeTpl,
      dueReminderMessage: dueTpl
    });
    setMasterControlOpen(false);
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
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'fd-rates', label: 'FD Interest Rates' },
          { key: 'bulk-fd', label: 'Bulk FD Date Change' },
          { key: 'data-backup', label: 'Data & Backup' },
          { key: 'devices', label: 'Devices' }
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)', fontSize: '13px', padding: '6px 16px' }}
            onClick={() => setActiveTab(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="stat-card-icon icon-chip-green" style={{ flexShrink: 0 }}>
                <Lock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Master Control</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Company roles &amp; passwords, bank &amp; UPI details, Telegram backup and danger-zone tools.</p>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setMasterControlOpen(true)} style={{ gap: '8px' }}>
              <span>Open Master Control</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>CUSTOMERS</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>{safeCustomers.length}</span>
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
                <span className="stat-card-value" style={{ fontSize: '20px' }}>₹{(cashInHand || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card-icon"><Wallet size={16} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label" style={{ fontSize: '10px' }}>CASH AT BANK</span>
                <span className="stat-card-value" style={{ fontSize: '20px' }}>₹{(cashAtBank || 0).toLocaleString('en-IN')}</span>
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
                      onClick={() => setMasterSubTab(mt.key as any)}
                    >
                      {mt.label}
                    </button>
                  ))}
                </div>

                {masterSubTab === 'rates' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { key: 'gold', label: '📍 Gold Loan' },
                        { key: 'upi', label: '💳 UPI Payment' }
                      ].map((sc) => (
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

                    {ratesSubChip === 'gold' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>SHOW ON LOAN ISSUE</span>
                          <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-secondary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${goldShowOnIssue ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setGoldShowOnIssue(true)}
                            >
                              On
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${!goldShowOnIssue ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setGoldShowOnIssue(false)}
                            >
                              Off
                            </button>
                          </div>
                        </div>

                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                              MONTHLY INTEREST AMOUNT BANDS
                            </h4>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ gap: '4px', fontSize: '11.5px', padding: '4px 10px' }}
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
                            (amountBands || []).map((band, idx) => (
                              <div key={band.id || idx} style={{ marginBottom: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                                <div>
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
                                <div>
                                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>BASE %/MONTH</label>
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
                                <div>
                                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>PENALTY AFTER (MOS)</label>
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
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '6px', marginTop: '14px' }}
                                  onClick={() => setAmountBands((amountBands || []).filter((b) => b.id !== band.id))}
                                  title="Delete Band"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {masterSubTab === 'messaging' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">WELCOME MESSAGE</label>
                      <textarea
                        className="input-control"
                        rows={3}
                        value={welcomeTpl}
                        onChange={(e) => setWelcomeTpl(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">DUE REMINDER MESSAGE</label>
                      <textarea
                        className="input-control"
                        rows={3}
                        value={dueTpl}
                        onChange={(e) => setDueTpl(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {masterSubTab === 'operations' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System Feature Toggles</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      <div className="card" style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                      <div className="card" style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                      <div className="card" style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                      <div className="card" style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                {masterSubTab === 'security' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company Role Passwords</h3>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>Configure default sign-in passwords for workspace roles.</p>

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

                {masterSubTab === 'danger' && (
                  <div style={{ padding: '20px', backgroundColor: 'rgba(201, 106, 106, 0.08)', border: '1px solid rgba(201, 106, 106, 0.35)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#991B1B' }}>WIPE ALL DATA</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                      Warning: This action resets all customers, loans, receipts, and accounting ledgers to initial state.
                    </p>
                    <button
                      type="button"
                      className="btn"
                      style={{ backgroundColor: '#DC2626', color: '#FFF' }}
                      onClick={() => {
                        resetAllData();
                        setMasterControlOpen(false);
                      }}
                    >
                      Wipe All Data
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

export default AdminPanel;
