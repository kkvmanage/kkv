import { Router } from 'express';
import { driveController } from '../controllers/drive.controller.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// OAuth Authentication Flow
router.get('/connect', driveController.connect);
router.get('/callback', driveController.callback);
router.post('/disconnect', driveController.disconnect);

// Drive status & diagnostics
router.get('/status', driveController.getStatus);
router.get('/oauth-config', driveController.getOAuthConfig);

// Generic drive file operations
router.post('/upload', upload.single('file'), driveController.uploadFile);
router.get('/files', driveController.listFiles);
router.get('/file/:fileId', driveController.getFile);
router.delete('/file/:fileId', driveController.deleteFile);

// Application specific file uploads
router.post('/customers/:customerId/documents', upload.single('file'), driveController.uploadCustomerDocument);
router.post('/loans/:loanId/documents', upload.single('file'), driveController.uploadLoanDocument);

export default router;
