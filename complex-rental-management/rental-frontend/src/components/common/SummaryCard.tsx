import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconChipClass?: string;
  valueColor?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  iconChipClass = 'icon-chip-green',
  valueColor,
}) => {
  return (
    <div className="stat-card">
      <div className="stat-card-info">
        <span className="stat-card-label">{label}</span>
        <span
          className="stat-card-value"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </span>
        {subtext && <span className="stat-card-sub">{subtext}</span>}
      </div>
      <div className={`stat-card-icon ${iconChipClass}`}>
        <Icon size={20} />
      </div>
    </div>
  );
};
