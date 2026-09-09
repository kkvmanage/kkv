import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Check, X, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { authApi } from '../services/authApi.ts';
import { KKVLogo } from '../components/common/KKVLogo.tsx';

export const ResetPassword: React.FC = () => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    if (!tokenParam) {
      setError('Password reset token is missing. Please request a new reset link.');
    } else {
      setToken(tokenParam);
    }
  }, [location]);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (!isFormValid) {
      setError('Please ensure your password meets all complexity requirements.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await authApi.resetPassword(token, password);
      setIsSubmitting(false);

      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/login?reset=success');
        }, 2000);
      } else {
        setError(res.message || 'Failed to reset password. The link may have expired.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Password reset failed. Please try again.');
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
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <KKVLogo size={60} style={{ margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#1F2D26', letterSpacing: '0.4px', margin: 0 }}>
            KKV GOLD FINANCE
          </h1>
          <p style={{ fontSize: '13px', fontWeight: 800, color: '#B48909', letterSpacing: '1px', textTransform: 'uppercase', margin: '4px 0 0' }}>
            COMPLEX RENTAL MANAGEMENT
          </p>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            padding: '32px 28px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDE5DF',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1F2D26', margin: '0 0 6px' }}>
              Create New Password
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Choose a strong, secure password for your Rental Management account.
            </p>
          </div>

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
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {isSuccess ? (
            <div
              style={{
                padding: '18px',
                backgroundColor: 'rgba(23, 107, 82, 0.08)',
                border: '1px solid rgba(23, 107, 82, 0.25)',
                borderRadius: '12px',
                color: '#176B52',
                textAlign: 'center',
              }}
            >
              <CheckCircle2 size={32} style={{ margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px' }}>Password Reset Successful!</h3>
              <p style={{ fontSize: '13px', margin: 0 }}>Redirecting you to the login page...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label required">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="input-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                  <Lock size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="input-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                  <Lock size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F8FAF9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span style={{ fontWeight: 700, color: '#334155', marginBottom: '2px' }}>Password Requirements:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMinLength ? '#059669' : '#64748B' }}>
                  {hasMinLength ? <Check size={13} /> : <X size={13} />}
                  <span>At least 8 characters</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasUppercase ? '#059669' : '#64748B' }}>
                  {hasUppercase ? <Check size={13} /> : <X size={13} />}
                  <span>Uppercase letter (A-Z)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasLowercase ? '#059669' : '#64748B' }}>
                  {hasLowercase ? <Check size={13} /> : <X size={13} />}
                  <span>Lowercase letter (a-z)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasNumber ? '#059669' : '#64748B' }}>
                  {hasNumber ? <Check size={13} /> : <X size={13} />}
                  <span>Number (0-9)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasSpecialChar ? '#059669' : '#64748B' }}>
                  {hasSpecialChar ? <Check size={13} /> : <X size={13} />}
                  <span>Special character (!@#$%^&amp;*)</span>
                </div>
                {confirmPassword && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isMatch ? '#059669' : '#DC2626' }}>
                    {isMatch ? <Check size={13} /> : <X size={13} />}
                    <span>Passwords match</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isFormValid || !token}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '44px',
                  backgroundColor: isFormValid ? '#176B52' : '#94A3B8',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                }}
              >
                <span>{isSubmitting ? 'Resetting Password...' : 'Reset Password'}</span>
                <ArrowRight size={15} />
              </button>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <Link
                  to="/login"
                  style={{
                    fontSize: '13px',
                    color: '#64748B',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Cancel and return to Login
                </Link>
              </div>
            </form>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#64748B', fontSize: '11.5px' }}>
          <ShieldCheck size={14} style={{ color: '#176B52' }} />
          <span>Single-use cryptographic token verified.</span>
        </div>
      </div>
    </div>
  );
};
