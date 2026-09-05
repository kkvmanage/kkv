import React from 'react';

interface RentalStatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
}

export const RentalStatCard: React.FC<RentalStatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  variant = 'default'
}) => {
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: 'rgba(23, 107, 82, 0.08)',
          border: 'rgba(23, 107, 82, 0.25)',
          iconColor: '#176B52',
          text: '#176B52'
        };
      case 'success':
        return {
          bg: 'rgba(34, 197, 94, 0.08)',
          border: 'rgba(34, 197, 94, 0.25)',
          iconColor: '#16a34a',
          text: '#16a34a'
        };
      case 'warning':
        return {
          bg: 'rgba(234, 179, 8, 0.08)',
          border: 'rgba(234, 179, 8, 0.25)',
          iconColor: '#ca8a04',
          text: '#ca8a04'
        };
      case 'danger':
        return {
          bg: 'rgba(239, 68, 68, 0.08)',
          border: 'rgba(239, 68, 68, 0.25)',
          iconColor: '#dc2626',
          text: '#dc2626'
        };
      case 'info':
        return {
          bg: 'rgba(59, 130, 246, 0.08)',
          border: 'rgba(59, 130, 246, 0.25)',
          iconColor: '#2563eb',
          text: '#2563eb'
        };
      default:
        return {
          bg: 'var(--bg-card)',
          border: 'var(--border-subtle)',
          iconColor: 'var(--text-muted)',
          text: 'var(--text-primary)'
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className="card"
      style={{
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.bg,
        borderColor: colors.border,
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--text-muted)',
            display: 'block',
            marginBottom: '4px'
          }}
        >
          {label}
        </span>
        <div style={{ fontSize: '20px', fontWeight: 800, color: colors.text }}>
          {value}
        </div>
        {subValue && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
            {subValue}
          </span>
        )}
      </div>

      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.iconColor,
          flexShrink: 0
        }}
      >
        {icon}
      </div>
    </div>
  );
};
