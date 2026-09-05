import React from 'react';
import { PaymentMode } from '../../types/rental.types.ts';

interface PaymentMethodBadgeProps {
  mode: PaymentMode | string;
  cashAmount?: number;
  gpayAmount?: number;
}

const formatCompact = (val: number) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
  return `₹${val}`;
};

export const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({
  mode,
  cashAmount = 0,
  gpayAmount = 0,
}) => {
  const norm = (mode || '').toUpperCase();

  if (norm === 'CASH') {
    return <span className="badge-mode badge-mode-cash">CASH</span>;
  }

  if (norm === 'GPAY') {
    return <span className="badge-mode badge-mode-gpay">GPAY</span>;
  }

  if (norm === 'BOTH') {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span className="badge-mode badge-mode-both">BOTH</span>
        {(cashAmount > 0 || gpayAmount > 0) && (
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            C {formatCompact(cashAmount)} · G {formatCompact(gpayAmount)}
          </span>
        )}
      </div>
    );
  }

  return <span className="badge-mode badge-mode-cash">{norm}</span>;
};
