import { rentalRepository } from '../repositories/rental.repository.js';
import { sessionService } from './session.service.js';
import { GoogleUserInfo } from './googleAuth.service.js';
import { verifyFirebaseIdToken, VerifiedFirebaseUser } from '../config/firebaseAdmin.js';
import { config } from '../config/app.config.js';
import { UserAccount, UserRole } from '../types/rental.types.js';

export interface AuthResult {
  success: boolean;
  message?: string;
  unauthorized?: boolean;
  isGoogleAccount?: boolean;
  user?: Omit<UserAccount, 'passwordHash'>;
  sessionToken?: string;
  devResetLink?: string;
}

export class AuthService {
  // ── SHARED EMAIL + PASSWORD AUTHENTICATION VIA FINANCE SYSTEM ─────────────
  async loginWithPassword(
    identifier: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const cleanIdentifier = (identifier || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanIdentifier || !cleanPassword) {
      return { success: false, message: 'Email and password are required.' };
    }

    try {
      // 1. Authenticate against central authoritative Finance staff system
      const verifyEndpoint = `${config.financeBackendUrl}/api/staff/verify-staff`;
      let financeResponse: any = null;
      let networkError = false;

      try {
        const res = await fetch(verifyEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanIdentifier, password: cleanPassword })
        });
        financeResponse = await res.json();
      } catch (fetchErr) {
        console.warn('[AuthService] Central Finance auth endpoint unavailable, evaluating local fallback:', fetchErr);
        networkError = true;
      }

      // If central endpoint responded
      if (financeResponse) {
        if (!financeResponse.success) {
          // Account Disabled
          if (financeResponse.disabled) {
            rentalRepository.createAuditLog({
              action: 'ACCOUNT_DISABLED',
              entityType: 'AUTH',
              entityId: cleanIdentifier,
              newValue: { reason: 'ACCOUNT_DISABLED_IN_FINANCE_SYSTEM', email: cleanIdentifier },
              ipAddress
            });
            return {
              success: false,
              unauthorized: true,
              message: 'Your staff account is currently disabled. Please contact the administrator.'
            };
          }

          // Unauthorized Role (e.g. OPERATOR or MANAGER not allowed for Rental)
          if (financeResponse.unauthorizedRole) {
            rentalRepository.createAuditLog({
              action: 'UNAUTHORIZED_RENTAL_ACCESS',
              entityType: 'AUTH',
              entityId: cleanIdentifier,
              newValue: { reason: 'ROLE_NOT_AUTHORIZED_FOR_RENTAL', email: cleanIdentifier },
              ipAddress
            });
            return {
              success: false,
              unauthorized: true,
              message: 'Your account does not have access to Rental Management.'
            };
          }

          // Invalid Credentials
          rentalRepository.createAuditLog({
            action: 'LOGIN_FAILED',
            entityType: 'AUTH',
            entityId: cleanIdentifier,
            newValue: { reason: 'INVALID_CREDENTIALS', email: cleanIdentifier },
            ipAddress
          });
          return { success: false, message: financeResponse.message || 'Invalid email or password.' };
        }

        // Central verification succeeded!
        const centralUser = financeResponse.user;
        const normalizedRole: UserRole = (centralUser.role === 'MASTER_ADMIN' || centralUser.role === 'ADMIN' || centralUser.role === 'RENTAL_ADMIN')
          ? 'RENTAL_ADMIN'
          : 'RENTAL_STAFF';

        // Synchronize / link user metadata in Rental DB without copying password
        let rentalUser = rentalRepository.findUserByEmail(centralUser.email.toLowerCase());

        if (rentalUser) {
          rentalUser = rentalRepository.updateUser(rentalUser.id, {
            name: centralUser.name || centralUser.displayName || rentalUser.name,
            displayName: centralUser.displayName || centralUser.name || rentalUser.displayName,
            role: normalizedRole,
            status: centralUser.status || 'ACTIVE',
            isActive: centralUser.status === 'ACTIVE',
            phone: centralUser.phone || rentalUser.phone,
            lastLoginAt: new Date().toISOString()
          })!;
        } else {
          rentalUser = rentalRepository.createUser({
            email: centralUser.email.toLowerCase(),
            name: centralUser.name || centralUser.displayName || 'Staff Member',
            displayName: centralUser.displayName || centralUser.name || 'Staff Member',
            role: normalizedRole,
            status: 'ACTIVE',
            isActive: true,
            authProvider: 'LOCAL',
            phone: centralUser.phone
          });
        }

        // Create secure Rental session
        const { session, token } = sessionService.createSession(rentalUser.id, ipAddress, userAgent);

        rentalRepository.createAuditLog({
          action: 'LOGIN_SUCCESS',
          entityType: 'AUTH',
          entityId: rentalUser.id,
          userEmail: rentalUser.email,
          newValue: { sessionId: session.id, role: normalizedRole, provider: 'CENTRAL_FINANCE' },
          ipAddress
        });

        const { passwordHash: _, ...safeUser } = rentalUser;
        return {
          success: true,
          message: 'Login successful',
          user: safeUser,
          sessionToken: token
        };
      }

      // If Central Finance backend is completely unreachable
      if (networkError) {
        return {
          success: false,
          message: 'Unable to sign in right now. Please try again later.'
        };
      }

      return { success: false, message: 'Invalid email or password.' };
    } catch (err: any) {
      console.error('[AuthService] loginWithPassword error:', err);
      return { success: false, message: err.message || 'Authentication failed.' };
    }
  }

  // ── FIREBASE GOOGLE AUTHENTICATION ──────────────────────────────────────────
  async loginWithFirebaseToken(
    idToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    if (!idToken) {
      return {
        success: false,
        message: 'Firebase ID Token is required for authentication.',
      };
    }

    const firebaseUser: VerifiedFirebaseUser | null = await verifyFirebaseIdToken(idToken);

    if (!firebaseUser) {
      rentalRepository.createAuditLog({
        action: 'TOKEN_VERIFICATION_FAILED',
        entityType: 'AUTH',
        entityId: 'UNKNOWN',
        newValue: { reason: 'INVALID_OR_EXPIRED_FIREBASE_TOKEN' },
        ipAddress,
      });

      return {
        success: false,
        message: 'Invalid or expired Firebase authentication token. Please sign in again.',
      };
    }

    const email = firebaseUser.email.toLowerCase().trim();

    // 1. Authoritative Lookup in Central Finance Staff System
    const lookupEndpoint = `${config.financeBackendUrl}/api/staff/lookup`;
    let centralStaffResponse: any = null;
    let networkError = false;

    try {
      const res = await fetch(lookupEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      centralStaffResponse = await res.json();
    } catch (fetchErr) {
      console.warn('[AuthService] Central Finance staff lookup endpoint unavailable:', fetchErr);
      networkError = true;
    }

    if (centralStaffResponse) {
      if (!centralStaffResponse.success) {
        // Disabled Staff Account in Finance
        if (centralStaffResponse.disabled) {
          rentalRepository.createAuditLog({
            action: 'ACCOUNT_DISABLED',
            entityType: 'AUTH',
            entityId: email,
            userEmail: email,
            newValue: { reason: 'ACCOUNT_DISABLED_IN_FINANCE_SYSTEM', email, firebaseUid: firebaseUser.uid },
            ipAddress,
          });

          return {
            success: false,
            unauthorized: true,
            message: 'Your staff account is currently disabled. Please contact the administrator.',
          };
        }

        // Unauthorized Role in Finance
        if (centralStaffResponse.unauthorizedRole) {
          rentalRepository.createAuditLog({
            action: 'UNAUTHORIZED_RENTAL_ACCESS',
            entityType: 'AUTH',
            entityId: email,
            userEmail: email,
            newValue: { reason: 'ROLE_NOT_AUTHORIZED_FOR_RENTAL', email, firebaseUid: firebaseUser.uid },
            ipAddress,
          });

          return {
            success: false,
            unauthorized: true,
            message: 'Your account does not have access to Rental Management.',
          };
        }

        // Account not found in Finance
        rentalRepository.createAuditLog({
          action: 'UNAUTHORIZED_GOOGLE_LOGIN',
          entityType: 'AUTH',
          entityId: email,
          newValue: {
            email,
            name: firebaseUser.name,
            firebaseUid: firebaseUser.uid,
            reason: 'STAFF_NOT_FOUND_IN_FINANCE_SYSTEM',
          },
          ipAddress,
        });

        return {
          success: false,
          unauthorized: true,
          message:
            'Your Google account is not authorized to access the Rental Management Portal. Please contact the administrator.',
        };
      }

      // 2. Authorized Central Staff Account Verified!
      const centralUser = centralStaffResponse.user;
      const normalizedRole: UserRole = (centralUser.role === 'MASTER_ADMIN' || centralUser.role === 'ADMIN' || centralUser.role === 'RENTAL_ADMIN')
        ? 'RENTAL_ADMIN'
        : 'RENTAL_STAFF';

      let rentalUser = rentalRepository.findUserByEmail(email);
      const isFirstLinking = !rentalUser || !rentalUser.firebaseUid;

      if (rentalUser) {
        rentalUser = rentalRepository.updateUser(rentalUser.id, {
          firebaseUid: firebaseUser.uid,
          googleId: firebaseUser.uid,
          profileImage: firebaseUser.picture || rentalUser.profileImage,
          name: centralUser.name || centralUser.displayName || rentalUser.name,
          displayName: centralUser.displayName || centralUser.name || rentalUser.displayName,
          role: normalizedRole,
          status: 'ACTIVE',
          isActive: true,
          phone: centralUser.phone || rentalUser.phone,
          lastLoginAt: new Date().toISOString(),
        })!;
      } else {
        rentalUser = rentalRepository.createUser({
          email: centralUser.email.toLowerCase(),
          name: centralUser.name || centralUser.displayName || firebaseUser.name || 'Staff Member',
          displayName: centralUser.displayName || centralUser.name || firebaseUser.name || 'Staff Member',
          role: normalizedRole,
          status: 'ACTIVE',
          isActive: true,
          authProvider: 'GOOGLE',
          firebaseUid: firebaseUser.uid,
          googleId: firebaseUser.uid,
          profileImage: firebaseUser.picture,
          phone: centralUser.phone
        });
      }

      const { session, token } = sessionService.createSession(rentalUser.id, ipAddress, userAgent);

      if (isFirstLinking) {
        rentalRepository.createAuditLog({
          action: 'GOOGLE_ACCOUNT_LINKED',
          entityType: 'AUTH',
          entityId: rentalUser.id,
          userEmail: rentalUser.email,
          newValue: { firebaseUid: firebaseUser.uid, email: rentalUser.email },
          ipAddress,
        });
      }

      rentalRepository.createAuditLog({
        action: 'GOOGLE_LOGIN_SUCCESS',
        entityType: 'AUTH',
        entityId: rentalUser.id,
        userEmail: rentalUser.email,
        newValue: { sessionId: session.id, authProvider: 'FIREBASE_GOOGLE', role: normalizedRole },
        ipAddress,
      });

      const { passwordHash: _, ...safeUser } = rentalUser;
      return {
        success: true,
        message: 'Google authentication successful',
        user: safeUser,
        sessionToken: token,
      };
    }

    if (networkError) {
      return {
        success: false,
        message: 'Unable to verify staff authorization right now. Please try again later.',
      };
    }

    return {
      success: false,
      unauthorized: true,
      message: 'Your Google account is not authorized to access the Rental Management Portal.',
    };
  }

  // ── GOOGLE OAUTH CALLBACK SIGN-IN ──────────────────────────────────────────
  async loginWithGoogle(
    googleUser: GoogleUserInfo,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const email = googleUser.email.toLowerCase().trim();

    // 1. Authoritative Lookup in Central Finance Staff System
    const lookupEndpoint = `${config.financeBackendUrl}/api/staff/lookup`;
    let centralStaffResponse: any = null;

    try {
      const res = await fetch(lookupEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      centralStaffResponse = await res.json();
    } catch (fetchErr) {
      console.warn('[AuthService] Central Finance staff lookup failed:', fetchErr);
    }

    if (!centralStaffResponse || !centralStaffResponse.success) {
      if (centralStaffResponse?.disabled) {
        return {
          success: false,
          unauthorized: true,
          message: 'Your staff account is currently disabled. Please contact the administrator.',
        };
      }
      if (centralStaffResponse?.unauthorizedRole) {
        return {
          success: false,
          unauthorized: true,
          message: 'Your account does not have access to Rental Management.',
        };
      }
      return {
        success: false,
        unauthorized: true,
        message: 'Your Google account is not authorized to access the Rental Management Portal.',
      };
    }

    const centralUser = centralStaffResponse.user;
    const normalizedRole: UserRole = (centralUser.role === 'MASTER_ADMIN' || centralUser.role === 'ADMIN' || centralUser.role === 'RENTAL_ADMIN')
      ? 'RENTAL_ADMIN'
      : 'RENTAL_STAFF';

    let rentalUser = rentalRepository.findUserByEmail(email);

    if (rentalUser) {
      rentalUser = rentalRepository.updateUser(rentalUser.id, {
        googleId: googleUser.googleId,
        profileImage: googleUser.picture || rentalUser.profileImage,
        name: centralUser.name || centralUser.displayName || rentalUser.name,
        displayName: centralUser.displayName || centralUser.name || rentalUser.displayName,
        role: normalizedRole,
        status: 'ACTIVE',
        isActive: true,
        phone: centralUser.phone || rentalUser.phone,
        lastLoginAt: new Date().toISOString(),
      })!;
    } else {
      rentalUser = rentalRepository.createUser({
        email: centralUser.email.toLowerCase(),
        name: centralUser.name || centralUser.displayName || googleUser.name || 'Staff Member',
        displayName: centralUser.displayName || centralUser.name || googleUser.name || 'Staff Member',
        role: normalizedRole,
        status: 'ACTIVE',
        isActive: true,
        authProvider: 'GOOGLE',
        googleId: googleUser.googleId,
        profileImage: googleUser.picture,
        phone: centralUser.phone
      });
    }

    const { token } = sessionService.createSession(rentalUser.id, ipAddress, userAgent);

    const { passwordHash: _, ...safeUser } = rentalUser;
    return {
      success: true,
      message: 'Google authentication successful',
      user: safeUser,
      sessionToken: token,
    };
  }

  // ── FORGOT PASSWORD / CENTRAL STAFF RECOVERY ───────────────────────────────
  async requestPasswordReset(email: string, ipAddress?: string): Promise<AuthResult> {
    const cleanEmail = (email || '').toLowerCase().trim();
    const genericSuccessMessage =
      'If an account exists for this email, a password reset link has been sent.';

    if (!cleanEmail) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    rentalRepository.createAuditLog({
      action: 'PASSWORD_RESET_REQUEST',
      entityType: 'AUTH',
      entityId: cleanEmail,
      userEmail: cleanEmail,
      ipAddress,
    });

    // Route through central Finance backend password reset request
    try {
      const res = await fetch(`${config.financeBackendUrl}/api/staff/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      return {
        success: true,
        message: data.message || genericSuccessMessage,
        devResetLink: data.devResetLink
      };
    } catch (err) {
      console.warn('[AuthService] Central password reset request fallback:', err);
      return { success: true, message: genericSuccessMessage };
    }
  }

  // ── RESET PASSWORD WITH TOKEN ──────────────────────────────────────────────
  async resetPassword(
    rawToken: string,
    newPassword: string,
    ipAddress?: string
  ): Promise<AuthResult> {
    if (!rawToken || !newPassword) {
      return { success: false, message: 'Reset token and new password are required.' };
    }

    // Delegate password update to central Finance backend
    try {
      const res = await fetch(`${config.financeBackendUrl}/api/staff/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken, newPassword })
      });
      const data = await res.json();

      if (!data.success) {
        return {
          success: false,
          message: data.message || 'Password reset link is invalid or has expired.'
        };
      }

      rentalRepository.createAuditLog({
        action: 'PASSWORD_RESET_SUCCESS',
        entityType: 'AUTH',
        entityId: rawToken,
        ipAddress,
      });

      return {
        success: true,
        message: data.message || 'Password has been reset successfully. You can now sign in with your new password.'
      };
    } catch (err) {
      return {
        success: false,
        message: 'Failed to reset password. Please try again.'
      };
    }
  }
}

export const authService = new AuthService();
