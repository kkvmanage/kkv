import React, { useState, useEffect } from 'react';
import { X, Receipt } from 'lucide-react';
import { RentalExpense, RentalComplex, RentalShop, ExpenseCategory, PaymentMode } from '../types/rental.types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    complexId: string;
    shopId?: string;
    expenseDate: string;
    category: ExpenseCategory;
    expenseReason: string;
    expenseAmount: number;
    paymentMode: PaymentMode;
    cashAmount?: number;
    gpayAmount?: number;
    notes?: string;
  }) => Promise<void>;
  complexes: RentalComplex[];
  shops: RentalShop[];
  expenseToEdit?: RentalExpense | null;
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
  'Other'
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  complexes,
  shops,
  expenseToEdit,
  defaultComplexId
}) => {
  const getToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [complexId, setComplexId] = useState('');
  const [shopId, setShopId] = useState('');
  const [expenseDate, setExpenseDate] = useState(getToday());
  const [category, setCategory] = useState<ExpenseCategory>('Maintenance');
  const [expenseReason, setExpenseReason] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [cashAmount, setCashAmount] = useState<number | string>('');
  const [gpayAmount, setGpayAmount] = useState<number | string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredShops = shops.filter((s) => s.complexId === complexId);

  useEffect(() => {
    if (expenseToEdit) {
      setComplexId(expenseToEdit.complexId);
      setShopId(expenseToEdit.shopId || '');
      setExpenseDate(expenseToEdit.expenseDate);
      setCategory(expenseToEdit.category);
      setExpenseReason(expenseToEdit.expenseReason);
      setExpenseAmount(expenseToEdit.expenseAmount);
      setPaymentMode(expenseToEdit.paymentMode);
      setCashAmount(expenseToEdit.cashAmount);
      setGpayAmount(expenseToEdit.gpayAmount);
      setNotes(expenseToEdit.notes || '');
    } else {
      setComplexId(defaultComplexId || complexes[0]?.complexId || '');
      setShopId('');
      setExpenseDate(getToday());
      setCategory('Maintenance');
      setExpenseReason('');
      setExpenseAmount('');
      setPaymentMode('CASH');
      setCashAmount('');
      setGpayAmount('');
      setNotes('');
    }
    setError('');
  }, [expenseToEdit, isOpen, defaultComplexId, complexes]);

  useEffect(() => {
    const amt = Number(expenseAmount) || 0;
    if (paymentMode === 'CASH') {
      setCashAmount(amt);
      setGpayAmount(0);
    } else if (paymentMode === 'GPAY') {
      setCashAmount(0);
      setGpayAmount(amt);
    }
  }, [expenseAmount, paymentMode]);

  if (!isOpen) return null;

  const numAmt = Number(expenseAmount) || 0;
  const numCash = Number(cashAmount) || 0;
  const numGpay = Number(gpayAmount) || 0;
  const isSplitMismatch = paymentMode === 'BOTH' && Math.abs(numCash + numGpay - numAmt) > 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complexId) {
      setError('Please select a complex');
      return;
    }
    if (!category) {
      setError('Please select an expense category');
      return;
    }
    if (!expenseReason.trim()) {
      setError('Please enter expense reason/description');
      return;
    }
    if (numAmt <= 0) {
      setError('Expense amount must be greater than zero');
      return;
    }
    if (paymentMode === 'BOTH' && isSplitMismatch) {
      setError(`Cash amount (₹${numCash}) + GPay amount (₹${numGpay}) must equal total expense (₹${numAmt})`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSave({
        complexId,
        shopId: shopId || undefined,
        expenseDate,
        category,
        expenseReason: expenseReason.trim(),
        expenseAmount: numAmt,
        paymentMode,
        cashAmount: paymentMode === 'CASH' ? numAmt : paymentMode === 'GPAY' ? 0 : numCash,
        gpayAmount: paymentMode === 'GPAY' ? numAmt : paymentMode === 'CASH' ? 0 : numGpay,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '520px', padding: 0 }}>
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {expenseToEdit ? `Edit Expense (${expenseToEdit.expenseId})` : 'Record Rental Expense'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                marginBottom: '16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#dc2626',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>
                  COMPLEX *
                </label>
                <select
                  className="select-control"
                  value={complexId}
                  onChange={(e) => {
                    setComplexId(e.target.value);
                    setShopId('');
                  }}
                  required
                >
                  <option value="">-- Select Complex --</option>
                  {complexes.map((c) => (
                    <option key={c.complexId} value={c.complexId}>
                      {c.complexName} ({c.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>
                  SHOP (OPTIONAL)
                </label>
                <select
                  className="select-control"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                >
                  <option value="">General Complex Expense</option>
                  {filteredShops.map((s) => (
                    <option key={s.shopId} value={s.shopId}>
                      {s.shopNumber} - {s.shopName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>
                  CATEGORY *
                </label>
                <select
                  className="select-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>
                  EXPENSE DATE *
                </label>
                <input
                  type="date"
                  className="input-control"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>
                EXPENSE REASON / DESCRIPTION *
              </label>
              <input
                type="text"
                className="input-control"
                placeholder={category === 'Other' ? 'Describe specific custom expense reason' : 'e.g. EB meter bill, motor pump repair'}
                value={expenseReason}
                onChange={(e) => setExpenseReason(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>
                EXPENSE AMOUNT (₹) *
              </label>
              <input
                type="number"
                className="input-control"
                placeholder="e.g. 2500"
                min="1"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                required
              />
            </div>

            {/* Payment Mode Selection */}
            <div>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                PAYMENT MODE
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="expensePaymentMode"
                    value="CASH"
                    checked={paymentMode === 'CASH'}
                    onChange={() => setPaymentMode('CASH')}
                  />
                  <span>Cash</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="expensePaymentMode"
                    value="GPAY"
                    checked={paymentMode === 'GPAY'}
                    onChange={() => setPaymentMode('GPAY')}
                  />
                  <span>GPay / UPI</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="expensePaymentMode"
                    value="BOTH"
                    checked={paymentMode === 'BOTH'}
                    onChange={() => setPaymentMode('BOTH')}
                  />
                  <span>Both</span>
                </label>
              </div>
            </div>

            {/* Split Fields if BOTH */}
            {paymentMode === 'BOTH' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: 'rgba(23, 107, 82, 0.04)',
                  borderRadius: 'var(--radius-md)',
                  border: isSplitMismatch ? '1px solid #ef4444' : '1px solid rgba(23, 107, 82, 0.2)'
                }}
              >
                <div>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>
                    CASH PAID (₹)
                  </label>
                  <input
                    type="number"
                    className="input-control"
                    placeholder="0"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>
                    GPAY PAID (₹)
                  </label>
                  <input
                    type="number"
                    className="input-control"
                    placeholder="0"
                    min="0"
                    value={gpayAmount}
                    onChange={(e) => setGpayAmount(e.target.value)}
                    required
                  />
                </div>
                {isSplitMismatch && (
                  <span style={{ gridColumn: '1 / -1', fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                    ⚠️ Split sum (₹{numCash + numGpay}) does not equal total expense (₹{numAmt})
                  </span>
                )}
              </div>
            )}

            <div>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>
                NOTES / REMARKS (OPTIONAL)
              </label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Paid to technician directly, invoice attached"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || (paymentMode === 'BOTH' && isSplitMismatch)}
            >
              {loading ? 'Saving...' : expenseToEdit ? 'Update Expense' : `Record Expense (₹${numAmt.toLocaleString('en-IN')})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
