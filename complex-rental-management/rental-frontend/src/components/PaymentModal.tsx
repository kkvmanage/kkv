import React, { useState, useEffect, useMemo } from 'react';
import { X, Receipt, Wallet, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { RentalShop, RentalComplex, PaymentMode, ShopMonthlyStatus } from '../types/rental.types.ts';
import { rentalApi } from '../services/rentalApi.ts';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  complexes: RentalComplex[];
  shops: RentalShop[];
  defaultShopId?: string;
  defaultComplexId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  complexes,
  shops,
  defaultShopId,
  defaultComplexId,
}) => {
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const todayDateStr = useMemo(() => new Date().toISOString().substring(0, 10), []);

  const [selectedComplexId, setSelectedComplexId] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('');
  const [paymentMonth, setPaymentMonth] = useState(currentMonthStr);
  const [paymentDate, setPaymentDate] = useState(todayDateStr);
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [cashAmount, setCashAmount] = useState('');
  const [gpayAmount, setGpayAmount] = useState('');
  const [advanceToUse, setAdvanceToUse] = useState('');
  const [notes, setNotes] = useState('');

  const [shopMonthlyStatus, setShopMonthlyStatus] = useState<ShopMonthlyStatus | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availableShops = useMemo(() => {
    if (!selectedComplexId) return shops;
    return shops.filter((s) => s.complexId === selectedComplexId);
  }, [shops, selectedComplexId]);

  const currentShop = useMemo(() => {
    return shops.find((s) => s.shopId === selectedShopId) || null;
  }, [shops, selectedShopId]);

  useEffect(() => {
    if (isOpen) {
      const initComplexId = defaultComplexId || (complexes[0]?.complexId || '');
      setSelectedComplexId(initComplexId);

      const matchingShops = defaultComplexId
        ? shops.filter((s) => s.complexId === defaultComplexId)
        : shops;

      const initShopId = defaultShopId || (matchingShops[0]?.shopId || '');
      setSelectedShopId(initShopId);

      setPaymentMonth(currentMonthStr);
      setPaymentDate(todayDateStr);
      setAmountReceived('');
      setPaymentMode('CASH');
      setCashAmount('');
      setGpayAmount('');
      setAdvanceToUse('');
      setNotes('');
      setError('');
    }
  }, [isOpen, defaultComplexId, defaultShopId, complexes, shops, currentMonthStr, todayDateStr]);

  // Fetch shop status for the selected month
  useEffect(() => {
    if (!selectedShopId || !paymentMonth) return;

    let isMounted = true;
    setIsStatusLoading(true);

    rentalApi
      .getShopMonthlyStatus(selectedShopId, paymentMonth)
      .then((res) => {
        if (isMounted && res.success) {
          setShopMonthlyStatus(res.data);
          if (!amountReceived && res.data.outstandingBalance > 0) {
            setAmountReceived(String(res.data.outstandingBalance));
          }
        }
      })
      .catch(() => {
        if (isMounted) setShopMonthlyStatus(null);
      })
      .finally(() => {
        if (isMounted) setIsStatusLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedShopId, paymentMonth]);

  // Calculation logic
  const numAmountReceived = parseFloat(amountReceived) || 0;
  const numAdvanceToUse = parseFloat(advanceToUse) || 0;
  const numCash = parseFloat(cashAmount) || 0;
  const numGpay = parseFloat(gpayAmount) || 0;

  const availableCredit = currentShop?.availableAdvance || 0;
  const monthlyRent = currentShop?.monthlyRent || 0;
  const currentOutstanding = shopMonthlyStatus?.outstandingBalance ?? monthlyRent;

  const actualAdvanceUsage = Math.min(numAdvanceToUse, currentOutstanding);
  const remainingDue = Math.max(0, currentOutstanding - actualAdvanceUsage);
  const rentCovered = Math.min(numAmountReceived, remainingDue);
  const advanceGenerated = Math.max(0, numAmountReceived - remainingDue);
  const newBalance = Math.max(0, remainingDue - rentCovered);

  const isSplitMismatch = paymentMode === 'BOTH' && Math.abs(numCash + numGpay - numAmountReceived) > 0.01;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedShopId || !currentShop) {
      setError('Please select a shop.');
      return;
    }

    if (numAmountReceived <= 0 && numAdvanceToUse <= 0) {
      setError('Please enter either an amount received or advance credit to use.');
      return;
    }

    if (numAdvanceToUse > availableCredit) {
      setError(`Advance used (₹${numAdvanceToUse}) cannot exceed available credit (₹${availableCredit}).`);
      return;
    }

    if (isSplitMismatch) {
      setError(`Split total (₹${numCash + numGpay}) must equal Amount Received (₹${numAmountReceived}).`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await rentalApi.createPayment({
        complexId: currentShop.complexId,
        shopId: currentShop.shopId,
        paymentMonth,
        amountReceived: numAmountReceived,
        paymentMode,
        cashAmount: paymentMode === 'CASH' ? numAmountReceived : paymentMode === 'BOTH' ? numCash : 0,
        gpayAmount: paymentMode === 'GPAY' ? numAmountReceived : paymentMode === 'BOTH' ? numGpay : 0,
        advanceToUse: numAdvanceToUse,
        paymentDate,
        mobileNumber: currentShop.mobileNumber,
        notes: notes.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record rent payment.');
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
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Modal Header */}
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
            <div className="stat-card-icon icon-chip-green" style={{ width: '36px', height: '36px' }}>
              <Receipt size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Rent Payment
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Payment Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-button" style={{ width: '32px', height: '32px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--badge-danger-bg)',
                border: '1px solid rgba(201,106,106,0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-danger)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Complex & Shop */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label required">Complex</label>
              <select
                className="select-control"
                value={selectedComplexId}
                onChange={(e) => {
                  setSelectedComplexId(e.target.value);
                  const firstShop = shops.find((s) => s.complexId === e.target.value);
                  if (firstShop) setSelectedShopId(firstShop.shopId);
                }}
              >
                {complexes.map((c) => (
                  <option key={c.complexId} value={c.complexId}>
                    {c.complexName} ({c.complexId})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required">Shop</label>
              <select
                className="select-control"
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
              >
                {availableShops.map((s) => (
                  <option key={s.shopId} value={s.shopId}>
                    {s.shopNumber} - {s.tenantName} (₹{s.monthlyRent.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Auto Displayed Tenant Details */}
          {currentShop && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
              }}
            >
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tenant</span>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {currentShop.tenantName}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mobile</span>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                  {currentShop.mobileNumber || '-'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Rent</span>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--color-gold)', marginTop: '2px' }}>
                  ₹{monthlyRent.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Available Advance</span>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--color-info)', marginTop: '2px' }}>
                  ₹{availableCredit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Section: Payment Month & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label required">Payment Month</label>
              <input
                type="month"
                className="input-control"
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Payment Date</label>
              <input
                type="date"
                className="input-control"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          {/* Section: Advance Used (if available) */}
          {availableCredit > 0 && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(91, 164, 196, 0.1)',
                border: '1px solid rgba(91, 164, 196, 0.3)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-info)', textTransform: 'uppercase' }}>
                  Advance Used (Available: ₹{availableCredit.toLocaleString('en-IN')})
                </span>
                {currentOutstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setAdvanceToUse(String(Math.min(availableCredit, currentOutstanding)))}
                    style={{ fontSize: '11px', color: 'var(--color-info)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Apply Max (₹{Math.min(availableCredit, currentOutstanding).toLocaleString('en-IN')})
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                max={availableCredit}
                className="input-control"
                placeholder="₹ 0"
                value={advanceToUse}
                onChange={(e) => setAdvanceToUse(e.target.value)}
              />
            </div>
          )}

          {/* Section: Amount Received & Payment Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label required">Amount Received</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input-control"
                placeholder="₹ 10,000"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary-accent)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Payment Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {(['CASH', 'GPAY', 'BOTH'] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setPaymentMode(mode);
                      if (mode === 'BOTH') {
                        setCashAmount(String(Math.floor(numAmountReceived / 2)));
                        setGpayAmount(String(numAmountReceived - Math.floor(numAmountReceived / 2)));
                      }
                    }}
                    className={`btn ${paymentMode === mode ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{ fontWeight: 700 }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Split Mode Amounts (When BOTH is selected) */}
          {paymentMode === 'BOTH' && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Cash & GPay Split Breakdown</span>
                {isSplitMismatch ? (
                  <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>
                    Mismatch: Difference of ₹{Math.abs(numCash + numGpay - numAmountReceived).toLocaleString('en-IN')}
                  </span>
                ) : (
                  <span style={{ fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} />
                    <span>Exact Total Match</span>
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Cash Amount</label>
                  <input
                    type="number"
                    min="0"
                    className="input-control"
                    placeholder="₹ 6,000"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GPay Amount</label>
                  <input
                    type="number"
                    min="0"
                    className="input-control"
                    placeholder="₹ 4,000"
                    value={gpayAmount}
                    onChange={(e) => setGpayAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Balance / Impact Calculation Summary */}
          {(numAmountReceived > 0 || numAdvanceToUse > 0) && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Calculation Preview
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Rent Covered:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                  ₹{(rentCovered + actualAdvanceUsage).toLocaleString('en-IN')}
                </span>
              </div>
              {advanceGenerated > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-info)' }}>
                  <span>Overpayment credited to Advance:</span>
                  <span style={{ fontWeight: 700 }}>+ ₹{advanceGenerated.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontWeight: 800,
                }}
              >
                <span>Outstanding Balance:</span>
                <span style={{ color: newBalance > 0 ? 'var(--color-warning)' : 'var(--color-success)', fontSize: '13px' }}>
                  ₹{newBalance.toLocaleString('en-IN')} {newBalance === 0 ? '(PAID)' : '(PARTIAL)'}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input
              type="text"
              className="input-control"
              placeholder="Payment remarks or transaction reference number..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Modal Footer */}
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
            <button
              type="submit"
              disabled={isSubmitting || isSplitMismatch}
              className="btn btn-primary"
            >
              <Receipt size={15} />
              <span>{isSubmitting ? 'Saving...' : 'Save Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
