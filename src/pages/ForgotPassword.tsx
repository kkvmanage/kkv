import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { KeyRound, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { KKVLogo } from '../components/common/KKVLogo';
import '../components/auth/LoginView.css';

export const ForgotPassword: React.FC<{ onBackToLogin?: () => void }> = ({ onBackToLogin }) => {
  const { resetPasswordEmail } = useApp();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    const res = await resetPasswordEmail(email.trim());
    setIsSubmitting(false);

    if (res.success) {
      setMessage('Password reset link has been sent to your registered email.');
    } else {
      setError(res.message || 'Failed to send password reset email.');
    }
  };

  return (
    <div className="kkv-login-wrapper" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="kkv-login-form-card" style={{ maxWidth: '460px', margin: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              background: '#FFFFFF',
              borderRadius: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              border: '1px solid #E5E7EB',
              marginBottom: '12px'
            }}
          >
            <KKVLogo size={36} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: '0 0 6px 0' }}>
            Reset Your Password
          </h2>
          <p style={{ fontSize: '13.5px', color: '#6B7280', margin: 0 }}>
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

        {message && (
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '18px'
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div className="kkv-alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="kkv-auth-form">
          <div className="kkv-form-group">
            <label className="kkv-form-label" htmlFor="forgot-email">
              Registered Email
            </label>
            <div className="kkv-input-wrapper">
              <Mail size={18} className="kkv-input-icon" />
              <input
                id="forgot-email"
                type="email"
                required
                className="kkv-input-field"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className="kkv-signin-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="kkv-spin" />
                <span>Sending Reset Link...</span>
              </>
            ) : (
              <>
                <KeyRound size={18} />
                <span>Send Reset Link</span>
              </>
            )}
          </button>
        </form>

        {onBackToLogin && (
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#0F5132',
              fontSize: '13.5px',
              fontWeight: 600,
              marginTop: '20px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
