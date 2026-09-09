import React, { useState, useEffect } from 'react';
import { X, Store } from 'lucide-react';
import { RentalShop, RentalComplex, RentalStatus } from '../types/rental.types.ts';
import { rentalApi } from '../services/rentalApi.ts';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shop?: RentalShop | null;
  complexes: RentalComplex[];
  defaultComplexId?: string;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  shop,
  complexes,
  defaultComplexId,
}) => {
  const [complexId, setComplexId] = useState(defaultComplexId || '');
  const [shopNumber, setShopNumber] = useState('');
  const [shopName, setShopName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [status, setStatus] = useState<RentalStatus>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (shop) {
      setComplexId(shop.complexId);
      setShopNumber(shop.shopNumber);
      setShopName(shop.shopName);
      setTenantName(shop.tenantName);
      setMobileNumber(shop.mobileNumber);
      setMonthlyRent(String(shop.monthlyRent));
      setStatus(shop.status);
    } else {
      setComplexId(defaultComplexId || (complexes[0]?.complexId || ''));
      setShopNumber('');
      setShopName('');
      setTenantName('');
      setMobileNumber('');
      setMonthlyRent('');
      setStatus('ACTIVE');
    }
    setError('');
  }, [shop, isOpen, defaultComplexId, complexes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complexId || !shopNumber.trim() || !tenantName.trim() || !monthlyRent) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    const rentNum = parseFloat(monthlyRent);
    if (isNaN(rentNum) || rentNum <= 0) {
      setError('Please enter a valid monthly rent amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (shop) {
        await rentalApi.updateShop(shop.shopId, {
          complexId,
          shopNumber: shopNumber.trim(),
          shopName: shopName.trim() || shopNumber.trim(),
          tenantName: tenantName.trim(),
          mobileNumber: mobileNumber.trim(),
          monthlyRent: rentNum,
          status,
        });
      } else {
        await rentalApi.createShop({
          complexId,
          shopNumber: shopNumber.trim(),
          shopName: shopName.trim() || shopNumber.trim(),
          tenantName: tenantName.trim(),
          mobileNumber: mobileNumber.trim(),
          monthlyRent: rentNum,
          status,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save shop');
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
            <div className="stat-card-icon icon-chip-green" style={{ width: '36px', height: '36px' }}>
              <Store size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {shop ? 'Edit Commercial Shop / Tenant' : 'Register New Commercial Shop'}
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Unit number, tenant KYC, and monthly rent</p>
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

          <div className="form-group">
            <label className="form-label required">Select Complex</label>
            <select
              className="select-control"
              value={complexId}
              onChange={(e) => setComplexId(e.target.value)}
            >
              {complexes.map((c) => (
                <option key={c.complexId} value={c.complexId}>
                  {c.complexName} ({c.location})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label required">Shop Number / Unit</label>
              <input
                type="text"
                required
                placeholder="e.g. G-01 or Shop #4"
                className="input-control"
                value={shopNumber}
                onChange={(e) => setShopNumber(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Trade / Business Name</label>
              <input
                type="text"
                placeholder="e.g. Royal Bakery"
                className="input-control"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label required">Tenant Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                className="input-control"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tenant Mobile</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                className="input-control"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label required">Monthly Rent (₹)</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                placeholder="e.g. 15000"
                className="input-control"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                style={{ fontWeight: 800, color: 'var(--color-primary-accent)' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Occupancy Status</label>
              <select
                className="select-control"
                value={status}
                onChange={(e) => setStatus(e.target.value as RentalStatus)}
              >
                <option value="ACTIVE">Active (Occupied)</option>
                <option value="INACTIVE">Inactive (Vacant)</option>
              </select>
            </div>
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
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <Store size={15} />
              <span>{isSubmitting ? 'Saving...' : shop ? 'Save Changes' : 'Register Shop'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
