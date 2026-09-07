import { env, validateStartupConfig } from './config/env.js';
import { connectDB } from './config/database.js';
import { isCloudinaryConfigured } from './config/cloudinary.js';
import { googleDriveService } from './services/googleDriveService.js';
import app from './app.js';

async function startServer() {
  const isMongoUriConfigured = Boolean(env.MONGODB_URI);
  const isCloudinaryOk = isCloudinaryConfigured();

  console.log(`[Database] MongoDB URI Configured: ${isMongoUriConfigured}`);
  console.log(`[Storage] Cloudinary Configured: ${isCloudinaryOk}`);

  // 1. Startup validation
  const validation = validateStartupConfig();
  if (!validation.isValid) {
    console.error(`[Startup Validation] ❌ Missing required configuration: ${validation.missingVars.join(', ')}`);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // 2. Connect to MongoDB via Mongoose and AWAIT connection before starting Express
  try {
    await connectDB();
  } catch (dbErr: any) {
    console.error('[Startup] Failed to establish MongoDB connection:', dbErr?.message || dbErr);
    console.error('[MongoDB Atlas Check] Please verify in MongoDB Atlas Dashboard:');
    console.error('  1. Network Access (Allow IP address / 0.0.0.0/0)');
    console.error('  2. Database Access (Username & Password)');
    console.error('  3. User Permissions (readWrite on kkv_gold_finance)');
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // 3. Log Cloudinary status
  if (isCloudinaryOk) {
    console.log('[Cloudinary] Configured successfully');
  } else {
    console.error('[Cloudinary] ❌ Cloudinary credentials missing in .env');
  }

  // 4. Initialize Google Drive once (optional integration)
  if (googleDriveService.isConnected()) {
    console.log(`[GoogleDriveService] Connected via ${googleDriveService.getAuthType()} (${googleDriveService.getPrincipalEmail()})`);
  } else {
    console.log('[GoogleDriveService] Google Drive is not connected. Optional integration disabled.');
  }

  // 5. Start Express server
  app.listen(env.PORT, () => {
    console.log(`[KKV Gold Finance Backend] Express server running at http://localhost:${env.PORT}`);
    console.log(`[KKV Gold Finance Backend] API Base: http://localhost:${env.PORT}/api`);
    console.log(`[KKV Gold Finance Backend] Health Endpoint: http://localhost:${env.PORT}/api/health`);
  });
}

startServer();
