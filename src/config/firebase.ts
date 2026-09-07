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
// AUTHORITATIVE FIREBASE CONFIGURATION (kkv-gold-finance)
// ====================================================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyC0z5Z3MAStIA88bRhQlbTzG2TWvEnc-Vg",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "kkv-gold-finance.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "kkv-gold-finance",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "kkv-gold-finance.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "1078096093903",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:1078096093903:web:74480b31fca9d9adec4dba",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-8DVJ631E0Y"
};

// Debugging output for verification
console.log("Firebase Config:", {
  apiKey: firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// ====================================================
// INITIALIZE FIREBASE SERVICES (SINGLETON)
// ====================================================
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Initialize Analytics conditionally and safely without crashing
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (analyticsErr) {
        console.warn('[Firebase Analytics] Analytics initialization skipped:', analyticsErr);
        analytics = null;
      }
    }
  }).catch((err) => {
    console.warn('[Firebase Analytics] Not supported in this environment:', err);
    analytics = null;
  });
}

// Google Authentication Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const MASTER_ADMIN_EMAIL = 'goldfinancekkv@gmail.com';

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
        permanentDelete: true,
        rentalManagement: true
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
        rentalManagement: true
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
        rentalManagement: false
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
