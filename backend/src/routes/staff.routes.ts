import { Router } from 'express';
import {
  getStaffList,
  getStaffProfile,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  revokeStaffSessions,
  deleteStaff,
  getAuditLogs,
  verifyStaffCredentials,
  lookupStaff,
  requestPasswordReset,
  resetPassword
} from '../controllers/staff.controller.js';
import { requireMasterAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Public / Auth verification routes
router.get('/', getStaffList);
router.get('/audit', requireMasterAdmin, getAuditLogs);
router.post('/verify-staff', verifyStaffCredentials);
router.post('/auth/verify-staff', verifyStaffCredentials);
router.post('/lookup', lookupStaff);
router.get('/by-email/:email', lookupStaff);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Master Admin Protected Staff Management
router.get('/:uid', getStaffProfile);
router.post('/create', requireMasterAdmin, createStaff);
router.put('/:uid', requireMasterAdmin, updateStaff);
router.post('/:uid/status', requireMasterAdmin, toggleStaffStatus);
router.post('/:uid/revoke-sessions', requireMasterAdmin, revokeStaffSessions);
router.delete('/:uid', requireMasterAdmin, deleteStaff);

export default router;

