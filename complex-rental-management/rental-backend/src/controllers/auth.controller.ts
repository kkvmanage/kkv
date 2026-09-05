import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { sessionService } from '../services/session.service.js';
import { googleAuthService } from '../services/googleAuth.service.js';
import { rentalRepository } from '../repositories/rental.repository.js';
import { firebaseAdmin } from '../config/firebaseAdmin.js';
import { config } from '../config/app.config.js';

export class AuthController {
  // Helper to set secure HTTP-only cookie
  private setSessionCookie(res: Response, sessionToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('rental_session', sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
  }

  // ── FIREBASE HEALTH DIAGNOSTIC ─────────────────────────────────────────────
  async firebaseHealth(_req: Request, res: Response): Promise<void> {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'otp-site-80c03';
    res.status(200).json({
      success: true,
      firebaseConfigured: true,
      projectId,
      adminInitialized: firebaseAdmin.apps.length > 0,
      timestamp: new Date().toISOString()
    });
  }

  // ── FIREBASE AUTHENTICATION (PRIMARY GOOGLE SIGN-IN) ───────────────────────
  async firebaseAuth(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
      const idToken = (bearerToken || req.body?.idToken || req.body?.token || req.body?.credential || '').trim();

      if (!idToken) {
        res.status(400).json({
          success: false,
          authenticated: false,
          errorCode: 'FIREBASE_TOKEN_MISSING',
          message: 'Firebase ID token is required for authentication.'
        });
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.loginWithFirebaseToken(idToken, clientIp, userAgent);

      if (!result.success) {
        if (result.unauthorized) {
          // Valid Google identity but unauthorized or disabled in Rental DB -> 403 Forbidden
          res.status(403).json({
            success: false,
            authenticated: false,
            unauthorized: true,
            message: result.message || 'Your Google account is not authorized to access the Rental Management Portal.'
          });
          return;
        }

        // Invalid or expired Firebase ID token -> 401 Unauthorized
        res.status(401).json({
          success: false,
          authenticated: false,
          errorCode: 'FIREBASE_TOKEN_INVALID',
          message: result.message || 'Google authentication could not be verified. Please sign in again.'
        });
        return;
      }

      if (result.sessionToken) {
        this.setSessionCookie(res, result.sessionToken);
      }

      res.status(200).json({
        success: true,
        authenticated: true,
        message: 'Firebase Google authentication successful',
        user: result.user,
        token: result.sessionToken
      });
    } catch (err: any) {
      console.error('[AuthController] firebaseAuth unexpected error:', err);
      res.status(500).json({
        success: false,
        authenticated: false,
        message: err.message || 'Internal server error during authentication.'
      });
    }
  }

  // ── GOOGLE OAUTH URL (FALLBACK) ────────────────────────────────────────────
  async getGoogleAuthUrl(req: Request, res: Response): Promise<void> {
    try {
      const state = req.query.state as string;
      const url = googleAuthService.getAuthorizationUrl(state);
      res.status(200).json({ success: true, url });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Failed to generate OAuth URL' });
    }
  }

  // ── GOOGLE OAUTH CALLBACK (REDIRECT FLOW) ──────────────────────────────────
  async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, error } = req.query;

