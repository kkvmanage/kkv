import { request } from './api.ts';
import { UserAccount, UserRole, AuthProvider } from '../types/rental.types.ts';

export const authApi = {
  verifyFirebaseToken: async (
    idToken: string
  ): Promise<{ success: boolean; token?: string; user?: UserAccount; message?: string }> => {
    return request('/auth/firebase', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ idToken }),
    });
  },

  getGoogleAuthUrl: async (): Promise<{ success: boolean; url: string }> => {
    return request('/auth/google');
  },

  loginWithGoogleToken: async (
    idToken: string
  ): Promise<{ success: boolean; token?: string; user?: UserAccount; message?: string }> => {
    return request('/auth/firebase', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ idToken }),
    });
  },

  login: async (
    email: string,
    password: string
  ): Promise<{ success: boolean; token?: string; user?: UserAccount; message?: string; unauthorized?: boolean }> => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getCurrentUser: async (): Promise<{ success: boolean; authenticated: boolean; user?: UserAccount; data?: UserAccount }> => {
    return request('/auth/me');
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    return request('/auth/logout', {
      method: 'POST',
    });
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string; isGoogleAccount?: boolean; devResetLink?: string }> => {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  // User Management (Admin only)
  listUsers: async (): Promise<{ success: boolean; data: UserAccount[] }> => {
    return request('/auth/users');
  },

  createUser: async (data: {
    email: string;
    name?: string;
    role: UserRole;
    authProvider?: AuthProvider;
  }): Promise<{ success: boolean; data: UserAccount; message: string }> => {
    return request('/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateUser: async (
    id: string,
    updates: Partial<UserAccount>
  ): Promise<{ success: boolean; data: UserAccount; message: string }> => {
    return request(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteUser: async (id: string): Promise<{ success: boolean; message: string }> => {
    return request(`/auth/users/${id}`, {
      method: 'DELETE',
    });
  },
};
