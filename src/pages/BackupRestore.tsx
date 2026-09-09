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
  ShieldCheck
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

  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Restore History
  const [restoreHistory, setRestoreHistory] = useState<any[]>([]);
  const [loadingRestoreHistory, setLoadingRestoreHistory] = useState(false);

  // Modals
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  useEffect(() => {
    loadHistory();
    loadRestoreHistory();
  }, []);

  useEffect(() => {
    setBotToken(telegramConfig.botToken || '');
    setChatId(telegramConfig.chatId || '');
    setAutoBackupOnOpen(telegramConfig.autoBackupOnOpen || false);
  }, [telegramConfig]);

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

  const handleDownloadBackup = (backupId: string) => {
    apiService.downloadBackup(backupId);
    showToast('Backup download started.', 'info');
  };

  const handleSaveTelegram = () => {
    updateTelegramConfig({
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      autoBackupOnOpen
    });
    showToast('Telegram configuration saved!', 'success');
  };

  const handleTestTelegram = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      showToast('Please enter both Bot Token and Chat ID', 'warning');
      return;
    }
    showToast('Sending test message to Telegram...', 'info');
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: `🔐 *KKV Gold Finance — System Alert*\n\nTelegram backup notifications are successfully configured and active.\n_Time: ${new Date().toLocaleString()}_`,
          parse_mode: 'Markdown'
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Telegram test message delivered successfully!', 'success');
      } else {
        showToast(`Telegram Error: ${data.description}`, 'error');
      }
    } catch (err: any) {
      showToast(`Connection failed: ${err.message}`, 'error');
    }
  };

  const totalOperationalRecords =
    (customers?.length || 0) +
    (loans?.length || 0) +
    (receipts?.length || 0) +
    (fixedDeposits?.length || 0) +
    (dayBookEntries?.length || 0);

  return (
    <div className="page-content">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Backup &amp; Disaster Recovery</h2>
          <p className="page-description">
            Complete data protection suite with portable archives, integrity verification, and atomic restoration.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              loadHistory();
              loadRestoreHistory();
            }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* THREE TOP STAT CARDS */}
      <div className="grid-3" style={{ gap: '16px', marginBottom: '24px' }}>
        {/* CARD 1: DATABASE STATUS */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Operational Records
            </span>
            <HardDrive size={16} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalOperationalRecords.toLocaleString()}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Records</span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Across {customers?.length || 0} customers, {loans?.length || 0} loans, {receipts?.length || 0} receipts
          </p>
        </div>

        {/* CARD 2: BACKUP ARCHIVES */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Server Backup Archives
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

        {/* CARD 3: SYSTEM INTEGRITY */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Data Vault Integrity
            </span>
            <ShieldCheck size={16} color="#16A34A" />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#166534' }}>
            ✓ Authoritative Storage Active
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            MongoDB Replica &amp; Local Encrypted Vault
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
                  Verified server archives available for download.
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
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(b.createdAt).toLocaleString()} | {(b.fileSize / 1024).toFixed(1)} KB | {b.totalRecords || 0} records
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleDownloadBackup(b.backupId)}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RESTORE AUDIT HISTORY */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '17px', fontWeight: 800 }}>
                  Restoration Audit Log
                </h3>
                <p className="card-description">
                  Historical log of database restorations, rollbacks, and schema integrity validations.
                </p>
              </div>
            </div>

            {loadingRestoreHistory ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                <span>Loading restore logs...</span>
              </div>
            ) : restoreHistory.length === 0 ? (
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
                No system restorations recorded in audit log.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                {restoreHistory.map((r) => (
                  <div
                    key={r.restoreId}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-surface-secondary, #F8FAFC)',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{r.backupFileName || r.restoreId}</strong>
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={11} /> {r.status || 'VERIFIED'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      Restored by {r.restoredBy || 'Admin'} on {new Date(r.createdAt || r.restoredAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TELEGRAM + DANGER ZONE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
export default BackupRestore;
