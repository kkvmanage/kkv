import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService, AuthResponse } from '../services/authService';

export interface AuthContextType {
  user: FirebaseUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  loginWithGoogle: () => Promise<AuthResponse>;
  logout: () => Promise<AuthResponse>;
  resetPassword: (email: string) => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to Firebase Auth state changes
    const unsubscribe = authService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    setLoading(true);
    const res = await authService.loginWithEmail(email, password);
    setLoading(false);
    return res;
  };

  const handleGoogleLogin = async (): Promise<AuthResponse> => {
    setLoading(true);
    const res = await authService.loginWithGoogle();
    setLoading(false);
    return res;
  };

  const handleLogout = async (): Promise<AuthResponse> => {
    setLoading(true);
    const res = await authService.logout();
    setUser(null);
    setLoading(false);
    return res;
  };

  const handleResetPassword = async (email: string): Promise<AuthResponse> => {
    return await authService.sendPasswordReset(email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser: user,
        loading,
        login,
        loginWithGoogle: handleGoogleLogin,
        logout: handleLogout,
        resetPassword: handleResetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
