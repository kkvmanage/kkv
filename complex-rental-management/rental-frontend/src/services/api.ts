import { auth } from '../config/firebase.ts';

const API_BASE = import.meta.env.VITE_RENTAL_API_URL || 'http://localhost:5175/api';

export class ApiError extends Error {
  statusCode: number;
  unauthorized?: boolean;
  isGoogleAccount?: boolean;
  errorCode?: string;

  constructor(
    message: string,
    statusCode: number,
    unauthorized?: boolean,
    isGoogleAccount?: boolean,
    errorCode?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.unauthorized = unauthorized;
    this.isGoogleAccount = isGoogleAccount;
    this.errorCode = errorCode;
  }
}

export const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const customHeaders = (options.headers as Record<string, string>) || {};

  // If caller explicitly passed Authorization header, respect it
  let authBearerToken: string | null = null;
  if (customHeaders['Authorization']) {
    authBearerToken = customHeaders['Authorization'];
  } else {
    // Attempt to get fresh Firebase ID token if user is signed in with Firebase
    if (auth.currentUser) {
      try {
        const freshIdToken = await auth.currentUser.getIdToken();
        if (freshIdToken) {
          authBearerToken = `Bearer ${freshIdToken}`;
        }
      } catch {
        // Fallback to cached token
      }
    }

    if (!authBearerToken) {
      const cachedToken = localStorage.getItem('rental_token');
      if (cachedToken) {
        authBearerToken = `Bearer ${cachedToken}`;
      }
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (authBearerToken) {
    headers['Authorization'] = authBearerToken;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Transport HTTP-only cookies
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      if (
        endpoint !== '/auth/firebase' &&
        endpoint !== '/auth/google' &&
        endpoint !== '/auth/login' &&
        endpoint !== '/auth/me'
      ) {
        // Token or session expired on protected content
        localStorage.removeItem('rental_token');
        localStorage.removeItem('rental_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?expired=true';
        }
      }
    }

    throw new ApiError(
      data.message || `Request failed with status ${response.status}`,
      response.status,
      data.unauthorized,
      data.isGoogleAccount,
      data.errorCode
    );
  }

  return data;
};
