import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { sessionService } from '../services/session.service.js';
import { rentalRepository } from '../repositories/rental.repository.js';
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

  // ── LOCAL EMAIL + PASSWORD LOGIN ──────────────────────────────────────────
  async login(req: Request, res: Response): Promise<void> {
    try {
      const email = (req.body?.email || req.body?.identifier || '').trim();
      const password = (req.body?.password || '').trim();

      if (!email || !password) {
        res.status(400).json({
          success: false,
          authenticated: false,
          message: 'Email and password are required.'
        });
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.loginWithPassword(email, password, clientIp, userAgent);

      if (!result.success) {
        res.status(result.unauthorized ? 403 : 401).json({
          success: false,
          authenticated: false,
          message: result.message || 'Invalid email or password.'
        });
        return;
      }

      if (result.sessionToken) {
        this.setSessionCookie(res, result.sessionToken);
      }

      res.status(200).json({
        success: true,
        authenticated: true,
        message: 'Signed in successfully',
        user: result.user,
        token: result.sessionToken
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'An error occurred during login.'
      });
    }
  }

  // ── GET CURRENT AUTHENTICATED USER ────────────────────────────────────────
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          authenticated: false,
          message: 'Not authenticated.'
        });
        return;
      }

      res.status(200).json({
        success: true,
        authenticated: true,
        user: req.user
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve user profile.'
      });
    }
  }

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const sessionToken =
        req.cookies?.rental_session ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.substring(7)
          : null);

      if (sessionToken) {
        sessionService.destroySession(sessionToken);
      }

      res.clearCookie('rental_session', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });

      res.status(200).json({
        success: true,
        message: 'Signed out successfully.'
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Error during sign out.'
      });
    }
  }

  // ── FORGOT PASSWORD ────────────────────────────────────────────────────────
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const email = (req.body?.email || '').trim();
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await authService.requestPasswordReset(email, clientIp);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Error processing password reset request.'
      });
    }
  }

  // ── RESET PASSWORD ─────────────────────────────────────────────────────────
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const token = (req.body?.token || '').trim();
      const newPassword = (req.body?.newPassword || '').trim();
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await authService.resetPassword(token, newPassword, clientIp);
      res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Error resetting password.'
      });
    }
  }

  // ── USER MANAGEMENT (RENTAL ADMIN) ─────────────────────────────────────────
  async listUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = rentalRepository.getAllUsers().map(({ passwordHash: _, ...u }) => u);
      res.status(200).json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const user = rentalRepository.createUser(req.body);
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json({ success: true, data: safeUser });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = rentalRepository.updateUser(id, req.body);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      const { passwordHash: _, ...safeUser } = user;
      res.status(200).json({ success: true, data: safeUser });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ok = rentalRepository.deleteUser(id);
      res.status(ok ? 200 : 404).json({ success: ok, message: ok ? 'User deleted' : 'User not found' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const authController = new AuthController();
