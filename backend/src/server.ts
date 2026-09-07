import app from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log(`[KKV Gold Finance Backend] Express server running at http://localhost:${env.PORT}`);
  console.log(`[KKV Gold Finance Backend] API Base: http://localhost:${env.PORT}/api`);
  console.log(`[KKV Gold Finance Backend] Health Endpoint: http://localhost:${env.PORT}/api/health`);
  console.log(`GOOGLE_DRIVE_AUTH_MODE=oauth`);
  console.log(`GOOGLE_DRIVE_FOLDER_ID=${env.GOOGLE_DRIVE_FOLDER_ID || '1gqDbQuvf2EWkh_y-kiqRDBV3fOpEEGPx'}`);
  console.log(`GOOGLE_DRIVE_ACCOUNT=${env.GOOGLE_DRIVE_ACCOUNT_EMAIL || 'goldfinancekkv@gmail.com'}`);
  console.log(`GOOGLE_DRIVE_CLIENT_CONFIGURED=${Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)}`);
  console.log(`GOOGLE_DRIVE_REFRESH_TOKEN_CONFIGURED=${Boolean(env.GOOGLE_REFRESH_TOKEN)}`);
});
