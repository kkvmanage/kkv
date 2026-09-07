import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPermissions {
  customers?: boolean;
  loans?: boolean;
  loanReceipts?: boolean;
  pendingLoans?: boolean;
  fixedDeposits?: boolean;
  fdInterest?: boolean;
  fdWithdrawal?: boolean;
  notifications?: boolean;
  adminPanel?: boolean;
  masterControl?: boolean;
  fdInterestRates?: boolean;
  bulkFdDateChange?: boolean;
  devices?: boolean;
  staffManagement?: boolean;
  settings?: boolean;
  permanentDelete?: boolean;
  rental?: boolean;
  [key: string]: boolean | undefined;
}

export type StaffRole = 'MASTER_ADMIN' | 'STAFF' | 'RENTAL_STAFF' | 'ADMIN' | 'MANAGER' | 'OPERATOR';

export interface IStaff extends Document {
  staffId: string;
  uid: string;
  fullName: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  phone: string;
  role: StaffRole;
  passwordHash: string;
  status: 'active' | 'inactive';
  isActive: boolean;
  permissions: IUserPermissions;
  department: string;
  profilePhoto?: string;
  createdByUid?: string;
  createdByEmail?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserPermissionsSchema = new Schema<IUserPermissions>(
  {
    customers: { type: Boolean, default: true },
    loans: { type: Boolean, default: true },
    loanReceipts: { type: Boolean, default: true },
    pendingLoans: { type: Boolean, default: true },
    fixedDeposits: { type: Boolean, default: true },
    fdInterest: { type: Boolean, default: true },
    fdWithdrawal: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true },
    adminPanel: { type: Boolean, default: false },
    masterControl: { type: Boolean, default: false },
    fdInterestRates: { type: Boolean, default: false },
    bulkFdDateChange: { type: Boolean, default: false },
    devices: { type: Boolean, default: false },
    staffManagement: { type: Boolean, default: false },
    settings: { type: Boolean, default: false },
    permanentDelete: { type: Boolean, default: false },
    rental: { type: Boolean, default: false }
  },
  { _id: false }
);

const StaffSchema = new Schema<IStaff>(
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
      required: [true, 'Phone number is required'],
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['MASTER_ADMIN', 'STAFF', 'RENTAL_STAFF', 'ADMIN', 'MANAGER', 'OPERATOR'],
      required: true,
      default: 'STAFF',
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
    permissions: {
      type: UserPermissionsSchema,
      default: () => ({})
    },
    department: {
      type: String,
      default: 'Finance Operations',
      trim: true
    },
    profilePhoto: {
      type: String,
      default: ''
    },
    createdByUid: {
      type: String,
      default: 'uid_master_admin_01'
    },
    createdByEmail: {
      type: String,
      default: 'goldfinancekkv@gmail.com'
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
      transform: function (doc, ret: any) {
        // Strip sensitive passwordHash before returning to frontend
        delete ret.passwordHash;
        ret.id = ret.staffId || ret.uid || ret._id?.toString();
        ret.displayName = ret.fullName || ret.displayName;
        ret.phone = ret.phoneNumber || ret.phone;
        ret.isActive = ret.status === 'active' || ret.status === 'ACTIVE' || ret.isActive === true;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Virtual aliases for seamless frontend compatibility
StaffSchema.virtual('name').get(function (this: IStaff) {
  return this.fullName;
});

StaffSchema.index({
  fullName: 'text',
  email: 'text',
  phoneNumber: 'text',
  staffId: 'text',
  role: 'text'
});

export const StaffModel = mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);
export default StaffModel;
