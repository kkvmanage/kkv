import { UserProfile, UserPermissions, UserRole, StaffAuditLog } from '../types/index.js';
import { sessionService } from './session.service.js';

const MASTER_ADMIN_EMAIL = 'kkvgoldfinance13@gmail.com';

const getDefaultPermissionsForRole = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'MASTER_ADMIN':
      return {
        customers: true,
        loans: true,
        loanReceipts: true,
        pendingLoans: true,
        fixedDeposits: true,
        fdInterest: true,
        fdWithdrawal: true,
        notifications: true,
        adminPanel: true,
        masterControl: true,
        fdInterestRates: true,
        bulkFdDateChange: true,
        devices: true,
        staffManagement: true,
        settings: true,
        permanentDelete: true
      };
    case 'ADMIN':
      return {
        customers: true,
        loans: true,
        loanReceipts: true,
        pendingLoans: true,
        fixedDeposits: true,
        fdInterest: true,
        fdWithdrawal: true,
        notifications: true,
        adminPanel: false,
        masterControl: false,
        fdInterestRates: false,
        bulkFdDateChange: false,
        devices: true,
        staffManagement: false,
        settings: false,
        permanentDelete: false
      };
    case 'MANAGER':
      return {
        customers: true,
        loans: true,
        loanReceipts: true,
        pendingLoans: true,
        fixedDeposits: true,
        fdInterest: true,
        fdWithdrawal: true,
        notifications: true,
        adminPanel: false,
        masterControl: false,
        fdInterestRates: false,
        bulkFdDateChange: false,
        devices: false,
        staffManagement: false,
        settings: false,
        permanentDelete: false
      };
    case 'OPERATOR':
    default:
      return {
        customers: true,
        loans: true,
        loanReceipts: true,
        pendingLoans: true,
        fixedDeposits: false,
        fdInterest: false,
        fdWithdrawal: false,
        notifications: true,
        adminPanel: false,
        masterControl: false,
        fdInterestRates: false,
        bulkFdDateChange: false,
        devices: false,
        staffManagement: false,
        settings: false,
        permanentDelete: false
      };
  }
};

class StaffService {
  private users: UserProfile[] = [
    {
      uid: 'uid_master_admin_01',
      email: MASTER_ADMIN_EMAIL,
      displayName: 'Master Admin',
      phone: '9876543210',
      role: 'MASTER_ADMIN',
      isActive: true,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-09-03T12:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
      permissions: getDefaultPermissionsForRole('MASTER_ADMIN')
    },
    {
      uid: 'uid_admin_01',
      email: 'admin1@kkvgoldfinance.com',
      displayName: 'Karthik Raja (Admin)',
      phone: '9876543211',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-08-10T09:30:00.000Z',
      updatedAt: '2026-09-02T10:15:00.000Z',
      lastLoginAt: '2026-09-03T09:15:00.000Z',
      createdByUid: 'uid_master_admin_01',
      createdByEmail: MASTER_ADMIN_EMAIL,
      permissions: getDefaultPermissionsForRole('ADMIN')
    },
    {
      uid: 'uid_manager_01',
      email: 'manager1@kkvgoldfinance.com',
      displayName: 'Muthu Kumar (Branch Manager)',
      phone: '9876543212',
      role: 'MANAGER',
      isActive: true,
      createdAt: '2026-08-15T11:00:00.000Z',
      updatedAt: '2026-09-01T14:20:00.000Z',
      lastLoginAt: '2026-09-03T08:30:00.000Z',
      createdByUid: 'uid_master_admin_01',
      createdByEmail: MASTER_ADMIN_EMAIL,
      permissions: getDefaultPermissionsForRole('MANAGER')
    },
    {
      uid: 'uid_operator_01',
      email: 'staff1@kkvgoldfinance.com',
      displayName: 'Sanjai (Operator)',
      phone: '9876543213',
      role: 'OPERATOR',
      isActive: true,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-09-02T16:45:00.000Z',
      lastLoginAt: '2026-09-03T07:45:00.000Z',
      createdByUid: 'uid_master_admin_01',
      createdByEmail: MASTER_ADMIN_EMAIL,
      permissions: getDefaultPermissionsForRole('OPERATOR')
    }
  ];

  private auditLogs: StaffAuditLog[] = [
    {
      id: 'audit_01',
      timestamp: '2026-08-01T00:00:00.000Z',
      actorUid: 'system',
      actorEmail: 'system@kkvgoldfinance.com',
      action: 'SYSTEM INITIALIZATION',
      targetUid: 'uid_master_admin_01',
      targetEmail: MASTER_ADMIN_EMAIL,
      details: 'Master Admin account initialized',
      result: 'SUCCESS'
    }
  ];

  public listStaff(): UserProfile[] {
    return [...this.users];
  }

  public getStaffByUid(uid: string): UserProfile | undefined {
    return this.users.find((u) => u.uid === uid);
  }

