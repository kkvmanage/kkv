import { Request, Response } from 'express';
import { staffService } from '../services/staff.service.js';

export const getStaffList = (req: Request, res: Response) => {
  try {
    const list = staffService.listStaff();
    return res.json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getStaffProfile = (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const user = staffService.getStaffByUid(uid);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: user });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createStaff = (req: Request, res: Response) => {
  try {
    const { email, displayName, role, phone, permissions } = req.body;
    const actorUid = (req.headers['x-actor-uid'] as string) || 'uid_master_admin_01';
    const actorEmail = (req.headers['x-actor-email'] as string) || 'kkvgoldfinance13@gmail.com';

    if (!email || !displayName || !role) {
      return res.status(400).json({ success: false, message: 'Email, display name, and role are required.' });
    }

    const created = staffService.createStaff(
      { email, displayName, role, phone, permissions },
      actorUid,
      actorEmail
    );
    return res.json({ success: true, data: created, message: 'Staff account created successfully.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const updateStaff = (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    const actorUid = (req.headers['x-actor-uid'] as string) || 'uid_master_admin_01';
    const actorEmail = (req.headers['x-actor-email'] as string) || 'kkvgoldfinance13@gmail.com';

    const updated = staffService.updateStaff(uid, updates, actorUid, actorEmail);
    return res.json({ success: true, data: updated, message: 'Staff profile updated successfully.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const toggleStaffStatus = (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { isActive } = req.body;
    const actorUid = (req.headers['x-actor-uid'] as string) || 'uid_master_admin_01';
    const actorEmail = (req.headers['x-actor-email'] as string) || 'kkvgoldfinance13@gmail.com';

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive boolean is required.' });
    }

    const updated = staffService.toggleStaffStatus(uid, isActive, actorUid, actorEmail);
    return res.json({
      success: true,
      data: updated,
      message: `Staff account successfully ${isActive ? 'enabled' : 'disabled'}.`
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const revokeStaffSessions = (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const actorUid = (req.headers['x-actor-uid'] as string) || 'uid_master_admin_01';
    const actorEmail = (req.headers['x-actor-email'] as string) || 'kkvgoldfinance13@gmail.com';

    const count = staffService.revokeStaffSessions(uid, actorUid, actorEmail);
    return res.json({
      success: true,
      revokedCount: count,
      message: `Successfully revoked ${count} active session(s) for this staff member.`
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteStaff = (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const actorUid = (req.headers['x-actor-uid'] as string) || 'uid_master_admin_01';
    const actorEmail = (req.headers['x-actor-email'] as string) || 'kkvgoldfinance13@gmail.com';

    staffService.deleteStaff(uid, actorUid, actorEmail);
    return res.json({ success: true, message: 'Staff account deleted permanently.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getAuditLogs = (req: Request, res: Response) => {
  try {
    const logs = staffService.listAuditLogs();
    return res.json({ success: true, data: logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
