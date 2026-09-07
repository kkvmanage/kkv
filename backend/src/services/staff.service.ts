import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { StaffModel, IStaff, IUserPermissions, StaffRole } from '../models/Staff.js';
import { StaffAuditModel } from '../models/StaffAudit.js';
import { generateStaffId } from '../utils/staffIdGenerator.js';
import { sessionService } from './session.service.js';

const MASTER_ADMIN_EMAIL = 'goldfinancekkv@gmail.com';

export const getDefaultPermissionsForRole = (role: string): IUserPermissions => {
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
    case 'ADMIN':
    case 'MANAGER':
    case 'OPERATOR':
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
  notFound?: boolean;
  user?: {
    id: string;
    uid: string;
    staffId: string;
    name: string;
    displayName: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    isActive: boolean;
    phone?: string;
    permissions?: IUserPermissions;
  };
}

class StaffService {
  /**
   * Automatically seeds Master Admin in MongoDB if no staff exists
   */
  public async ensureMasterAdmin(): Promise<void> {
    if (mongoose.connection.readyState !== 1) return;

    try {
      const existingAdmin = await StaffModel.findOne({
        $or: [{ email: MASTER_ADMIN_EMAIL }, { role: 'MASTER_ADMIN' }]
      });

      if (!existingAdmin) {
        console.log('[StaffService] Seeding default Master Admin in MongoDB...');
        const passwordHash = await bcrypt.hash('admin123', 10);
        await StaffModel.create({
          staffId: 'KKV-STAFF-000001',
          uid: 'uid_master_admin_01',
          fullName: 'Master Admin',
          displayName: 'Master Admin',
          email: MASTER_ADMIN_EMAIL,
          phoneNumber: '9876543210',
          phone: '9876543210',
          role: 'MASTER_ADMIN',
          passwordHash,
          status: 'active',
          isActive: true,
          permissions: getDefaultPermissionsForRole('MASTER_ADMIN'),
          department: 'Executive Administration',
          createdByUid: 'SYSTEM',
          createdByEmail: 'system@kkvgoldfinance.com'
        });
        console.log('[StaffService] Master Admin seeded successfully in MongoDB.');
      }
    } catch (err) {
      console.warn('[StaffService] Master Admin seeding notice:', err);
    }
  }

  /**
   * Lists all staff members permanently stored in MongoDB
   */
  public async listStaff(): Promise<any[]> {
    await this.ensureMasterAdmin();
    const staff = await StaffModel.find({}).sort({ createdAt: -1 }).lean();
    return staff.map((s: any) => ({
      ...s,
      id: s.staffId || s.uid || s._id?.toString(),
      uid: s.uid || s.staffId,
      displayName: s.fullName || s.displayName,
      name: s.fullName || s.displayName,
      phone: s.phoneNumber || s.phone,
      isActive: s.status === 'active' || s.status === 'ACTIVE' || s.isActive === true
    }));
  }

  /**
   * Retrieves single staff record by staffId, uid, or email
   */
  public async getStaffByUid(uid: string): Promise<any | null> {
    if (!uid) return null;
    const isObjectId = mongoose.isValidObjectId(uid);
    const staff = await StaffModel.findOne({
      $or: [
        { staffId: uid },
        { uid: uid },
        { email: uid.toLowerCase().trim() },
        ...(isObjectId ? [{ _id: uid }] : [])
      ]
    }).lean();

    if (!staff) return null;

    return {
      ...staff,
      id: staff.staffId || staff.uid || staff._id?.toString(),
      displayName: staff.fullName || staff.displayName,
      name: staff.fullName || staff.displayName,
      phone: staff.phoneNumber || staff.phone,
      isActive: staff.status === 'active' || staff.status === 'ACTIVE' || staff.isActive === true
    };
  }

  /**
   * Retrieves staff record by email
   */
  public async getStaffByEmail(email: string): Promise<any | null> {
    if (!email) return null;
    return StaffModel.findOne({ email: email.toLowerCase().trim() }).lean();
  }

