import { googleDriveRepository } from '../../repositories/googleDrive.repository.js';
import { encryptToken, decryptToken } from '../../utils/encryption.js';

export interface StoredDriveTokens {
  encryptedRefreshToken: string;
  googleAccount?: string;
  updatedAt?: string;
  scope?: string;
}

const TOKENS_FILE = 'drive_oauth_tokens.json';

export class DriveTokenService {
  public saveTokens(data: { refreshToken: string; googleAccount?: string; scope?: string }): void {
    if (!data.refreshToken) {
      console.warn('[DriveTokenService] Warning: Attempting to save empty refresh token.');
      return;
    }

    const encryptedRefreshToken = encryptToken(data.refreshToken);
    const existing = this.getRawTokens();

    const payload: StoredDriveTokens = {
      encryptedRefreshToken: encryptedRefreshToken || existing.encryptedRefreshToken || '',
      googleAccount: data.googleAccount || existing.googleAccount || '',
      scope: data.scope || existing.scope || '',
      updatedAt: new Date().toISOString()
    };

    googleDriveRepository.writeJson(TOKENS_FILE, payload);
    console.log(`[DriveTokenService] Stored encrypted OAuth tokens securely for account: ${payload.googleAccount || 'authorized user'}`);
  }

  public getRawTokens(): StoredDriveTokens {
    return googleDriveRepository.readJson<StoredDriveTokens>(TOKENS_FILE, {
      encryptedRefreshToken: '',
      googleAccount: '',
      updatedAt: ''
    });
  }

  public getRefreshToken(): string {
    const raw = this.getRawTokens();
    if (!raw.encryptedRefreshToken) {
      return '';
    }
    return decryptToken(raw.encryptedRefreshToken);
  }

  public getGoogleAccount(): string {
    return this.getRawTokens().googleAccount || '';
  }

  public hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  public clearTokens(): void {
    googleDriveRepository.writeJson(TOKENS_FILE, {
      encryptedRefreshToken: '',
      googleAccount: '',
      updatedAt: new Date().toISOString()
    });
    console.log('[DriveTokenService] Cleared stored OAuth tokens.');
  }
}

export const driveTokenService = new DriveTokenService();