  public getStaffByEmail(email: string): UserProfile | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  public createStaff(
    data: {
      email: string;
      displayName: string;
      role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
      phone?: string;
      permissions?: Partial<UserPermissions>;
    },
    actorUid: string,
    actorEmail: string
  ): UserProfile {
    const cleanEmail = data.email.trim().toLowerCase();

    // Check duplicate
    if (this.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error(`An account with email "${cleanEmail}" already exists.`);
    }

    if ((data.role as string) === 'MASTER_ADMIN') {
      throw new Error('Cannot assign MASTER_ADMIN role through staff creation.');
    }

    const defaultPerms = getDefaultPermissionsForRole(data.role);
    const finalPerms: UserPermissions = {
      ...defaultPerms,
      ...(data.permissions || {})
    };

    const newUid = `uid_staff_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const newUser: UserProfile = {
      uid: newUid,
      email: cleanEmail,
      displayName: data.displayName.trim(),
      phone: data.phone?.trim(),
      role: data.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdByUid: actorUid,
      createdByEmail: actorEmail,
      permissions: finalPerms
    };

    this.users.push(newUser);

    this.addAuditLog({
      actorUid,
      actorEmail,
      action: 'STAFF_CREATED',
      targetUid: newUid,
      targetEmail: cleanEmail,
      details: `Created staff account with role ${data.role}`,
      result: 'SUCCESS'
    });

    return newUser;
  }

  public updateStaff(
    uid: string,
    updates: {
      displayName?: string;
      phone?: string;
      role?: UserRole;
      permissions?: Partial<UserPermissions>;
      isActive?: boolean;
    },
    actorUid: string,
    actorEmail: string
  ): UserProfile {
    const targetIndex = this.users.findIndex((u) => u.uid === uid);
    if (targetIndex === -1) {
      throw new Error('Staff user not found.');
    }

    const current = this.users[targetIndex];

    // Protect Master Admin from demotion or tampering
    if (current.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      if (updates.role && updates.role !== 'MASTER_ADMIN') {
        throw new Error('Master Admin account cannot be demoted.');
      }
      if (updates.isActive === false) {
        throw new Error('Master Admin account cannot be disabled.');
      }
    }

    const oldRole = current.role;
    const newRole = updates.role && updates.role !== 'MASTER_ADMIN' ? updates.role : current.role;
    const roleChanged = oldRole !== newRole;

    const basePerms = roleChanged ? getDefaultPermissionsForRole(newRole) : current.permissions;
    const updatedPerms: UserPermissions = {
      ...basePerms,
      ...(updates.permissions || {})
    };

    const updated: UserProfile = {
      ...current,
      displayName: updates.displayName !== undefined ? updates.displayName.trim() : current.displayName,
      phone: updates.phone !== undefined ? updates.phone.trim() : current.phone,
      role: current.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? 'MASTER_ADMIN' : newRole,
      isActive: updates.isActive !== undefined ? updates.isActive : current.isActive,
      permissions: current.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? getDefaultPermissionsForRole('MASTER_ADMIN') : updatedPerms,
      updatedAt: new Date().toISOString()
    };

    this.users[targetIndex] = updated;

    this.addAuditLog({
      actorUid,
      actorEmail,
      action: roleChanged ? 'STAFF_ROLE_CHANGED' : 'STAFF_UPDATED',
      targetUid: uid,
      targetEmail: current.email,
      details: roleChanged
        ? `Role updated: ${oldRole} → ${newRole}`
        : 'Profile details / permissions updated',
      result: 'SUCCESS'
    });

    return updated;
  }

  public toggleStaffStatus(uid: string, isActive: boolean, actorUid: string, actorEmail: string): UserProfile {
    const target = this.users.find((u) => u.uid === uid);
    if (!target) {
      throw new Error('Staff user not found.');
    }

    if (target.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      throw new Error('Master Admin account cannot be disabled.');
    }

    target.isActive = isActive;
    target.updatedAt = new Date().toISOString();

    if (!isActive) {
      // Revoke all sessions for disabled staff
      sessionService.revokeOtherSessions(uid);
    }

    this.addAuditLog({
      actorUid,
      actorEmail,
      action: isActive ? 'STAFF_ENABLED' : 'STAFF_DISABLED',
      targetUid: uid,
      targetEmail: target.email,
      details: `Account status set to ${isActive ? 'ACTIVE' : 'DISABLED'}`,
      result: 'SUCCESS'
    });

    return target;
  }

  public revokeStaffSessions(uid: string, actorUid: string, actorEmail: string): number {
    const target = this.users.find((u) => u.uid === uid);
    if (!target) {
      throw new Error('Staff user not found.');
    }

    // Invalidate sessions associated with user email or uid
    const allSessions = sessionService.listSessions();
    let count = 0;
    allSessions.forEach((s) => {
      if (s.userEmail?.toLowerCase() === target.email.toLowerCase() && s.status === 'ACTIVE') {
        sessionService.revokeSession(s.sessionId);
        count++;
      }
    });

    this.addAuditLog({
      actorUid,
      actorEmail,
      action: 'STAFF_SESSIONS_REVOKED',
      targetUid: uid,
      targetEmail: target.email,
      details: `Revoked ${count} active session(s)`,
      result: 'SUCCESS'
    });

    return count;
  }

  public deleteStaff(uid: string, actorUid: string, actorEmail: string): boolean {
    const target = this.users.find((u) => u.uid === uid);
    if (!target) {
      throw new Error('Staff user not found.');
    }

    if (target.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      throw new Error('Master Admin account cannot be deleted.');
    }

    this.users = this.users.filter((u) => u.uid !== uid);

    this.addAuditLog({
      actorUid,
      actorEmail,
      action: 'STAFF_DELETED',
      targetUid: uid,
      targetEmail: target.email,
      details: `Permanently removed staff account`,
      result: 'SUCCESS'
    });

    return true;
  }

  public listAuditLogs(): StaffAuditLog[] {
    return [...this.auditLogs].reverse();
  }

  private addAuditLog(log: Omit<StaffAuditLog, 'id' | 'timestamp'>) {
    this.auditLogs.push({
      id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...log
    });
  }
}

export const staffService = new StaffService();
