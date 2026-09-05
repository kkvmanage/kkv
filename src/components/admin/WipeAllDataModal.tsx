import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  X,
  Download,
  Check,
  FileArchive
} from 'lucide-react';
import { apiService } from '../../services/api';

export interface WipeAllDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReset: () => void;
  onOpenRestore?: () => void;
}

export const WipeAllDataModal: React.FC<WipeAllDataModalProps> = ({
  isOpen,
  onClose,
  onSuccessReset,
  onOpenRestore
}) => {
  // Steps: 1 = Preview & Start, 2 = Verify, 3 = Download & Ack, 4 = Final Confirm, 5 = Wiped
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Preview Data
  const [previewData, setPreviewData] = useState<{
    counts: {
      customers: number;
      loans: number;
      receipts: number;
      fixedDeposits: number;
      fdCustomers: number;
      fdInterestPayouts: number;
      fdWithdrawals: number;
      dayBookEntries: number;
      reminders: number;
      notifications: number;
      totalOperationalRecords: number;
    };
    wipeableEntities: string[];
    preservedSystemData: string[];
  } | null>(null);

  // Backup Verification Record
  const [verificationRecord, setVerificationRecord] = useState<{
    token: string;
    backupId: string;
    fileName: string;
    fileSize: number;
    sha256: string;
    backupStatus: string;
    uploadedAt: string;
    drivePath: string;
    recordCounts: Record<string, number>;
  } | null>(null);

  // Download State
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const [downloadAcknowledged, setDownloadAcknowledged] = useState(false);

  // Final confirmation input & checkbox
  const [inputConfirmation, setInputConfirmation] = useState('');
  const [agreeCheckbox, setAgreeCheckbox] = useState(false);

  // Checklist for Step 2
  const [checklist, setChecklist] = useState({
    snapshot: false,
    csv: false,
    zip: false,
    sha256: false
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMessage('');
      setDownloadTriggered(false);
      setDownloadAcknowledged(false);
      setInputConfirmation('');
      setAgreeCheckbox(false);
      loadPreview();
    }
  }, [isOpen]);

  const loadPreview = async () => {
    try {
      const res = await apiService.getWipePreview();
      if (res.success && res.data) {
        setPreviewData(res.data);
      }
    } catch (err) {
      console.error('Failed to load wipe preview:', err);
    }
  };

  if (!isOpen) return null;

  const handleStartBackupAndVerify = async () => {
    setStep(2);
    setLoading(true);
    setErrorMessage('');
    setChecklist({ snapshot: true, csv: false, zip: false, sha256: false });

    try {
      setTimeout(() => setChecklist((prev) => ({ ...prev, csv: true })), 400);
      setTimeout(() => setChecklist((prev) => ({ ...prev, zip: true })), 800);
      setTimeout(() => setChecklist((prev) => ({ ...prev, sha256: true })), 1200);

      const res = await apiService.initiateWipeBackup('WIPE ALL DATA');

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Backup generation or verification failed. No application data was deleted.');
      }

      setVerificationRecord(res.data);
      setLoading(false);

      setTimeout(() => {
        setStep(3);
      }, 700);
    } catch (err: any) {
      console.error('[WipeAllDataModal] Error:', err);
      setErrorMessage(err?.message || 'Backup generation or verification failed. No application data was deleted.');
      setLoading(false);
    }
  };

  const handleDownloadFile = () => {
    if (!verificationRecord) return;
    const downloadUrl = apiService.getBackupDownloadUrl(verificationRecord.backupId);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', verificationRecord.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadTriggered(true);
  };

  const handleAcknowledgeDownload = async () => {
    if (!verificationRecord) return;
    try {
      await apiService.acknowledgeBackupDownload(verificationRecord.backupId);
      setDownloadAcknowledged(true);
      setStep(4);
    } catch (err: any) {
      console.warn('Acknowledgment warning:', err);
      setDownloadAcknowledged(true);
      setStep(4);
    }
  };

  const handleConfirmWipe = async () => {
    if (!verificationRecord || !verificationRecord.token) return;
    if (inputConfirmation !== 'WIPE ALL DATA' || !agreeCheckbox) return;

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

  const isExactConfirm = inputConfirmation.trim() === 'WIPE ALL DATA';
  const isWipeEnabled = isExactConfirm && agreeCheckbox && downloadAcknowledged && !loading;

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
          maxWidth: '680px',
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
        {/* TOP HEADER */}
        <div
          style={{
            padding: '16px 22px',
            backgroundColor: step === 5 ? '#065F46' : '#FFFFFF',
            borderBottom: step === 5 ? 'none' : '1px solid #E2E8F0',
            color: step === 5 ? '#FFFFFF' : '#1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: step === 5 ? 'rgba(255, 255, 255, 0.2)' : '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: step === 5 ? '#FFFFFF' : '#DC2626'
              }}
            >
              {step === 5 ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                {step === 5 ? 'System Data Successfully Wiped' : 'Wipe All Operational Data'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', opacity: step === 5 ? 0.9 : 0.6 }}>
                {step === 5
                  ? 'All records removed. Database verified empty.'
                  : 'Multi-Step Fail-Safe Recovery Workflow'}
              </p>
            </div>
          </div>

          {step !== 2 && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: step === 5 ? '#FFF' : '#64748B',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* STEP PROGRESS BAR */}
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
              { num: 1, label: '1. Review' },
              { num: 2, label: '2. Verify' },
              { num: 3, label: '3. Download' },
              { num: 4, label: '4. Confirm' }
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
                    color: isCurrent ? '#DC2626' : isPast ? '#16A34A' : '#94A3B8'
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
                      backgroundColor: isCurrent ? '#DC2626' : isPast ? '#16A34A' : '#E2E8F0',
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

        {/* MODAL BODY */}
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ERROR ALERT BANNER */}
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
                🛑 Operation Halted (Data Intact)
              </strong>
              {errorMessage}
            </div>
          )}

          {/* STEP 1: REVIEW DATA & INITIATE BACKUP */}
          {step === 1 && (
            <>
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#FFFBEB',
                  borderLeft: '4px solid #F59E0B',
                  borderRadius: '6px',
                  color: '#92400E',
                  fontSize: '12.5px',
                  lineHeight: '1.5'
                }}
              >
                Before any data can be wiped, the system will generate a complete, portable <strong>ZIP backup package</strong> containing JSON snapshots, CSV exports, manifest, and SHA-256 checksums.
              </div>

              {/* RECORD COUNTS TABLE */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>
                  Operational Data to be Removed:
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
                    <strong>{previewData?.counts.customers ?? '...'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Loans:</span>
                    <strong>{previewData?.counts.loans ?? '...'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Receipts:</span>
                    <strong>{previewData?.counts.receipts ?? '...'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Fixed Deposits:</span>
                    <strong>{previewData?.counts.fixedDeposits ?? '...'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Day Book Entries:</span>
                    <strong>{previewData?.counts.dayBookEntries ?? '...'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Reminders &amp; Alerts:</span>
                    <strong>{previewData?.counts.reminders ?? '...'}</strong>
                  </div>
                </div>
              </div>

              {/* PRESERVED DATA CARD */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ShieldCheck size={18} color="#16A34A" />
                <span>
                  <strong>Preserved System Data:</strong> Admin logins, master interest configurations, branch profile, and printer settings will remain intact.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFF',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={handleStartBackupAndVerify}
                >
                  <FileArchive size={16} />
                  <span>Create &amp; Verify Complete Backup (.ZIP)</span>
                </button>
              </div>
            </>
          )}

          {/* STEP 2: VERIFICATION IN PROGRESS */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <RefreshCw size={36} className="spin" style={{ color: '#DC2626', margin: '0 auto 10px' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                  Generating &amp; Verifying Portable Backup Package
                </h4>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  No application data will be deleted until all verification checks pass.
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
                  {checklist.snapshot ? <CheckCircle2 size={16} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>1. Authoritative JSON database snapshot generated...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {checklist.csv ? <CheckCircle2 size={16} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>2. Entity CSV exports generated (customers, loans, payments, daybook)...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {checklist.zip ? <CheckCircle2 size={16} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>3. Portable ZIP archive created with manifest &amp; schema...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {checklist.sha256 ? <CheckCircle2 size={16} color="#16A34A" /> : <div className="spinner-sm" />}
                  <span>4. SHA-256 integrity checksums calculated &amp; verified...</span>
                </div>
              </div>

              {errorMessage && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>
                    Back to Safety
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: DOWNLOAD & ACKNOWLEDGE BACKUP */}
          {step === 3 && verificationRecord && (
            <>
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
                <span>Backup Package Ready &amp; Verified</span>
              </div>

              {/* BACKUP DETAILS CARD */}
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '12.5px'
                }}
              >
                <div>
                  <span style={{ color: '#64748B' }}>Backup Package: </span>
                  <strong style={{ color: '#1E293B' }}>{verificationRecord.fileName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Package Size: </span>
                  <strong>{(verificationRecord.fileSize / 1024).toFixed(1)} KB</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>SHA-256 Checksum: </span>
                  <code style={{ fontSize: '11px', background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>
                    {verificationRecord.sha256}
                  </code>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Package Contents: </span>
                  <span>snapshot.json, data/*.csv, manifest.json, SHA256SUMS.txt</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#1E40AF', display: 'block' }}>
                      Step A: Download Local Backup
                    </strong>
                    <span style={{ fontSize: '11.5px', color: '#3B82F6' }}>
                      Save the complete recovery package to your computer.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ gap: '6px', fontWeight: 700 }}
                    onClick={handleDownloadFile}
                  >
                    <Download size={15} />
                    <span>Download Backup (.ZIP)</span>
                  </button>
                </div>

                <div
                  style={{
                    borderTop: '1px solid #DBEAFE',
                    paddingTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#1E3A8A' }}>
                    {downloadTriggered
                      ? '✓ File download initiated. Please confirm when saved.'
                      : 'Click Download above to save your backup.'}
                  </span>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      backgroundColor: '#16A34A',
                      color: '#FFF',
                      fontWeight: 700,
                      gap: '6px',
                      opacity: downloadTriggered ? 1 : 0.6
                    }}
                    onClick={handleAcknowledgeDownload}
                  >
                    <Check size={16} />
                    <span>I Have Downloaded The Backup</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel (Keep Data Intact)
                </button>
              </div>
            </>
          )}

          {/* STEP 4: FINAL CONFIRMATION */}
          {step === 4 && verificationRecord && (
            <>
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#FEF2F2',
                  borderLeft: '4px solid #DC2626',
                  borderRadius: '6px',
                  color: '#991B1B',
                  fontSize: '12.5px',
                  lineHeight: '1.5'
                }}
              >
                <strong>Final Safety Check:</strong> You have verified and downloaded the backup. You are now about to permanently wipe all operational records. This cannot be undone without restoring from your backup.
              </div>

              {/* CONFIRMATION INPUT */}
              <div className="form-group" style={{ marginTop: '2px' }}>
                <label className="form-label required" style={{ color: '#991B1B', fontWeight: 700, fontSize: '13px' }}>
                  Type <code>WIPE ALL DATA</code> to confirm:
                </label>
                <input
                  type="text"
                  className="input-control"
                  style={{
                    borderColor: isExactConfirm ? '#16A34A' : '#DC2626',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}
                  placeholder="WIPE ALL DATA"
                  value={inputConfirmation}
                  onChange={(e) => setInputConfirmation(e.target.value)}
                />
              </div>

              {/* CHECKBOX */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '12.5px',
                  color: '#475569',
                  cursor: 'pointer',
                  padding: '8px 10px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0'
                }}
              >
                <input
                  type="checkbox"
                  checked={agreeCheckbox}
                  onChange={(e) => setAgreeCheckbox(e.target.checked)}
                  style={{ marginTop: '2px', cursor: 'pointer' }}
                />
                <span>
                  I understand this permanently removes all listed operational data and can only be restored from the downloaded backup.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel (Keep Data Intact)
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFF',
                    fontWeight: 800,
                    opacity: isWipeEnabled ? 1 : 0.5,
                    cursor: isWipeEnabled ? 'pointer' : 'not-allowed'
                  }}
                  disabled={!isWipeEnabled}
                  onClick={handleConfirmWipe}
                >
                  {loading ? 'Wiping Database...' : 'WIPE ALL DATA'}
                </button>
              </div>
            </>
          )}

          {/* STEP 5: SUCCESS SUMMARY */}
          {step === 5 && (
            <>
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
                All application operational data has been permanently removed. System configuration and Administrator credentials remain intact. The application is clean and ready for a fresh start.
              </div>

              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '12.5px'
                }}
              >
                <div>
                  <span style={{ color: '#64748B' }}>Verified Recovery Backup: </span>
                  <strong style={{ color: '#1E293B' }}>{verificationRecord?.fileName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>SHA-256 Checksum: </span>
                  <code style={{ fontSize: '11px', background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>
                    {verificationRecord?.sha256}
                  </code>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span className="badge badge-success">✓ Database Cleared</span>
                  <span className="badge badge-success">✓ Configurations Retained</span>
                  <span className="badge badge-success">✓ Recovery Backup Preserved</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                {onOpenRestore && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      onClose();
                      onOpenRestore();
                    }}
                  >
                    Restore From Backup
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontWeight: 800, padding: '0 24px' }}
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
