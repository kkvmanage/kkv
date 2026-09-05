import { google } from 'googleapis';
import { config } from '../config/app.config.js';

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified?: boolean;
}

export class GoogleAuthService {
  private oauth2Client: any = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    if (config.google.clientId && config.google.clientSecret) {
      this.oauth2Client = new google.auth.OAuth2(
        config.google.clientId,
        config.google.clientSecret,
        config.google.callbackUrl
      );
    }
  }

  getAuthorizationUrl(state?: string): string {
    if (!this.oauth2Client) {
      this.initClient();
    }

    if (!this.oauth2Client) {
      // Return a simulated or placeholder OAuth URL if client ID is not configured yet
      const params = new URLSearchParams({
        client_id: config.google.clientId || 'GOOGLE_CLIENT_ID_PLACEHOLDER',
        redirect_uri: config.google.callbackUrl,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
        state: state || 'rental_auth_state'
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
      state: state || 'rental_auth_state'
    });
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserInfo | null> {
    try {
      if (!this.oauth2Client) {
        this.initClient();
      }

      if (this.oauth2Client && config.google.clientId) {
        const ticket = await this.oauth2Client.verifyIdToken({
          idToken,
          audience: config.google.clientId
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) return null;

        return {
          googleId: payload.sub,
          email: payload.email.toLowerCase(),
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture,
          emailVerified: payload.email_verified
        };
      }

      // If clientId is not set yet in dev or using public Google tokeninfo endpoint
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.email) return null;

      return {
        googleId: data.sub,
        email: data.email.toLowerCase(),
        name: data.name || data.email.split('@')[0],
        picture: data.picture,
        emailVerified: data.email_verified === 'true' || data.email_verified === true
      };
    } catch (err: any) {
      console.error('[GoogleAuthService] verifyIdToken error:', err.message);
      return null;
    }
  }

  async getTokensFromCode(code: string): Promise<GoogleUserInfo | null> {
    try {
      if (!this.oauth2Client) {
        this.initClient();
      }

      if (!this.oauth2Client) {
        throw new Error('Google OAuth client is not configured.');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      if (tokens.id_token) {
        return this.verifyIdToken(tokens.id_token);
      }

      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      if (!userInfo.data || !userInfo.data.email) return null;

      return {
        googleId: userInfo.data.id || '',
        email: userInfo.data.email.toLowerCase(),
        name: userInfo.data.name || userInfo.data.email.split('@')[0],
        picture: userInfo.data.picture || undefined,
        emailVerified: userInfo.data.verified_email || false
      };
    } catch (err: any) {
      console.error('[GoogleAuthService] getTokensFromCode error:', err.message);
      return null;
    }
  }
}

export const googleAuthService = new GoogleAuthService();
