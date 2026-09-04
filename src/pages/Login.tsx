import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LoginView } from '../components/auth/LoginView';

export const Login: React.FC = () => {
  const {
    authLoading,
    loginWithCredentials,
    loginWithGoogle,
    resetPasswordEmail
  } = useApp();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both email address and password.');
      return;
    }

    setIsLoggingIn(true);
    const res = await loginWithCredentials(loginEmail.trim(), loginPassword.trim());
    setIsLoggingIn(false);

    if (!res.success) {
      setLoginError(res.message || 'Incorrect email or password.');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    setIsGoogleLoggingIn(true);
    const res = await loginWithGoogle();
    setIsGoogleLoggingIn(false);

    if (!res.success) {
      setLoginError(res.message || 'Google authentication failed.');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    await resetPasswordEmail(resetEmail.trim());
    setIsForgotPasswordOpen(false);
  };

  return (
    <LoginView
      loginEmail={loginEmail}
      setLoginEmail={setLoginEmail}
      loginPassword={loginPassword}
      setLoginPassword={setLoginPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      loginError={loginError}
      isLoggingIn={isLoggingIn}
      isGoogleLoggingIn={isGoogleLoggingIn}
      authLoading={authLoading}
      handleLogin={handleLogin}
      handleGoogleSignIn={handleGoogleSignIn}
      isForgotPasswordOpen={isForgotPasswordOpen}
      setIsForgotPasswordOpen={setIsForgotPasswordOpen}
      resetEmail={resetEmail}
      setResetEmail={setResetEmail}
      handlePasswordReset={handlePasswordReset}
    />
  );
};

export default Login;