      if (error) {
        res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent('Google authentication was cancelled.')}`);
        return;
      }

      if (!code || typeof code !== 'string') {
        res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent('Invalid OAuth callback parameter.')}`);
        return;
      }

      const googleUser = await googleAuthService.getTokensFromCode(code);
      if (!googleUser) {
        res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent('Failed to retrieve user profile from Google.')}`);
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.loginWithGoogle(googleUser, clientIp, userAgent);

      if (!result.success) {
        const errorMsg = result.message || 'Google account not authorized.';
        res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent(errorMsg)}&email=${encodeURIComponent(googleUser.email)}`);
        return;
      }

      if (result.sessionToken) {
        this.setSessionCookie(res, result.sessionToken);
      }

      // Redirect to rental staff dashboard with token parameter as well
      res.redirect(`${config.frontendUrl}/rental/dashboard?auth=success&token=${result.sessionToken}`);
    } catch (err: any) {
      console.error('[AuthController] googleCallback error:', err);
      res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent('An unexpected error occurred during Google sign-in.')}`);
    }
  }

  // ── LOCAL PASSWORD LOGIN (OPTIONAL FALLBACK) ───────────────────────────────
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password } = req.body;
      const identifier = (email || username || '').trim();

      if (!identifier || !password) {
        res.status(400).json({ success: false, message: 'Email/username and password are required' });
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.loginWithPassword(identifier, password, clientIp, userAgent);

      if (!result.success) {
        if (result.unauthorized) {
          res.status(403).json({
            success: false,
            unauthorized: true,
            message: result.message || 'Access denied'
          });
          return;
        }

        res.status(401).json({
          success: false,
          message: result.message || 'Invalid email or password.'
        });
        return;
      }

      if (result.sessionToken) {
        this.setSessionCookie(res, result.sessionToken);
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token: result.sessionToken,
        user: result.user
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Login failed' });
    }
  }

  // ── CURRENT AUTHENTICATED USER ─────────────────────────────────────────────
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, authenticated: false, message: 'Not authenticated' });
        return;
      }

      res.status(200).json({
        success: true,
        authenticated: true,
        user: req.user
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch user' });
    }
  }

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const cookieToken = req.cookies?.rental_session;
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const token = cookieToken || bearerToken || req.sessionToken;

      if (token) {
        sessionService.invalidateSession(token);
      }

      if (req.user) {
        rentalRepository.createAuditLog({
          action: 'LOGOUT',
          entityType: 'AUTH',
          entityId: req.user.id,
          userEmail: req.user.email
        });
      }

      res.clearCookie('rental_session', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });

      res.status(200).json({ success: true, message: 'Signed out successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Logout failed' });
    }
  }

  // ── FORGOT PASSWORD ────────────────────────────────────────────────────────
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email || !email.trim()) {
        res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await authService.requestPasswordReset(email.trim(), clientIp);

      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Failed to process password reset request.' });
    }
  }

  // ── RESET PASSWORD ─────────────────────────────────────────────────────────
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ success: false, message: 'Token and new password are required.' });
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await authService.resetPassword(token, newPassword, clientIp);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Failed to reset password.' });
    }
  }

  // ── ADMIN: LIST USERS ──────────────────────────────────────────────────────
  async listUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = rentalRepository.getUsers().map(({ passwordHash: _, ...safe }) => safe);
      res.status(200).json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Failed to list users' });
    }
  }

  // ── ADMIN: CREATE / AUTHORIZE USER ─────────────────────────────────────────
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, role, authProvider, password } = req.body;

      if (!email || !email.trim()) {
        res.status(400).json({ success: false, message: 'Email is required' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = rentalRepository.findUserByEmail(cleanEmail);
      if (existing) {
        res.status(409).json({ success: false, message: 'A user with this email already exists.' });
        return;
      }

      const bcrypt = await import('bcryptjs');
      const passwordHash = password ? bcrypt.default.hashSync(password, 10) : null;

      const newUser = rentalRepository.createUser({
        email: cleanEmail,
        name: (name || cleanEmail.split('@')[0]).trim(),
        role: role === 'RENTAL_ADMIN' ? 'RENTAL_ADMIN' : 'RENTAL_STAFF',
        status: 'ACTIVE',
        authProvider: authProvider || (password ? 'BOTH' : 'GOOGLE'),
        passwordHash,
        profileImage: null,
        lastLoginAt: null
      });

      rentalRepository.createAuditLog({
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: newUser.id,
        userEmail: req.user?.email,
        newValue: { email: newUser.email, role: newUser.role }
      });

      const { passwordHash: _, ...safeUser } = newUser;
      res.status(201).json({
        success: true,
        message: 'Staff user authorized successfully',
        data: safeUser
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Failed to create user' });
    }
  }

  // ── ADMIN: UPDATE USER STATUS / ROLE ───────────────────────────────────────
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role, status, name } = req.body;

      const existing = rentalRepository.findUserById(id);
      if (!existing) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const updates: any = {};
      if (role) updates.role = role;
      if (status) updates.status = status;
      if (name) updates.name = name;

      const updated = rentalRepository.updateUser(id, updates);

      if (status === 'DISABLED') {
        sessionService.invalidateAllUserSessions(id);
        rentalRepository.createAuditLog({
          action: 'USER_DISABLED',
          entityType: 'USER',
          entityId: id,
          userEmail: req.user?.email
        });
      } else if (role && role !== existing.role) {
        rentalRepository.createAuditLog({
          action: 'USER_ROLE_CHANGED',
          entityType: 'USER',
          entityId: id,
          userEmail: req.user?.email,
          oldValue: { role: existing.role },
          newValue: { role }
        });
      }

      const { passwordHash: _, ...safeUser } = updated!;
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: safeUser
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Failed to update user' });
    }
  }

  // ── ADMIN: DELETE USER ─────────────────────────────────────────────────────
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        return;
      }

      const existing = rentalRepository.findUserById(id);
      if (!existing) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      sessionService.invalidateAllUserSessions(id);
      rentalRepository.deleteUser(id);

      rentalRepository.createAuditLog({
        action: 'DELETE',
        entityType: 'USER',
        entityId: id,
        userEmail: req.user?.email,
        oldValue: { email: existing.email, role: existing.role }
      });

      res.status(200).json({ success: true, message: 'User removed successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Failed to delete user' });
    }
  }
}

export const authController = new AuthController();
