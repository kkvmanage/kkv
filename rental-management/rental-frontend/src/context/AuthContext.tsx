import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount } from '../types/rental.types.ts';
import { authApi } from '../services/authApi.ts';

interface AuthContextType {
  user: UserAccount | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: UserAccount; message?: string }>;
  loginWithGoogleToken: (idToken: string) => Promise<{ success: boolean; user?: UserAccount; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(() => {
    const cached = localStorage.getItem('rental_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rental_token'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await authApi.getCurrentUser();
      const userData = res.user || res.data;
      if (res.success && userData) {
        setUser(userData);
        localStorage.setItem('rental_user', JSON.stringify(userData));
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('rental_user');
        localStorage.removeItem('rental_token');
      }
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('rental_user');
      localStorage.removeItem('rental_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: UserAccount; message?: string }> => {
    try {
      const res = await authApi.login(email.trim(), password);
      if (res.success && res.user) {
        setUser(res.user);
        if (res.token) {
          setToken(res.token);
          localStorage.setItem('rental_token', res.token);
        }
        localStorage.setItem('rental_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      } else {
        return { success: false, message: res.message || 'Invalid email or password.' };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Unable to sign in right now. Please try again later.'
      };
    }
  };

  const loginWithGoogleToken = async (
    idToken: string
  ): Promise<{ success: boolean; user?: UserAccount; message?: string }> => {
    try {
      const res = await authApi.verifyFirebaseToken(idToken);
      if (res.success && res.user) {
        setUser(res.user);
        if (res.token) {
          setToken(res.token);
          localStorage.setItem('rental_token', res.token);
        }
        localStorage.setItem('rental_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      } else {
        return { success: false, message: res.message || 'Google authentication failed.' };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Unable to sign in with Google. Please try again.'
      };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('[AuthContext] Backend logout API error:', err);
    } finally {
      localStorage.removeItem('rental_token');
      localStorage.removeItem('rental_user');
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  const isAdmin = user?.role === 'RENTAL_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        login,
        loginWithGoogleToken,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
