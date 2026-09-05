import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { rentalRepository } from '../repositories/rental.repository.js';
import { config } from '../config/app.config.js';
import { UserAccount, UserSession } from '../types/rental.types.js';

export class SessionService {
  private sessionDurationDays = 7;

  createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): { session: UserSession; token: string } {
    // Generate high-entropy 64-character session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.sessionDurationDays * 24 * 60 * 60 * 1000).toISOString();

    const session = rentalRepository.createSession({
      userId,
      sessionToken,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    });

    return { session, token: sessionToken };
  }

  validateSessionToken(token: string): { valid: boolean; user?: UserAccount; session?: UserSession } {
    if (!token) return { valid: false };

    // Check if token is raw sessionToken
    let session = rentalRepository.findSessionByToken(token);

    // If not found, attempt JWT decode
    if (!session) {
      try {
        const decoded: any = jwt.verify(token, config.jwtSecret);
        if (decoded?.sessionToken) {
          session = rentalRepository.findSessionByToken(decoded.sessionToken);
        }
      } catch {
        // Not a valid JWT either
      }
    }

    if (!session) return { valid: false };

    const user = rentalRepository.findUserById(session.userId);
    if (!user || user.status !== 'ACTIVE' || !user.isActive) {
      return { valid: false };
    }

    return { valid: true, user, session };
  }

  invalidateSession(token: string): boolean {
    return rentalRepository.invalidateSession(token);
  }

  invalidateAllUserSessions(userId: string): void {
    rentalRepository.invalidateAllUserSessions(userId);
  }
}

export const sessionService = new SessionService();
