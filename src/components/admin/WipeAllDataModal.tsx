import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, HardDrive, RefreshCw, X } from 'lucide-react';
import { apiService } from '../../services/api';

export interface WipeAllDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReset: () => void;
}

export const WipeAllDataModal: React.FC<WipeAllDataModalProps> = ({
  isOpen,
  onClose,
  onSuccessReset
}) => {
  // Steps: 1 = Initial Confirmation, 2 = Backup & Verify, 3 = Final Confirmation, 4 = Wiping, 5 = Success Screen
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [inputConfirmation, setInputConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Backup Verification Record
  const [verificationRecord, setVerificationRecord] = useState<{
    token: string;
    fileId: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    drivePath: string;
  } | null>(null);

  // Verification Checklist State
  const [checklist, setChecklist] = useState({
    snapshot: false,
    upload: false,
    access: false,
    integrity: false
  });

  if (!isOpen) return null;

  const handleStartBackup = async () => {
    if (inputConfirmation !== 'WIPE ALL DATA') return;

    setStep(2);
    setLoading(true);
    setErrorMessage('');
    setChecklist({ snapshot: true, upload: false, access: false, integrity: false });

    try {
      // Simulate smooth progress indicator steps
      setTimeout(() => {
        setChecklist((prev) => ({ ...prev, upload: true }));
      }, 1000);

      const res = await apiService.initiateWipeBackup('WIPE ALL DATA');

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Google Drive backup creation or verification failed. No application data was deleted.');
      }

      setChecklist({ snapshot: true, upload: true, access: true, integrity: true });
      setVerificationRecord(res.data);
      setLoading(false);

      // Transition to final confirmation
      setTimeout(() => {
        setStep(3);
      }, 800);
    } catch (err: any) {
      console.error('[WipeAllDataModal] Backup initiation error:', err);
      setErrorMessage(err?.message || 'Google Drive backup verification failed. No application data was deleted.');
      setLoading(false);
    }
  };

  const handleConfirmWipe = async () => {
    if (!verificationRecord || !verificationRecord.token) return;

    setStep(4);
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await apiService.confirmSystemWipe(verificationRecord.token, 'WIPE ALL DATA');

      if (!res.success) {
        throw new Error(res.message || 'System data wipe failed.');
      }

      setLoading(false);
      setStep(5);
    } catch (err: any) {
      console.error('[WipeAllDataModal] Data wipe error:', err);
      setErrorMessage(err?.message || 'Failed to complete system wipe.');
      setLoading(false);
    }
  };

  const handleStartFresh = () => {
    onSuccessReset();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '20px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.35)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '2px solid #DC2626',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface, #ffffff)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: step === 5 ? '#065F46' : '#991B1B',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {step === 5 ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                {step === 1 && '⚠️ Permanently Wipe All Application Data?'}
                {step === 2 && 'Creating & Verifying Cloud Backup'}
                {step === 3 && 'Backup Verified Successfully'}
                {step === 4 && 'Atomic Data Wipe in Progress'}
                {step === 5 && '✓ SYSTEM DATA SUCCESSFULLY WIPED'}
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', opacity: 0.9 }}>
                {step === 5 ? 'System is clear and ready for a fresh start' : 'Production Fail-Safe Workflow'}
              </p>
            </div>
          </div>

          {step !== 2 && step !== 4 && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', opacity: 0.8 }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* ERROR ALERT BANNER */}
          {errorMessage && (
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #EF4444',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                lineHeight: '1.5'
              }}
            >
              <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                🛑 Operation Halted (Data Intact)
              </strong>
              {errorMessage}
            </div>
          )}

          {/* STEP 1: HIGH RISK WARNING & CONFIRMATION TEXT */}
          {step === 1 && (
            <>
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'rgba(254, 242, 242, 1)',
                  borderLeft: '4px solid #DC2626',
                  borderRadius: '6px',
                  color: '#7F1D1D',
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}
              >
                This action will permanently remove all operational data from the KKV Gold Finance application. Before deletion, a complete encrypted backup will be created and verified in Google Drive.
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                  The following data will be PERMANENTLY WIPED:
                </h4>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '20px',
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px 16px'
                  }}
                >
                  <li>Customers &amp; KYC records</li>
                  <li>Active &amp; Closed loan records</li>
                  <li>Loan payment transactions</li>
                  <li>Generated payment receipts</li>
                  <li>Gold pledge item details</li>
                  <li>Interest &amp; payment history</li>
                  <li>Accounting ledgers &amp; Daybook</li>
                  <li>Fixed deposits &amp; payouts</li>
                  <li>Audit logs &amp; Notifications</li>
                  <li>Business reports &amp; history</li>
                </ul>
              </div>

              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--text-muted)'
                }}
              >
                🔒 <strong>Preserved System Data:</strong> Admin authentication logins, Google OAuth credentials, and system configurations are safely retained so you remain logged in.
              </div>

              <div className="form-group" style={{ marginTop: '6px' }}>
                <label className="form-label required" style={{ color: '#991B1B', fontWeight: 700 }}>
                  To confirm, type <code>WIPE ALL DATA</code> below:
                </label>
                <input
                  type="text"
                  className="input-control"
                  style={{
                    borderColor: inputConfirmation === 'WIPE ALL DATA' ? '#16A34A' : '#DC2626',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}
                  placeholder="WIPE ALL DATA"
                  value={inputConfirmation}
                  onChange={(e) => setInputConfirmation(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFF',
                    opacity: inputConfirmation === 'WIPE ALL DATA' ? 1 : 0.5,
                    gap: '6px'
                  }}
                  disabled={inputConfirmation !== 'WIPE ALL DATA'}
                  onClick={handleStartBackup}
                >
                  <HardDrive size={16} />
                  <span>Create &amp; Verify Google Drive Backup</span>
                </button>
              </div>
            </>
          )}

          {/* STEP 2: BACKUP CREATION & GOOGLE DRIVE VERIFICATION PROGRESS */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
              <div style={{ textAlign: 'center' }}>
                {loading && <RefreshCw size={36} className="spin" style={{ color: '#DC2626', margin: '0 auto 12px' }} />}
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                  Securing Database Backup to Google Drive
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  No application data will be deleted until all verification checks pass.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light, #e2e8f0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  {checklist.snapshot ? <CheckCircle2 size={18} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>1. Generating complete database snapshot payload...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  {checklist.upload ? <CheckCircle2 size={18} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>2. Uploading to Google Drive (My Drive → KKV_DATABASE → Backups → Full_System_Backups)...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  {checklist.access ? <CheckCircle2 size={18} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>3. Verifying Google Drive file existence &amp; account permissions...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  {checklist.integrity ? <CheckCircle2 size={18} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>4. Verifying file size &gt; 0 bytes &amp; testing JSON snapshot structure...</span>
                </div>
              </div>

              {errorMessage && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>
                    Back to Safety
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: FINAL DELETE CONFIRMATION */}
          {step === 3 && verificationRecord && (
            <>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(22, 101, 52, 0.08)',
                  border: '1px solid #166534',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '14px' }}>
                  <ShieldCheck size={18} />
                  <span>Google Drive Backup Verified</span>
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  A complete backup has been securely verified in Google Drive. You are now about to permanently delete all application operational data from this system.
                </p>
              </div>

              {/* Verified Backup Card */}
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
                  border: '1px solid var(--border-light, #cbd5e1)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '12.5px'
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Backup File: </span>
                  <strong style={{ color: 'var(--color-primary-dark)' }}>{verificationRecord.fileName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Drive Location: </span>
                  <strong>{verificationRecord.drivePath}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Backup Size: </span>
                  <strong>{(verificationRecord.fileSize / 1024).toFixed(1)} KB</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Verification Status: </span>
                  <span className="badge badge-success">✓ Verified in Google Drive</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel (Keep My Data Intact)
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: '#DC2626', color: '#FFF', fontWeight: 800 }}
                  onClick={handleConfirmWipe}
                >
                  Yes, Permanently Delete All Data
                </button>
              </div>
            </>
          )}

          {/* STEP 4: ATOMIC DATA WIPE IN PROGRESS */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <RefreshCw size={42} className="spin" style={{ color: '#DC2626', margin: '0 auto 16px' }} />
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                Permanently Wiping Operational Database...
              </h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Clearing customer, loan, payment, receipt, and ledger records.
              </p>
            </div>
          )}

          {/* STEP 5: SUCCESS SCREEN */}
          {step === 5 && (
            <>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(6, 95, 70, 0.08)',
                  border: '1px solid #065F46',
                  borderRadius: '8px',
                  color: '#065F46',
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}
              >
                A complete backup was securely created and verified in Google Drive before deletion. All application operational data has now been permanently removed. The KKV Gold Finance system is ready for a fresh start.
              </div>

              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '12.5px'
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Backup File: </span>
                  <strong style={{ color: 'var(--color-primary-dark)' }}>{verificationRecord?.fileName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Location: </span>
                  <strong>Google Drive → KKV_DATABASE → Backups → Full_System_Backups</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span className="badge badge-success">✓ Backup Verified</span>
                  <span className="badge badge-success">✓ Database Cleared</span>
                  <span className="badge badge-success">✓ Application Reset</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ height: '42px', padding: '0 24px', fontSize: '14px', fontWeight: 800 }}
                  onClick={handleStartFresh}
                >
                  Start Fresh
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
