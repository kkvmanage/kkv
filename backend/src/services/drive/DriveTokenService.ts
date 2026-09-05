import { googleDriveRepository } from '../../repositories/googleDrive.repository.js';
import { encryptToken, decryptToken } from '../../utils/encryption.js';

export interface StoredDriveTokens {
  encryptedRefreshToken: string;
  encryptedAccessToken?: string;
  expiryDate?: number;
  googleAccount?: string;
  updatedAt?: string;
  scope?: string;
  authMode?: 'OAUTH' | 'SERVICE_ACCOUNT' | 'NONE';
}

const TOKENS_FILE = 'drive_oauth_tokens.json';

export class DriveTokenService {
  private activeOAuthStates: Map<string, number> = new Map();

  /**
   * Generates and stores a cryptographically random OAuth state string for CSRF mitigation.
   */
  public generateState(): string {
    const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
    this.activeOAuthStates.set(state, Date.now() + 10 * 60 * 1000); // 10 mins validity
    return state;
  }

  /**
   * Validates an incoming OAuth state string.
   */
  public validateState(state: string): boolean {
    if (!state) return false;
    const expires = this.activeOAuthStates.get(state);
    if (!expires) return false;
    this.activeOAuthStates.delete(state);
    return Date.now() < expires;
  }

  public saveTokens(data: {
    refreshToken?: string;
    accessToken?: string;
    expiryDate?: number;
    googleAccount?: string;
    scope?: string;
  }): void {
    const existing = this.getRawTokens();

    let encryptedRefreshToken = existing.encryptedRefreshToken;
    if (data.refreshToken) {
      encryptedRefreshToken = encryptToken(data.refreshToken) || '';
    }

    let encryptedAccessToken = existing.encryptedAccessToken;
    if (data.accessToken) {
      encryptedAccessToken = encryptToken(data.accessToken) || '';
    }

    const payload: StoredDriveTokens = {
      encryptedRefreshToken: encryptedRefreshToken || '',
      encryptedAccessToken: encryptedAccessToken || '',
      expiryDate: data.expiryDate || existing.expiryDate || 0,
      googleAccount: data.googleAccount || existing.googleAccount || '',
      scope: data.scope || existing.scope || '',
      authMode: 'OAUTH',
      updatedAt: new Date().toISOString()
    };

    googleDriveRepository.writeJson(TOKENS_FILE, payload);
    console.log(`[DriveTokenService] 🔒 Stored encrypted OAuth tokens for account: ${payload.googleAccount || 'Authorized User'}`);
  }

  public getRawTokens(): StoredDriveTokens {
    return googleDriveRepository.readJson<StoredDriveTokens>(TOKENS_FILE, {
      encryptedRefreshToken: '',
      googleAccount: '',
      authMode: 'NONE',
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

  public getAccessToken(): string {
    const raw = this.getRawTokens();
    if (!raw.encryptedAccessToken) {
      return '';
    }
    return decryptToken(raw.encryptedAccessToken);
  }

  public getExpiryDate(): number {
    return this.getRawTokens().expiryDate || 0;
  }

  public getGoogleAccount(): string {
    return this.getRawTokens().googleAccount || '';
  }

  public getAuthMode(): 'OAUTH' | 'SERVICE_ACCOUNT' | 'NONE' {
    return this.getRawTokens().authMode || (this.hasRefreshToken() ? 'OAUTH' : 'NONE');
  }

  public hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  public isTokenExpired(): boolean {
    const expiry = this.getExpiryDate();
    if (!expiry) return true;
    // Buffer by 2 minutes
    return Date.now() >= expiry - 2 * 60 * 1000;
  }

  public clearTokens(): void {
    googleDriveRepository.writeJson(TOKENS_FILE, {
      encryptedRefreshToken: '',
      encryptedAccessToken: '',
      expiryDate: 0,
      googleAccount: '',
      authMode: 'NONE',
      updatedAt: new Date().toISOString()
    });
    console.log('[DriveTokenService] 🧹 Cleared stored OAuth tokens.');
  }
}

export const driveTokenService = new DriveTokenService();
