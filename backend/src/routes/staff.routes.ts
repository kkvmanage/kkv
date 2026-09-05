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

const router = Router();

router.get('/', getStaffList);
router.get('/audit', getAuditLogs);
router.post('/verify-staff', verifyStaffCredentials);
router.post('/auth/verify-staff', verifyStaffCredentials);
router.post('/lookup', lookupStaff);
router.get('/by-email/:email', lookupStaff);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

router.get('/:uid', getStaffProfile);
router.post('/create', createStaff);
router.put('/:uid', updateStaff);
router.post('/:uid/status', toggleStaffStatus);
router.post('/:uid/revoke-sessions', revokeStaffSessions);
router.delete('/:uid', deleteStaff);

export default router;

