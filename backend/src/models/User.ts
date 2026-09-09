import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'ADMIN' | 'STAFF' | 'RENTAL_STAFF';

export interface IModuleActionPermissions {
  view?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  approve?: boolean;
  export?: boolean;
  restore?: boolean;
  [key: string]: boolean | undefined;
}

export interface IUserPermissions {
  dashboard: { view: boolean };
  customers: { view: boolean; create: boolean; update: boolean; delete: boolean };
  loans: { view: boolean; create: boolean; update: boolean; delete: boolean; approve: boolean };
  receipts: { view: boolean; create: boolean; update: boolean; delete: boolean };
  fd: { view: boolean; create: boolean; update: boolean; delete: boolean };
  accounting: { view: boolean; create: boolean; update: boolean; delete: boolean };
  rental: { view: boolean; create: boolean; update: boolean; delete: boolean; approve: boolean };
  reports: { view: boolean; export: boolean };
  staffManagement: { view: boolean; create: boolean; update: boolean; delete: boolean };
  settings: { view: boolean; update: boolean };
  backupRestore: { view: boolean; create: boolean; restore: boolean; delete: boolean };
  [key: string]: any;
}

export const ADMIN_DEFAULT_PERMISSIONS: IUserPermissions = {
  dashboard: { view: true },
  customers: { view: true, create: true, update: true, delete: true },
  loans: { view: true, create: true, update: true, delete: true, approve: true },
  receipts: { view: true, create: true, update: true, delete: true },
  fd: { view: true, create: true, update: true, delete: true },
  accounting: { view: true, create: true, update: true, delete: true },
  rental: { view: true, create: true, update: true, delete: true, approve: true },
  reports: { view: true, export: true },
  staffManagement: { view: true, create: true, update: true, delete: true },
  settings: { view: true, update: true },
  backupRestore: { view: true, create: true, restore: true, delete: true }
};

export const STAFF_DEFAULT_PERMISSIONS: IUserPermissions = {
  dashboard: { view: true },
  customers: { view: true, create: true, update: true, delete: false },
  loans: { view: true, create: true, update: true, delete: false, approve: true },
  receipts: { view: true, create: true, update: false, delete: false },
  fd: { view: true, create: true, update: true, delete: false },
  accounting: { view: true, create: true, update: true, delete: false },
  rental: { view: false, create: false, update: false, delete: false, approve: false },
  reports: { view: true, export: true },
  staffManagement: { view: false, create: false, update: false, delete: false },
  settings: { view: false, update: false },
  backupRestore: { view: false, create: false, restore: false, delete: false }
};

export const RENTAL_STAFF_DEFAULT_PERMISSIONS: IUserPermissions = {
  dashboard: { view: true },
  customers: { view: false, create: false, update: false, delete: false },
  loans: { view: false, create: false, update: false, delete: false, approve: false },
  receipts: { view: false, create: false, update: false, delete: false },
  fd: { view: false, create: false, update: false, delete: false },
  accounting: { view: false, create: false, update: false, delete: false },
  rental: { view: true, create: true, update: true, delete: false, approve: true },
  reports: { view: true, export: true },
  staffManagement: { view: false, create: false, update: false, delete: false },
  settings: { view: false, update: false },
  backupRestore: { view: false, create: false, restore: false, delete: false }
};

export const getDefaultPermissionsForRole = (role?: string | null): IUserPermissions => {
  const norm = (role || '').toUpperCase();
  if (norm === 'ADMIN' || norm === 'MASTER_ADMIN') {
    return JSON.parse(JSON.stringify(ADMIN_DEFAULT_PERMISSIONS));
  }
  if (norm === 'RENTAL_STAFF') {
    return JSON.parse(JSON.stringify(RENTAL_STAFF_DEFAULT_PERMISSIONS));
  }
  return JSON.parse(JSON.stringify(STAFF_DEFAULT_PERMISSIONS));
};

/**
 * Helper to normalize legacy flat permissions into structured module-action permissions
 */
