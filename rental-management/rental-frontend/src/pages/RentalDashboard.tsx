import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Store,
  Wallet,
  Clock,
  TrendingDown,
  TrendingUp,
  Receipt,
  Plus,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { rentalApi } from '../services/rentalApi.ts';
import { RentalDashboardData, RentalComplex, RentalShop } from '../types/rental.types.ts';
import { PaymentModal } from '../components/PaymentModal.tsx';
import { ExpenseModal } from '../components/ExpenseModal.tsx';
import { ComplexModal } from '../components/ComplexModal.tsx';
import { ShopModal } from '../components/ShopModal.tsx';

export const RentalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const currentMonth = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [data, setData] = useState<RentalDashboardData | null>(null);
  const [complexes, setComplexes] = useState<RentalComplex[]>([]);
  const [shops, setShops] = useState<RentalShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [complexModalOpen, setComplexModalOpen] = useState(false);
  const [shopModalOpen, setShopModalOpen] = useState(false);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const [dashRes, compRes, shopRes] = await Promise.all([
        rentalApi.getDashboardData(selectedMonth),
        rentalApi.getComplexes(),
        rentalApi.getShops(),
      ]);

      if (dashRes.success) setData(dashRes.data);
      if (compRes.success) setComplexes(compRes.data);
      if (shopRes.success) setShops(shopRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedMonth]);

  const collectionPercent =
    data && data.expectedMonthlyRent > 0
      ? Math.min(100, Math.round((data.collectedThisMonth / data.expectedMonthlyRent) * 100))
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Hero / Filter Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="stat-card-icon icon-chip-green">
            <Calendar size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Monthly Billing Period: {selectedMonth}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Commercial rent collections, advance management, and property expenses
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-control"
            style={{ width: '160px', height: '36px' }}
          />
          <button className="btn btn-primary btn-sm" onClick={() => setPaymentModalOpen(true)}>
            <Plus size={14} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 8 Metric Stat Cards — KKV Gold Finance Style Grid */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        {/* Total Complexes */}
        <div className="stat-card" onClick={() => navigate('/complexes')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-info">
            <span className="stat-card-label">Total Complexes</span>
            <span className="stat-card-value">{data?.totalComplexes || 0}</span>
            <span className="stat-card-sub">Active commercial properties</span>
          </div>
          <div className="stat-card-icon icon-chip-green">
            <Building2 size={20} />
          </div>
        </div>

        {/* Total Shops */}
        <div className="stat-card" onClick={() => navigate('/shops')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-info">
            <span className="stat-card-label">Total Shops</span>
            <span className="stat-card-value">{data?.totalShops || 0}</span>
            <span className="stat-card-sub">Leased & registered units</span>
          </div>
          <div className="stat-card-icon icon-chip-blue">
            <Store size={20} />
          </div>
        </div>

        {/* Expected Monthly Rent */}
        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Expected Rent</span>
            <span className="stat-card-value">₹{(data?.expectedMonthlyRent || 0).toLocaleString('en-IN')}</span>
            <span className="stat-card-sub">Target for {selectedMonth}</span>
          </div>
          <div className="stat-card-icon icon-chip-gold">
            <CreditCard size={20} />
          </div>
        </div>

        {/* Collected This Month */}
        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label" style={{ color: 'var(--color-success)' }}>
              Collected Rent
            </span>
            <span className="stat-card-value" style={{ color: 'var(--color-success)' }}>
              ₹{(data?.collectedThisMonth || 0).toLocaleString('en-IN')}
            </span>
            <span className="stat-card-sub">{collectionPercent}% Target Achieved</span>
          </div>
          <div className="stat-card-icon icon-chip-teal">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Pending Rent */}
        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label" style={{ color: 'var(--color-warning)' }}>
              Pending Rent
            </span>
            <span className="stat-card-value" style={{ color: 'var(--color-warning)' }}>
              ₹{(data?.pendingRent || 0).toLocaleString('en-IN')}
            </span>
            <span className="stat-card-sub">Due from active tenants</span>
          </div>
          <div className="stat-card-icon icon-chip-orange">
            <Clock size={20} />
          </div>
        </div>

        {/* Available Advance */}
        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label" style={{ color: 'var(--color-info)' }}>
              Available Advance
            </span>
            <span className="stat-card-value" style={{ color: 'var(--color-info)' }}>
              ₹{(data?.availableAdvance || 0).toLocaleString('en-IN')}
            </span>
            <span className="stat-card-sub">Tenant advance deposits</span>
          </div>
          <div className="stat-card-icon icon-chip-blue">
            <Wallet size={20} />
          </div>
        </div>

        {/* Today's Collection */}
        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Today&apos;s Collection</span>
            <span className="stat-card-value">₹{(data?.todaysCollection || 0).toLocaleString('en-IN')}</span>
            <span className="stat-card-sub">Day book receipts</span>
          </div>
          <div className="stat-card-icon icon-chip-green">
            <Receipt size={20} />
          </div>
        </div>

        {/* Today's / Month's Expenses */}
        <div className="stat-card" onClick={() => navigate('/expenses')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-info">
            <span className="stat-card-label" style={{ color: 'var(--color-danger)' }}>
              Monthly Expenses
            </span>
            <span className="stat-card-value" style={{ color: 'var(--color-danger)' }}>
              ₹{(data?.thisMonthExpenses || 0).toLocaleString('en-IN')}
            </span>
            <span className="stat-card-sub">
              Today: ₹{(data?.todaysExpenses || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="stat-card-icon icon-chip-red">
            <TrendingDown size={20} />
          </div>
        </div>
      </div>

      {/* Row: Payment Mode Split & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {/* Cash vs GPay Mode Split */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Cash vs. Google Pay Collections</h3>
              <p className="card-description">Collection mode distribution for {selectedMonth}</p>
            </div>
            <span className="badge badge-gold">
              Total: ₹{(data?.paymentModeSplit.total || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>Cash Receipts</span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{(data?.paymentModeSplit.cashTotal || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--color-success)',
                    width: `${
                      data && data.paymentModeSplit.total > 0
                        ? Math.round((data.paymentModeSplit.cashTotal / data.paymentModeSplit.total) * 100)
                        : 0
                    }%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-info)' }}>Google Pay / UPI</span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{(data?.paymentModeSplit.gpayTotal || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--color-info)',
                    width: `${
                      data && data.paymentModeSplit.total > 0
                        ? Math.round((data.paymentModeSplit.gpayTotal / data.paymentModeSplit.total) * 100)
                        : 0
                    }%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '6px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              <span>Net Surplus (Rent - Expenses):</span>
              <span style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '13px' }}>
                ₹{(data?.netCollection || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Operations Box */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Staff Quick Operations</h3>
              <p className="card-description">Create properties, record collections, or log building bills</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setPaymentModalOpen(true)}
              style={{ height: '54px', justifyContent: 'flex-start', padding: '0 14px' }}
            >
              <Receipt size={18} style={{ color: 'var(--color-success)' }} />
              <div style={{ textAlign: 'left', marginLeft: '6px' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Collect Rent
                </span>
                <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Cash / GPay / Advance
                </span>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setExpenseModalOpen(true)}
              style={{ height: '54px', justifyContent: 'flex-start', padding: '0 14px' }}
            >
              <TrendingDown size={18} style={{ color: 'var(--color-danger)' }} />
              <div style={{ textAlign: 'left', marginLeft: '6px' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Log Expense
                </span>
                <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Maintenance & Bills
                </span>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setShopModalOpen(true)}
              style={{ height: '54px', justifyContent: 'flex-start', padding: '0 14px' }}
            >
              <Store size={18} style={{ color: 'var(--color-info)' }} />
              <div style={{ textAlign: 'left', marginLeft: '6px' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Add Shop
                </span>
                <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Assign Tenant & Rent
                </span>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setComplexModalOpen(true)}
              style={{ height: '54px', justifyContent: 'flex-start', padding: '0 14px' }}
            >
              <Building2 size={18} style={{ color: 'var(--color-gold)' }} />
              <div style={{ textAlign: 'left', marginLeft: '6px' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Add Complex
                </span>
                <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Commercial Building
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Complex Rent Collection Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">Commercial Complexes Rent Collection Progress</h3>
            <p className="card-description">Live monthly performance by building property</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/complexes')}>
            <span>View All Complexes</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Complex ID</th>
                <th>Complex Name & Location</th>
                <th>Units</th>
                <th style={{ textAlign: 'right' }}>Expected Rent</th>
                <th style={{ textAlign: 'right' }}>Collected</th>
                <th style={{ textAlign: 'right' }}>Pending</th>
                <th style={{ textAlign: 'right' }}>Expenses</th>
                <th style={{ textAlign: 'right' }}>Net Collection</th>
                <th style={{ textAlign: 'center' }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {data?.complexStats.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No complexes configured yet. Click &quot;Add Complex&quot; to begin.
                  </td>
                </tr>
              ) : (
                data?.complexStats.map((c) => {
                  const pct = c.expectedRent > 0 ? Math.round((c.collected / c.expectedRent) * 100) : 0;
                  return (
                    <tr
                      key={c.complexId}
                      onClick={() => navigate(`/complexes/${c.complexId}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-gold)' }}>
                        {c.complexId}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                          {c.complexName}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.location}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.totalShops} Units</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{c.expectedRent.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-success)' }}>
                        ₹{c.collected.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-warning)' }}>
                        ₹{c.pending.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)' }}>
                        ₹{c.expenses.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary-accent)' }}>
                        ₹{c.net.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'center', minWidth: '120px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '6px',
                              backgroundColor: 'var(--bg-surface-secondary)',
                              borderRadius: 'var(--radius-full)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                backgroundColor: 'var(--color-success)',
                                width: `${Math.min(100, pct)}%`,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '32px' }}>{pct}%</span>
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

      {/* Modals */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={fetchDashboard}
        complexes={complexes}
        shops={shops}
      />
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSuccess={fetchDashboard}
        complexes={complexes}
        shops={shops}
      />
      <ComplexModal
        isOpen={complexModalOpen}
        onClose={() => setComplexModalOpen(false)}
        onSuccess={fetchDashboard}
      />
      <ShopModal
        isOpen={shopModalOpen}
        onClose={() => setShopModalOpen(false)}
        onSuccess={fetchDashboard}
        complexes={complexes}
      />
    </div>
  );
};
