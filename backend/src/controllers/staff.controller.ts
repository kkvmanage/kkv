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
    const { email, displayName, role, phone, permissions, password } = req.body;
    const actorUid = (req.headers['x-actor-uid'] as string) || 'uid_master_admin_01';
    const actorEmail = (req.headers['x-actor-email'] as string) || 'goldfinancekkv@gmail.com';

    if (!email || !displayName || !role) {
      return res.status(400).json({ success: false, message: 'Email, display name, and role are required.' });
    }

    const created = staffService.createStaff(
      { email, displayName, role, phone, permissions, password },
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
    const actorEmail = (req.headers['x-actor-email'] as string) || 'goldfinancekkv@gmail.com';

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
    const actorEmail = (req.headers['x-actor-email'] as string) || 'goldfinancekkv@gmail.com';

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
    const actorEmail = (req.headers['x-actor-email'] as string) || 'goldfinancekkv@gmail.com';

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
    const actorEmail = (req.headers['x-actor-email'] as string) || 'goldfinancekkv@gmail.com';

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

export const verifyStaffCredentials = (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const targetPortal = req.body?.targetPortal || (req.headers['x-target-portal'] as string) || (req.body?.portal === 'RENTAL' ? 'RENTAL' : undefined);
    const result = staffService.verifyStaffCredentials(email, password, targetPortal as any);

    if (!result.success) {
      if (result.disabled) {
        return res.status(403).json({
          success: false,
          disabled: true,
          message: result.message || 'Your staff account is currently disabled. Please contact the administrator.'
        });
      }
      if (result.unauthorizedRole) {
        return res.status(403).json({
          success: false,
          unauthorizedRole: true,
          message: result.message || 'Your account does not have access to Rental Management.'
        });
      }
      return res.status(401).json({
        success: false,
        message: result.message || 'Invalid email or password.'
      });
    }

    return res.status(200).json({
      success: true,
      user: result.user,
      message: 'Staff verification successful.'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during staff verification.'
    });
  }
};

export const lookupStaff = (req: Request, res: Response) => {
  try {
    const email = (req.body?.email || req.params?.email || req.query?.email || '') as string;
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    const result = staffService.lookupStaffByEmail(email);

    if (!result.success) {
      if (result.notFound) {
        return res.status(404).json({
          success: false,
          notFound: true,
          message: result.message || 'Staff account not found.'
        });
      }
      if (result.disabled) {
        return res.status(403).json({
          success: false,
          disabled: true,
          user: result.user,
          message: result.message || 'Your staff account is currently disabled. Please contact the administrator.'
        });
      }
      if (result.unauthorizedRole) {
        return res.status(403).json({
          success: false,
          unauthorizedRole: true,
          user: result.user,
          message: result.message || 'Your account does not have access to Rental Management.'
        });
      }
      return res.status(400).json({
        success: false,
        message: result.message || 'Staff lookup failed.'
      });
    }

    return res.status(200).json({
      success: true,
      user: result.user,
      message: 'Staff lookup successful.'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during staff lookup.'
    });
  }
};

export const requestPasswordReset = (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const result = staffService.requestPasswordReset(email);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to request password reset.' });
  }
};

export const resetPassword = (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    const result = staffService.resetPasswordWithToken(token, newPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to reset password.' });
  }
};

