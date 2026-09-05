import React, { useState, useEffect } from 'react';
import { Printer, CreditCard, TrendingUp, TrendingDown, Clock, Wallet, Smartphone, IndianRupee } from 'lucide-react';
import { rentalApi } from '../services/rentalApi.ts';
import { MonthlyRentReportItem, PaymentModeReportData } from '../types/rental.types.ts';
import { SummaryCard } from '../components/common/SummaryCard.tsx';
import { PaymentMethodBadge } from '../components/common/PaymentMethodBadge.tsx';

export const ReportsAndStatement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'payment_modes'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [monthlyReport, setMonthlyReport] = useState<MonthlyRentReportItem[]>([]);
  const [paymentModeReport, setPaymentModeReport] = useState<PaymentModeReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'monthly') {
        const res = await rentalApi.getMonthlyReport(selectedMonth);
        if (res.success) setMonthlyReport(res.data);
      } else {
        const res = await rentalApi.getPaymentModeReport(startDate || undefined, endDate || undefined);
        if (res.success) setPaymentModeReport(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedMonth, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const totalExpected = monthlyReport.reduce((s, r) => s + r.expectedRent, 0);
  const totalCollected = monthlyReport.reduce((s, r) => s + r.collected, 0);
  const totalPending = monthlyReport.reduce((s, r) => s + r.pending, 0);
  const totalExpenses = monthlyReport.reduce((s, r) => s + r.expenses, 0);
  const totalNet = monthlyReport.reduce((s, r) => s + r.netCollection, 0);

  const paymentModeTotal =
    (paymentModeReport?.cashTotal || 0) + (paymentModeReport?.gpayTotal || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Reports & Statements
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Monthly rental statements, property performance, expense ledgers, and collection mode audit.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={handlePrint}>
          <Printer size={15} />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          className={`btn ${activeTab === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('monthly')}
        >
          Monthly Property Statement
        </button>
        <button
          className={`btn ${activeTab === 'payment_modes' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('payment_modes')}
        >
          Cash vs. GPay Collections
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        {activeTab === 'monthly' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Statement Month:</span>
            <input
              type="month"
              className="filter-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ minWidth: '160px' }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Date Range:</span>
            <input
              type="date"
              className="filter-select"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="From Date"
              style={{ minWidth: '140px' }}
            />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              className="filter-select"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="To Date"
              style={{ minWidth: '140px' }}
            />
          </div>
        )}
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'monthly' ? (
        <>
          {/* Summary Metric Cards */}
          <div className="stat-grid-5">
            <SummaryCard
              label="Expected Rent"
              value={`₹${totalExpected.toLocaleString('en-IN')}`}
              subtext="Contractual target"
              icon={CreditCard}
              iconChipClass="icon-chip-green"
            />
            <SummaryCard
              label="Collected Rent"
              value={`₹${totalCollected.toLocaleString('en-IN')}`}
              subtext="Receipts this month"
              icon={TrendingUp}
              iconChipClass="icon-chip-teal"
              valueColor="var(--color-primary-dark)"
            />
            <SummaryCard
              label="Pending Dues"
              value={`₹${totalPending.toLocaleString('en-IN')}`}
              subtext="Unpaid balance"
              icon={Clock}
              iconChipClass="icon-chip-orange"
              valueColor={totalPending > 0 ? 'var(--color-warning)' : 'var(--text-primary)'}
            />
            <SummaryCard
              label="Property Expenses"
              value={`₹${totalExpenses.toLocaleString('en-IN')}`}
              subtext="Maintenance & utilities"
              icon={TrendingDown}
              iconChipClass="icon-chip-red"
              valueColor="var(--color-danger)"
            />
            <SummaryCard
              label="Net Collection"
              value={`₹${totalNet.toLocaleString('en-IN')}`}
              subtext="Collected minus expenses"
              icon={IndianRupee}
              iconChipClass="icon-chip-blue"
              valueColor={totalNet >= 0 ? 'var(--color-primary-dark)' : 'var(--color-danger)'}
            />
          </div>

          {/* Statement Table */}
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Complex ID</th>
                  <th style={{ width: '220px' }}>Complex Name</th>
                  <th className="text-center" style={{ width: '100px' }}>Shops</th>
                  <th className="text-right" style={{ width: '130px' }}>Expected Rent</th>
                  <th className="text-right" style={{ width: '130px' }}>Collected</th>
                  <th className="text-right" style={{ width: '120px' }}>Pending</th>
                  <th className="text-right" style={{ width: '120px' }}>Expenses</th>
                  <th className="text-right" style={{ width: '140px' }}>Net Yield</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '16px', height: '16px', border: '2px solid var(--color-primary-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Compiling monthly statement...</span>
                      </div>
                    </td>
                  </tr>
                ) : monthlyReport.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                      No statement data available for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  monthlyReport.map((row) => (
                    <tr key={row.complexId}>
                      <td>
                        <span className="cell-mono-id">{row.complexId}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.complexName}</span>
                      </td>
                      <td className="text-center">
                        <span style={{ fontWeight: 600 }}>{row.totalShops}</span>
                      </td>
                      <td className="text-right">
                        <span>₹{row.expectedRent.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="text-right">
                        <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                          ₹{row.collected.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="text-right">
                        <span style={{ color: row.pending > 0 ? 'var(--color-danger)' : 'var(--text-secondary)', fontWeight: row.pending > 0 ? 700 : 500 }}>
                          ₹{row.pending.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="text-right">
                        <span style={{ color: 'var(--color-danger)' }}>
                          ₹{row.expenses.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="text-right">
                        <span style={{ fontWeight: 800, color: row.netCollection >= 0 ? 'var(--color-primary-dark)' : 'var(--color-danger)' }}>
                          ₹{row.netCollection.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Payment Mode Split Cards */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <SummaryCard
              label="Total Collections"
              value={`₹${paymentModeTotal.toLocaleString('en-IN')}`}
              subtext={`${paymentModeReport?.totalPayments || 0} Transactions`}
              icon={IndianRupee}
              iconChipClass="icon-chip-green"
              valueColor="var(--color-primary-dark)"
            />
            <SummaryCard
              label="Cash In Drawer"
              value={`₹${(paymentModeReport?.cashTotal || 0).toLocaleString('en-IN')}`}
              subtext={`${paymentModeReport?.cashCount || 0} Cash receipts`}
              icon={Wallet}
              iconChipClass="icon-chip-teal"
            />
            <SummaryCard
              label="GPay / UPI In Bank"
              value={`₹${(paymentModeReport?.gpayTotal || 0).toLocaleString('en-IN')}`}
              subtext={`${paymentModeReport?.gpayCount || 0} Digital UPI transfers`}
              icon={Smartphone}
              iconChipClass="icon-chip-blue"
            />
          </div>

          {/* Payment Mode Transactions Ledger */}
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Payment ID</th>
                  <th style={{ width: '100px' }}>Date</th>
                  <th style={{ width: '140px' }}>Shop</th>
                  <th style={{ width: '160px' }}>Tenant</th>
                  <th className="text-right" style={{ width: '110px' }}>Total Paid</th>
                  <th className="text-center" style={{ width: '120px' }}>Mode</th>
                  <th className="text-right" style={{ width: '110px' }}>Cash Portion</th>
                  <th className="text-right" style={{ width: '110px' }}>GPay Portion</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '16px', height: '16px', border: '2px solid var(--color-primary-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading transaction ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : !paymentModeReport || paymentModeReport.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                      No payment transactions found in selected range.
                    </td>
                  </tr>
                ) : (
                  paymentModeReport.transactions.map((p) => (
                    <tr key={p.paymentId}>
                      <td>
                        <span className="cell-mono-id">{p.paymentId}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{p.shopNumber}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{p.tenantName || 'N/A'}</span>
                      </td>
                      <td className="text-right">
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                          ₹{p.amountReceived.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="text-center">
                        <PaymentMethodBadge mode={p.paymentMode} cashAmount={p.cashAmount} gpayAmount={p.gpayAmount} />
                      </td>
                      <td className="text-right">
                        <span style={{ fontSize: '13px', color: p.cashAmount > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          ₹{p.cashAmount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="text-right">
                        <span style={{ fontSize: '13px', color: p.gpayAmount > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          ₹{p.gpayAmount.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
