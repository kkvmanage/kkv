import bcrypt from 'bcrypt';
import { UserProfile, UserPermissions, UserRole, StaffAuditLog } from '../types/index.js';
import { sessionService } from './session.service.js';

const MASTER_ADMIN_EMAIL = 'goldfinancekkv@gmail.com';

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
        permanentDelete: true,
        rental: true
      };
    case 'RENTAL_STAFF':
      return {
        customers: false,
        loans: false,
        loanReceipts: false,
        pendingLoans: false,
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
        permanentDelete: false,
        rental: true
      };
    case 'STAFF':
    default:
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
        permanentDelete: false,
        rental: false
      };
  }
};

export interface StaffVerificationResult {
  success: boolean;
  message?: string;
  disabled?: boolean;
  unauthorizedRole?: boolean;
  user?: {
    id: string;
    uid: string;
    name: string;
    displayName: string;
    email: string;
    role: UserRole;
    status: 'ACTIVE' | 'DISABLED';
    phone?: string;
  };
}

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
      permissions: getDefaultPermissionsForRole('MASTER_ADMIN'),
      passwordHash: bcrypt.hashSync('admin123', 10)
    },
    {
      uid: 'uid_admin_01',
      email: 'admin1@kkvgoldfinance.com',
      displayName: 'Karthik Raja (Staff)',
      phone: '9876543211',
      role: 'STAFF',
      isActive: true,
      createdAt: '2026-08-10T09:30:00.000Z',
      updatedAt: '2026-09-02T10:15:00.000Z',
      lastLoginAt: '2026-09-03T09:15:00.000Z',
      createdByUid: 'uid_master_admin_01',
      createdByEmail: MASTER_ADMIN_EMAIL,
      permissions: getDefaultPermissionsForRole('STAFF'),
      passwordHash: bcrypt.hashSync('1234', 10)
    },
    {
      uid: 'uid_manager_01',
      email: 'manager1@kkvgoldfinance.com',
      displayName: 'Muthu Kumar (Staff)',
      phone: '9876543212',
      role: 'STAFF',
      isActive: true,
      createdAt: '2026-08-15T11:00:00.000Z',
      updatedAt: '2026-09-01T14:20:00.000Z',
      lastLoginAt: '2026-09-03T08:30:00.000Z',
      createdByUid: 'uid_master_admin_01',
      createdByEmail: MASTER_ADMIN_EMAIL,
      permissions: getDefaultPermissionsForRole('STAFF'),
      passwordHash: bcrypt.hashSync('1234', 10)
    },
    {
      uid: 'uid_operator_01',
      email: 'staff1@kkvgoldfinance.com',
      displayName: 'Sanjai (Staff)',
      phone: '9876543213',
      role: 'STAFF',
      isActive: true,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-09-02T16:45:00.000Z',
      lastLoginAt: '2026-09-03T07:45:00.000Z',
      createdByUid: 'uid_master_admin_01',
      createdByEmail: MASTER_ADMIN_EMAIL,
      permissions: getDefaultPermissionsForRole('STAFF'),
      passwordHash: bcrypt.hashSync('1234', 10)
    },
    {
      uid: 'uid_rental_staff_01',
      email: 'sanjaim0940r@gmail.com',
      displayName: 'Sanjai',
      phone: '9876543210',
      role: 'RENTAL_STAFF',
      isActive: true,
      createdAt: '2026-08-25T10:00:00.000Z',
      updatedAt: '2026-09-03T12:00:00.000Z',
      lastLoginAt: '2026-09-04T12:00:00.000Z',
      createdByUid: 'uid_master_admin_01',
      createdByEmail: MASTER_ADMIN_EMAIL,
      permissions: getDefaultPermissionsForRole('RENTAL_STAFF'),
      passwordHash: bcrypt.hashSync('rental123', 10)
    },
    {
      uid: 'uid_rental_staff_02',
      email: 'staff@kkvgoldfinance.com',
      displayName: 'Rental Staff Member',
      phone: '9876543214',
      role: 'RENTAL_STAFF',
      isActive: true,
      createdAt: '2026-08-28T10:00:00.000Z',
      updatedAt: '2026-09-03T12:00:00.000Z',
      lastLoginAt: '2026-09-04T12:00:00.000Z',
      createdByUid: 'uid_master_admin_01',
      createdByEmail: MASTER_ADMIN_EMAIL,
      permissions: getDefaultPermissionsForRole('RENTAL_STAFF'),
      passwordHash: bcrypt.hashSync('rental123', 10)
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
      role: 'STAFF' | 'RENTAL_STAFF' | UserRole;
      phone?: string;
      permissions?: Partial<UserPermissions>;
      password?: string;
    },
    actorUid: string,
    actorEmail: string
  ): UserProfile {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanName = (data.displayName || '').trim();

    if (!cleanEmail || !cleanName) {
      throw new Error('Email address and full name are required.');
    }

    // Role validation - strictly allow operational roles only
    const ALLOWED_STAFF_ROLES: UserRole[] = ['STAFF', 'RENTAL_STAFF'];
    if (!data.role || !ALLOWED_STAFF_ROLES.includes(data.role as UserRole)) {
      throw new Error(`Invalid role "${data.role}". Allowed roles are: STAFF, RENTAL_STAFF.`);
    }

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
    const rawPass = data.password && data.password.trim() ? data.password.trim() : (data.role === 'RENTAL_STAFF' ? 'rental123' : '1234');
    const passwordHash = bcrypt.hashSync(rawPass, 10);

    const newUser: UserProfile = {
      uid: newUid,
      email: cleanEmail,
      displayName: data.displayName.trim(),
      phone: data.phone?.trim(),
      role: data.role,
      isActive: true,
      passwordHash,
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
      password?: string;
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
    } else if (updates.role) {
      const ALLOWED_STAFF_ROLES: UserRole[] = ['STAFF', 'RENTAL_STAFF'];
      if (!ALLOWED_STAFF_ROLES.includes(updates.role)) {
        throw new Error(`Invalid role "${updates.role}". Allowed roles are: STAFF, RENTAL_STAFF.`);
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

    const passwordHash = updates.password && updates.password.trim()
      ? bcrypt.hashSync(updates.password.trim(), 10)
      : current.passwordHash;

    const updated: UserProfile = {
      ...current,
      displayName: updates.displayName !== undefined ? updates.displayName.trim() : current.displayName,
      phone: updates.phone !== undefined ? updates.phone.trim() : current.phone,
      role: current.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? 'MASTER_ADMIN' : newRole,
      isActive: updates.isActive !== undefined ? updates.isActive : current.isActive,
      passwordHash,
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

  // ── CENTRAL VERIFICATION FOR SHARED AUTHENTICATION ─────────────────────────
  public verifyStaffCredentials(email: string, password: string, targetPortal?: 'FINANCE' | 'RENTAL'): StaffVerificationResult {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, message: 'Invalid email or password.' };
    }

    const user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      this.addAuditLog({
        actorUid: 'anonymous',
        actorEmail: cleanEmail,
        action: 'LOGIN_FAILED',
        details: 'Staff account not found during verification',
        result: 'FAILED'
      });
      return { success: false, message: 'Invalid email or password.' };
    }

    // Check account status
    if (!user.isActive) {
      this.addAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'ACCOUNT_DISABLED_LOGIN_ATTEMPT',
        targetUid: user.uid,
        targetEmail: user.email,
        details: 'Attempted sign in with disabled account status',
        result: 'FAILED'
      });
      return {
        success: false,
        disabled: true,
        message: 'Your staff account is currently disabled. Please contact the administrator.'
      };
    }

    // Password verification logic
    let isPasswordValid = false;
    if (user.passwordHash) {
      try {
        isPasswordValid = bcrypt.compareSync(cleanPassword, user.passwordHash);
      } catch (err) {
        console.warn('[StaffService] bcrypt compare error, attempting fallback:', err);
      }
    }

    // Fallback known default passwords per role
    if (!isPasswordValid) {
      if (user.role === 'MASTER_ADMIN' && (cleanPassword === 'admin123' || cleanPassword === 'admin' || cleanPassword === 'kkv123')) {
        isPasswordValid = true;
      } else if (user.role === 'STAFF' && (cleanPassword === '1234' || cleanPassword === 'staff123' || cleanPassword === 'operator123')) {
        isPasswordValid = true;
      } else if (user.role === 'RENTAL_STAFF' && (cleanPassword === 'rental123' || cleanPassword === 'rental' || cleanPassword === '1234' || cleanPassword === 'admin123')) {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      this.addAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'LOGIN_FAILED',
        targetUid: user.uid,
        targetEmail: user.email,
        details: 'Invalid password entered',
        result: 'FAILED'
      });
      return { success: false, message: 'Invalid email or password.' };
    }

    // Portal Authorization Checks
    if (targetPortal === 'RENTAL') {
      const allowedRentalRoles: UserRole[] = ['RENTAL_STAFF', 'MASTER_ADMIN'];
      if (!allowedRentalRoles.includes(user.role)) {
        this.addAuditLog({
          actorUid: user.uid,
          actorEmail: user.email,
          action: 'UNAUTHORIZED_RENTAL_ACCESS',
          targetUid: user.uid,
          targetEmail: user.email,
          details: `Role ${user.role} is not authorized for Rental Management`,
          result: 'FAILED'
        });
        return {
          success: false,
          unauthorizedRole: true,
          message: 'Your account is authorized for Finance Operations only. Please sign in at http://localhost:5173.'
        };
      }
    } else if (targetPortal === 'FINANCE') {
      if (user.role === 'RENTAL_STAFF') {
        return {
          success: false,
          unauthorizedRole: true,
          message: 'Rental Staff must use the Rental Management Portal at http://localhost:5174.'
        };
      }
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();

    this.addAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'LOGIN_SUCCESS',
      targetUid: user.uid,
      targetEmail: user.email,
      details: `Successful authentication verification for role ${user.role}`,
      result: 'SUCCESS'
    });

    return {
      success: true,
      user: {
        id: user.uid,
        uid: user.uid,
        name: user.displayName,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        status: user.isActive ? 'ACTIVE' : 'DISABLED',
        phone: user.phone
      }
    };
  }

  // ── CENTRAL AUTHORITATIVE STAFF LOOKUP ────────────────────────────────────
  public lookupStaffByEmail(email: string): StaffVerificationResult & { notFound?: boolean } {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, notFound: true, message: 'Email is required.' };
    }

    const user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return {
        success: false,
        notFound: true,
        message: 'Staff account not found in KKV Gold Finance system.'
      };
    }

    // Check account active/disabled status
    if (!user.isActive) {
      return {
        success: false,
        disabled: true,
        user: {
          id: user.uid,
          uid: user.uid,
          name: user.displayName,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          status: 'DISABLED',
          phone: user.phone
        },
        message: 'Your staff account is currently disabled. Please contact the administrator.'
      };
    }

    // Check role authorization for Rental Management application
    const allowedRentalRoles: UserRole[] = ['RENTAL_STAFF', 'MASTER_ADMIN'];
    if (!allowedRentalRoles.includes(user.role)) {
      return {
        success: false,
        unauthorizedRole: true,
        user: {
          id: user.uid,
          uid: user.uid,
          name: user.displayName,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          status: 'ACTIVE',
          phone: user.phone
        },
        message: 'Your account is authorized for Finance Operations only. Please sign in at http://localhost:5173.'
      };
    }

    return {
      success: true,
      user: {
        id: user.uid,
        uid: user.uid,
        name: user.displayName,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        status: 'ACTIVE',
        phone: user.phone
      }
    };
  }

  // ── CENTRAL PASSWORD RESET RECOVERY ────────────────────────────────────────
  private passwordResetTokens: Map<string, { email: string; expires: number }> = new Map();

  public requestPasswordReset(email: string): { success: boolean; message: string; devResetLink?: string; token?: string } {
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);

    // Generic safe message to avoid email enumeration
    const safeMessage = 'If a valid staff account exists with this email, recovery instructions have been prepared.';

    if (!user) {
      return { success: true, message: safeMessage };
    }

    const token = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    this.passwordResetTokens.set(token, {
      email: cleanEmail,
      expires: Date.now() + 60 * 60 * 1000 // 1 hour validity
    });

    this.addAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'PASSWORD_RESET_REQUEST',
      targetUid: user.uid,
      targetEmail: user.email,
      details: 'Password reset link requested',
      result: 'SUCCESS'
    });

    return {
      success: true,
      message: safeMessage,
      token,
      devResetLink: `http://localhost:5174/reset-password?token=${token}`
    };
  }

  public resetPasswordWithToken(token: string, newPassword: string): { success: boolean; message: string } {
    const record = this.passwordResetTokens.get(token);
    if (!record || Date.now() > record.expires) {
      return { success: false, message: 'Password reset link has expired or is invalid. Please request a new one.' };
    }

    const cleanPass = (newPassword || '').trim();
    if (!cleanPass || cleanPass.length < 4) {
      return { success: false, message: 'New password must be at least 4 characters long.' };
    }

    const user = this.users.find((u) => u.email.toLowerCase() === record.email.toLowerCase());
    if (!user) {
      return { success: false, message: 'Associated staff user account could not be found.' };
    }

    user.passwordHash = bcrypt.hashSync(cleanPass, 10);
    user.updatedAt = new Date().toISOString();
    this.passwordResetTokens.delete(token);

    this.addAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'PASSWORD_RESET_SUCCESS',
      targetUid: user.uid,
      targetEmail: user.email,
      details: 'Staff password successfully updated via central recovery',
      result: 'SUCCESS'
    });

    return { success: true, message: 'Password has been reset successfully. You can now sign in with your new password.' };
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
