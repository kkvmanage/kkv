import path from 'path';
import fs from 'fs';

/**
 * Detects if the current execution environment is a serverless runtime (Vercel / AWS Lambda)
 */
export const isServerless: boolean = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.VERCEL_ENV
);

/**
 * Returns the centralized base storage directory for application temporary files and configs.
 * - On Vercel / Lambda (where /var/task is read-only): uses /tmp/KKV_GOLD_FINANCE
 * - On Local development: uses <process.cwd()>/KKV_GOLD_FINANCE
 */
export function getStorageBaseDir(): string {
  if (isServerless) {
    return path.join('/tmp', 'KKV_GOLD_FINANCE');
  }
  return path.resolve(process.cwd(), 'KKV_GOLD_FINANCE');
}

/**
 * Returns the path for configuration/state files
 */
export function getConfigDirectory(): string {
  return path.join(getStorageBaseDir(), 'config');
}

/**
 * Returns the path for backup files
 */
export function getBackupsDirectory(): string {
  return path.join(getStorageBaseDir(), 'backups');
}

/**
 * Returns a specific subfolder path under the storage base directory
 */
export function getStorageSubdirectory(subFolder: string): string {
  return path.join(getStorageBaseDir(), subFolder);
}

/**
 * Safely ensures a directory exists without throwing fatal errors during module evaluation
 */
export function ensureDirectoryExists(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (err) {
    console.warn(`[StorageConfig] Warning: Unable to create directory ${dirPath}:`, (err as any)?.message || err);
    return false;
  }
}
