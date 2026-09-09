import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Plus,
  Search,
  RotateCcw,
  Wallet,
  Smartphone,
  CreditCard,
  Trash2,
  Calendar,
  Building2,
} from 'lucide-react';
import { rentalApi } from '../services/rentalApi.ts';
import { RentalExpense, RentalComplex, RentalShop, ExpenseCategory, PaymentMode } from '../types/rental.types.ts';
import { ExpenseModal } from '../components/ExpenseModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SummaryCard } from '../components/common/SummaryCard.tsx';
import { PaymentMethodBadge } from '../components/common/PaymentMethodBadge.tsx';

export const Expenses: React.FC = () => {
  const { isAdmin } = useAuth();
  const [expenses, setExpenses] = useState<RentalExpense[]>([]);
  const [complexes, setComplexes] = useState<RentalComplex[]>([]);
  const [shops, setShops] = useState<RentalShop[]>([]);

  const [selectedComplex, setSelectedComplex] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [expRes, compRes, shopsRes] = await Promise.all([
        rentalApi.getExpenses({
          complexId: selectedComplex || undefined,
          category: (selectedCategory as ExpenseCategory) || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        rentalApi.getComplexes(),
        rentalApi.getShops(),
      ]);

      if (expRes.success) setExpenses(expRes.data);
      if (compRes.success) setComplexes(compRes.data);
      if (shopsRes.success) setShops(shopsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedComplex, selectedCategory, startDate, endDate]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await rentalApi.deleteExpense(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      e.expenseId.toLowerCase().includes(q) ||
      e.expenseReason.toLowerCase().includes(q) ||
      (e.complexName && e.complexName.toLowerCase().includes(q)) ||
      (e.notes && e.notes.toLowerCase().includes(q))
    );
  });

  const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.expenseAmount, 0);
  const totalCash = filteredExpenses.reduce((sum, e) => sum + e.cashAmount, 0);
  const totalGPay = filteredExpenses.reduce((sum, e) => sum + e.gpayAmount, 0);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedComplex('');
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = searchQuery || selectedComplex || selectedCategory || startDate || endDate;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Property Expenses
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Track property maintenance, electricity, plumbing, repairs, cleaning, and vendor bills.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <SummaryCard
          label="Total Expenses"
          value={`₹${totalExpense.toLocaleString('en-IN')}`}
          subtext={`${filteredExpenses.length} expense transactions`}
          icon={TrendingDown}
          iconChipClass="icon-chip-red"
          valueColor="var(--color-danger)"
        />
        <SummaryCard
          label="Cash Payments"
          value={`₹${totalCash.toLocaleString('en-IN')}`}
          subtext="Disbursed from drawer"
          icon={Wallet}
          iconChipClass="icon-chip-teal"
        />
        <SummaryCard
          label="GPay / UPI Payments"
          value={`₹${totalGPay.toLocaleString('en-IN')}`}
          subtext="Disbursed via bank transfer"
          icon={Smartphone}
          iconChipClass="icon-chip-blue"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search expenses by reason, vendor, notes, or ID..."
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

        <select
          className="filter-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as ExpenseCategory | '')}
          title="Filter by Category"
        >
          <option value="">All Categories</option>
          <option value="Electricity">Electricity</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Cleaning">Cleaning</option>
          <option value="Plumbing">Plumbing</option>
          <option value="Repair">Repair</option>
          <option value="Water">Water</option>
          <option value="Security">Security</option>
          <option value="Transport">Transport</option>
          <option value="Other">Other</option>
        </select>

        <input
          type="date"
          className="filter-select"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          title="Start Date"
          style={{ minWidth: '135px' }}
        />

        <input
          type="date"
          className="filter-select"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          title="End Date"
          style={{ minWidth: '135px' }}
        />

        {hasActiveFilters && (
          <button className="filter-clear-btn" onClick={handleClearFilters}>
            <RotateCcw size={13} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Expense ID</th>
              <th style={{ width: '100px' }}>Date</th>
              <th style={{ width: '160px' }}>Complex / Unit</th>
              <th style={{ width: '120px' }}>Category</th>
              <th style={{ width: '220px' }}>Reason / Description</th>
              <th className="text-right" style={{ width: '110px' }}>Amount</th>
              <th className="text-center" style={{ width: '110px' }}>Mode</th>
              {isAdmin && <th className="text-center" style={{ width: '70px' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid var(--color-primary-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading expenses ledger...</span>
                  </div>
                </td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <TrendingDown size={32} style={{ strokeWidth: 1.5, opacity: 0.6 }} />
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No Expenses Recorded</p>
                    <p style={{ fontSize: '12px' }}>
                      {hasActiveFilters ? 'Try adjusting your search query or filters.' : 'Click "+ Record Expense" to log property maintenance.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((e) => {
                const formattedDate = new Date(e.expenseDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <tr key={e.expenseId}>
                    <td>
                      <span className="cell-mono-id">{e.expenseId}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      {formattedDate}
                    </td>
                    <td>
                      <div className="cell-two-line">
                        <span className="cell-title">{e.complexName || e.complexId}</span>
                        <span className="cell-sub">{e.shopNumber || 'General Complex Expense'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: '#F1F5F3', color: 'var(--color-primary-dark)', border: '1px solid var(--border-subtle)' }}>
                        {e.category}
                      </span>
                    </td>
                    <td>
                      <div className="cell-two-line">
                        <span className="cell-title">{e.expenseReason}</span>
                        {e.notes && <span className="cell-sub">{e.notes}</span>}
                      </div>
                    </td>
                    <td className="text-right">
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-danger)' }}>
                        ₹{e.expenseAmount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="text-center">
                      <PaymentMethodBadge
                        mode={e.paymentMode}
                        cashAmount={e.cashAmount}
                        gpayAmount={e.gpayAmount}
                      />
                    </td>
                    {isAdmin && (
                      <td className="text-center">
                        <button
                          className="btn-view"
                          style={{ color: 'var(--color-danger)', borderColor: 'rgba(248, 113, 113, 0.3)' }}
                          onClick={() => handleDelete(e.expenseId)}
                          title="Delete Expense"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Record Expense Modal */}
      <ExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchData}
        complexes={complexes}
        shops={shops}
      />
    </div>
  );
};
