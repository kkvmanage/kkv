import React from 'react';
import { X, Receipt, Building2, Store, User, Phone, Calendar, CreditCard } from 'lucide-react';
import { RentalPayment } from '../types/rental.types.ts';
import { StatusBadge } from './common/StatusBadge.tsx';
import { PaymentMethodBadge } from './common/PaymentMethodBadge.tsx';

interface PaymentDetailsModalProps {
  payment: RentalPayment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  payment,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !payment) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-card-icon icon-chip-green" style={{ width: '36px', height: '36px' }}>
              <Receipt size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="modal-title">Payment Receipt</h3>
                <span className="cell-mono-id">{payment.paymentId}</span>
              </div>
              <p className="modal-subtitle">
                Recorded on {new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Status & Amount Hero Banner */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Amount Received
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                ₹{payment.amountReceived.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <StatusBadge status={payment.paymentStatus} />
              <PaymentMethodBadge mode={payment.paymentMode} cashAmount={payment.cashAmount} gpayAmount={payment.gpayAmount} />
            </div>
          </div>

          {/* Property & Tenant Information */}
          <div className="form-section">
            <div className="form-section-title">
              <Building2 size={14} />
              <span>Property & Tenant Details</span>
            </div>
            <div className="form-grid-2">
              <div>
                <span className="form-label">Complex</span>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {payment.complexName || payment.complexId}
                </p>
              </div>
              <div>
                <span className="form-label">Shop Number</span>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {payment.shopNumber || payment.shopId}
                </p>
              </div>
              <div>
                <span className="form-label">Tenant Name</span>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {payment.tenantName || 'N/A'}
                </p>
              </div>
              <div>
                <span className="form-label">Mobile Number</span>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {payment.mobileNumber || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Rent & Balance Breakdown */}
          <div className="form-section">
            <div className="form-section-title">
              <CreditCard size={14} />
              <span>Financial Breakdown</span>
            </div>
            <div className="form-grid-2">
              <div>
                <span className="form-label">Rent Month</span>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {payment.paymentMonth}
                </p>
              </div>
              <div>
                <span className="form-label">Monthly Rent</span>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  ₹{(payment.monthlyRent || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="form-label">Cash Received</span>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  ₹{(payment.cashAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="form-label">GPay / UPI Received</span>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  ₹{(payment.gpayAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="form-label">Advance Credit Used</span>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  ₹{(payment.advanceUsed || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="form-label">Remaining Balance</span>
                <p style={{ fontSize: '13.5px', fontWeight: 700, color: (payment.balanceAfterPayment || 0) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  ₹{(payment.balanceAfterPayment || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {payment.notes && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <span className="form-label">Notes</span>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {payment.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
