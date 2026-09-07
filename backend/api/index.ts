import app from '../src/app.js';
import { initializeMongoIndexes } from '../src/config/database.js';

// Auto-initialize indexes in background on cold start
initializeMongoIndexes().catch((err) => {
  console.warn('[Vercel Serverless] MongoDB index warmup warning:', err);
});

export default app;
