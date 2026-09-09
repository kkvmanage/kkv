import React, { useState, useEffect } from 'react';
import { X, TrendingDown, CheckCircle2 } from 'lucide-react';
import { RentalComplex, RentalShop, PaymentMode, ExpenseCategory } from '../types/rental.types.ts';
import { rentalApi } from '../services/rentalApi.ts';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  complexes: RentalComplex[];
  shops: RentalShop[];
  defaultComplexId?: string;
}

const CATEGORIES: ExpenseCategory[] = [
  'Electricity',
  'Maintenance',
  'Cleaning',
  'Plumbing',
  'Repair',
  'Water',
  'Security',
  'Transport',
  'Other',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  complexes,
  shops,
  defaultComplexId,
}) => {
  const [complexId, setComplexId] = useState('');
  const [shopId, setShopId] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().substring(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>('Maintenance');
  const [expenseReason, setExpenseReason] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [cashAmount, setCashAmount] = useState('');
  const [gpayAmount, setGpayAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setComplexId(defaultComplexId || (complexes[0]?.complexId || ''));
      setShopId('');
      setExpenseDate(new Date().toISOString().substring(0, 10));
      setCategory('Maintenance');
      setExpenseReason('');
      setExpenseAmount('');
      setPaymentMode('CASH');
      setCashAmount('');
      setGpayAmount('');
      setNotes('');
      setError('');
    }
  }, [isOpen, defaultComplexId, complexes]);

  const availableShops = shops.filter((s) => s.complexId === complexId);

  const numAmount = parseFloat(expenseAmount) || 0;
  const numCash = parseFloat(cashAmount) || 0;
  const numGpay = parseFloat(gpayAmount) || 0;

  const isSplitMismatch = paymentMode === 'BOTH' && Math.abs(numCash + numGpay - numAmount) > 0.01;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!complexId || !expenseReason.trim() || numAmount <= 0) {
      setError('Please fill in all mandatory fields with a positive expense amount.');
      return;
    }

    if (isSplitMismatch) {
      setError(`Split total (₹${numCash + numGpay}) must equal Expense Amount (₹${numAmount}).`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await rentalApi.createExpense({
        complexId,
        shopId: shopId || undefined,
        expenseDate,
        category,
        expenseReason: expenseReason.trim(),
        expenseAmount: numAmount,
        paymentMode,
        cashAmount: paymentMode === 'CASH' ? numAmount : paymentMode === 'BOTH' ? numCash : 0,
        gpayAmount: paymentMode === 'GPAY' ? numAmount : paymentMode === 'BOTH' ? numGpay : 0,
        notes: notes.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '580px',
          padding: 0,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-surface-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-card-icon icon-chip-red" style={{ width: '36px', height: '36px' }}>
              <TrendingDown size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Record Property Expense
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Building maintenance, utility bills, & repairs</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-button" style={{ width: '32px', height: '32px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--badge-danger-bg)',
                border: '1px solid rgba(201,106,106,0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-danger)',
                fontSize: '12px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label required">Complex</label>
              <select
                className="select-control"
                value={complexId}
                onChange={(e) => {
                  setComplexId(e.target.value);
                  setShopId('');
                }}
              >
                {complexes.map((c) => (
                  <option key={c.complexId} value={c.complexId}>
                    {c.complexName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Shop (Optional)</label>
              <select
                className="select-control"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
              >
                <option value="">General Building Expense</option>
                {availableShops.map((s) => (
                  <option key={s.shopId} value={s.shopId}>
                    {s.shopNumber} - {s.tenantName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label required">Category</label>
              <select
                className="select-control"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required">Expense Date</label>
              <input
                type="date"
                required
                className="input-control"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Reason / Description</label>
            <input
              type="text"
              required
              placeholder="e.g. Electrical motor repair & replacement switch"
              className="input-control"
              value={expenseReason}
              onChange={(e) => setExpenseReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label required">Expense Amount (₹)</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                placeholder="e.g. 2500"
                className="input-control"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                style={{ fontWeight: 800, color: 'var(--color-danger)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Paid Via</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {(['CASH', 'GPAY', 'BOTH'] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setPaymentMode(mode);
                      if (mode === 'BOTH') {
                        setCashAmount(String(Math.floor(numAmount / 2)));
                        setGpayAmount(String(numAmount - Math.floor(numAmount / 2)));
                      }
                    }}
                    className={`btn ${paymentMode === mode ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                    style={{ fontWeight: 700 }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {paymentMode === 'BOTH' && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              <div className="form-group">
                <label className="form-label">Cash Portion (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input-control"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">GPay Portion (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input-control"
                  value={gpayAmount}
                  onChange={(e) => setGpayAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Vendor / Payee Details</label>
            <input
              type="text"
              placeholder="e.g. Paid to Electrician Murugan"
              className="input-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div
            style={{
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || isSplitMismatch} className="btn btn-primary">
              <TrendingDown size={15} />
              <span>{isSubmitting ? 'Saving...' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
