import { Router } from 'express';
import {
  getStaffList,
  getStaffProfile,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  revokeStaffSessions,
  deleteStaff,
  getAuditLogs
} from '../controllers/staff.controller.js';

const router = Router();

router.get('/', getStaffList);
router.get('/audit', getAuditLogs);
router.get('/:uid', getStaffProfile);
router.post('/create', createStaff);
router.put('/:uid', updateStaff);
router.post('/:uid/status', toggleStaffStatus);
router.post('/:uid/revoke-sessions', revokeStaffSessions);
router.delete('/:uid', deleteStaff);

export default router;
