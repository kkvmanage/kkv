import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}

/**
 * Sign in with Email and Password using Firebase Auth
 */
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<AuthResponse<UserCredential>> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return {
      success: true,
      data: userCredential
    };
  } catch (error: any) {
    let message = 'Failed to sign in. Please verify your credentials.';
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      message = 'Incorrect email address or password.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'The email address entered is invalid.';
    } else if (error.code === 'auth/user-disabled') {
      message = 'This user account has been disabled.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many failed login attempts. Please try again later.';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network connection error. Please check your internet connection.';
    } else if (error.message) {
      message = error.message;
    }
    return {
      success: false,
      message,
      error
    };
  }
};

/**
 * Sign in with Google Popup using Firebase Auth
 */
export const loginWithGoogle = async (): Promise<AuthResponse<UserCredential>> => {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    return {
      success: true,
      data: userCredential
    };
  } catch (error: any) {
    let message = 'Google authentication failed.';
    if (error.code === 'auth/popup-closed-by-user') {
      message = 'Google sign-in popup was closed before completing.';
    } else if (error.code === 'auth/popup-blocked') {
      message = 'Sign-in popup was blocked by your browser. Please allow popups.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      message = 'Sign-in request was cancelled.';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network connection error. Please check your internet connection.';
    } else if (error.message) {
      message = error.message;
    }
    return {
      success: false,
      message,
      error
    };
  }
};

/**
 * Send Password Reset Email using Firebase Auth
 */
export const sendPasswordReset = async (email: string): Promise<AuthResponse<void>> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return {
      success: true,
      message: 'Password reset link has been sent to your registered email.'
    };
  } catch (error: any) {
    let message = 'Failed to send password reset email.';
    if (error.code === 'auth/user-not-found') {
      message = 'No account found with this email address.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'The email address entered is invalid.';
    } else if (error.message) {
      message = error.message;
    }
    return {
      success: false,
      message,
      error
    };
  }
};

/**
 * Sign out the currently authenticated user
 */
export const logout = async (): Promise<AuthResponse<void>> => {
  try {
    await signOut(auth);
    return {
      success: true,
      message: 'Successfully logged out.'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to log out.',
      error
    };
  }
};

/**
 * Subscribe to Firebase authentication state changes
 */
export const subscribeToAuthChanges = (
  callback: (user: FirebaseUser | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current Firebase user synchronously
 */
export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const authService = {
  loginWithEmail,
  loginWithGoogle,
  sendPasswordReset,
  logout,
  subscribeToAuthChanges,
  getCurrentFirebaseUser
};

export default authService;
