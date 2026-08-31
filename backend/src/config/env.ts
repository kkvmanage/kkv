import dotenv from 'dotenv';
import path from 'path';

// Safely load .env from backend folder or workspace root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '';
const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '';
// Convert escaped \n characters to real newline characters
const formattedPrivateKey = rawPrivateKey.replace(/\\n/g, '\n');

const rootFolderId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || '15MY3DHoYCSccsIvh5j31lUOZ6ZrSYdlh').trim();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.SERVER_PORT || process.env.PORT || '8080', 10),
  CORS_ORIGIN: process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173',
  GOOGLE_DRIVE_ENABLED: process.env.GOOGLE_DRIVE_ENABLED === 'true' || !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolderId,
  GOOGLE_DRIVE_FOLDER_ID: rootFolderId,
  GOOGLE_CLIENT_ID: (process.env.GOOGLE_CLIENT_ID || '').trim(),
  GOOGLE_CLIENT_SECRET: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
  GOOGLE_REDIRECT_URI: (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/google-drive/callback').trim(),
  GOOGLE_REFRESH_TOKEN: (process.env.GOOGLE_REFRESH_TOKEN || '').trim(),
  JWT_SECRET: process.env.JWT_SECRET || 'kkv_gold_finance_default_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRATION_MS ? `${process.env.JWT_EXPIRATION_MS}ms` : '24h',
  LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH || 'D:/client_2/backend/data',
  TELEGRAM_ENABLED: process.env.TELEGRAM_ENABLED === 'true',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
};
