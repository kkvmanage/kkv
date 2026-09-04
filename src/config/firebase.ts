import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { UserProfile, UserPermissions, UserRole } from '../types';

// ====================================================
// OFFICIAL FIREBASE CONFIGURATION
// ====================================================
export const firebaseConfig = {
  apiKey: "AIzaSyCJPtgnamoaA3l_sZLpj-yDTfxQXWlC2WU",
  authDomain: "kkv-gold-f9994.firebaseapp.com",
  projectId: "kkv-gold-f9994",
  storageBucket: "kkv-gold-f9994.firebasestorage.app",
  messagingSenderId: "72452164765",
  appId: "1:72452164765:web:b3ad3d71d1dead1b25d874",
  measurementId: "G-08FX5TX7VL"
};

// ====================================================
// INITIALIZE FIREBASE SERVICES (SINGLETON)
// ====================================================
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Initialize Analytics conditionally if supported in the browser environment
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported or blocked by browser extensions
    analytics = null;
  });
}

// Google Authentication Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const MASTER_ADMIN_EMAIL = 'kkvgoldfinance13@gmail.com';

/**
 * Generates canonical default permissions for each role.
 */
export const getDefaultPermissionsForRole = (role: UserRole): UserPermissions => {
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

/**
 * Creates the Master Admin profile.
 */
export const getMasterAdminProfile = (uid: string = 'master_admin_uid', displayName: string = 'Master Admin'): UserProfile => {
  return {
    uid,
    email: MASTER_ADMIN_EMAIL,
    displayName,
    role: 'MASTER_ADMIN',
    isActive: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    permissions: getDefaultPermissionsForRole('MASTER_ADMIN')
  };
};

export {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot
};
export type { FirebaseUser };
