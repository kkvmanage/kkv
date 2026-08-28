import React from 'react';
import { useApp } from '../context/AppContext';
import { Grid, FileSpreadsheet, Printer, CheckCircle2, Clock, Coins } from 'lucide-react';

export const TotalLoans: React.FC = () => {
  const { loans, showToast } = useApp();

  const totalLoansCount = loans.length;
  const activeLoansCount = loans.filter((l) => l.status === 'ACTIVE').length;
  const closedLoansCount = loans.filter((l) => l.status === 'CLOSED').length;
  const totalPrincipal = loans.reduce((a, b) => a + b.principal, 0);
  const outstandingAmount = loans.reduce((a, b) => a + b.outstandingPrincipal, 0);

  return (
    <div className="page-content">
      {/* 5 Summary Metrics at Top */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Total Loans</span>
            <span className="stat-card-value">{totalLoansCount}</span>
            <span className="stat-card-sub">All-time accounts</span>
          </div>
          <div className="stat-card-icon">
            <Grid size={18} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Active Loans</span>
            <span className="stat-card-value" style={{ color: 'var(--badge-success-text)' }}>
              {activeLoansCount}
            </span>
            <span className="stat-card-sub">Currently pledged</span>
          </div>
          <div className="stat-card-icon">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Closed Loans</span>
            <span className="stat-card-value" style={{ color: 'var(--text-secondary)' }}>
              {closedLoansCount}
            </span>
            <span className="stat-card-sub">Redeemed &amp; settled</span>
          </div>
          <div className="stat-card-icon">
            <Clock size={18} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Total Principal</span>
            <span className="stat-card-value">₹{totalPrincipal.toLocaleString('en-IN')}</span>
            <span className="stat-card-sub">Gross volume</span>
          </div>
          <div className="stat-card-icon">
            <Coins size={18} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Outstanding Amount</span>
            <span className="stat-card-value">₹{outstandingAmount.toLocaleString('en-IN')}</span>
            <span className="stat-card-sub">Active balance</span>
          </div>
          <div className="stat-card-icon">
            <Coins size={18} />
          </div>
        </div>
      </div>

      {/* Detailed Loans Master Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Total Loans Portfolio Registry</h2>
            <p className="card-description">Comprehensive ledger of all historical and active gold loan pledge contracts</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => showToast('Exporting master portfolio to CSV...', 'info')}>
              <FileSpreadsheet size={14} />
              <span>Export CSV</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
              <Printer size={14} />
              <span>Print Registry</span>
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>LOAN #</th>
                <th>CUSTOMER</th>
                <th>DISBURSEMENT DATE</th>
                <th>PRINCIPAL</th>
                <th>CURRENT BALANCE</th>
                <th>NET WT (G)</th>
                <th>MARKET VALUE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{l.loanNo}</td>
                  <td style={{ fontWeight: 600 }}>{l.customerName}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{l.date}</td>
                  <td style={{ fontWeight: 600 }}>₹{l.principal.toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                    ₹{l.outstandingPrincipal.toLocaleString('en-IN')}
                  </td>
                  <td>{l.totalNetWeight.toFixed(3)} g</td>
                  <td>₹{l.marketValue.toLocaleString('en-IN')}</td>
                  <td>
                    <span
                      className={`badge ${
                        l.status === 'ACTIVE'
                          ? 'badge-success'
                          : l.status === 'CLOSED'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
