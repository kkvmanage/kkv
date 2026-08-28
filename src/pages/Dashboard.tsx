import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Coins,
  TrendingUp,
  CreditCard,
  Users,
  Eye,
  EyeOff,
  ChevronRight,
  Plus,
  FileText,
  AlertCircle
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { loans, receipts, setCurrentPage, customers } = useApp();
  const [hideValues, setHideValues] = useState<boolean>(false);

  const totalDisbursed = loans.reduce((acc, l) => acc + l.principal, 0);
  const totalCollected = receipts.filter(r => r.kind === 'REPAYMENT' || r.kind === 'INTEREST PAYMENT' || r.kind === 'LOAN CLOSURE').reduce((acc, r) => acc + r.amount, 0);
  const totalOutstanding = loans.reduce((acc, l) => acc + l.outstandingPrincipal, 0);

  const formatAmount = (val: number) => {
    return hideValues ? '₹XXXXXX' : `₹${val.toLocaleString('en-IN')}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const activeCount = loans.filter(l => l.status === 'ACTIVE').length;
  const overdueCount = loans.filter(l => l.status === 'OVERDUE' || (l.nextDueDate && new Date(l.nextDueDate.split('-').reverse().join('-')) < new Date())).length;
  const closedCount = loans.filter(l => l.status === 'CLOSED').length;
  const totalLoanCount = loans.length;

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Greeting Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {getGreeting()}
        </h2>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setHideValues(!hideValues)}
          style={{ gap: '6px' }}
        >
          {hideValues ? <Eye size={15} /> : <EyeOff size={15} />}
          <span>{hideValues ? 'Show Amounts' : 'Hide Amounts'}</span>
        </button>
      </div>

      {/* 4 Stat Grid Cards */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="stat-card" style={{ position: 'relative' }}>
          <div className="stat-card-info">
            <span className="stat-card-label" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)' }}>TOTAL DISBURSED</span>
            <span className="stat-card-value" style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{formatAmount(totalDisbursed)}</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284C7' }}>
            <Coins size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)' }}>COLLECTED</span>
            <span className="stat-card-value" style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{formatAmount(totalCollected)}</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)' }}>OUTSTANDING</span>
            <span className="stat-card-value" style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{formatAmount(totalOutstanding)}</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <CreditCard size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)' }}>CUSTOMERS</span>
            <span className="stat-card-value" style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{customers.length}</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Middle Row Charts: Disbursement vs Collection & Loan Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Line Chart Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Disbursement vs Collection</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Last 6 months - live</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366F1' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366F1' }}></span>
                Disbursed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                Collected
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div style={{ width: '100%', height: '180px', position: 'relative', marginTop: '10px' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none">
              <line x1="0" y1="120" x2="500" y2="120" stroke="var(--border-light)" strokeDasharray="4 4" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="var(--border-light)" strokeDasharray="4 4" />
              <line x1="0" y1="30" x2="500" y2="30" stroke="var(--border-light)" strokeDasharray="4 4" />

              {/* Disbursed Line */}
              <path
                d="M 20 110 L 100 80 L 180 95 L 260 50 L 340 70 L 420 35"
                fill="none"
                stroke="#6366F1"
                strokeWidth="3"
              />
              {/* Collected Line */}
              <path
                d="M 20 115 L 100 100 L 180 85 L 260 70 L 340 60 L 420 40"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
              />

              {/* Data Dots */}
              {[
                { x: 20, y1: 110, y2: 115 },
                { x: 100, y1: 80, y2: 100 },
                { x: 180, y1: 95, y2: 85 },
                { x: 260, y1: 50, y2: 70 },
                { x: 340, y1: 70, y2: 60 },
                { x: 420, y1: 35, y2: 40 }
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y1} r="4" fill="#6366F1" />
                  <circle cx={pt.x} cy={pt.y2} r="4" fill="#10B981" />
                </g>
              ))}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
            </div>
          </div>
        </div>

        {/* Donut Chart Card */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Loan Status</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{totalLoanCount} loans</span>
          </div>

          <div style={{ position: 'relative', width: '130px', height: '130px', margin: '12px 0' }}>
            <svg width="130" height="130" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--bg-surface-secondary)"
                strokeWidth="3.8"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3.8"
                strokeDasharray="70, 100"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3.8"
                strokeDasharray="20, 100"
                strokeDashoffset="-70"
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalLoanCount}</span>
              <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL LOANS</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></span> Active ({activeCount})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span> Overdue ({overdueCount})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }}></span> Closed ({closedCount})
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Recent Activity Table */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="card-header" style={{ marginBottom: '14px' }}>
            <div>
              <h3 className="card-title">Recent Activity</h3>
              <p className="card-description">Latest transactions and disbursements</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setCurrentPage('all-receipts')}>
              View All
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>VOUCHER #</th>
                  <th>KIND</th>
                  <th>CUSTOMER</th>
                  <th>LOAN #</th>
                  <th>AMOUNT</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {receipts.length > 0 ? (
                  receipts.slice(0, 5).map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>#{r.receiptNo}</td>
                      <td>
                        <span className={`badge ${r.kind === 'NEW LOAN' ? 'badge-info' : 'badge-success'}`}>
                          {r.kind}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.customerName}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>{r.loanNo}</td>
                      <td style={{ fontWeight: 700 }}>₹{r.amount.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{r.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Quick Actions</h3>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}
            onClick={() => setCurrentPage('loan-issue')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Plus size={16} />
              <span>+ Issue New Loan</span>
            </div>
            <ChevronRight size={16} />
          </button>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}
            onClick={() => setCurrentPage('loan-receipts')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={16} />
              <span>Record Loan Receipt</span>
            </div>
            <ChevronRight size={16} />
          </button>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}
            onClick={() => setCurrentPage('pending-loans')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={16} />
              <span>View Pending Loans</span>
            </div>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