export const normalizeUserPermissions = (rawPermissions: any, role: string): IUserPermissions => {
  const baseDefaults = getDefaultPermissionsForRole(role);
  if (!rawPermissions || typeof rawPermissions !== 'object') {
    return baseDefaults;
  }

  // If already structured with module objects
  if (rawPermissions.customers && typeof rawPermissions.customers === 'object') {
    return {
      dashboard: { ...baseDefaults.dashboard, ...(rawPermissions.dashboard || {}) },
      customers: { ...baseDefaults.customers, ...(rawPermissions.customers || {}) },
      loans: { ...baseDefaults.loans, ...(rawPermissions.loans || {}) },
      receipts: { ...baseDefaults.receipts, ...(rawPermissions.receipts || {}) },
      fd: { ...baseDefaults.fd, ...(rawPermissions.fd || {}) },
      accounting: { ...baseDefaults.accounting, ...(rawPermissions.accounting || {}) },
      rental: { ...baseDefaults.rental, ...(rawPermissions.rental || {}) },
      reports: { ...baseDefaults.reports, ...(rawPermissions.reports || {}) },
      staffManagement: { ...baseDefaults.staffManagement, ...(rawPermissions.staffManagement || {}) },
      settings: { ...baseDefaults.settings, ...(rawPermissions.settings || {}) },
      backupRestore: { ...baseDefaults.backupRestore, ...(rawPermissions.backupRestore || {}) }
    };
  }

  // Handle legacy flat boolean permissions migration
  const merged: IUserPermissions = JSON.parse(JSON.stringify(baseDefaults));
  if (typeof rawPermissions.customers === 'boolean') {
    merged.customers.view = rawPermissions.customers;
    merged.customers.create = rawPermissions.customers;
    merged.customers.update = rawPermissions.customers;
  }
  if (typeof rawPermissions.loans === 'boolean') {
    merged.loans.view = rawPermissions.loans;
    merged.loans.create = rawPermissions.loans;
    merged.loans.update = rawPermissions.loans;
  }
  if (typeof rawPermissions.loanReceipts === 'boolean') {
    merged.receipts.view = rawPermissions.loanReceipts;
    merged.receipts.create = rawPermissions.loanReceipts;
  }
  if (typeof rawPermissions.fixedDeposits === 'boolean') {
    merged.fd.view = rawPermissions.fixedDeposits;
    merged.fd.create = rawPermissions.fixedDeposits;
    merged.fd.update = rawPermissions.fixedDeposits;
  }
  if (typeof rawPermissions.rental === 'boolean' || typeof rawPermissions.rentalManagement === 'boolean') {
    const rVal = rawPermissions.rental ?? rawPermissions.rentalManagement;
    merged.rental.view = rVal;
    merged.rental.create = rVal;
    merged.rental.update = rVal;
  }
  if (typeof rawPermissions.staffManagement === 'boolean') {
    merged.staffManagement.view = rawPermissions.staffManagement;
    merged.staffManagement.create = rawPermissions.staffManagement;
  }
  if (typeof rawPermissions.settings === 'boolean' || typeof rawPermissions.adminPanel === 'boolean') {
    const sVal = rawPermissions.settings ?? rawPermissions.adminPanel;
    merged.settings.view = sVal;
    merged.settings.update = sVal;
  }
  if (typeof rawPermissions.permanentDelete === 'boolean') {
    merged.customers.delete = rawPermissions.permanentDelete;
    merged.loans.delete = rawPermissions.permanentDelete;
    merged.fd.delete = rawPermissions.permanentDelete;
  }
  return merged;
};

export interface IUser extends Document {
  staffId: string;
  uid: string;
  name: string;
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  phoneNumber: string;
  role: UserRole;
  passwordHash: string;
  status: 'active' | 'inactive' | 'ACTIVE' | 'DISABLED';
  isActive: boolean;
  mustChangePassword: boolean;
  permissions: IUserPermissions;
  department: string;
  profilePhoto?: string;
  createdByUid?: string;
  createdByEmail?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const UserPermissionsSchema = new Schema(
  {
    dashboard: {
      view: { type: Boolean, default: true }
    },
    customers: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    loans: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: true }
    },
    receipts: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    fd: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    accounting: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    rental: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: false }
    },
    reports: {
      view: { type: Boolean, default: true },
      export: { type: Boolean, default: true }
    },
    staffManagement: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    settings: {
      view: { type: Boolean, default: false },
      update: { type: Boolean, default: false }
    },
    backupRestore: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      restore: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }
  },
  { _id: false, strict: false }
);

export const UserSchema = new Schema<IUser>(
  {
    staffId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true
    },
    displayName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phoneNumber: {
      type: String,
      default: '',
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    role: {
      type: String,
      enum: ['ADMIN', 'STAFF', 'MASTER_ADMIN', 'RENTAL_STAFF'],
      required: true,
      default: 'STAFF',
      set: (v: string) => {
        if (v === 'MASTER_ADMIN') return 'ADMIN';
        return v;
      },
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'ACTIVE', 'DISABLED'],
      default: 'active',
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    },
    permissions: {
      type: Schema.Types.Mixed,
      default: function (this: any) {
        return getDefaultPermissionsForRole(this?.role || 'STAFF');
      }
    },
    department: {
      type: String,
      default: 'Operations',
      trim: true
    },
    profilePhoto: {
      type: String,
      default: ''
    },
    createdByUid: {
      type: String,
      default: 'SYSTEM'
    },
    createdByEmail: {
      type: String,
      default: 'admin@kkvgoldfinance.com'
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        delete ret.passwordHash;
        ret.id = ret.staffId || ret.uid || ret._id?.toString();
        ret.name = ret.fullName || ret.displayName;
        ret.displayName = ret.fullName || ret.displayName;
        ret.phone = ret.phoneNumber || ret.phone;
        ret.isActive = ret.status === 'active' || ret.status === 'ACTIVE' || ret.isActive === true;
        if (ret.role === 'MASTER_ADMIN') ret.role = 'ADMIN';
        ret.permissions = normalizeUserPermissions(ret.permissions, ret.role);
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        if (ret.role === 'MASTER_ADMIN') ret.role = 'ADMIN';
        ret.permissions = normalizeUserPermissions(ret.permissions, ret.role);
        return ret;
      }
    }
  }
);

UserSchema.virtual('name').get(function (this: IUser) {
  return this.fullName;
});

UserSchema.index({
  fullName: 'text',
  email: 'text',
  phoneNumber: 'text',
  staffId: 'text',
  role: 'text'
});

export const UserModel = mongoose.models.User || mongoose.models.Staff || mongoose.model<IUser>('User', UserSchema, 'staffs');
export default UserModel;
