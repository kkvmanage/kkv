import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ShieldCheck, Mail, Lock, Eye, EyeOff, X, ArrowRight } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authApi } from '../services/authApi.ts';
import { KKVLogo } from '../components/common/KKVLogo.tsx';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const { login, loginWithGoogleToken, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    const expiredParam = params.get('expired');

    if (errorParam) {
      setError(errorParam);
    } else if (expiredParam) {
      setInfoMessage('Your session has expired. Please sign in again to continue.');
    }
  }, [location, user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both your email address and password.');
      return;
    }

    setIsSigningIn(true);

    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to sign in right now. Please try again later.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setInfoMessage('');
    setIsGoogleSigningIn(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const res = await loginWithGoogleToken(idToken);
      if (res.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(res.message || 'Your Google account is not authorized to access the Rental Management Portal.');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error('[Login] Google sign-in error:', err);
      setError(err.message || 'Unable to sign in with Google. Please try again.');
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotMessage('Please enter your staff email address.');
      return;
    }

    setForgotLoading(true);
    setForgotMessage('');

    try {
      const res = await authApi.forgotPassword(forgotEmail.trim());
      setForgotMessage(res.message || 'If an account exists for this email, a password reset link has been sent.');
    } catch {
      setForgotMessage('If an account exists for this email, a password reset link has been sent.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#F8FAF9',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <KKVLogo size={68} style={{ margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#1F2D26', letterSpacing: '0.5px', margin: 0 }}>
            KKV GOLD FINANCE
          </h1>
          <p style={{ fontSize: '13px', fontWeight: 800, color: '#B48909', letterSpacing: '1px', textTransform: 'uppercase', margin: '6px 0 0' }}>
            COMPLEX RENTAL MANAGEMENT
          </p>
          <span style={{ fontSize: '12.5px', color: '#66756D', display: 'block', marginTop: '4px' }}>
            Official Staff Portal for Commercial Properties
          </span>
        </div>

        {/* Authentication Card */}
        <div
          className="card"
          style={{
            padding: '36px 32px',
            boxShadow: '0 10px 28px rgba(0,0,0,0.06)',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDE5DF',
          }}
        >
          {/* Status Banners */}
          {error && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                color: '#DC2626',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '20px',
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          {infoMessage && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(23, 107, 82, 0.08)',
                border: '1px solid rgba(23, 107, 82, 0.25)',
                borderRadius: '10px',
                color: '#176B52',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '20px',
                lineHeight: 1.45,
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{infoMessage}</div>
            </div>
          )}

          {/* Email + Password Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Email Field */}
            <div className="form-group" style={{ margin: 0 }}>
              <label
                htmlFor="staff-email-input"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1F2D26',
                  marginBottom: '6px',
                }}
              >
                Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail
                  size={17}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: '#8C9B93',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="staff-email-input"
                  type="email"
                  placeholder="staff@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSigningIn || isGoogleSigningIn}
                  style={{
                    width: '100%',
                    height: '44px',
                    paddingLeft: '38px',
                    paddingRight: '14px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#1F2D26',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#176B52')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor="staff-password-input"
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1F2D26',
                    margin: 0,
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotMessage('');
                    setShowForgotModal(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#176B52',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock
                  size={17}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: '#8C9B93',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="staff-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSigningIn || isGoogleSigningIn}
                  style={{
                    width: '100%',
                    height: '44px',
                    paddingLeft: '38px',
                    paddingRight: '40px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#1F2D26',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#176B52')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#8C9B93',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              id="staff-signin-btn"
              type="submit"
              disabled={isSigningIn || isGoogleSigningIn}
              style={{
                width: '100%',
                height: '46px',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: (isSigningIn || isGoogleSigningIn) ? '#6E8B7E' : '#176B52',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14.5px',
                fontWeight: 700,
                cursor: (isSigningIn || isGoogleSigningIn) ? 'wait' : 'pointer',
                boxShadow: '0 2px 6px rgba(23, 107, 82, 0.25)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSigningIn && !isGoogleSigningIn) e.currentTarget.style.backgroundColor = '#135843';
              }}
              onMouseLeave={(e) => {
                if (!isSigningIn && !isGoogleSigningIn) e.currentTarget.style.backgroundColor = '#176B52';
              }}
            >
              <span>{isSigningIn ? 'Signing In...' : 'Sign In'}</span>
              {!isSigningIn && <ArrowRight size={16} />}
            </button>

            {/* OR Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '8px 0 2px',
                gap: '12px'
              }}
            >
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                OR
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            </div>

            {/* Google Sign-In Button */}
            <button
              id="google-signin-btn"
              type="button"
              disabled={isSigningIn || isGoogleSigningIn}
              onClick={handleGoogleSignIn}
              style={{
                width: '100%',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: (isSigningIn || isGoogleSigningIn) ? 'wait' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSigningIn && !isGoogleSigningIn) {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#94A3B8';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSigningIn && !isGoogleSigningIn) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }
              }}
            >
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
              <span>{isGoogleSigningIn ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>
          </form>
        </div>

        {/* Security & Access Notice */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#64748B', fontSize: '11.5px' }}>
          <ShieldCheck size={14} style={{ color: '#176B52' }} />
          <span>Authorized commercial staff access only. Activity is monitored.</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid #DDE5DF'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} style={{ color: '#176B52' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1F2D26' }}>Reset Staff Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
              Enter your registered staff email address to receive recovery instructions from the central authentication system.
            </p>

            {forgotMessage && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(23, 107, 82, 0.08)',
                  border: '1px solid rgba(23, 107, 82, 0.25)',
                  borderRadius: '8px',
                  color: '#176B52',
                  fontSize: '12.5px',
                  marginBottom: '16px',
                  lineHeight: 1.4,
                }}
              >
                {forgotMessage}
              </div>
            )}

            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1F2D26', marginBottom: '6px' }}>
                  Staff Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@example.com"
                  className="input-control"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForgotModal(false)}
                  style={{ height: '38px', padding: '0 16px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{ height: '38px', padding: '0 18px', borderRadius: '8px', border: 'none', backgroundColor: '#176B52', color: '#FFFFFF', fontWeight: 700, cursor: forgotLoading ? 'wait' : 'pointer' }}
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
