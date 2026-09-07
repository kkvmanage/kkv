import { Router } from 'express';
import {
  getStaffList,
  getStaffProfile,
  createStaff,
  updateStaff,
  updateStaffPassword,
  toggleStaffStatus,
  revokeStaffSessions,
  deleteStaff,
  searchStaff,
  getAuditLogs,
  verifyStaffCredentials,
  lookupStaff,
  requestPasswordReset,
  resetPassword
} from '../controllers/staff.controller.js';

const router = Router();

// Public / Auth verification routes
router.get('/audit', getAuditLogs);
router.get('/search', searchStaff);
router.post('/verify-staff', verifyStaffCredentials);
router.post('/auth/verify-staff', verifyStaffCredentials);
router.post('/lookup', lookupStaff);
router.get('/by-email/:email', lookupStaff);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Staff Directory & Management
router.get('/', getStaffList);
router.post('/create', createStaff);
router.get('/:uid', getStaffProfile);
router.put('/:uid/password', updateStaffPassword);
router.put('/:uid', updateStaff);
router.post('/:uid/status', toggleStaffStatus);
router.post('/:uid/revoke-sessions', revokeStaffSessions);
router.delete('/:uid', deleteStaff);

export default router;
