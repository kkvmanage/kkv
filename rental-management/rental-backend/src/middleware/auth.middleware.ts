import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/session.service.js';
import { UserRole, UserAccount } from '../types/rental.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: Omit<UserAccount, 'passwordHash'>;
      sessionToken?: string;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract token from HTTP-only Cookie or Authorization Header
  const cookieToken = req.cookies?.rental_session;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const token = cookieToken || bearerToken;

  if (!token) {
    res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Authentication required. Please sign in.'
    });
    return;
  }

  // Local session token validation
  const { valid, user, session } = sessionService.validateSessionToken(token);

  if (valid && user && session) {
    if (user.status === 'DISABLED' || !user.isActive) {
      res.status(403).json({
        success: false,
        authenticated: false,
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
      return;
    }

    const { passwordHash: _, ...safeUser } = user;
    req.user = safeUser;
    req.sessionToken = session.sessionToken;
    next();
    return;
  }

  // Clear invalid cookie if present
  if (cookieToken) {
    res.clearCookie('rental_session', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
  }

  res.status(401).json({
    success: false,
    authenticated: false,
    message: 'Session expired or invalid. Please sign in again.'
  });
};

export const requireAuth = authenticateToken;

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to access this resource.'
      });
      return;
    }

    next();
  };
};
