import React from 'react';
import {
  ShieldAlert,
  Mail,
  Lock,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  CheckCircle,
  KeyRound
} from 'lucide-react';
import { KKVLogo } from '../common/KKVLogo';
import './LoginView.css';

interface LoginViewProps {
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  loginError: string;
  isLoggingIn: boolean;
  isGoogleLoggingIn: boolean;
  authLoading: boolean;
  handleLogin: (e: React.FormEvent) => void;
  handleGoogleSignIn: () => void;
  isForgotPasswordOpen: boolean;
  setIsForgotPasswordOpen: (val: boolean) => void;
  resetEmail: string;
  setResetEmail: (val: string) => void;
  handlePasswordReset: (e: React.FormEvent) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  showPassword,
  setShowPassword,
  loginError,
  isLoggingIn,
  isGoogleLoggingIn,
  authLoading,
  handleLogin,
  handleGoogleSignIn,
  isForgotPasswordOpen,
  setIsForgotPasswordOpen,
  resetEmail,
  setResetEmail,
  handlePasswordReset
}) => {
  return (
    <div className="kkv-login-wrapper">
      {/* ============================================================
          LEFT SIDE — PREMIUM BRAND EXPERIENCE (42% Width)
          ============================================================ */}
      <div className="kkv-login-brand-pane">
        {/* Ambient atmospheric glows & subtle geometric accents */}
        <div className="kkv-brand-glow-radial" />
        <div className="kkv-brand-glow-bottom" />
        <div className="kkv-brand-lines-pattern" />

        {/* Top Branding */}
        <div className="kkv-brand-header">
          <div className="kkv-brand-logo-pill">
            <KKVLogo size={34} />
          </div>
          <div className="kkv-brand-title-area">
            <span className="kkv-brand-name">KKV GOLD FINANCE</span>
            <span className="kkv-brand-tagline">Gold Loan &amp; Term Deposit System</span>
          </div>
        </div>

        {/* Main Hero Section */}
        <div className="kkv-brand-hero">
          <h1 className="kkv-brand-heading">
            Finance, Built on
            <br />
            <span className="kkv-brand-heading-gold">Trust.</span>
          </h1>

          <p className="kkv-brand-desc">
            Securely manage gold loans, deposits and financial operations from one intelligent platform.
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="kkv-trust-indicators">
          <div className="kkv-trust-item">
            <div className="kkv-trust-icon-box">
              <Lock size={15} />
            </div>
            <span>Bank-Grade Security</span>
          </div>

          <div className="kkv-trust-item">
            <div className="kkv-trust-icon-box">
              <Zap size={15} />
            </div>
            <span>Fast &amp; Reliable Operations</span>
          </div>

          <div className="kkv-trust-item">
            <div className="kkv-trust-icon-box">
              <CheckCircle size={15} />
            </div>
            <span>Secure Financial Management</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          RIGHT SIDE — LOGIN AREA (58% Width)
          ============================================================ */}
      <div className="kkv-login-form-pane">
        <div className="kkv-login-container">
          {/* Mobile Header (displayed on mobile screens only) */}
          <div className="kkv-mobile-header">
            <div className="kkv-mobile-logo-wrap">
              <KKVLogo size={32} />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0B6B4A' }}>
              KKV GOLD FINANCE
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#667085', letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '2px' }}>
              Gold Loan &amp; Term Deposit System
            </span>
          </div>

          {/* Login Header */}
          <div className="kkv-login-header">
            <h2 className="kkv-login-title">Welcome back</h2>
            <p className="kkv-login-subtitle">
              Sign in to securely access your account.
            </p>
          </div>

          {/* Error Banner */}
          {loginError && (
            <div className="kkv-alert-error" role="alert">
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{loginError}</span>
            </div>
          )}

          {/* Google Login Button */}
          <button
            type="button"
            className="kkv-google-button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoggingIn || isLoggingIn || authLoading}
          >
            {isGoogleLoggingIn ? (
              <>
                <RefreshCw size={16} className="kkv-spin" style={{ color: '#0B6B4A' }} />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Clean Divider */}
          <div className="kkv-divider-row">
            <div className="kkv-divider-line" />
            <span className="kkv-divider-text">OR</span>
            <div className="kkv-divider-line" />
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleLogin} className="kkv-form-wrapper">
            {/* Email Address */}
            <div className="kkv-form-group">
              <label className="kkv-input-label" htmlFor="kkv-login-email">
                Email Address
              </label>
              <div className="kkv-input-box">
                <Mail size={18} className="kkv-field-icon" />
                <input
                  id="kkv-login-email"
                  type="email"
                  required
                  className="kkv-text-input"
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="kkv-form-group">
              <div className="kkv-label-row">
                <label className="kkv-input-label" htmlFor="kkv-login-password">
                  Password
                </label>
                <button
                  type="button"
                  className="kkv-forgot-link"
                  onClick={() => {
                    setResetEmail(loginEmail);
                    setIsForgotPasswordOpen(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="kkv-input-box">
                <Lock size={18} className="kkv-field-icon" />
                <input
                  id="kkv-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="kkv-password-input"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="kkv-visibility-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign In Primary CTA */}
            <button
              type="submit"
              className="kkv-submit-btn"
              disabled={isLoggingIn || isGoogleLoggingIn || authLoading}
            >
              {isLoggingIn || authLoading ? (
                <>
                  <RefreshCw size={18} className="kkv-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Security Message */}
          <div className="kkv-security-note">
            <Lock size={13} />
            <span>Your information is protected with secure encryption.</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          FORGOT PASSWORD MODAL (Refined & Minimal)
          ============================================================ */}
      {isForgotPasswordOpen && (
        <div
          className="kkv-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsForgotPasswordOpen(false);
          }}
        >
          <div className="kkv-modal-box">
            <div className="kkv-modal-head">
              <div className="kkv-modal-icon-circle">
                <KeyRound size={20} />
              </div>
              <h3 className="kkv-modal-heading">Reset Account Password</h3>
            </div>
            <p className="kkv-modal-text">
              Enter your registered email address and we will send you a secure password reset link.
            </p>
            <form onSubmit={handlePasswordReset} className="kkv-form-wrapper">
              <div className="kkv-form-group">
                <label className="kkv-input-label" htmlFor="kkv-reset-email">
                  Email Address
                </label>
                <div className="kkv-input-box">
                  <Mail size={18} className="kkv-field-icon" />
                  <input
                    id="kkv-reset-email"
                    type="email"
                    required
                    className="kkv-text-input"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoFocus
                  />
                </div>
              </div>
              <div className="kkv-modal-buttons">
                <button
                  type="button"
                  className="kkv-btn-dismiss"
                  onClick={() => setIsForgotPasswordOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="kkv-btn-action">
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;
