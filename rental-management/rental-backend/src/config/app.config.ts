import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5175', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'Complex Rental Management',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
  financeBackendUrl: process.env.FINANCE_BACKEND_URL || 'http://localhost:8080',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5174,http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),

  sessionSecret: process.env.SESSION_SECRET || 'rental-staff-session-secret-production-2026',
  jwtSecret: process.env.JWT_SECRET || 'rental-staff-jwt-secret-key-production-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  databaseDir: path.resolve(process.cwd(), process.env.DATABASE_DIR || './data'),

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    mailFrom: process.env.MAIL_FROM || 'no-reply@rental.kkvgoldfinance.com'
  }
};
