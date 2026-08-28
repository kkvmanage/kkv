import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Download, MessageCircle, AlertTriangle, Clock, CheckCircle2, FileText } from 'lucide-react';

interface ReminderRecord {
  id: string;
  loanNo: string;
  customerName: string;
  vehicle: string;
  type: 'RC Book' | 'Insurance' | 'Road Tax' | 'Permit' | 'FC Expiry';
  expiryDate: string;
  daysLeft: number;
  amount: number;
  status: 'EXPIRED' | 'DUE IN 30 DAYS' | 'UPCOMING' | 'ALL GOOD';
}

const mockReminders: ReminderRecord[] = [
  {
    id: 'rem-1',
    loanNo: 'GL-01',
    customerName: 'Thayba Begum',
    vehicle: 'TN-09-CB-4492 (Pledge Collateral)',
    type: 'Insurance',
    expiryDate: '15-09-2026',
    daysLeft: 21,
    amount: 100000,
    status: 'DUE IN 30 DAYS'
  },
  {
    id: 'rem-2',
    loanNo: 'GL-02',
    customerName: 'Rajan P',
    vehicle: 'TN-07-BQ-1188 (Pledge Collateral)',
    type: 'RC Book',
    expiryDate: '28-10-2026',
    daysLeft: 64,
    amount: 45000,
    status: 'UPCOMING'
  }
];

export const RCRenewalReminders: React.FC = () => {
  const { showToast } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = mockReminders.filter((r) => {
    const matchesSearch =
      r.loanNo.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.vehicle.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'All' || r.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const expiredCount = mockReminders.filter((r) => r.status === 'EXPIRED').length;
  const due30Count = mockReminders.filter((r) => r.status === 'DUE IN 30 DAYS').length;
  const upcomingCount = mockReminders.filter((r) => r.status === 'UPCOMING').length;
  const allGoodCount = mockReminders.filter((r) => r.status === 'ALL GOOD').length;

  const handleSendAllReminders = () => {
    showToast('Sending WhatsApp automated renewal reminders to all customers...', 'success');
  };

  const handleExportCSV = () => {
    showToast('Exporting renewal reminders list to CSV...', 'info');
  };

  return (
    <div className="page-content">
      {/* 4 Summary Stat Cards */}
      <div className="grid-4" style={{ marginBottom: '18px' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">EXPIRED</span>
            <AlertTriangle size={16} color="var(--badge-danger-text)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--badge-danger-text)' }}>{expiredCount}</div>
          <div className="stat-helper">Requires urgent follow-up</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">DUE IN 30 DAYS</span>
            <Clock size={16} color="var(--badge-warning-text)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--badge-warning-text)' }}>{due30Count}</div>
          <div className="stat-helper">Immediate notice period</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">UPCOMING</span>
            <FileText size={16} color="var(--color-primary-accent)" />
          </div>
          <div className="stat-value">{upcomingCount}</div>
          <div className="stat-helper">30 to 90 days out</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">ALL GOOD</span>
            <CheckCircle2 size={16} color="var(--badge-success-text)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--badge-success-text)' }}>{allGoodCount}</div>
          <div className="stat-helper">Fully compliant pledges</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">RC &amp; Renewal Reminders</h2>
            <p className="card-description">
              RC books still to come in, plus Insurance, Road Tax, Permit and F.C. expiries on PN/HP loans
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
            marginBottom: '16px',
            flexWrap: 'wrap',
            padding: '14px',
            backgroundColor: 'var(--bg-surface-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
            <label className="form-label">SEARCH</label>
            <input
              type="text"
              className="input-control"
              placeholder="Loan No, customer, or vehicle no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ width: '150px' }}>
            <label className="form-label">TYPE</label>
            <select
              className="select-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="RC Book">RC Book</option>
              <option value="Insurance">Insurance</option>
              <option value="Road Tax">Road Tax</option>
              <option value="Permit">Permit</option>
              <option value="FC Expiry">FC Expiry</option>
            </select>
          </div>

          <div className="form-group" style={{ width: '150px' }}>
            <label className="form-label">STATUS</label>
            <select
              className="select-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="EXPIRED">Expired</option>
              <option value="DUE IN 30 DAYS">Due in 30 Days</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="ALL GOOD">All Good</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSendAllReminders}
              style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
            >
              <MessageCircle size={14} />
              <span>Send All Reminders</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>LOAN NO</th>
                <th>CUSTOMER</th>
                <th>VEHICLE</th>
                <th>TYPE</th>
                <th>EXPIRY DATE</th>
                <th>DAYS LEFT</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No vehicle renewals tracked. Add RC details on a Pronote or HP loan to get reminders here.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{r.loanNo}</td>
                    <td style={{ fontWeight: 600 }}>{r.customerName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.vehicle}</td>
                    <td>
                      <span className="badge badge-info">{r.type}</span>
                    </td>
                    <td>{r.expiryDate}</td>
                    <td style={{ fontWeight: 700, color: r.daysLeft <= 30 ? 'var(--badge-warning-text)' : 'inherit' }}>
                      {r.daysLeft} days
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{r.amount.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${r.status === 'EXPIRED' ? 'badge-danger' : r.status === 'DUE IN 30 DAYS' ? 'badge-warning' : 'badge-success'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
