import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  RotateCcw,
  IndianRupee,
  Wallet,
  Smartphone,
  History,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { rentalApi } from '../services/rentalApi.ts';
import { RentalPayment, RentalComplex, RentalShop, PaymentMode, PaymentStatus } from '../types/rental.types.ts';
import { PaymentModal } from '../components/PaymentModal.tsx';
import { PaymentDetailsModal } from '../components/PaymentDetailsModal.tsx';
import { SummaryCard } from '../components/common/SummaryCard.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { PaymentMethodBadge } from '../components/common/PaymentMethodBadge.tsx';

export const RentPayments: React.FC = () => {
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [complexes, setComplexes] = useState<RentalComplex[]>([]);
  const [shops, setShops] = useState<RentalShop[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplex, setSelectedComplex] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | ''>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [viewPayment, setViewPayment] = useState<RentalPayment | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [paymentsRes, complexesRes, shopsRes] = await Promise.all([
        rentalApi.getPayments({
          complexId: selectedComplex || undefined,
          month: selectedMonth || undefined,
          paymentMode: (selectedPaymentMode as PaymentMode) || undefined,
        }),
        rentalApi.getComplexes(),
        rentalApi.getShops(),
      ]);

      if (paymentsRes.success) setPayments(paymentsRes.data);
      if (complexesRes.success) setComplexes(complexesRes.data);
      if (shopsRes.success) setShops(shopsRes.data);
    } catch (err) {
      console.error('Error fetching payments data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedComplex, selectedMonth, selectedPaymentMode]);

  // Client-side filtering for Search & Status
  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.paymentId.toLowerCase().includes(q) ||
      (p.tenantName && p.tenantName.toLowerCase().includes(q)) ||
      (p.shopNumber && p.shopNumber.toLowerCase().includes(q)) ||
      (p.complexName && p.complexName.toLowerCase().includes(q)) ||
      (p.mobileNumber && p.mobileNumber.includes(q));

    const matchesStatus = !selectedStatus || p.paymentStatus === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalCollected = filteredPayments.reduce((sum, p) => sum + (p.amountReceived || 0), 0);
  const totalCash = filteredPayments.reduce((sum, p) => sum + (p.cashAmount || 0), 0);
  const totalGPay = filteredPayments.reduce((sum, p) => sum + (p.gpayAmount || 0), 0);
  const totalAdvanceUsed = filteredPayments.reduce((sum, p) => sum + (p.advanceUsed || 0), 0);
  const totalPendingBalance = filteredPayments.reduce((sum, p) => sum + (p.balanceAfterPayment || 0), 0);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedComplex('');
    setSelectedMonth('');
    setSelectedPaymentMode('');
    setSelectedStatus('');
  };

  const hasActiveFilters =
    searchQuery || selectedComplex || selectedMonth || selectedPaymentMode || selectedStatus;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Rent Payments
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Historical ledger of all rent collections, advance deductions and payment modes.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setIsNewPaymentModalOpen(true)}
        >
          <Plus size={16} />
          <span>New Rent Payment</span>
        </button>
      </div>

      {/* 5 Summary Cards Grid */}
      <div className="stat-grid-5">
        <SummaryCard
          label="Total Collected"
          value={`₹${totalCollected.toLocaleString('en-IN')}`}
          subtext={`${filteredPayments.length} transactions recorded`}
          icon={IndianRupee}
          iconChipClass="icon-chip-green"
          valueColor="var(--color-primary-dark)"
        />
        <SummaryCard
          label="Cash Collection"
          value={`₹${totalCash.toLocaleString('en-IN')}`}
          subtext="Cash in drawer"
          icon={Wallet}
          iconChipClass="icon-chip-teal"
        />
        <SummaryCard
          label="GPay / UPI"
          value={`₹${totalGPay.toLocaleString('en-IN')}`}
          subtext="Bank UPI transfer"
          icon={Smartphone}
          iconChipClass="icon-chip-blue"
        />
        <SummaryCard
          label="Advance Adjusted"
          value={`₹${totalAdvanceUsed.toLocaleString('en-IN')}`}
          subtext="From tenant deposit"
          icon={History}
          iconChipClass="icon-chip-gold"
          valueColor="var(--color-gold-muted)"
        />
        <SummaryCard
          label="Pending Balance"
          value={`₹${totalPendingBalance.toLocaleString('en-IN')}`}
          subtext="Outstanding due"
          icon={AlertCircle}
          iconChipClass="icon-chip-red"
          valueColor={totalPendingBalance > 0 ? 'var(--color-danger)' : 'var(--text-primary)'}
        />
      </div>

      {/* Filter Section Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search payments by tenant, shop, mobile, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={selectedComplex}
          onChange={(e) => setSelectedComplex(e.target.value)}
          title="Filter by Complex"
        >
          <option value="">All Complexes</option>
          {complexes.map((c) => (
            <option key={c.complexId} value={c.complexId}>
              {c.complexName}
            </option>
          ))}
        </select>

        <input
          type="month"
          className="filter-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ minWidth: '150px' }}
          title="Filter by Month"
        />

        <select
          className="filter-select"
          value={selectedPaymentMode}
          onChange={(e) => setSelectedPaymentMode(e.target.value as PaymentMode | '')}
          title="Filter by Mode"
        >
          <option value="">All Modes</option>
          <option value="CASH">Cash Only</option>
          <option value="GPAY">GPay Only</option>
          <option value="BOTH">Cash + GPay Split</option>
        </select>

        <select
          className="filter-select"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as PaymentStatus | '')}
          title="Filter by Status"
        >
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="PENDING">Pending</option>
        </select>

        {hasActiveFilters && (
          <button className="filter-clear-btn" onClick={handleClearFilters}>
            <RotateCcw size={13} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Payment Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Payment ID</th>
              <th style={{ width: '100px' }}>Date</th>
              <th style={{ width: '170px' }}>Complex / Shop</th>
              <th style={{ width: '160px' }}>Tenant</th>
              <th style={{ width: '90px' }}>Rent Month</th>
              <th className="text-right" style={{ width: '110px' }}>Amount</th>
              <th className="text-center" style={{ width: '110px' }}>Mode</th>
              <th className="text-right" style={{ width: '95px' }}>Advance</th>
              <th className="text-right" style={{ width: '95px' }}>Balance</th>
              <th className="text-center" style={{ width: '90px' }}>Status</th>
              <th className="text-center" style={{ width: '75px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid var(--color-primary-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading payments ledger...</span>
                  </div>
                </td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <CreditCard size={32} style={{ strokeWidth: 1.5, opacity: 0.6 }} />
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No Rent Payments Found</p>
                    <p style={{ fontSize: '12px' }}>
                      {hasActiveFilters ? 'Try adjusting your search query or filters.' : 'Click "+ New Rent Payment" to record your first collection.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => {
                const formattedDate = new Date(p.paymentDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <tr key={p.paymentId}>
                    <td>
                      <span className="cell-mono-id">{p.paymentId}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      {formattedDate}
                    </td>
                    <td>
                      <div className="cell-two-line">
                        <span className="cell-title">{p.complexName || p.complexId}</span>
                        <span className="cell-sub">{p.shopNumber || p.shopId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-two-line">
                        <span className="cell-title">{p.tenantName || 'N/A'}</span>
                        <span className="cell-sub">{p.mobileNumber || '-'}</span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 500 }}>
                      {p.paymentMonth}
                    </td>
                    <td className="text-right">
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                        ₹{p.amountReceived.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="text-center">
                      <PaymentMethodBadge
                        mode={p.paymentMode}
                        cashAmount={p.cashAmount}
                        gpayAmount={p.gpayAmount}
                      />
                    </td>
                    <td className="text-right">
                      <span style={{ fontSize: '12.5px', color: p.advanceUsed > 0 ? 'var(--color-gold-muted)' : 'var(--text-muted)' }}>
                        {p.advanceUsed > 0 ? `₹${p.advanceUsed.toLocaleString('en-IN')}` : '-'}
                      </span>
                    </td>
                    <td className="text-right">
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: (p.balanceAfterPayment || 0) > 0 ? 700 : 500,
                          color: (p.balanceAfterPayment || 0) > 0 ? 'var(--color-danger)' : 'var(--text-secondary)',
                        }}
                      >
                        ₹{(p.balanceAfterPayment || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="text-center">
                      <StatusBadge status={p.paymentStatus} />
                    </td>
                    <td className="text-center">
                      <button
                        className="btn-view"
                        onClick={() => setViewPayment(p)}
                        title="View Payment Details"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Rent Payment Form Modal */}
      <PaymentModal
        isOpen={isNewPaymentModalOpen}
        onClose={() => setIsNewPaymentModalOpen(false)}
        onSuccess={fetchData}
        complexes={complexes}
        shops={shops}
      />

      {/* Payment Details Drawer / Modal */}
      <PaymentDetailsModal
        payment={viewPayment}
        isOpen={!!viewPayment}
        onClose={() => setViewPayment(null)}
      />
    </div>
  );
};
