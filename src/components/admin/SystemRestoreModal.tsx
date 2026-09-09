import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Upload,
  RefreshCw,
  X,
  RotateCcw,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { apiService } from '../../services/api';

export interface SystemRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReload: () => void;
}

export const SystemRestoreModal: React.FC<SystemRestoreModalProps> = ({
  isOpen,
  onClose,
  onSuccessReload
}) => {
  // Steps: 1 = Select & Upload, 2 = Validate & Preview, 3 = Confirm, 4 = Executing, 5 = Complete
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);

  // Validation Preview Result
  const [previewResult, setPreviewResult] = useState<{
    token: string;
    backupId: string;
    fileName: string;
    createdAt: string;
    fileSize: number;
    sha256: string;
    schemaVersion: string;
    sourceType: 'LOCAL_UPLOAD' | 'LOCAL_SERVER';
    manifestVerified: boolean;
    checksumsVerified: boolean;
    relationshipsVerified: boolean;
    counts: {
      customers: number;
      loans: number;
      receipts: number;
      fixedDeposits: number;
      dayBookEntries: number;
      totalRecords: number;
    };
    currentDbCounts: {
      customers: number;
      loans: number;
      receipts: number;
      fixedDeposits: number;
      dayBookEntries: number;
      totalRecords: number;
    };
  } | null>(null);

  // Confirmation Controls
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);
  const [inputConfirmation, setInputConfirmation] = useState('');

  // Restore Execution Results
  const [dbRestoreStatus, setDbRestoreStatus] = useState<'PENDING' | 'RESTORING' | 'VERIFIED' | 'FAILED'>('PENDING');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMessage('');
      setPreviewResult(null);
      setAcknowledgedWarning(false);
      setInputConfirmation('');
      setDbRestoreStatus('PENDING');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleValidateUploadedFile = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip') && !file.name.toLowerCase().endsWith('.json')) {
      setErrorMessage('Unsupported file type. Please select a valid .ZIP backup archive or .JSON snapshot.');
      return;
    }

    if (file.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes).');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('The selected file exceeds the 100MB maximum upload limit.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await apiService.validateRestoreBackup({ file });
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Backup validation failed. Archive is invalid or corrupted.');
      }
      setPreviewResult(res.data);
      setStep(2);
    } catch (err: any) {
      console.error('[SystemRestoreModal] Validation error:', err);
      setErrorMessage(err?.message || 'Selected backup could not be validated.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!previewResult || !previewResult.token) return;
    const cleanConfirm = inputConfirmation.trim();
    if (cleanConfirm !== 'RESTORE BACKUP' && cleanConfirm !== 'RESTORE SYSTEM') return;
    if (!acknowledgedWarning) return;

    setStep(4);
    setLoading(true);
    setErrorMessage('');
    setDbRestoreStatus('RESTORING');

    try {
      const res = await apiService.executeSystemRestore(previewResult.token, cleanConfirm);

      if (!res.success || !res.data) {
        setDbRestoreStatus('FAILED');
        throw new Error(res.message || 'Database restoration failed.');
      }

      setDbRestoreStatus('VERIFIED');
      setLoading(false);
      setStep(5);
    } catch (err: any) {
      console.error('[SystemRestoreModal] Restore execution error:', err);
      setDbRestoreStatus('FAILED');
      setErrorMessage(err?.message || 'Restore failed. The database has been rolled back safely.');
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onSuccessReload();
    onClose();
  };

  const isExactConfirm =
    inputConfirmation.trim() === 'RESTORE BACKUP' || inputConfirmation.trim() === 'RESTORE SYSTEM';
  const canProceedToRestore = isExactConfirm && acknowledgedWarning && !loading;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '640px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF'
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '16px 22px',
            backgroundColor:
              step === 5
                ? dbRestoreStatus === 'VERIFIED'
                  ? '#065F46'
                  : '#991B1B'
                : '#1E293B',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background-color 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {step === 5 ? (
                dbRestoreStatus === 'FAILED' ? (
                  <AlertTriangle size={20} />
                ) : (
                  <CheckCircle2 size={20} />
                )
              ) : (
                <RotateCcw size={20} />
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                {step === 5
                  ? dbRestoreStatus === 'VERIFIED'
                    ? 'System Restored Successfully'
                    : 'Restore Failed'
                  : 'Restore Operational Database'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>
                {step === 5
                  ? dbRestoreStatus === 'VERIFIED'
                    ? 'Database verified and restored.'
                    : 'Database restore could not be completed.'
                  : 'Multi-Step Verified Restoration Engine'}
              </p>
            </div>
          </div>
          {step !== 4 && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                opacity: 0.8
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* STEP PROGRESS BAR */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
          {[
            { num: 1, label: 'Upload' },
            { num: 2, label: 'Validate' },
            { num: 3, label: 'Confirm' },
            { num: 4, label: 'Execute' },
            { num: 5, label: 'Done' }
          ].map((s) => (
            <div
              key={s.num}
              style={{
                flex: 1,
                padding: '10px 0',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: step === s.num ? 700 : 500,
                color: step >= s.num ? '#2563EB' : '#94A3B8',
                borderBottom: step === s.num ? '2px solid #2563EB' : '2px solid transparent'
              }}
            >
              {s.num}. {s.label}
            </div>
          ))}
        </div>

        {/* BODY */}
        <div style={{ padding: '24px' }}>
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: SELECT & UPLOAD */}
          {step === 1 && (
            <div>
              <div
                style={{
                  border: `2px dashed ${isDragging ? '#2563EB' : '#CBD5E1'}`,
                  borderRadius: '12px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: isDragging ? '#EFF6FF' : '#F8FAFC',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleValidateUploadedFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.zip,.json';
                  input.onchange = (e: any) => {
                    if (e.target?.files?.[0]) {
                      handleValidateUploadedFile(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
              >
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <RefreshCw size={28} className="spin" color="#2563EB" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB' }}>
                      Validating backup package integrity &amp; SHA-256...
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload size={32} color="#64748B" style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                      Click to choose or drag &amp; drop a backup file
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Supports official portable packages (.ZIP) and JSON snapshots (.JSON) up to 100MB
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: VALIDATE & PREVIEW */}
          {step === 2 && previewResult && (
            <div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <CheckCircle2 size={24} color="#166534" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534' }}>
                    Package Verified: {previewResult.fileName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#166534' }}>
                    Created: {new Date(previewResult.createdAt).toLocaleString()} | Schema: {previewResult.schemaVersion}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Customers</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{previewResult.counts.customers}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Loans</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{previewResult.counts.loans}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Receipts</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{previewResult.counts.receipts}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                  <span>Continue to Confirmation</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM */}
          {step === 3 && previewResult && (
            <div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontWeight: 700, marginBottom: '6px' }}>
                  <AlertTriangle size={18} />
                  <span>Destructive Action Warning</span>
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#7F1D1D', lineHeight: 1.5 }}>
                  Restoring will replace the current operational database with the contents of the verified backup package. An emergency safety rollback point will be automatically generated.
                </p>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={acknowledgedWarning}
                  onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>I understand that existing operational records will be replaced.</span>
              </label>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600 }}>
                  Type <strong style={{ color: '#DC2626' }}>RESTORE BACKUP</strong> to confirm:
                </label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="RESTORE BACKUP"
                  value={inputConfirmation}
                  onChange={(e) => setInputConfirmation(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    backgroundColor: canProceedToRestore ? '#DC2626' : '#94A3B8',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: canProceedToRestore ? 'pointer' : 'not-allowed'
                  }}
                  disabled={!canProceedToRestore}
                  onClick={handleExecuteRestore}
                >
                  Confirm &amp; Execute Restore
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: EXECUTING */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <RefreshCw size={36} className="spin" color="#2563EB" style={{ margin: '0 auto 16px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', margin: '0 0 8px' }}>
                Restoring Database...
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                Please do not close your browser. Atomic restore and schema verification in progress.
              </p>
            </div>
          )}

          {/* STEP 5: COMPLETE */}
          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: dbRestoreStatus === 'VERIFIED' ? '#DCFCE7' : '#FEE2E2',
                  color: dbRestoreStatus === 'VERIFIED' ? '#16A34A' : '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                {dbRestoreStatus === 'VERIFIED' ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', color: '#1E293B' }}>
                {dbRestoreStatus === 'VERIFIED' ? 'Restoration Successfully Verified!' : 'Restoration Encountered Errors'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 24px' }}>
                {dbRestoreStatus === 'VERIFIED'
                  ? 'All operational data tables and relations have been verified and restored.'
                  : errorMessage || 'Restoration failed. Safety backup rollback preserved your previous data.'}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ margin: '0 auto', minWidth: '160px', justifyContent: 'center' }}
                onClick={handleFinish}
              >
                Complete &amp; Reload Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
