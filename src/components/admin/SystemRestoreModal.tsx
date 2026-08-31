import React, { useState, useEffect } from 'react';
import { CheckCircle2, CloudDownload, RefreshCw, X, FileJson, Lock } from 'lucide-react';
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
  // Steps: 1 = Backup Selection, 2 = Confirmation & Text Entry, 3 = Restore Progress, 4 = Success Screen
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);

  const [validationResult, setValidationResult] = useState<{
    token: string;
    fileId: string;
    fileName: string;
    createdTime: string;
    sizeBytes: number;
    counts: { customers: number; loans: number; receipts: number; fixedDeposits: number };
  } | null>(null);

  const [inputConfirmation, setInputConfirmation] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emergencyBackupName, setEmergencyBackupName] = useState('');

  // Restore Progress Checklist
  const [checklist, setChecklist] = useState({
    validated: false,
    emergencyCreated: false,
    emergencyUploaded: false,
    restoringTables: false,
    verified: false
  });

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen]);

  const fetchBackups = async () => {
    setLoadingBackups(true);
    setErrorMessage('');
    try {
      const res = await apiService.getRestoreBackups();
      if (res.success && Array.isArray(res.data)) {
        setBackups(res.data);
      } else {
        setErrorMessage(res.message || 'Failed to list Google Drive backups.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error fetching backups.');
    } finally {
      setLoadingBackups(false);
    }
  };

  if (!isOpen) return null;

  const handleSelectBackup = async (backup: any) => {
    setLoadingBackups(true);
    setErrorMessage('');

    try {
      const res = await apiService.validateRestoreBackup(backup.fileId);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Backup file validation failed. Corrupted or invalid backup payload.');
      }
      setValidationResult(res.data);
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Selected file structure is invalid for system restore.');
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (inputConfirmation !== 'RESTORE SYSTEM' || !validationResult) return;

    setStep(3);
    setRestoring(true);
    setErrorMessage('');
    setChecklist({ validated: true, emergencyCreated: false, emergencyUploaded: false, restoringTables: false, verified: false });

    try {
      // Simulate checklist visual steps
      setTimeout(() => setChecklist((prev) => ({ ...prev, emergencyCreated: true })), 800);
      setTimeout(() => setChecklist((prev) => ({ ...prev, emergencyUploaded: true })), 1600);
      setTimeout(() => setChecklist((prev) => ({ ...prev, restoringTables: true })), 2400);

      const res = await apiService.executeSystemRestore(validationResult.token, 'RESTORE SYSTEM');

      if (!res.success) {
        throw new Error(res.message || 'System restore failed.');
      }

      setEmergencyBackupName(res.data?.emergencyBackupFileName || 'PRE_RESTORE_BACKUP.json');
      setChecklist({ validated: true, emergencyCreated: true, emergencyUploaded: true, restoringTables: true, verified: true });
      setRestoring(false);

      setTimeout(() => {
        setStep(4);
      }, 600);
    } catch (err: any) {
      console.error('[SystemRestoreModal] Restore error:', err);
      setErrorMessage(err?.message || 'Restore failed. Your current data was preserved safely.');
      setRestoring(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
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
          maxWidth: '640px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.35)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '2px solid #2563EB',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface, #ffffff)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: step === 4 ? '#065F46' : '#1E3A8A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {step === 4 ? <CheckCircle2 size={24} /> : <CloudDownload size={24} />}
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                {step === 1 && 'Select System Backup'}
                {step === 2 && '⚠️ Restore Complete System?'}
                {step === 3 && 'Restoring System from Cloud Backup'}
                {step === 4 && '✓ SYSTEM RESTORED SUCCESSFULLY'}
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', opacity: 0.9 }}>
                Google Drive Verified System Restore Workflow
              </p>
            </div>
          </div>

          {step !== 3 && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', opacity: 0.8 }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Modal Body */}
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
                🛑 Restore Error (Current Data Intact)
              </strong>
              {errorMessage}
            </div>
          )}

          {/* STEP 1: BACKUP SELECTION SCREEN */}
          {step === 1 && (
            <>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Select a verified Google Drive backup snapshot to restore KKV Gold Finance operational records:
              </p>

              {loadingBackups ? (
                <div style={{ textAlign: 'center', padding: '36px' }}>
                  <RefreshCw size={32} className="spin" style={{ color: '#2563EB', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                    Loading available backups from Google Drive...
                  </p>
                </div>
              ) : backups.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                  No backup files found in <code>Google Drive → KKV_DATABASE → Backups → Full_System_Backups</code>.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                  {backups.map((b) => (
                    <div
                      key={b.fileId}
                      style={{
                        padding: '14px 16px',
                        border: '1px solid var(--border-light, #cbd5e1)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <FileJson size={22} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ fontSize: '13.5px', color: 'var(--color-primary-dark)' }}>{b.fileName}</strong>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Created: <strong>{formatDate(b.createdTime)}</strong> | Size: <strong>{formatSize(b.sizeBytes)}</strong>
                          </span>
                          <span className="badge badge-success" style={{ width: 'fit-content', marginTop: '4px', fontSize: '10px' }}>
                            {b.status}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ height: '34px', padding: '0 14px', flexShrink: 0 }}
                        onClick={() => handleSelectBackup(b)}
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* STEP 2: RESTORE CONFIRMATION & TEXT INPUT */}
          {step === 2 && validationResult && (
            <>
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderLeft: '4px solid #D97706',
                  borderRadius: '6px',
                  color: '#92400E',
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}
              >
                The selected backup will restore the KKV Gold Finance system to its previous state. Current business data may be replaced by the backup data.
              </div>

              {/* Selected Backup Summary Card */}
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
                  <span style={{ color: 'var(--text-muted)' }}>Selected Backup: </span>
                  <strong style={{ color: 'var(--color-primary-dark)' }}>{validationResult.fileName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Backup Date: </span>
                  <strong>{formatDate(validationResult.createdTime)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Google Drive Status: </span>
                  <span className="badge badge-success">✓ Verified Snapshot</span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Snapshot contains: <strong>{validationResult.counts.customers} Customers</strong>, <strong>{validationResult.counts.loans} Loans</strong>, <strong>{validationResult.counts.receipts} Receipts</strong>.
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(37, 99, 235, 0.06)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Lock size={16} />
                <span>
                  <strong>Automatic Safety Guarantee:</strong> An emergency backup of your CURRENT system state will be uploaded and verified in Google Drive BEFORE any data is replaced.
                </span>
              </div>

              <div className="form-group" style={{ marginTop: '4px' }}>
                <label className="form-label required" style={{ color: '#92400E', fontWeight: 700 }}>
                  To confirm, type <code>RESTORE SYSTEM</code> below:
                </label>
                <input
                  type="text"
                  className="input-control"
                  style={{
                    borderColor: inputConfirmation === 'RESTORE SYSTEM' ? '#16A34A' : '#D97706',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}
                  placeholder="RESTORE SYSTEM"
                  value={inputConfirmation}
                  onChange={(e) => setInputConfirmation(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  Back to Backups
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#2563EB',
                    color: '#FFF',
                    opacity: inputConfirmation === 'RESTORE SYSTEM' ? 1 : 0.5,
                    gap: '6px'
                  }}
                  disabled={inputConfirmation !== 'RESTORE SYSTEM'}
                  onClick={handleExecuteRestore}
                >
                  <CloudDownload size={16} />
                  <span>Restore System</span>
                </button>
              </div>
            </>
          )}

          {/* STEP 3: CONTROLLED RESTORE PROGRESS */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
              <div style={{ textAlign: 'center' }}>
                {restoring && <RefreshCw size={36} className="spin" style={{ color: '#2563EB', margin: '0 auto 12px' }} />}
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                  Restoring KKV Gold Finance System
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Please do not navigate away. Restoring operational collections safely.
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
                  <CheckCircle2 size={18} color="#16A34A" />
                  <span>1. Selected backup verified in Google Drive</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  {checklist.emergencyCreated ? <CheckCircle2 size={18} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>2. Creating current system emergency snapshot...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  {checklist.emergencyUploaded ? <CheckCircle2 size={18} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>3. Uploading &amp; verifying emergency backup in Google Drive...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  {checklist.restoringTables ? <CheckCircle2 size={18} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>4. Restoring customer, loan, payment, and accounting records...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  {checklist.verified ? <CheckCircle2 size={18} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>5. Verifying restored database integrity...</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS SCREEN */}
          {step === 4 && (
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
                The KKV Gold Finance system has been successfully restored from the selected Google Drive backup.
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
                  <span style={{ color: 'var(--text-muted)' }}>Restored Backup: </span>
                  <strong style={{ color: 'var(--color-primary-dark)' }}>{validationResult?.fileName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Emergency Backup Created: </span>
                  <strong style={{ color: '#166534' }}>{emergencyBackupName}</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span className="badge badge-success">✓ Complete</span>
                  <span className="badge badge-success">✓ Data Integrity Verified</span>
                  <span className="badge badge-success">✓ Emergency Backup Created</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ height: '42px', padding: '0 24px', fontSize: '14px', fontWeight: 800 }}
                  onClick={() => {
                    onSuccessReload();
                    onClose();
                  }}
                >
                  Reload Application
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
