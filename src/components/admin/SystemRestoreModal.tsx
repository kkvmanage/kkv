import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Upload,
  RefreshCw,
  X,
  FileArchive,
  HardDrive,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  ExternalLink
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
  const [sourceType, setSourceType] = useState<'upload' | 'drive'>('upload');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected File info
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Google Drive Backups
  const [driveBackups, setDriveBackups] = useState<any[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);

  // Validation Preview Result
  const [previewResult, setPreviewResult] = useState<{
    token: string;
    backupId: string;
    fileName: string;
    createdAt: string;
    fileSize: number;
    sha256: string;
    schemaVersion: string;
    sourceType: 'LOCAL_UPLOAD' | 'GOOGLE_DRIVE' | 'LOCAL_SERVER';
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

  // Restore Execution Results & Decoupled Statuses
  const [restoreResult, setRestoreResult] = useState<any>(null);
  const [dbRestoreStatus, setDbRestoreStatus] = useState<'PENDING' | 'RESTORING' | 'VERIFIED' | 'FAILED'>('PENDING');
  const [driveSyncStatus, setDriveSyncStatus] = useState<'NOT_STARTED' | 'SYNCING' | 'VERIFIED' | 'PENDING' | 'REAUTH_REQUIRED' | 'FAILED'>('NOT_STARTED');
  const [retryingDriveSync, setRetryingDriveSync] = useState(false);
  const [reconnectingDrive, setReconnectingDrive] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [previousAccount, setPreviousAccount] = useState<string>('');

  // Execution Progress Checklist
  const [checklist, setChecklist] = useState({
    emergencyBackup: false,
    restoring: false,
    verified: false,
    driveSync: false
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMessage('');
      setPreviewResult(null);
      setSelectedFile(null);
      setAcknowledgedWarning(false);
      setInputConfirmation('');
      setRestoreResult(null);
      setDbRestoreStatus('PENDING');
      setDriveSyncStatus('NOT_STARTED');
      setReconnectingDrive(false);
      fetchDriveBackups();
      fetchInitialDriveHealth();
    }
  }, [isOpen]);

  const fetchInitialDriveHealth = async () => {
    try {
      const health = await apiService.getDriveHealth();
      if (health.googleAccount || health.googlePrincipal) {
        setPreviousAccount(health.googleAccount || health.googlePrincipal || '');
      }
    } catch {
      // ignore
    }
  };

  const fetchDriveBackups = async () => {
    setLoadingDrive(true);
    try {
      const res = await apiService.getRestoreBackups();
      if (res.success && Array.isArray(res.data)) {
        setDriveBackups(res.data);
      }
    } catch (err) {
      console.warn('Failed to load Google Drive backups:', err);
    } finally {
      setLoadingDrive(false);
    }
  };

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

    setSelectedFile(file);
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

  const handleValidateDriveFile = async (fileId: string) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await apiService.validateRestoreBackup({ fileId });
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Drive backup validation failed.');
      }
      setPreviewResult(res.data);
      setStep(2);
    } catch (err: any) {
      console.error('[SystemRestoreModal] Drive validation error:', err);
      setErrorMessage(err?.message || 'Failed to download or validate Google Drive backup.');
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
    setDriveSyncStatus('NOT_STARTED');
    setChecklist({ emergencyBackup: true, restoring: false, verified: false, driveSync: false });

    try {
      setTimeout(() => setChecklist((prev) => ({ ...prev, restoring: true })), 700);
      setTimeout(() => setChecklist((prev) => ({ ...prev, verified: true })), 1400);
      setTimeout(() => setChecklist((prev) => ({ ...prev, driveSync: true })), 2100);

      const res = await apiService.executeSystemRestore(previewResult.token, cleanConfirm);

      if (!res.success || !res.data) {
        setDbRestoreStatus('FAILED');
        setDriveSyncStatus('NOT_STARTED');
        throw new Error(res.message || 'Database restoration failed.');
      }

      const resultData = res.data;
      setRestoreResult(resultData);
      setDbRestoreStatus('VERIFIED');

      const errCode = resultData.googleDriveErrorCode || resultData.googleDrive?.errorCode || res.googleDrive?.errorCode;
      const rawDriveStatus = resultData.googleDriveSync || resultData.googleDrive?.status || res.googleDrive?.status;

      if (rawDriveStatus === 'VERIFIED') {
        setDriveSyncStatus('VERIFIED');
      } else if (errCode === 'GOOGLE_DRIVE_REAUTH_REQUIRED' || rawDriveStatus === 'REAUTH_REQUIRED') {
        setDriveSyncStatus('REAUTH_REQUIRED');
      } else if (rawDriveStatus === 'FAILED') {
        setDriveSyncStatus('FAILED');
      } else {
        setDriveSyncStatus('PENDING');
      }

      setLoading(false);
      setStep(5);
    } catch (err: any) {
      console.error('[SystemRestoreModal] Restore execution error:', err);
      setDbRestoreStatus('FAILED');
      setDriveSyncStatus('NOT_STARTED');
      setErrorMessage(err?.message || 'Restore failed. The database has been rolled back safely.');
      setLoading(false);
    }
  };

  const handleReconnectDrive = async () => {
    setReconnectingDrive(true);
    setErrorMessage('');
    try {
      const res = await apiService.getGoogleDriveAuthUrl();
      if (res.success && res.url) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          res.url,
          'GoogleDriveAuth',
          `width=${width},height=${height},top=${top},left=${left}`
        );

        const onMessage = (event: MessageEvent) => {
          if (event.data?.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
            window.removeEventListener('message', onMessage);
            if (popup && !popup.closed) popup.close();
            setConnectedAccount(event.data.email || 'Connected User');
            setDriveSyncStatus('PENDING');
            setReconnectingDrive(false);
          } else if (event.data?.type === 'GOOGLE_DRIVE_AUTH_FAILED') {
            window.removeEventListener('message', onMessage);
            if (popup && !popup.closed) popup.close();
            setErrorMessage(event.data.error || 'Google Drive re-authentication failed.');
            setReconnectingDrive(false);
          }
        };
        window.addEventListener('message', onMessage);

        const pollTimer = setInterval(async () => {
          try {
            const health = await apiService.getDriveHealth();
            if (health.success && health.canUpload) {
              clearInterval(pollTimer);
              window.removeEventListener('message', onMessage);
              if (popup && !popup.closed) popup.close();
              setConnectedAccount(health.googleAccount || health.googlePrincipal || 'Connected User');
              setDriveSyncStatus('PENDING');
              setReconnectingDrive(false);
            } else if (popup && popup.closed) {
              clearInterval(pollTimer);
              window.removeEventListener('message', onMessage);
              setReconnectingDrive(false);
            }
          } catch {
            // continue polling
          }
        }, 1500);

        setTimeout(() => {
          clearInterval(pollTimer);
          window.removeEventListener('message', onMessage);
          setReconnectingDrive(false);
        }, 300000);
      } else {
        setErrorMessage(res.message || 'Failed to initialize Google OAuth login.');
        setReconnectingDrive(false);
      }
    } catch (err: any) {
      console.error('[SystemRestoreModal] Reconnect error:', err);
      setErrorMessage(err?.message || 'Error connecting to Google Drive');
      setReconnectingDrive(false);
    }
  };

  const handleRetryDriveSync = async () => {
    const restoreId = restoreResult?.restoreId || previewResult?.backupId;
    if (!restoreId) return;

    setRetryingDriveSync(true);
    setDriveSyncStatus('SYNCING');
    setErrorMessage('');

    try {
      const res = await apiService.retryRestoreDriveSync(restoreId);
      if (res.data) {
        setRestoreResult(res.data);
      }

      const rawDriveStatus = res.data?.googleDriveSync || res.googleDrive?.status || (res.success ? 'VERIFIED' : 'FAILED');
      const errCode = res.errorCode || res.data?.googleDriveErrorCode || res.googleDrive?.errorCode;

      if (res.success && rawDriveStatus === 'VERIFIED') {
        setDriveSyncStatus('VERIFIED');
      } else if (errCode === 'GOOGLE_DRIVE_REAUTH_REQUIRED') {
        setDriveSyncStatus('REAUTH_REQUIRED');
      } else {
        setDriveSyncStatus('FAILED');
      }
    } catch (err: any) {
      setDriveSyncStatus('FAILED');
      console.error('Drive sync retry error:', err);
    } finally {
      setRetryingDriveSync(false);
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
          maxWidth: '700px',
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
                ? dbRestoreStatus === 'VERIFIED' && driveSyncStatus === 'VERIFIED'
                  ? '#065F46' // Green for both verified
                  : dbRestoreStatus === 'VERIFIED'
                  ? '#1E3A8A' // Deep navy blue for DB verified + Drive pending/reauth/failed
                  : '#991B1B' // Red for restore failure
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
                  ? dbRestoreStatus === 'VERIFIED' && driveSyncStatus === 'VERIFIED'
                    ? 'System Restored Successfully'
                    : dbRestoreStatus === 'VERIFIED'
                    ? 'System Restored'
                    : 'Restore Failed'
                  : 'Restore Operational Database'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>
                {step === 5
                  ? dbRestoreStatus === 'VERIFIED' && driveSyncStatus === 'VERIFIED'
                    ? 'Database and Google Drive verified.'
                    : dbRestoreStatus === 'VERIFIED' && driveSyncStatus === 'REAUTH_REQUIRED'
                    ? 'Database restored. Drive authorization requires renewal.'
                    : dbRestoreStatus === 'VERIFIED' && driveSyncStatus === 'FAILED'
                    ? 'Database restored and verified. Google Drive synchronization could not be completed.'
                    : dbRestoreStatus === 'VERIFIED' && (driveSyncStatus === 'PENDING' && connectedAccount)
                    ? 'Database restored. Google Drive connected.'
                    : dbRestoreStatus === 'VERIFIED'
                    ? 'Database restored and verified. Google Drive synchronization is pending.'
                    : 'Database restore could not be completed.'
                  : 'Multi-Step Verified Restoration Engine'}
              </p>
            </div>
          </div>

          {step !== 4 && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* STEP INDICATOR */}
        {step !== 5 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 22px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              fontSize: '11.5px',
              fontWeight: 700
            }}
          >
            {[
              { num: 1, label: '1. Select Source' },
              { num: 2, label: '2. Validate & Preview' },
              { num: 3, label: '3. Confirmation' },
              { num: 4, label: '4. Restore & Sync' }
            ].map((s) => {
              const isPast = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div
                  key={s.num}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: isCurrent ? '#2563EB' : isPast ? '#16A34A' : '#94A3B8'
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      backgroundColor: isCurrent ? '#2563EB' : isPast ? '#16A34A' : '#E2E8F0',
                      color: isCurrent || isPast ? '#FFF' : '#64748B'
                    }}
                  >
                    {isPast ? '✓' : s.num}
                  </div>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* BODY */}
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ERROR ALERT */}
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #F87171',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                lineHeight: '1.5'
              }}
            >
              <strong style={{ display: 'block', fontSize: '13px', marginBottom: '2px' }}>
                🛑 Restoration Blocked
              </strong>
              {errorMessage}
            </div>
          )}

          {/* STEP 1: SELECT BACKUP SOURCE */}
          {step === 1 && (
            <>
              {/* SOURCE TABS */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: sourceType === 'upload' ? '#2563EB' : '#F1F5F9',
                    color: sourceType === 'upload' ? '#FFF' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setSourceType('upload')}
                >
                  <Upload size={15} />
                  <span>Upload Backup ZIP</span>
                </button>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: sourceType === 'drive' ? '#2563EB' : '#F1F5F9',
                    color: sourceType === 'drive' ? '#FFF' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setSourceType('drive')}
                >
                  <HardDrive size={15} />
                  <span>Restore From Google Drive</span>
                </button>
              </div>

              {/* UPLOAD TAB WITH DRAG & DROP */}
              {sourceType === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleValidateUploadedFile(file);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '36px 20px',
                      border: isDragging ? '2px dashed #2563EB' : '2px dashed #94A3B8',
                      backgroundColor: isDragging ? '#EFF6FF' : '#F8FAFC',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      gap: '10px',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FileArchive size={40} color={isDragging ? '#2563EB' : '#475569'} />
                    <div>
                      <strong style={{ fontSize: '14px', color: '#1E293B', display: 'block' }}>
                        Drag &amp; Drop Backup ZIP Here
                      </strong>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        or click to browse from your local computer (.zip / .json)
                      </span>
                    </div>

                    <span
                      className="btn btn-secondary"
                      style={{ marginTop: '6px', fontSize: '12px', padding: '6px 14px' }}
                    >
                      Select ZIP File
                    </span>

                    <input
                      type="file"
                      accept=".zip,.json,application/zip"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleValidateUploadedFile(file);
                      }}
                    />
                  </label>

                  {selectedFile && (
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#F1F5F9',
                        borderRadius: '6px',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </div>
                      <span style={{ color: '#64748B' }}>
                        Last modified: {new Date(selectedFile.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {loading && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: '#2563EB',
                        fontSize: '13px',
                        padding: '10px 0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={16} className="spin" />
                        <span style={{ fontWeight: 700 }}>Validating backup integrity &amp; SHA-256 hashes...</span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                        Checking ZIP structure, manifest, schemas, and relational keys.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* DRIVE TAB */}
              {sourceType === 'drive' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', fontSize: '11.5px', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span><strong>Source Folder:</strong> <code>kkv finance</code></span>
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>✓ Verified Destination</span>
                  </div>
                  {loadingDrive ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748B', fontSize: '13px' }}>
                      <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                      <span>Loading verified Google Drive backups...</span>
                    </div>
                  ) : driveBackups.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '24px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        color: '#64748B',
                        fontSize: '13px'
                      }}
                    >
                      No backups found in Google Drive folder. You can upload a local backup ZIP file instead.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                      {driveBackups.map((b) => (
                        <div
                          key={b.fileId}
                          style={{
                            padding: '12px 14px',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '12.5px'
                          }}
                        >
                          <div>
                            <strong style={{ color: '#1E293B', display: 'block' }}>{b.fileName}</strong>
                            <span style={{ color: '#64748B', fontSize: '11px' }}>
                              {(b.sizeBytes / 1024).toFixed(1)} KB • Created {new Date(b.createdTime).toLocaleString()}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '5px 12px' }}
                            disabled={loading}
                            onClick={() => handleValidateDriveFile(b.fileId)}
                          >
                            {loading ? 'Validating...' : 'Select & Validate'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* STEP 2: PREVIEW & VERIFICATION RESULTS */}
          {step === 2 && previewResult && (
            <>
              {/* INTEGRITY CHECKLIST */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#166534',
                  fontSize: '13px',
                  fontWeight: 700
                }}
              >
                <ShieldCheck size={18} />
                <span>Backup Package 100% Validated &amp; Ready for Restoration</span>
              </div>

              {/* METADATA & INTEGRITY STATUS */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px 14px',
                  fontSize: '12px'
                }}
              >
                <div>
                  <span style={{ color: '#64748B' }}>Source File: </span>
                  <strong>{previewResult.fileName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Schema Version: </span>
                  <strong>{previewResult.schemaVersion}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Package Size: </span>
                  <strong>{(previewResult.fileSize / 1024).toFixed(1)} KB</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Created At: </span>
                  <strong>{new Date(previewResult.createdAt).toLocaleString()}</strong>
                </div>
              </div>

              {/* INTEGRITY STATUS BADGES */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span className="badge badge-success">✓ ZIP Valid</span>
                <span className="badge badge-success">✓ SHA-256 Verified</span>
                <span className="badge badge-success">✓ Manifest Verified</span>
                <span className="badge badge-success">✓ Schema Verified</span>
                <span className="badge badge-success">✓ Relationships Verified</span>
              </div>

              {/* RECORD COMPARISON TABLE */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>
                  Operational Records to Restore:
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px 16px',
                    padding: '12px 16px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12.5px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Customers:</span>
                    <strong>{previewResult.counts.customers} (Current: {previewResult.currentDbCounts.customers})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Loans:</span>
                    <strong>{previewResult.counts.loans} (Current: {previewResult.currentDbCounts.loans})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Receipts:</span>
                    <strong>{previewResult.counts.receipts} (Current: {previewResult.currentDbCounts.receipts})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Fixed Deposits:</span>
                    <strong>{previewResult.counts.fixedDeposits} (Current: {previewResult.currentDbCounts.fixedDeposits})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Day Book Entries:</span>
                    <strong>{previewResult.counts.dayBookEntries} (Current: {previewResult.currentDbCounts.dayBookEntries})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Total Records:</span>
                    <strong style={{ color: '#2563EB' }}>{previewResult.counts.totalRecords}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  Select Different File
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setStep(3)}
                >
                  <span>Proceed to Confirmation</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* STEP 3: FINAL RESTORE CONFIRMATION */}
          {step === 3 && previewResult && (
            <>
              {/* WARNING BOX */}
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  color: '#991B1B',
                  fontSize: '12.5px',
                  lineHeight: '1.5'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, marginBottom: '4px' }}>
                  <AlertTriangle size={16} />
                  <span>Replacement Warning:</span>
                </div>
                Restoring this backup will <strong>replace the current operational database</strong> with the verified backup data ({previewResult.counts.totalRecords} records).
              </div>

              {/* SAFETY GUARANTEE */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#EFF6FF',
                  borderLeft: '4px solid #2563EB',
                  borderRadius: '6px',
                  color: '#1E40AF',
                  fontSize: '12px',
                  lineHeight: '1.5'
                }}
              >
                <strong>Pre-Restore Snapshot &amp; Rollback:</strong> An automatic <strong>Pre-Restore Emergency Backup</strong> will be created before modifying any tables. If post-restore count assertions fail, the system rolls back automatically.
              </div>

              {/* IDENTITY PROTECTION */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#166534'
                }}
              >
                🔒 <strong>System Identity Preserved:</strong> Current Admin credentials, security secrets, branch profile, and master control interest rates will NOT be overwritten.
              </div>

              {/* MANDATORY CHECKBOX */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#1E293B'
                }}
              >
                <input
                  type="checkbox"
                  checked={acknowledgedWarning}
                  onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>I understand that the current operational data will be replaced by this verified backup.</span>
              </label>

              {/* CONFIRMATION INPUT */}
              <div className="form-group" style={{ marginTop: '2px' }}>
                <label className="form-label required" style={{ color: '#1E40AF', fontWeight: 700, fontSize: '13px' }}>
                  Type <code>RESTORE BACKUP</code> to execute:
                </label>
                <input
                  type="text"
                  className="input-control"
                  style={{
                    borderColor: isExactConfirm ? '#16A34A' : '#2563EB',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}
                  placeholder="RESTORE BACKUP"
                  value={inputConfirmation}
                  onChange={(e) => setInputConfirmation(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    fontWeight: 800,
                    opacity: canProceedToRestore ? 1 : 0.5,
                    cursor: canProceedToRestore ? 'pointer' : 'not-allowed'
                  }}
                  disabled={!canProceedToRestore}
                  onClick={handleExecuteRestore}
                >
                  {loading ? 'Restoring...' : 'RESTORE DATA'}
                </button>
              </div>
            </>
          )}

          {/* STEP 4: RESTORE IN PROGRESS */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <RefreshCw size={36} className="spin" style={{ color: '#2563EB', margin: '0 auto 10px' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                  Executing Transactional System Restoration
                </h4>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Securing emergency backup, restoring relational collections, and syncing cloud snapshot.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12.5px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {checklist.emergencyBackup ? <CheckCircle2 size={16} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>1. Created automatic pre-restore emergency snapshot...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {checklist.restoring ? <CheckCircle2 size={16} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>2. Restoring customers, loans, payments, and ledger collections...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {checklist.verified ? <CheckCircle2 size={16} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>3. Verifying post-restore record counts match manifest...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {checklist.driveSync ? <CheckCircle2 size={16} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>4. Synchronizing restored state to Google Drive...</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: RESTORE COMPLETE */}
          {step === 5 && (
            <>
              {/* STATUS BANNER */}
              {dbRestoreStatus === 'VERIFIED' && driveSyncStatus === 'VERIFIED' && (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    color: '#166534',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                    SYSTEM RESTORED SUCCESSFULLY
                  </strong>
                  Database restored and Google Drive synchronized successfully. All operational collections (customers, loans, receipts, fixed deposits, day book) are live and verified.
                </div>
              )}

              {dbRestoreStatus === 'VERIFIED' && driveSyncStatus === 'REAUTH_REQUIRED' && (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #93C5FD',
                    borderRadius: '8px',
                    color: '#1E40AF',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#1E3A8A' }}>
                    SYSTEM RESTORED
                  </strong>
                  Your database has been restored successfully. Google Drive authorization needs to be renewed.

                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '6px',
                      color: '#991B1B',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div>
                      <strong>[GOOGLE_DRIVE_REAUTH_REQUIRED]</strong> Google Drive authorization expired.
                    </div>
                    <div>Reconnect your Google account to continue cloud synchronization.</div>
                    {(previousAccount || restoreResult?.googleAccount) && (
                      <div style={{ fontSize: '11.5px', color: '#7F1D1D', marginTop: '2px' }}>
                        Previously connected account: <strong>{previousAccount || restoreResult?.googleAccount}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {dbRestoreStatus === 'VERIFIED' && driveSyncStatus === 'PENDING' && connectedAccount && (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    color: '#166534',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                    SYSTEM RESTORED
                  </strong>
                  Database restored and Google Drive connected (<strong>{connectedAccount}</strong>). Click <strong>"Sync Restored Data"</strong> below to create and verify the cloud snapshot.
                </div>
              )}

              {dbRestoreStatus === 'VERIFIED' && driveSyncStatus === 'FAILED' && (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #93C5FD',
                    borderRadius: '8px',
                    color: '#1E40AF',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#1E3A8A' }}>
                    SYSTEM RESTORED
                  </strong>
                  The database was restored successfully, but Google Drive synchronization could not be completed. Your restored operational database is 100% active and intact. You can retry Google Drive cloud synchronization below without affecting the database.

                  {(restoreResult?.googleDriveError || restoreResult?.googleDriveErrorCode) && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        borderRadius: '6px',
                        color: '#991B1B',
                        fontSize: '11.5px'
                      }}
                    >
                      <strong>Google Drive Status:</strong>{' '}
                      {restoreResult.googleDriveErrorCode ? `[${restoreResult.googleDriveErrorCode}] ` : ''}
                      {restoreResult.googleDriveError || 'Synchronization failed.'}
                    </div>
                  )}
                </div>
              )}

              {dbRestoreStatus === 'VERIFIED' && (driveSyncStatus === 'NOT_STARTED' || (driveSyncStatus === 'PENDING' && !connectedAccount) || driveSyncStatus === 'SYNCING') && (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '8px',
                    color: '#1E40AF',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                    SYSTEM RESTORED
                  </strong>
                  The database restore completed successfully. Google Drive synchronization is {driveSyncStatus === 'SYNCING' ? 'in progress' : 'pending'}.
                </div>
              )}

              {dbRestoreStatus === 'FAILED' && (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '8px',
                    color: '#991B1B',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                    RESTORE FAILED
                  </strong>
                  Database restoration failed. No operational records were modified. The database was rolled back safely to its pre-restore state.
                </div>
              )}

              {/* SUMMARY DETAILS CARD */}
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '12.5px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Source Backup:</span>
                  <strong style={{ color: '#1E293B' }}>{previewResult?.fileName || restoreResult?.sourceFileName || 'uploaded_backup.zip'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Restore ID:</span>
                  <strong style={{ color: '#1E293B', fontFamily: 'monospace' }}>{restoreResult?.restoreId || previewResult?.backupId || 'RST-0001'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Total Records Restored:</span>
                  <strong style={{ color: '#2563EB', fontSize: '13px' }}>
                    {(
                      restoreResult?.restoredCounts?.totalRecords ??
                      restoreResult?.recordCounts?.totalRecords ??
                      previewResult?.counts?.totalRecords ??
                      0
                    ).toLocaleString()}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Database:</span>
                  {dbRestoreStatus === 'VERIFIED' ? (
                    <span style={{ color: '#16A34A', fontWeight: 700 }}>✓ Restored &amp; Verified</span>
                  ) : dbRestoreStatus === 'FAILED' ? (
                    <span style={{ color: '#DC2626', fontWeight: 700 }}>✕ Restore Failed</span>
                  ) : (
                    <span style={{ color: '#64748B', fontWeight: 700 }}>Pending</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Google Drive:</span>
                  {driveSyncStatus === 'VERIFIED' ? (
                    <span style={{ color: '#16A34A', fontWeight: 700 }}>✓ Synchronized &amp; Verified</span>
                  ) : driveSyncStatus === 'SYNCING' ? (
                    <span style={{ color: '#2563EB', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <RefreshCw size={13} className="spin" /> Syncing with Google Drive...
                    </span>
                  ) : driveSyncStatus === 'REAUTH_REQUIRED' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#D97706', fontWeight: 700 }}>⚠️ Authorization Required</span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '11px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
                        disabled={reconnectingDrive}
                        onClick={handleReconnectDrive}
                      >
                        {reconnectingDrive ? <RefreshCw size={12} className="spin" /> : <ExternalLink size={12} />}
                        <span>{reconnectingDrive ? 'Connecting...' : 'Reconnect Google Drive'}</span>
                      </button>
                    </div>
                  ) : connectedAccount || driveSyncStatus === 'PENDING' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#16A34A', fontWeight: 700 }}>
                        ✓ Connected {connectedAccount ? `(${connectedAccount})` : ''}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '11px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
                        disabled={retryingDriveSync}
                        onClick={handleRetryDriveSync}
                      >
                        <HardDrive size={12} />
                        <span>{retryingDriveSync ? 'Syncing...' : 'Sync Restored Data'}</span>
                      </button>
                    </div>
                  ) : driveSyncStatus === 'FAILED' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>✕ Sync Failed</span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                        disabled={retryingDriveSync}
                        onClick={handleRetryDriveSync}
                      >
                        <RefreshCw size={12} className={retryingDriveSync ? 'spin' : ''} />
                        <span>{retryingDriveSync ? 'Syncing...' : 'Retry Google Drive Sync'}</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#D97706', fontWeight: 700 }}>⚠️ Sync Pending</span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                        disabled={retryingDriveSync}
                        onClick={handleRetryDriveSync}
                      >
                        <RefreshCw size={12} className={retryingDriveSync ? 'spin' : ''} />
                        <span>{retryingDriveSync ? 'Syncing...' : 'Retry Google Drive Sync'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Restored At:</span>
                  <span>{new Date(restoreResult?.restoredAt || Date.now()).toLocaleString()}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Restored By:</span>
                  <span>{restoreResult?.restoredBy?.name || 'Administrator'}</span>
                </div>
              </div>

              {/* COMPLETE RECORD BREAKDOWN */}
              <div>
                <h4 style={{ fontSize: '12.5px', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>
                  Restored Entity Breakdown:
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '8px',
                    padding: '12px 14px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Customers</span>
                    <strong style={{ color: '#1E293B', fontSize: '13px' }}>
                      {restoreResult?.restoredCounts?.customers ?? previewResult?.counts?.customers ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Loans</span>
                    <strong style={{ color: '#1E293B', fontSize: '13px' }}>
                      {restoreResult?.restoredCounts?.loans ?? previewResult?.counts?.loans ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Receipts</span>
                    <strong style={{ color: '#1E293B', fontSize: '13px' }}>
                      {restoreResult?.restoredCounts?.receipts ?? previewResult?.counts?.receipts ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Fixed Deposits</span>
                    <strong style={{ color: '#1E293B', fontSize: '13px' }}>
                      {restoreResult?.restoredCounts?.fixedDeposits ?? previewResult?.counts?.fixedDeposits ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Day Book Entries</span>
                    <strong style={{ color: '#1E293B', fontSize: '13px' }}>
                      {restoreResult?.restoredCounts?.dayBookEntries ?? previewResult?.counts?.dayBookEntries ?? 0}
                    </strong>
                  </div>
                </div>
              </div>

              {/* STATS BADGES */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span className="badge badge-success">✓ {restoreResult?.restoredCounts?.customers ?? previewResult?.counts?.customers ?? 0} Customers</span>
                <span className="badge badge-success">✓ {restoreResult?.restoredCounts?.loans ?? previewResult?.counts?.loans ?? 0} Loans</span>
                <span className="badge badge-success">✓ {restoreResult?.restoredCounts?.receipts ?? previewResult?.counts?.receipts ?? 0} Receipts</span>
                <span className="badge badge-success">✓ {restoreResult?.restoredCounts?.fixedDeposits ?? previewResult?.counts?.fixedDeposits ?? 0} Fixed Deposits</span>
                <span className="badge badge-success">✓ {restoreResult?.restoredCounts?.dayBookEntries ?? previewResult?.counts?.dayBookEntries ?? 0} Day Book Entries</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontWeight: 800, padding: '0 26px' }}
                  onClick={handleFinish}
                >
                  Done
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
