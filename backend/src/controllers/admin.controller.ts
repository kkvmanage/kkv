import { Request, Response } from 'express';
import { adminService } from '../services/admin.service.js';
import { systemWipeService } from '../services/systemWipe.service.js';
import { systemRestoreService } from '../services/systemRestore.service.js';

export const getMasterSettings = (req: Request, res: Response) => {
  const settings = adminService.getMasterSettings();
  return res.json({ success: true, data: settings });
};

export const updateMasterSettings = (req: Request, res: Response) => {
  const updated = adminService.updateMasterSettings(req.body);
  return res.json({ success: true, message: 'Master control settings updated', data: updated });
};

export const getWhatsAppTemplates = (req: Request, res: Response) => {
  const templates = adminService.getWhatsAppTemplates();
  return res.json({ success: true, data: templates });
};

export const updateWhatsAppTemplates = (req: Request, res: Response) => {
  const updated = adminService.updateWhatsAppTemplates(req.body);
  return res.json({ success: true, message: 'WhatsApp templates updated', data: updated });
};

export const unlockMasterControl = (req: Request, res: Response) => {
  const { password } = req.body;
  const unlocked = adminService.unlockMasterControl(password);
  if (!unlocked) {
    return res.status(401).json({ success: false, message: 'Incorrect password! Try: admin123' });
  }
  return res.json({ success: true, message: 'Master Control unlocked' });
};

export const initiateWipeBackup = async (req: Request, res: Response) => {
  try {
    const { confirmationText } = req.body || {};
    if (confirmationText !== 'WIPE ALL DATA') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation text. You must type "WIPE ALL DATA" exactly.',
        error: { code: 'INVALID_CONFIRMATION' }
      });
    }

    const verificationRecord = await systemWipeService.initiateFullBackupAndVerify(confirmationText);
    return res.json({
      success: true,
      message: 'Complete backup created and verified in Google Drive successfully.',
      data: verificationRecord
    });
  } catch (err: any) {
    console.error('[AdminController] initiateWipeBackup error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Backup verification failed. No application data was deleted.',
      error: { code: 'BACKUP_VERIFICATION_FAILED' }
    });
  }
};

export const confirmSystemWipe = async (req: Request, res: Response) => {
  try {
    const { token, confirmationText } = req.body || {};
    if (!token || confirmationText !== 'WIPE ALL DATA') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token or confirmation text.',
        error: { code: 'INVALID_REQUEST' }
      });
    }

    const wipeResult = systemWipeService.confirmAndWipeData(token, confirmationText);
    return res.json({
      success: true,
      message: 'All application operational data has been permanently removed.',
      data: wipeResult
    });
  } catch (err: any) {
    console.error('[AdminController] confirmSystemWipe error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Data wipe failed.',
      error: { code: 'WIPE_FAILED' }
    });
  }
};

export const getAvailableRestoreBackups = async (req: Request, res: Response) => {
  try {
    const backups = await systemRestoreService.getAvailableBackups();
    return res.json({ success: true, data: backups });
  } catch (err: any) {
    console.error('[AdminController] getAvailableRestoreBackups error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to list Google Drive backups.',
      error: { code: 'BACKUP_LISTING_FAILED' }
    });
  }
};

export const validateRestoreBackup = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.body || {};
    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required for validation.',
        error: { code: 'MISSING_FILE_ID' }
      });
    }

    const validationResult = await systemRestoreService.validateBackupForRestore(fileId);
    return res.json({
      success: true,
      message: 'Backup file validated successfully.',
      data: validationResult
    });
  } catch (err: any) {
    console.error('[AdminController] validateRestoreBackup error:', err?.message || err);
    return res.status(400).json({
      success: false,
      message: err?.message || 'Backup validation failed.',
      error: { code: 'BACKUP_VALIDATION_FAILED' }
    });
  }
};

export const executeSystemRestore = async (req: Request, res: Response) => {
  try {
    const { token, confirmationText } = req.body || {};
    if (!token || confirmationText !== 'RESTORE SYSTEM') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token or confirmation text.',
        error: { code: 'INVALID_CONFIRMATION' }
      });
    }

    const result = await systemRestoreService.executeRestore(token, confirmationText);
    return res.json({
      success: true,
      message: 'System business collections restored successfully.',
      data: result
    });
  } catch (err: any) {
    console.error('[AdminController] executeSystemRestore error:', err?.message || err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'System restore failed.',
      error: { code: 'RESTORE_FAILED' }
    });
  }
};