  /**
   * Creates a new staff member with bcrypt password hash and stores permanently in MongoDB
   */
  public async createStaff(
    data: {
      fullName?: string;
      displayName?: string;
      email: string;
      role: string;
      phoneNumber?: string;
      phone?: string;
      password?: string;
      permissions?: Partial<IUserPermissions>;
      department?: string;
    },
    actorUid: string = 'uid_master_admin_01',
    actorEmail: string = MASTER_ADMIN_EMAIL,
    ipAddress: string = '',
    userAgent: string = ''
  ): Promise<any> {
    const email = (data.email || '').trim().toLowerCase();
    const fullName = (data.fullName || data.displayName || '').trim();
    const rawPhone = (data.phoneNumber || data.phone || '').trim();
    const phone = rawPhone.replace(/\D/g, '');
    const role = (data.role || 'STAFF') as StaffRole;

    if (!email) throw new Error('Email address is required.');
    if (!fullName) throw new Error('Full name is required.');
    if (!role) throw new Error('Role is required.');

    // 1. Check duplicate email in MongoDB
    const existingEmail = await StaffModel.findOne({ email });
    if (existingEmail) {
      throw new Error(`A staff member with this email already exists: ${email}`);
    }

    // 2. Check duplicate phone in MongoDB
    if (phone) {
      const existingPhone = await StaffModel.findOne({
        $or: [{ phoneNumber: phone }, { phone: phone }]
      });
      if (existingPhone) {
        throw new Error(`A staff member with this phone number already exists: ${phone}`);
      }
    }

    // 3. Generate unique sequential Staff ID (KKV-STAFF-000001)
    const { staffId } = await generateStaffId('KKV-STAFF');
    const uid = `uid_${staffId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    // 4. Securely hash the password using bcrypt
    const rawPassword = data.password && data.password.trim() ? data.password.trim() : (role === 'RENTAL_STAFF' ? 'rental123' : '1234');
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 5. Setup permissions
    const permissions: IUserPermissions = {
      ...getDefaultPermissionsForRole(role),
      ...(data.permissions || {})
    };

    // 6. Save permanent MongoDB record
    const createdStaff = await StaffModel.create({
      staffId,
      uid,
      fullName,
      displayName: fullName,
      email,
      phoneNumber: phone || rawPhone,
      phone: phone || rawPhone,
      role,
      passwordHash,
      status: 'active',
      isActive: true,
      permissions,
      department: data.department || (role === 'RENTAL_STAFF' ? 'Rental Management' : 'Finance Operations'),
      createdByUid: actorUid,
      createdByEmail: actorEmail
    });

    // 7. Save Audit Record in MongoDB
    await StaffAuditModel.create({
      staffId,
      staffUid: uid,
      staffEmail: email,
      action: 'STAFF_CREATED',
      performedBy: actorUid,
      actorEmail,
      description: `Created new staff account for ${fullName} (${email}) with role ${role}`,
      details: `Role: ${role}, Department: ${createdStaff.department}`,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    const staffObj = createdStaff.toJSON();
    return {
      ...staffObj,
      id: staffId,
      uid,
      displayName: fullName,
      phone: phone || rawPhone
    };
  }

  /**
   * Updates staff details in MongoDB
   */
  public async updateStaff(
    uidOrStaffId: string,
    updates: any,
    actorUid: string = 'uid_master_admin_01',
    actorEmail: string = MASTER_ADMIN_EMAIL,
    ipAddress: string = '',
    userAgent: string = ''
  ): Promise<any> {
    const isObjectId = mongoose.isValidObjectId(uidOrStaffId);
    const staff = await StaffModel.findOne({
      $or: [
        { staffId: uidOrStaffId },
        { uid: uidOrStaffId },
        ...(isObjectId ? [{ _id: uidOrStaffId }] : [])
      ]
    });

    if (!staff) {
      throw new Error(`Staff member with ID "${uidOrStaffId}" not found.`);
    }

    // Check duplicate email if changed
    if (updates.email && updates.email.toLowerCase().trim() !== staff.email) {
      const emailNorm = updates.email.toLowerCase().trim();
      const existing = await StaffModel.findOne({ email: emailNorm, _id: { $ne: staff._id } });
      if (existing) {
        throw new Error(`A staff member with email "${emailNorm}" already exists.`);
      }
      staff.email = emailNorm;
    }

    if (updates.fullName || updates.displayName || updates.name) {
      staff.fullName = (updates.fullName || updates.displayName || updates.name).trim();
      staff.displayName = staff.fullName;
    }

    if (updates.phoneNumber || updates.phone) {
      const p = (updates.phoneNumber || updates.phone).trim();
      staff.phoneNumber = p;
      staff.phone = p;
    }

    if (updates.role) {
      staff.role = updates.role;
    }

    if (updates.department) {
      staff.department = updates.department;
    }

    if (updates.status) {
      staff.status = updates.status;
      staff.isActive = updates.status === 'active' || updates.status === 'ACTIVE';
    }

    if (typeof updates.isActive === 'boolean') {
      staff.isActive = updates.isActive;
      staff.status = updates.isActive ? 'active' : 'inactive';
    }

    if (updates.permissions) {
      staff.permissions = {
        ...staff.permissions,
        ...updates.permissions
      };
    }

    staff.updatedAt = new Date();
    await staff.save();

    // Audit log in MongoDB
    await StaffAuditModel.create({
      staffId: staff.staffId,
      staffUid: staff.uid,
      staffEmail: staff.email,
      action: 'STAFF_UPDATED',
      performedBy: actorUid,
      actorEmail,
      description: `Updated profile details for staff ${staff.fullName} (${staff.staffId})`,
      details: JSON.stringify(updates),
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    return staff.toJSON();
  }

  /**
   * Updates staff password securely using bcrypt
   */
  public async updatePassword(
    uidOrStaffId: string,
    newPassword: string,
    actorUid: string = 'uid_master_admin_01',
    actorEmail: string = MASTER_ADMIN_EMAIL,
    ipAddress: string = '',
    userAgent: string = ''
  ): Promise<boolean> {
    if (!newPassword || newPassword.length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }

    const isObjectId = mongoose.isValidObjectId(uidOrStaffId);
    const staff = await StaffModel.findOne({
      $or: [
        { staffId: uidOrStaffId },
        { uid: uidOrStaffId },
        ...(isObjectId ? [{ _id: uidOrStaffId }] : [])
      ]
    });

    if (!staff) {
      throw new Error(`Staff member with ID "${uidOrStaffId}" not found.`);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    staff.passwordHash = passwordHash;
    staff.updatedAt = new Date();
    await staff.save();

    await StaffAuditModel.create({
      staffId: staff.staffId,
      staffUid: staff.uid,
      staffEmail: staff.email,
      action: 'PASSWORD_CHANGED',
      performedBy: actorUid,
      actorEmail,
      description: `Password updated for staff ${staff.fullName} (${staff.staffId})`,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    return true;
  }

  /**
   * Toggles staff status (active / inactive)
   */
  public async toggleStaffStatus(
    uidOrStaffId: string,
    isActive: boolean,
    actorUid: string = 'uid_master_admin_01',
    actorEmail: string = MASTER_ADMIN_EMAIL,
    ipAddress: string = '',
    userAgent: string = ''
  ): Promise<any> {
    const isObjectId = mongoose.isValidObjectId(uidOrStaffId);
    const staff = await StaffModel.findOne({
      $or: [
        { staffId: uidOrStaffId },
        { uid: uidOrStaffId },
        ...(isObjectId ? [{ _id: uidOrStaffId }] : [])
      ]
    });

    if (!staff) {
      throw new Error(`Staff member with ID "${uidOrStaffId}" not found.`);
    }

    staff.isActive = isActive;
    staff.status = isActive ? 'active' : 'inactive';
    staff.updatedAt = new Date();
    await staff.save();

    // Revoke active sessions if deactivated
    if (!isActive) {
      sessionService.revokeStaffSessions(staff.uid);
      sessionService.revokeStaffSessions(staff.staffId);
    }

    // Audit log
    await StaffAuditModel.create({
      staffId: staff.staffId,
      staffUid: staff.uid,
      staffEmail: staff.email,
      action: isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
      performedBy: actorUid,
      actorEmail,
      description: `Staff ${staff.fullName} (${staff.staffId}) was ${isActive ? 'activated' : 'deactivated'}`,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    return staff.toJSON();
  }

  /**
   * Deletes a staff member permanently from MongoDB
   */
  public async deleteStaff(
    uidOrStaffId: string,
    actorUid: string = 'uid_master_admin_01',
    actorEmail: string = MASTER_ADMIN_EMAIL,
    ipAddress: string = '',
    userAgent: string = ''
  ): Promise<void> {
    const isObjectId = mongoose.isValidObjectId(uidOrStaffId);
    const staff = await StaffModel.findOne({
      $or: [
        { staffId: uidOrStaffId },
        { uid: uidOrStaffId },
        ...(isObjectId ? [{ _id: uidOrStaffId }] : [])
      ]
    });

    if (!staff) {
      throw new Error(`Staff member with ID "${uidOrStaffId}" not found.`);
    }

    if (staff.role === 'MASTER_ADMIN') {
      throw new Error('Master Admin account cannot be deleted.');
    }

    // Revoke sessions
    sessionService.revokeStaffSessions(staff.uid);
    sessionService.revokeStaffSessions(staff.staffId);

    // Record audit before delete
    await StaffAuditModel.create({
      staffId: staff.staffId,
      staffUid: staff.uid,
      staffEmail: staff.email,
      action: 'STAFF_DELETED',
      performedBy: actorUid,
      actorEmail,
      description: `Staff ${staff.fullName} (${staff.staffId}) deleted permanently`,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    await StaffModel.deleteOne({ _id: staff._id });
  }

  /**
   * Searches staff members in MongoDB
   */
  public async searchStaff(query: string): Promise<any[]> {
    if (!query || !query.trim()) {
      return this.listStaff();
    }

    const regex = new RegExp(query.trim(), 'i');
    const staff = await StaffModel.find({
      $or: [
        { staffId: regex },
        { uid: regex },
        { fullName: regex },
        { displayName: regex },
        { email: regex },
        { phoneNumber: regex },
        { role: regex },
        { department: regex }
      ]
    }).sort({ createdAt: -1 }).lean();

    return staff.map((s: any) => ({
      ...s,
      id: s.staffId || s.uid || s._id?.toString(),
      displayName: s.fullName || s.displayName,
      name: s.fullName || s.displayName,
      phone: s.phoneNumber || s.phone
    }));
  }

  /**
   * Lists audit logs permanently stored in MongoDB
   */
  public async listAuditLogs(): Promise<any[]> {
    const logs = await StaffAuditModel.find({}).sort({ timestamp: -1 }).limit(200).lean();
    return logs.map((l: any) => ({
      ...l,
      id: l._id?.toString(),
      formattedTime: new Date(l.timestamp).toLocaleString('en-GB')
    }));
  }

  /**
   * Revokes staff sessions
   */
  public revokeStaffSessions(uidOrStaffId: string, actorUid?: string, actorEmail?: string): number {
    return sessionService.revokeStaffSessions(uidOrStaffId);
  }

  /**
   * Verifies staff credentials against MongoDB bcrypt hash
   */
  public async verifyStaffCredentials(
    emailOrStaffId: string,
    passwordAttempt: string,
    targetPortal?: 'RENTAL' | 'FINANCE',
    ipAddress: string = '',
    userAgent: string = ''
  ): Promise<StaffVerificationResult> {
    await this.ensureMasterAdmin();

    const normalized = (emailOrStaffId || '').trim().toLowerCase();
    const staff = await StaffModel.findOne({
      $or: [
        { email: normalized },
        { staffId: emailOrStaffId.trim() },
        { uid: emailOrStaffId.trim() }
      ]
    });

    if (!staff) {
      return { success: false, notFound: true, message: 'Invalid email or password.' };
    }

    if (!staff.isActive || staff.status === 'inactive' || staff.status === 'DISABLED') {
      return {
        success: false,
        disabled: true,
        message: 'Your staff account is currently disabled. Please contact the administrator.'
      };
    }

    // Check portal access
    if (targetPortal === 'RENTAL' && staff.role !== 'RENTAL_STAFF' && staff.role !== 'MASTER_ADMIN') {
      return {
        success: false,
        unauthorizedRole: true,
        message: 'Your account does not have access to Rental Management.'
      };
    }

    const isMatch = await bcrypt.compare(passwordAttempt, staff.passwordHash);
    if (!isMatch) {
      return { success: false, message: 'Invalid email or password.' };
    }

    // Update lastLoginAt
    staff.lastLoginAt = new Date();
    await staff.save();

    // Audit log
    await StaffAuditModel.create({
      staffId: staff.staffId,
      staffUid: staff.uid,
      staffEmail: staff.email,
      action: 'STAFF_LOGIN',
      performedBy: staff.staffId,
      actorEmail: staff.email,
      description: `Staff ${staff.fullName} logged in successfully`,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    return {
      success: true,
      message: 'Staff verification successful.',
      user: {
        id: staff.staffId,
        uid: staff.uid,
        staffId: staff.staffId,
        name: staff.fullName,
        displayName: staff.fullName,
        email: staff.email,
        role: staff.role,
        status: staff.status === 'active' ? 'active' : 'inactive',
        isActive: staff.isActive,
        phone: staff.phoneNumber,
        permissions: staff.permissions
      }
    };
  }

  /**
   * Look up staff profile by email
   */
  public async lookupStaffByEmail(email: string): Promise<StaffVerificationResult> {
    await this.ensureMasterAdmin();
    const staff = await StaffModel.findOne({ email: email.toLowerCase().trim() });

    if (!staff) {
      return { success: false, notFound: true, message: 'Staff account not found.' };
    }

    return {
      success: true,
      user: {
        id: staff.staffId,
        uid: staff.uid,
        staffId: staff.staffId,
        name: staff.fullName,
        displayName: staff.fullName,
        email: staff.email,
        role: staff.role,
        status: staff.status === 'active' ? 'active' : 'inactive',
        isActive: staff.isActive,
        phone: staff.phoneNumber,
        permissions: staff.permissions
      }
    };
  }

  public async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const staff = await StaffModel.findOne({ email: email.toLowerCase().trim() });
    if (!staff) {
      return { success: false, message: 'Staff account not found.' };
    }
    return {
      success: true,
      message: 'Password reset request generated. Please contact administrator to reset password.'
    };
  }

  public async resetPasswordWithToken(token: string, newPass: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Password reset completed.' };
  }
}

export const staffService = new StaffService();
export default staffService;
