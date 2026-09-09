import React, { useState, useEffect, useRef } from 'react';
import { X, Building2, Plus, AlertCircle, Info, CheckCircle2, ChevronDown } from 'lucide-react';
import { RentalComplex, RentalStatus } from '../types/rental.types.ts';
import { rentalApi } from '../services/rentalApi.ts';

interface ComplexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  complex?: RentalComplex | null;
}

export const ComplexModal: React.FC<ComplexModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  complex,
}) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<RentalStatus>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Field Touched & Validation state
  const [touched, setTouched] = useState<{ name?: boolean; location?: boolean }>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Check if form is dirty
  const isDirty = Boolean(
    complex
      ? name !== complex.complexName || location !== complex.location || status !== complex.status
      : name.trim() !== '' || location.trim() !== '' || status !== 'ACTIVE'
  );

  useEffect(() => {
    if (isOpen) {
      if (complex) {
        setName(complex.complexName || '');
        setLocation(complex.location || '');
        setStatus(complex.status || 'ACTIVE');
      } else {
        setName('');
        setLocation('');
        setStatus('ACTIVE');
      }
      setTouched({});
      setApiError(null);
      setShowDiscardConfirm(false);

      // Auto-focus first input
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [complex, isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else if (isDirty) {
          setShowDiscardConfirm(true);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, showDiscardConfirm, onClose]);

  if (!isOpen) return null;

  // Validation rules
  const nameError = touched.name && !name.trim() ? 'Complex name is required.' : null;
  const locationError = touched.location && !location.trim() ? 'Location / area address is required.' : null;

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, location: true });

    if (!name.trim() || !location.trim()) {
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      if (complex) {
        await rentalApi.updateComplex(complex.complexId, {
          complexName: name.trim(),
          location: location.trim(),
          status,
        });
      } else {
        await rentalApi.createComplex({
          complexName: name.trim(),
          location: location.trim(),
          status,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setApiError(err?.message || 'Unable to save commercial complex. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseAttempt();
      }}
    >
      <div
        ref={modalContainerRef}
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '16px',
          border: '1px solid #DCE5DF',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 20px 40px rgba(11, 61, 46, 0.14), 0 4px 12px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E6EDE8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAF9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(23, 107, 82, 0.12)',
                color: '#176B52',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(23, 107, 82, 0.18)',
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#1F2D26',
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                {complex ? 'Edit Commercial Complex' : 'Add New Commercial Complex'}
              </h3>
              <p style={{ fontSize: '13px', color: '#566960', margin: '2px 0 0' }}>
                {complex
                  ? 'Update commercial property information and operational status.'
                  : 'Create and configure a commercial property and its operational status.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseAttempt}
            className="icon-button"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              color: '#566960',
              backgroundColor: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(23, 107, 82, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="Close modal (Esc)"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── DISCARD WARNING BANNER ────────────────────────────────────────── */}
        {showDiscardConfirm && (
          <div
            style={{
              padding: '12px 24px',
              backgroundColor: '#FEF3C7',
              borderBottom: '1px solid #FCD34D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
              <AlertCircle size={16} />
              <span>Discard unsaved changes?</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDiscardConfirm(false)}
                style={{ height: '28px', padding: '0 10px', fontSize: '12px' }}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmDiscard}
                style={{
                  height: '28px',
                  padding: '0 10px',
                  fontSize: '12px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* ── MODAL BODY / FORM ──────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* API Error Box */}
          {apiError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FDE8E8',
                border: '1px solid #F87171',
                borderRadius: '10px',
                color: '#9F2222',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div style={{ flex: 1 }}>{apiError}</div>
            </div>
          )}

          {/* Section Heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #E6EDE8', paddingBottom: '8px', marginBottom: '2px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#176B52',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              COMPLEX DETAILS
            </span>
          </div>

          {/* 1. Complex Name Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="complex-name-input"
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1F2D26',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Complex Name</span>
              <span style={{ color: '#DC2626', fontWeight: 800 }}>*</span>
            </label>
            <input
              ref={nameInputRef}
              id="complex-name-input"
              type="text"
              placeholder="e.g. City Center Plaza"
              className="input-control"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (touched.name && e.target.value.trim()) {
                  setTouched((prev) => ({ ...prev, name: false }));
                }
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              style={{
                height: '44px',
                fontSize: '14px',
                borderRadius: '10px',
                border: nameError ? '1px solid #DC2626' : '1px solid #DCE5DF',
                backgroundColor: '#FFFFFF',
                boxShadow: nameError ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : undefined,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              disabled={isSubmitting}
            />
            {nameError ? (
              <span style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} />
                {nameError}
              </span>
            ) : (
              <span style={{ fontSize: '11.5px', color: '#7E9288' }}>
                Enter the registered commercial complex or building name.
              </span>
            )}
          </div>

          {/* 2. Location / Area Address Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="complex-location-input"
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1F2D26',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Location / Area Address</span>
              <span style={{ color: '#DC2626', fontWeight: 800 }}>*</span>
            </label>
            <input
              id="complex-location-input"
              type="text"
              placeholder="e.g. 104 Main Road, Anna Nagar"
              className="input-control"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (touched.location && e.target.value.trim()) {
                  setTouched((prev) => ({ ...prev, location: false }));
                }
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, location: true }))}
              style={{
                height: '44px',
                fontSize: '14px',
                borderRadius: '10px',
                border: locationError ? '1px solid #DC2626' : '1px solid #DCE5DF',
                backgroundColor: '#FFFFFF',
                boxShadow: locationError ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : undefined,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              disabled={isSubmitting}
            />
            {locationError ? (
              <span style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} />
                {locationError}
              </span>
            ) : (
              <span style={{ fontSize: '11.5px', color: '#7E9288' }}>
                Enter the main address, street, or landmark locality.
              </span>
            )}
          </div>

          {/* 3. Status Field (Styled Select) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="complex-status-select"
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1F2D26',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Operational Status</span>
              <span style={{ color: '#DC2626', fontWeight: 800 }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id="complex-status-select"
                className="select-control"
                value={status}
                onChange={(e) => setStatus(e.target.value as RentalStatus)}
                style={{
                  height: '44px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: '1px solid #DCE5DF',
                  backgroundColor: '#FFFFFF',
                  color: '#1F2D26',
                  paddingLeft: '34px',
                  paddingRight: '36px',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
                disabled={isSubmitting}
              >
                <option value="ACTIVE">Active (Operational)</option>
                <option value="INACTIVE">Inactive (Under Renovation / Closed)</option>
              </select>

              {/* Status Indicator Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: status === 'ACTIVE' ? '#059669' : '#D97706',
                  pointerEvents: 'none',
                }}
              />

              {/* Dropdown Chevron */}
              <ChevronDown
                size={16}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#566960',
                  pointerEvents: 'none',
                }}
              />
            </div>
            <span style={{ fontSize: '11.5px', color: '#7E9288' }}>
              {status === 'ACTIVE'
                ? 'Complex is actively tenantable and available for shop allocations.'
                : 'Complex is temporarily closed or under renovation.'}
            </span>
          </div>

          {/* 4. Auto-Generated Complex ID Informational Box */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#F8FAF9',
              border: '1px dashed #DCE5DF',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} style={{ color: '#176B52', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1F2D26' }}>
                  Complex ID
                </div>
                <div style={{ fontSize: '11.5px', color: '#566960' }}>
                  {complex?.complexId
                    ? `Current ID: ${complex.complexId}`
                    : 'System assigns an authoritative sequential identifier (e.g. CMP-0005) on save.'}
                </div>
              </div>
            </div>
            {complex?.complexId ? (
              <span
                style={{
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: '#176B52',
                  backgroundColor: 'rgba(23, 107, 82, 0.1)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                {complex.complexId}
              </span>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#7E9288',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E6EDE8',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                Auto-generated
              </span>
            )}
          </div>

          {/* ── FOOTER ACTIONS ───────────────────────────────────────────────── */}
          <div
            style={{
              paddingTop: '18px',
              marginTop: '6px',
              borderTop: '1px solid #E6EDE8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCloseAttempt}
              disabled={isSubmitting}
              style={{
                height: '42px',
                padding: '0 18px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '10px',
                border: '1px solid #DCE5DF',
                backgroundColor: '#FFFFFF',
                color: '#1F2D26',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                height: '42px',
                padding: '0 20px',
                fontSize: '13px',
                fontWeight: 800,
                borderRadius: '10px',
                backgroundColor: '#176B52',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(23, 107, 82, 0.25)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.85 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #FFFFFF',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>{complex ? 'Saving...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  {complex ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                  <span>{complex ? 'Save Changes' : 'Create Complex'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
