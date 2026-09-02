import React from 'react';
import { Customer } from '../../types';
import { X, User, ShieldCheck, ExternalLink, Phone, Mail, Briefcase, Calendar, CheckCircle2 } from 'lucide-react';
import { formatIdProofDisplay } from '../../utils/kycValidation';
import { buildGoogleMapsUrl } from '../../utils/addressUtils';

export interface ViewCustomerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onEdit?: (customer: Customer) => void;
}

export const ViewCustomerModal: React.FC<ViewCustomerModalProps> = ({
  isOpen,
  customer,
  onClose,
  onEdit
}) => {
  if (!isOpen || !customer) return null;

  const currentLoc = customer.currentLocation;
  const permLoc = customer.permanentLocation;
  const isSameAddress =
    customer.currentAddress === customer.permanentAddress ||
    (!customer.permanentAddress && !customer.permanentAddressDetails);

  const currentMapsUrl =
    currentLoc?.googleMapsUrl ||
    (currentLoc?.latitude && currentLoc?.longitude
      ? buildGoogleMapsUrl(currentLoc.latitude, currentLoc.longitude)
      : '');

  const permMapsUrl =
    permLoc?.googleMapsUrl ||
    (permLoc?.latitude && permLoc?.longitude
      ? buildGoogleMapsUrl(permLoc.latitude, permLoc.longitude)
      : '');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          height: 'auto',
          boxShadow: 'var(--shadow-xl, 0 20px 40px rgba(0,0,0,0.2))',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div
          style={{
            flexShrink: 0,
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-surface-secondary, #f8fafc)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {customer.customerPhoto ? (
              <img
                src={customer.customerPhoto}
                alt={customer.name}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--color-primary-accent, #059669)',
                  flexShrink: 0
                }}
              />
            ) : (
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-light-accent, #e6f4f1)',
                  color: 'var(--color-primary-dark, #163f35)',
                  fontWeight: 800,
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {customer.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)' }}>
                  {customer.name}
                </h3>
                <span className="badge badge-success" style={{ fontSize: '11px' }}>
                  <ShieldCheck size={12} style={{ marginRight: '4px' }} />
                  {customer.status}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Customer ID: <strong style={{ color: 'var(--color-primary-dark)' }}>{customer.id}</strong> | Joined: {customer.joinedDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '50%'
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div
          className="modal-body-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '24px',
            paddingBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* PROFILE PHOTO SECTION */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
              border: '1px solid var(--border-light, #e2e8f0)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            <div
              style={{
                width: '100px',
                height: '115px',
                borderRadius: '8px',
                border: '2px solid var(--color-primary-accent, #059669)',
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {customer.customerPhoto ? (
                <img
                  src={customer.customerPhoto}
                  alt="KYC Profile Photo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <User size={40} color="var(--text-muted)" />
              )}
            </div>

            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                KYC PROFILE PHOTO
              </h4>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Source: <strong style={{ textTransform: 'capitalize' }}>{customer.photoSource || (customer.customerPhoto ? 'Uploaded' : 'Default Avatar')}</strong>
              </p>
              {customer.customerPhoto ? (
                <span className="badge badge-success" style={{ fontSize: '11px' }}>
                  ✓ Profile Photo Verified
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                  No Custom Photo Attached
                </span>
              )}
            </div>
          </div>

          {/* PERSONAL INFORMATION */}
          <div>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--color-primary-dark)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: '0 0 12px 0',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '6px'
              }}
            >
              PERSONAL INFORMATION
            </h4>

            <div className="grid-3" style={{ gap: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>PHONE NUMBER</span>
                <strong style={{ color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Phone size={13} color="var(--color-primary-accent)" />
                  +91 {customer.phone}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>GENDER / AGE</span>
                <strong style={{ color: 'var(--text-dark)', marginTop: '2px', display: 'block' }}>
                  {customer.gender} {customer.age ? `(${customer.age} yrs)` : ''}
                </strong>
              </div>

              {customer.dateOfBirth && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>DATE OF BIRTH</span>
                  <strong style={{ color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Calendar size={13} color="var(--color-primary-accent)" />
                    {customer.dateOfBirth}
                  </strong>
                </div>
              )}

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>OCCUPATION</span>
                <strong style={{ color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Briefcase size={13} color="var(--color-primary-accent)" />
                  {customer.occupation || 'Self Employed'}
                </strong>
              </div>

              {customer.email && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>EMAIL</span>
                  <strong style={{ color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Mail size={13} color="var(--color-primary-accent)" />
                    {customer.email}
                  </strong>
                </div>
              )}

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>ID PROOF</span>
                <div style={{ marginTop: '2px' }}>
                  <strong style={{ color: 'var(--color-primary-dark)' }}>{customer.idProof}: </strong>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatIdProofDisplay(customer.idProof, customer.idNumber)}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>ACTIVE LOANS</span>
                <span className="badge badge-info" style={{ marginTop: '2px', display: 'inline-block' }}>
                  {customer.activeLoansCount} Active Loans
                </span>
              </div>
            </div>
          </div>

          {/* CURRENT ADDRESS */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
              border: '1px solid var(--border-light, #e2e8f0)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase' }}>
                CURRENT ADDRESS
              </h4>
              {currentLoc?.latitude && currentLoc?.longitude && (
                <span className="badge badge-success" style={{ fontSize: '11px', gap: '4px' }}>
                  <CheckCircle2 size={12} />
                  <span>GPS Location Verified</span>
                </span>
              )}
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-dark)', fontWeight: 600, lineHeight: '1.5' }}>
              {customer.currentAddress}
            </p>

            {/* GPS details if present */}
            {currentLoc?.latitude && currentLoc?.longitude ? (
              <div
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ fontSize: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Latitude</span>
                    <strong style={{ fontFamily: 'monospace' }}>{currentLoc.latitude}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Longitude</span>
                    <strong style={{ fontFamily: 'monospace' }}>{currentLoc.longitude}</strong>
                  </div>
                  {currentLoc.accuracy && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Accuracy</span>
                      <strong style={{ color: '#059669' }}>±{currentLoc.accuracy}m</strong>
                    </div>
                  )}
                </div>

                {currentMapsUrl && (
                  <a
                    href={currentMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: 'none', gap: '6px', fontSize: '12px' }}
                  >
                    <ExternalLink size={13} />
                    <span>View on Google Maps</span>
                  </a>
                )}
              </div>
            ) : currentMapsUrl ? (
              <a
                href={currentMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none', gap: '6px', fontSize: '12px', display: 'inline-flex' }}
              >
                <ExternalLink size={13} />
                <span>View Google Maps Link</span>
              </a>
            ) : null}
          </div>

          {/* PERMANENT ADDRESS */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
              border: '1px solid var(--border-light, #e2e8f0)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase' }}>
                PERMANENT ADDRESS
              </h4>
              {isSameAddress && (
                <span className="badge badge-info" style={{ fontSize: '11px' }}>
                  Same as Current Address
                </span>
              )}
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-dark)', fontWeight: 600, lineHeight: '1.5' }}>
              {isSameAddress ? customer.currentAddress : (customer.permanentAddress || customer.currentAddress)}
            </p>

            {/* Permanent GPS details if separate */}
            {!isSameAddress && permLoc?.latitude && permLoc?.longitude && (
              <div
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ fontSize: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Latitude</span>
                    <strong style={{ fontFamily: 'monospace' }}>{permLoc.latitude}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Longitude</span>
                    <strong style={{ fontFamily: 'monospace' }}>{permLoc.longitude}</strong>
                  </div>
                </div>

                {permMapsUrl && (
                  <a
                    href={permMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: 'none', gap: '6px', fontSize: '12px' }}
                  >
                    <ExternalLink size={13} />
                    <span>View Permanent Location on Maps</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer Actions */}
        <div
          style={{
            flexShrink: 0,
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle, #f1f5f9)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: 'var(--bg-surface-secondary, #f8fafc)'
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {onEdit && (
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onEdit(customer);
              }}
            >
              Edit Customer Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
