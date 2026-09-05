import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trash2,
  Edit3,
  X,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { authApi } from '../services/authApi.ts';
import { UserAccount, UserRole } from '../types/rental.types.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const StaffAndAccess: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Form State
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('RENTAL_STAFF');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await authApi.listUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load staff accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) {
      setError('Please provide a staff email address.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await authApi.createUser({
        email: addEmail.trim(),
        name: addName.trim() || undefined,
        role: addRole,
        authProvider: 'LOCAL',
      });

      setIsSubmitting(false);
      if (res.success) {
        setSuccess(`Staff account (${addEmail}) authorized successfully.`);
        setShowAddModal(false);
        setAddEmail('');
        setAddName('');
        setAddRole('RENTAL_STAFF');
        fetchUsers();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to authorize staff account.');
    }
  };

  const handleToggleStatus = async (targetUser: UserAccount) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot deactivate your own administrative account.');
      return;
    }

    const newStatus = targetUser.status === 'ACTIVE' || targetUser.isActive ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await authApi.updateUser(targetUser.id, { status: newStatus });
      if (res.success) {
        setSuccess(`User ${targetUser.email} status updated to ${newStatus}.`);
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update user status.');
    }
  };

  const handleUpdateRole = async (targetUser: UserAccount, newRole: UserRole) => {
    try {
      const res = await authApi.updateUser(targetUser.id, { role: newRole });
      if (res.success) {
        setSuccess(`User ${targetUser.email} role changed to ${newRole}.`);
        setShowEditModal(false);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update role.');
    }
  };

  const handleDeleteUser = async (targetUser: UserAccount) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot delete your own account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove access for ${targetUser.email}?`)) {
      return;
    }

    try {
      const res = await authApi.deleteUser(targetUser.id);
      if (res.success) {
        setSuccess(`Access removed for ${targetUser.email}.`);
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove user.');
    }
  };

  return (
    <div className="space-y-6 page-fade-in" style={{ padding: '4px 0 24px' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={24} style={{ color: 'var(--color-primary, #176B52)' }} />
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Staff &amp; Access Control
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Authorize and manage staff Google accounts permitted to log into the Complex Rental Management Portal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchUsers}
            disabled={isLoading}
            style={{ fontSize: '13px', height: '38px', gap: '6px' }}
          >
            <RotateCcw size={14} className={isLoading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: '#176B52',
              color: '#FFFFFF',
              fontWeight: 700,
              borderRadius: '8px',
              height: '38px',
              padding: '0 16px',
              gap: '6px',
            }}
          >
            <UserPlus size={16} />
            <span>Add Rental Staff</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            color: '#DC2626',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(23, 107, 82, 0.08)',
            border: '1px solid rgba(23, 107, 82, 0.25)',
            borderRadius: '10px',
            color: '#176B52',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #DDE5DF' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#1F2D26' }}>
            Authorized Google Staff Accounts ({users.length})
          </div>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Only users in this list can authenticate via Google OAuth.
          </span>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>STAFF MEMBER</th>
                <th>GOOGLE EMAIL</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>AUTH PROVIDER</th>
                <th>LAST LOGIN</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: '#64748B' }}>
                    <Users size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>No staff members registered.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isActive = u.status === 'ACTIVE' || (u.status === undefined && u.isActive !== false);
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: u.role === 'RENTAL_ADMIN' ? 'rgba(180, 137, 9, 0.15)' : 'rgba(23, 107, 82, 0.12)',
                              color: u.role === 'RENTAL_ADMIN' ? '#B48909' : '#176B52',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                            }}
                          >
                            {(u.name || u.displayName || u.email).substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {u.name || u.displayName || 'Staff Member'}
                              {isCurrent && (
                                <span style={{ marginLeft: '6px', fontSize: '11px', color: '#176B52', fontWeight: 700 }}>
                                  (You)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)' }}>
                          <Mail size={13} style={{ color: '#64748B' }} />
                          <span>{u.email}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: u.role === 'RENTAL_ADMIN' ? 'rgba(180, 137, 9, 0.12)' : 'rgba(23, 107, 82, 0.1)',
                            color: u.role === 'RENTAL_ADMIN' ? '#B48909' : '#176B52',
                            fontWeight: 700,
                          }}
                        >
                          {u.role === 'RENTAL_ADMIN' ? 'Rental Admin' : 'Rental Staff'}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: isActive ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                            color: isActive ? '#059669' : '#DC2626',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{isActive ? 'Active' : 'Disabled'}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                          {u.authProvider || 'GOOGLE'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-IN') : 'Never'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingUser(u);
                              setShowEditModal(true);
                            }}
                            title="Change Role"
                            style={{ height: '30px', padding: '0 8px' }}
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent}
                            title={isActive ? 'Disable Access' : 'Activate Access'}
                            style={{ height: '30px', padding: '0 8px' }}
                          >
                            <UserCheck size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent}
                            title="Remove Staff"
                            style={{ height: '30px', padding: '0 8px', color: '#DC2626' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} style={{ color: '#176B52' }} />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Authorize Rental Staff</h3>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label required">Google Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. staff.member@gmail.com"
                  className="input-control"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                  This must be the user's exact Google account email for OAuth verification.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Arun Kumar"
                  className="input-control"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Assigned Role</label>
                <select
                  className="select-control"
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as UserRole)}
                >
                  <option value="RENTAL_STAFF">Rental Staff (Dashboard, Payments, Complexes, Expenses)</option>
                  <option value="RENTAL_ADMIN">Rental Admin (Full Access + User Management)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#176B52' }}
                >
                  <span>{isSubmitting ? 'Authorizing...' : 'Authorize Staff'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && editingUser && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Change Role: {editingUser.name || editingUser.email}</h3>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button
                type="button"
                className={`btn ${editingUser.role === 'RENTAL_STAFF' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', padding: '12px' }}
                onClick={() => handleUpdateRole(editingUser, 'RENTAL_STAFF')}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>Rental Staff</div>
                  <div style={{ fontSize: '11.5px', opacity: 0.8 }}>Access to record payments, expenses, view reports</div>
                </div>
              </button>

              <button
                type="button"
                className={`btn ${editingUser.role === 'RENTAL_ADMIN' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', padding: '12px' }}
                onClick={() => handleUpdateRole(editingUser, 'RENTAL_ADMIN')}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>Rental Administrator</div>
                  <div style={{ fontSize: '11.5px', opacity: 0.8 }}>Full administrative control + Staff Access management</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
