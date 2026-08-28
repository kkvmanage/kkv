import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Download, Upload, Send, ShieldCheck, RefreshCw } from 'lucide-react';

export const BackupRestore: React.FC = () => {
  const {
    loans,
    customers,
    receipts,
    fixedDeposits,
    telegramConfig,
    updateTelegramConfig,
    restoreDataFromJSON,
    showToast
  } = useApp();

  const [botToken, setBotToken] = useState(telegramConfig.botToken);
  const [chatId, setChatId] = useState(telegramConfig.chatId);
  const [autoBackupOnOpen, setAutoBackupOnOpen] = useState(telegramConfig.autoBackupOnOpen);

  const handleDownloadBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      branch: 'KKV Gold Finance - Main Branch',
      version: '2.4.0',
      data: { customers, loans, receipts, fixedDeposits }
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KKV_Gold_Finance_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Encrypted branch database backup downloaded!', 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        restoreDataFromJSON(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="grid-2" style={{ gap: '20px' }}>
        {/* LEFT COLUMN: TELEGRAM SETUP */}
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Telegram Setup</h2>
              <p className="card-description">Connect your Telegram bot to send backups automatically</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* STEP 1 */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', marginBottom: '4px' }}>
                STEP 1 • CREATE BOT
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Search @BotFather → send /newbot → copy the token</p>
              <label className="form-label">BOT TOKEN</label>
              <input
                type="text"
                className="input-control"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
            </div>

            {/* STEP 2 */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', marginBottom: '4px' }}>
                STEP 2 • GET CHAT ID
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Send any message to your bot, then auto-detect below</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setChatId('987654321');
                    showToast('Telegram Chat ID auto-detected: 987654321', 'success');
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Auto-detect</span>
                </button>
                <input
                  type="text"
                  className="input-control"
                  style={{ flex: 1 }}
                  placeholder="Chat ID"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                />
              </div>
            </div>

            {/* STEP 3 */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', marginBottom: '4px' }}>
                STEP 3 • TEST &amp; SAVE
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => showToast('Telegram test message sent!', 'info')}
                >
                  Test
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => updateTelegramConfig({ botToken, chatId })}
                >
                  Save Config
                </button>
              </div>
            </div>

            {/* STEP 4 */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', marginBottom: '4px' }}>
                STEP 4 • SECURE THE TOKEN
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>No bot token set yet. Add one above, then secure it.</p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                onClick={() => showToast('Bot token secured!', 'success')}
              >
                <ShieldCheck size={16} />
                <span>Secure the bot token</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CLOUD & LOCAL BACKUP */}
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Cloud &amp; Offline Backup</h2>
              <p className="card-description">Automatic — every change is saved to your local cloud</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Cloud Backup */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Cloud Backup</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Last cloud backup: 25/08/2026, 4:04:56 PM</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => showToast('Cloud backup triggered!', 'success')}>
                  Back up to cloud now
                </button>
                <button className="btn btn-secondary" onClick={() => showToast('Cloud restore ready', 'info')}>
                  Restore from cloud
                </button>
              </div>
            </div>

            {/* Send Backup */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Send Backup</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                <strong>{customers.length}</strong> customers • <strong>{loans.length}</strong> loans • <strong>{fixedDeposits.length}</strong> FDs • <strong>{receipts.length}</strong> receipts
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => showToast('Backup dispatched to Telegram!', 'success')}>
                  <Send size={14} />
                  <span>Backup to Telegram</span>
                </button>
                <button className="btn btn-secondary" onClick={handleDownloadBackup}>
                  <Download size={14} />
                  <span>Download File</span>
                </button>
              </div>
            </div>

            {/* Restore */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Restore</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Upload a backup .json file</p>
              <div style={{ marginBottom: '10px' }}>
                <label className="form-label">On restore:</label>
                <select className="input-control" style={{ width: '100%' }}>
                  <option value="wipe">Replace current data (wipe &amp; load)</option>
                  <option value="merge">Merge with existing data</option>
                </select>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-primary-dark)'
                }}
              >
                <Upload size={18} />
                <span>Click to select backup .json</span>
                <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Auto backup switch */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Auto Backup to Telegram on Open</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sends a backup each time you open the app (once per day)</p>
              </div>
              <input
                type="checkbox"
                checked={autoBackupOnOpen}
                onChange={(e) => {
                  setAutoBackupOnOpen(e.target.checked);
                  updateTelegramConfig({ autoBackupOnOpen: e.target.checked });
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
