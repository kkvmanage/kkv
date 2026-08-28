import app from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log(`[KKV Gold Finance Backend] Express server running at http://localhost:${env.PORT}`);
  console.log(`[KKV Gold Finance Backend] API Base: http://localhost:${env.PORT}/api`);
  console.log(`[KKV Gold Finance Backend] Health Endpoint: http://localhost:${env.PORT}/api/health`);
});
