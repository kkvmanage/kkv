import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Download,
  Send,
  RefreshCw,
  HardDrive,
  FileArchive,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { apiService } from '../services/api';
import { WipeAllDataModal } from '../components/admin/WipeAllDataModal';
import { SystemRestoreModal } from '../components/admin/SystemRestoreModal';

export const BackupRestore: React.FC = () => {
  const {
    loans,
    customers,
    receipts,
    fixedDeposits,
    dayBookEntries,
    telegramConfig,
    updateTelegramConfig,
    showToast,
    resetAllData
  } = useApp();

  const [botToken, setBotToken] = useState(telegramConfig.botToken || '');
  const [chatId, setChatId] = useState(telegramConfig.chatId || '');
  const [autoBackupOnOpen, setAutoBackupOnOpen] = useState(telegramConfig.autoBackupOnOpen || false);

  const [driveHealth, setDriveHealth] = useState<{
    loaded: boolean;
    success: boolean;
    authType: string;
    googlePrincipal: string;
    googleAccount?: string;
    folderName?: string;
    canUpload?: boolean;
    message?: string;
    errorCode?: string;
  }>({
    loaded: false,
    success: false,
    authType: 'NONE',
    googlePrincipal: ''
  });
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [disconnectingDrive, setDisconnectingDrive] = useState(false);

  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Restore History
  const [restoreHistory, setRestoreHistory] = useState<any[]>([]);
  const [loadingRestoreHistory, setLoadingRestoreHistory] = useState(false);
  const [retryingRestoreId, setRetryingRestoreId] = useState<string | null>(null);

  // Modals
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  useEffect(() => {
    // Check URL search params for OAuth redirect feedback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('drive_connected') === 'true') {
      showToast('Google Drive successfully connected and authorized via OAuth 2.0!', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('drive_error')) {
      showToast('Google Drive authorization failed. Please try reconnecting.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadDriveHealth();
    loadHistory();
    loadRestoreHistory();
  }, []);

  useEffect(() => {
    setBotToken(telegramConfig.botToken || '');
    setChatId(telegramConfig.chatId || '');
    setAutoBackupOnOpen(telegramConfig.autoBackupOnOpen || false);
  }, [telegramConfig]);

  const loadDriveHealth = async () => {
    try {
      const res = await apiService.getDriveHealth();
      setDriveHealth({
        loaded: true,
        success: res.success,
        authType: res.authType || 'NONE',
        googlePrincipal: res.googlePrincipal || res.googleAccount || '',
        googleAccount: res.googleAccount || res.googlePrincipal || '',
        folderName: res.folderName || 'KKV_GOLD_FINANCE',
        canUpload: res.canUpload,
        message: res.message,
        errorCode: res.errorCode
      });
    } catch {
      setDriveHealth({
        loaded: true,
        success: false,
        authType: 'NONE',
        googlePrincipal: '',
        googleAccount: ''
      });
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiService.getBackupHistory();
      if (res.success && Array.isArray(res.data)) {
        setBackupHistory(res.data);
      }
    } catch (err) {
      console.warn('Failed to load backup history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadRestoreHistory = async () => {
    setLoadingRestoreHistory(true);
    try {
      const res = await apiService.getRestoreHistory();
      if (res.success && Array.isArray(res.data)) {
        setRestoreHistory(res.data);
      }
    } catch (err) {
      console.warn('Failed to load restore history:', err);
    } finally {
      setLoadingRestoreHistory(false);
    }
  };

  const handleConnectDrive = async () => {
    setConnectingDrive(true);
    try {
      const res = await apiService.getGoogleDriveAuthUrl();
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        showToast(res.message || 'Failed to initiate Google OAuth login.', 'error');
        setConnectingDrive(false);
      }
    } catch (err: any) {
      showToast(`Connection error: ${err?.message || err}`, 'error');
      setConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Drive? Cloud backups will be paused.')) {
      return;
    }
    setDisconnectingDrive(true);
    try {
      const res = await apiService.disconnectGoogleDrive();
      if (res.success) {
        showToast('Google Drive disconnected successfully.', 'info');
        loadDriveHealth();
      } else {
        showToast(res.message || 'Failed to disconnect Google Drive.', 'error');
      }
    } catch (err: any) {
      showToast(`Disconnect error: ${err?.message || err}`, 'error');
    } finally {
      setDisconnectingDrive(false);
    }
  };

  const handleCreateFullBackup = async () => {
    setCreatingBackup(true);
    showToast('Generating complete portable backup package (.ZIP)...', 'info');
    try {
      const res = await apiService.createBackupPackage();
      if (res.success && res.data) {
        showToast('Backup package created and verified successfully!', 'success');
        loadHistory();
      } else {
        showToast(res.message || 'Failed to create backup package', 'error');
      }
    } catch (err: any) {
      showToast(`Backup error: ${err.message}`, 'error');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleUploadBackupToDrive = async (backupId: string) => {
    showToast('Uploading backup package to Google Drive...', 'info');
    try {
      const res = await apiService.uploadBackupToDrive(backupId);
      if (res.success) {
        showToast('Backup package verified in Google Drive!', 'success');
        loadHistory();
      } else {
        showToast(res.message || 'Failed to upload to Google Drive', 'error');
      }
    } catch (err: any) {
      showToast(`Drive upload failed: ${err.message}`, 'error');
    }
  };

  const handleRetryRestoreDriveSync = async (restoreId: string) => {
    setRetryingRestoreId(restoreId);
    showToast('Retrying Google Drive synchronization...', 'info');
    try {
      const res = await apiService.retryRestoreDriveSync(restoreId);
      if (res.success) {
        showToast('Restored state synchronized with Google Drive!', 'success');
        loadRestoreHistory();
      } else {
        showToast(res.message || 'Drive sync retry failed.', 'error');
      }
    } catch (err: any) {
      showToast(`Sync error: ${err.message}`, 'error');
    } finally {
      setRetryingRestoreId(null);
    }
  };

  const handleTestTelegram = async () => {
    try {
      await apiService.updateTelegramConfig({ botToken, chatId, autoBackupOnOpen });
      updateTelegramConfig({ botToken, chatId, autoBackupOnOpen });
      showToast('Sending test message to Telegram...', 'info');
      const res = await apiService.testTelegram();
      if (res.success) {
        showToast('Telegram test message sent successfully!', 'success');
      } else {
        showToast(`Telegram test failed: ${res.message || 'unknown error'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Telegram connection failed: ${err.message}`, 'error');
    }
  };

  const handleSaveTelegram = async () => {
    try {
      await apiService.updateTelegramConfig({ botToken, chatId, autoBackupOnOpen });
      updateTelegramConfig({ botToken, chatId, autoBackupOnOpen });
      showToast('Telegram settings saved & synchronized!', 'success');
    } catch (err: any) {
      showToast(`Failed to save config: ${err.message}`, 'error');
    }
  };

  const totalRecords = customers.length + loans.length + receipts.length + fixedDeposits.length + dayBookEntries.length;

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* TOP STATUS CARDS */}
      <div className="grid-3" style={{ gap: '16px' }}>
        {/* CARD 1: DATABASE STATUS */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Operational Database
            </span>
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> Active
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalRecords.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Records</span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {customers.length} Customers • {loans.length} Loans • {receipts.length} Receipts
          </p>
        </div>

        {/* CARD 2: BACKUP ARCHIVE STATUS */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Local Backup Archives
            </span>
            <FileArchive size={16} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {backupHistory.length} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Packages</span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {backupHistory.length > 0
              ? `Latest: ${new Date(backupHistory[0].createdAt).toLocaleDateString()}`
              : 'No backups generated yet'}
          </p>
        </div>

        {/* CARD 3: GOOGLE DRIVE STATUS */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Google Drive Cloud
            </span>
            <HardDrive size={16} color={driveHealth.success ? '#16A34A' : '#D97706'} />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: driveHealth.success ? '#166534' : '#B45309' }}>
            {driveHealth.success ? 'Connected & Authorized' : 'OAuth Connection Needed'}
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {driveHealth.success
              ? `Account: ${driveHealth.googleAccount || 'Connected User'}`
              : 'Connect via OAuth 2.0 to enable cloud sync'}
          </p>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid-2" style={{ gap: '20px' }}>

        {/* LEFT COLUMN: BACKUP MANAGEMENT & RESTORE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* CREATE BACKUP CARD */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '17px', fontWeight: 800 }}>
                  Create Complete Backup Package
                </h3>
                <p className="card-description">
                  Generates an encrypted, portable ZIP archive with JSON snapshot, CSV exports, manifest, and SHA-256 checksums.
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--bg-surface-secondary, #F8FAFC)',
                border: '1px solid var(--border-light, #E2E8F0)',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '12.5px'
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Included in Backup Archive:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                <li>Authoritative database snapshot (<code>snapshot.json</code>)</li>
                <li>Individual entity CSV exports (<code>data/*.csv</code>)</li>
                <li>Cryptographic integrity manifest (<code>manifest.json</code> &amp; <code>SHA256SUMS.txt</code>)</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={creatingBackup}
                onClick={handleCreateFullBackup}
              >
                {creatingBackup ? <RefreshCw size={16} className="spin" /> : <FileArchive size={16} />}
                <span>{creatingBackup ? 'Creating Package...' : 'Create Backup Package (.ZIP)'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setShowRestoreModal(true)}
              >
                <RotateCcw size={15} />
                <span>Restore From Backup</span>
              </button>
            </div>
          </div>

          {/* BACKUP HISTORY TABLE */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '17px', fontWeight: 800 }}>
                  Backup History &amp; Downloads
                </h3>
                <p className="card-description">
                  Verified server archives available for download or cloud upload.
                </p>
              </div>
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                <span>Loading backup history...</span>
              </div>
            ) : backupHistory.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  backgroundColor: 'var(--bg-surface-secondary, #F8FAFC)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  color: 'var(--text-muted)',
                  fontSize: '13px'
                }}
              >
                No backup packages generated yet. Click "Create Backup Package" above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {backupHistory.map((b) => (
                  <div
                    key={b.backupId}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-surface-secondary, #F8FAFC)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '13px' }}>
                        {b.fileName}
                      </strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        {(b.fileSize / 1024).toFixed(1)} KB • {b.recordCounts?.totalRecords || '...'} Records • Created {new Date(b.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a
                        href={apiService.getBackupDownloadUrl(b.backupId)}
                        download={b.fileName}
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '11.5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>

                      {!b.googleDriveUploaded && driveHealth.success && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '11.5px' }}
                          onClick={() => handleUploadBackupToDrive(b.backupId)}
                        >
                          <HardDrive size={13} />
                          <span>To Drive</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RESTORE HISTORY TABLE */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '17px', fontWeight: 800 }}>
                  System Restore History
                </h3>
                <p className="card-description">
                  Audited historical restore operations and cloud synchronization status.
                </p>
              </div>
            </div>

            {loadingRestoreHistory ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                <span>Loading restore history...</span>
              </div>
            ) : restoreHistory.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  backgroundColor: 'var(--bg-surface-secondary, #F8FAFC)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light, #E2E8F0)',
                  color: 'var(--text-muted)',
                  fontSize: '12.5px'
                }}
              >
                No historical restore operations logged.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                {restoreHistory.map((r) => (
                  <div
                    key={r.restoreId}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-surface-secondary, #F8FAFC)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '12.5px' }}>
                          {r.sourceFileName || r.backupId}
                        </strong>
                        <span className="badge badge-success" style={{ fontSize: '10px' }}>
                          ✓ {r.databaseStatus}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                        Restored by {r.restoredBy?.name || 'Admin'} on {new Date(r.restoredAt).toLocaleString()} ({r.restoredCounts?.totalRecords || 0} Records)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {r.googleDriveSync === 'VERIFIED' ? (
                        <span className="badge badge-success" style={{ fontSize: '11px' }}>
                          ✓ Cloud Synced
                        </span>
                      ) : !driveHealth.success || driveHealth.errorCode === 'GOOGLE_DRIVE_REAUTH_REQUIRED' ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          disabled={connectingDrive}
                          onClick={handleConnectDrive}
                        >
                          <ExternalLink size={12} />
                          <span>Reconnect Drive</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 10px', color: '#1E40AF', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          disabled={retryingRestoreId === r.restoreId}
                          onClick={() => handleRetryRestoreDriveSync(r.restoreId)}
                        >
                          <RefreshCw size={12} className={retryingRestoreId === r.restoreId ? 'spin' : ''} />
                          <span>{retryingRestoreId === r.restoreId ? 'Syncing...' : 'Sync Restored Data'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: GOOGLE DRIVE OAUTH + TELEGRAM + DANGER ZONE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* GOOGLE DRIVE OAUTH MANAGEMENT CARD */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '17px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HardDrive size={18} color="#2563EB" />
                  <span>Google Drive Cloud Storage</span>
                </h3>
                <p className="card-description">
                  Connect your Personal Google Drive via OAuth 2.0 to automate offsite cloud backups.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {driveHealth.success ? (
                /* CONNECTED STATE */
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '12.5px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#166534' }}>Connection Status:</span>
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Connected &amp; Authorized
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#4B5563' }}>Authorized Account: </span>
                    <strong style={{ color: '#1E293B' }}>{driveHealth.googleAccount || 'Authorized Google User'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#4B5563' }}>Destination: </span>
                    <code style={{ fontSize: '11px', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                      {driveHealth.folderName || 'KKV_GOLD_FINANCE'} / Backups / Full_System_Backups
                    </code>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      disabled={connectingDrive}
                      onClick={handleConnectDrive}
                    >
                      <ExternalLink size={13} />
                      <span>{connectingDrive ? 'Connecting...' : 'Reconnect Account'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn"
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        backgroundColor: '#FEF2F2',
                        color: '#991B1B',
                        border: '1px solid #FCA5A5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      disabled={disconnectingDrive}
                      onClick={handleDisconnectDrive}
                    >
                      <LogOut size={13} />
                      <span>{disconnectingDrive ? 'Disconnecting...' : 'Disconnect'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* DISCONNECTED STATE */
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    fontSize: '12.5px'
                  }}
                >
                  <div style={{ color: '#475569', lineHeight: '1.5' }}>
                    <strong>Google Drive Not Connected:</strong> Connect your personal Google account via OAuth 2.0 to enable automatic cloud backup storage. Your local database remains 100% safe.
                  </div>

                  {driveHealth.errorCode === 'GOOGLE_DRIVE_REAUTH_REQUIRED' && (
                    <div style={{ padding: '8px 12px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '6px', color: '#92400E', fontSize: '12px' }}>
                      ⚠️ <strong>Re-authentication Required:</strong> Your previous Google authorization has expired. Please reconnect below.
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 16px'
                    }}
                    disabled={connectingDrive}
                    onClick={handleConnectDrive}
                  >
                    <HardDrive size={16} />
                    <span>{connectingDrive ? 'Connecting to Google...' : 'Connect Google Drive'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TELEGRAM SETUP */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '17px', fontWeight: 800 }}>Telegram Auto-Backup</h3>
                <p className="card-description">Dispatches daily database snapshots automatically to your Telegram channel.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Bot Token:</label>
                <input
                  type="password"
                  className="input-control"
                  placeholder="123456:ABC-DEF..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Chat ID:</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="-100123456789"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Auto-backup on application start
                </span>
                <input
                  type="checkbox"
                  checked={autoBackupOnOpen}
                  onChange={(e) => setAutoBackupOnOpen(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleTestTelegram}>
                  <Send size={14} />
                  <span>Test Message</span>
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveTelegram}>
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* DANGER ZONE: WIPE ALL DATA */}
          <div
            className="card"
            style={{
              padding: '24px',
              border: '1px solid #FCA5A5',
              backgroundColor: '#FEF2F2'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: '#991B1B' }}>
              <AlertTriangle size={20} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Danger Zone</h3>
            </div>
            <p style={{ fontSize: '12.5px', color: '#7F1D1D', lineHeight: '1.5', margin: '0 0 16px' }}>
              Wipes all operational customer, loan, payment, receipt, and ledger records. Requires creating, downloading, and acknowledging a complete verified backup before destruction.
            </p>

            <button
              type="button"
              className="btn"
              style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => setShowWipeModal(true)}
            >
              <AlertTriangle size={16} />
              <span>Wipe All Operational Data</span>
            </button>
          </div>

        </div>

      </div>

      {/* FAIL-SAFE WIPE ALL DATA MODAL */}
      <WipeAllDataModal
        isOpen={showWipeModal}
        onClose={() => setShowWipeModal(false)}
        onSuccessReset={() => {
          resetAllData();
          loadHistory();
          loadRestoreHistory();
        }}
        onOpenRestore={() => setShowRestoreModal(true)}
      />

      {/* FAIL-SAFE SYSTEM RESTORE MODAL */}
      <SystemRestoreModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onSuccessReload={() => {
          resetAllData();
          loadHistory();
          loadRestoreHistory();
        }}
      />

    </div>
  );
};
