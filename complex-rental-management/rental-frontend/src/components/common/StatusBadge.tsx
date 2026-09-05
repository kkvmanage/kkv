import React from 'react';
import { PaymentStatus, RentalStatus } from '../../types/rental.types.ts';

interface StatusBadgeProps {
  status: PaymentStatus | RentalStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toUpperCase();

  switch (normalized) {
    case 'PAID':
    case 'ACTIVE':
    case 'OCCUPIED':
      return <span className="badge badge-paid">{normalized}</span>;

    case 'PARTIAL':
      return <span className="badge badge-partial">{normalized}</span>;

    case 'PENDING':
    case 'OVERDUE':
    case 'INACTIVE':
      return <span className="badge badge-pending">{normalized}</span>;

    case 'VACANT':
      return <span className="badge badge-vacant">VACANT</span>;

    default:
      return (
        <span
          className="badge"
          style={{ backgroundColor: 'var(--badge-neutral-bg)', color: 'var(--badge-neutral-text)' }}
        >
          {normalized}
        </span>
      );
  }
};
