import { rentalRepository } from '../repositories/rental.repository.js';
import { sessionService } from './session.service.js';
import { config } from '../config/app.config.js';
import { UserAccount, UserRole } from '../types/rental.types.js';

export interface AuthResult {
  success: boolean;
  message?: string;
  unauthorized?: boolean;
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
      // Authenticate against central authoritative Finance staff system
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

      if (financeResponse) {
        if (!financeResponse.success) {
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

          rentalRepository.createAuditLog({
            action: 'LOGIN_FAILED',
            entityType: 'AUTH',
            entityId: cleanIdentifier,
            newValue: { reason: 'INVALID_CREDENTIALS', email: cleanIdentifier },
            ipAddress
          });
          return { success: false, message: financeResponse.message || 'Invalid email or password.' };
        }

        const centralUser = financeResponse.user;
        const normalizedRole: UserRole = (centralUser.role === 'MASTER_ADMIN' || centralUser.role === 'ADMIN' || centralUser.role === 'RENTAL_ADMIN')
          ? 'RENTAL_ADMIN'
          : 'RENTAL_STAFF';

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
