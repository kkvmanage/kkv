import React, { useState, useEffect } from 'react';
import {
  HardDriveDownload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Cloud,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { rentalApi } from '../services/rentalApi.ts';
import { SyncSummary } from '../types/rental.types.ts';

export const BackupAndSync: React.FC = () => {
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await rentalApi.getSyncStatus();
      if (res.success) setSyncSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await rentalApi.triggerSync();
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Sync operation failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const res = await rentalApi.testGoogleConnection();
      setTestResult({
        success: res.success,
        message: res.message,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Top Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-card-icon icon-chip-green">
            <HardDriveDownload size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Google Drive & Google Sheets Backup & Synchronization
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Authoritative data resides in local database; mirrored asynchronously to Google Drive for KKV Finance Admin review.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleTestConnection}>
            <Cloud size={14} />
            <span>Test Connection</span>
          </button>
          <button className="btn btn-primary" onClick={handleSyncNow} disabled={isSyncing}>
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {testResult && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: testResult.success ? 'var(--badge-success-bg)' : 'var(--badge-warning-bg)',
            border: `1px solid ${testResult.success ? 'rgba(92,209,159,0.3)' : 'rgba(229,190,66,0.3)'}`,
            borderRadius: 'var(--radius-md)',
            color: testResult.success ? 'var(--color-success)' : 'var(--color-warning)',
            fontSize: '12.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Sync Status 4-Card Grid */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Google Drive Status</span>
            <span className="stat-card-value" style={{ fontSize: '18px', color: syncSummary?.isConfigured ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {syncSummary?.isConfigured ? 'Connected' : 'Credentials Needed'}
            </span>
            <span className="stat-card-sub">Service Account Mirror</span>
          </div>
          <div className="stat-card-icon icon-chip-green">
            <Cloud size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Last Successful Sync</span>
            <span className="stat-card-value" style={{ fontSize: '15px', fontWeight: 700 }}>
              {syncSummary?.lastSyncedAt ? new Date(syncSummary.lastSyncedAt).toLocaleTimeString() : 'Recent'}
            </span>
            <span className="stat-card-sub">
              {syncSummary?.lastSyncedAt ? new Date(syncSummary.lastSyncedAt).toLocaleDateString() : 'Auto worker active'}
            </span>
          </div>
          <div className="stat-card-icon icon-chip-gold">
            <Clock size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Pending Sync Queue</span>
            <span className="stat-card-value" style={{ color: 'var(--color-warning)' }}>
              {syncSummary?.pending || 0}
            </span>
            <span className="stat-card-sub">Queued transactions</span>
          </div>
          <div className="stat-card-icon icon-chip-orange">
            <RefreshCw size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Synced Entities</span>
            <span className="stat-card-value" style={{ color: 'var(--color-success)' }}>
              {syncSummary?.synced || 0}
            </span>
            <span className="stat-card-sub">Mirrored to Google Sheets</span>
          </div>
          <div className="stat-card-icon icon-chip-teal">
            <FileSpreadsheet size={20} />
          </div>
        </div>
      </div>

      {/* Synchronized Datasets Overview Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Synchronized Google Sheets Structure</h3>
            <p className="card-description">5 dedicated sheets maintained inside your Google Drive spreadsheet</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'block', fontSize: '13px' }}>1. Complexes</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID, Name, Location, Status, Timestamp</span>
          </div>
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'block', fontSize: '13px' }}>2. Shops</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID, Unit, Tenant, Mobile, Rent, Advance</span>
          </div>
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'block', fontSize: '13px' }}>3. RentPayments</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID, Month, Amount, Mode, Advance, Status</span>
          </div>
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'block', fontSize: '13px' }}>4. Expenses</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID, Category, Amount, Mode, Reason, Notes</span>
          </div>
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'block', fontSize: '13px' }}>5. AuditLogs</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID, Action, Entity, User, Timestamp</span>
          </div>
        </div>
      </div>
    </div>
  );
};
