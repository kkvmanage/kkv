import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Firebase Diagnostic Health Check
router.get('/firebase-health', (req, res) => authController.firebaseHealth(req, res));

// Firebase Authentication (Primary Google Flow)
router.post('/firebase', (req, res) => authController.firebaseAuth(req, res));

// Google Token / OAuth Fallbacks
router.post('/google', (req, res) => authController.firebaseAuth(req, res));
router.get('/google', (req, res) => authController.getGoogleAuthUrl(req, res));
router.get('/google/callback', (req, res) => authController.googleCallback(req, res));

// Local Email/Password Fallback
router.post('/login', (req, res) => authController.login(req, res));

// Current User & Logout
router.get('/me', authenticateToken, (req, res) => authController.getCurrentUser(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// Forgot & Reset Password
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));

// Admin User Management (RENTAL_ADMIN only)
router.get('/users', authenticateToken, requireRole(['RENTAL_ADMIN']), (req, res) =>
  authController.listUsers(req, res)
);
router.post('/users', authenticateToken, requireRole(['RENTAL_ADMIN']), (req, res) =>
  authController.createUser(req, res)
);
router.put('/users/:id', authenticateToken, requireRole(['RENTAL_ADMIN']), (req, res) =>
  authController.updateUser(req, res)
);
router.patch('/users/:id/status', authenticateToken, requireRole(['RENTAL_ADMIN']), (req, res) =>
  authController.updateUser(req, res)
);
router.patch('/users/:id/role', authenticateToken, requireRole(['RENTAL_ADMIN']), (req, res) =>
  authController.updateUser(req, res)
);
router.delete('/users/:id', authenticateToken, requireRole(['RENTAL_ADMIN']), (req, res) =>
  authController.deleteUser(req, res)
);

export default router;
