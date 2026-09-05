import React, { useState, useEffect } from 'react';
import {
  Users,
  ScrollText,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { rentalApi } from '../services/rentalApi.ts';
import { authApi } from '../services/authApi.ts';
import { AuditLog, UserAccount } from '../types/rental.types.ts';

export const Settings: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, usersRes] = await Promise.all([
        rentalApi.getAuditLogs(),
        authApi.listUsers(),
      ]);

      if (logsRes.success) setAuditLogs(logsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Staff Accounts Management Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-card-icon icon-chip-green" style={{ width: '36px', height: '36px' }}>
              <Users size={18} />
            </div>
            <div>
              <h3 className="card-title">Authorized Rental Staff Accounts</h3>
              <p className="card-description">Users with access to collect rents and manage complexes</p>
            </div>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Username</th>
                <th>Role</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.displayName}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{u.username}</td>
                  <td>
                    <span className="badge badge-info">{u.role}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Audit Trail */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-card-icon icon-chip-gold" style={{ width: '36px', height: '36px' }}>
              <ScrollText size={18} />
            </div>
            <div>
              <h3 className="card-title">System Audit Trail</h3>
              <p className="card-description">Immutable ledger log of all operations performed in the Rental application</p>
            </div>
          </div>
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {auditLogs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              No audit records logged yet.
            </p>
          ) : (
            auditLogs.slice(0, 40).map((log) => (
              <div
                key={log.auditId}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12.5px',
                }}
              >
                <div>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary-accent)', marginRight: '8px' }}>
                    {log.action}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    on {log.entityType} ({log.entityId})
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                    By staff user: {log.userId}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
