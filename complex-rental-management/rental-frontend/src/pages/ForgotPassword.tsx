import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { authApi } from '../services/authApi.ts';
import { KKVLogo } from '../components/common/KKVLogo.tsx';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await authApi.forgotPassword(email.trim());
      setIsSubmitting(false);

      if (res.isGoogleAccount) {
        setIsGoogleAccount(true);
        setSuccessMessage(res.message);
        setIsSuccess(true);
      } else {
        setIsGoogleAccount(false);
        setSuccessMessage(res.message || 'If an account exists for this email, a password reset link has been sent.');
        if (res.devResetLink) {
          setDevLink(res.devResetLink);
        }
        setIsSuccess(true);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Unable to process your request. Please try again.');
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
              Forgot your password?
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Enter the email address associated with your Rental Management staff account.
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: isGoogleAccount ? 'rgba(59, 130, 246, 0.08)' : 'rgba(23, 107, 82, 0.08)',
                  border: `1px solid ${isGoogleAccount ? 'rgba(59, 130, 246, 0.25)' : 'rgba(23, 107, 82, 0.25)'}`,
                  borderRadius: '12px',
                  color: isGoogleAccount ? '#1D4ED8' : '#176B52',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
                  <CheckCircle2 size={18} />
                  <span>{isGoogleAccount ? 'Google Account Detected' : 'Request Processed'}</span>
                </div>
                <div>{successMessage}</div>

                {devLink && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(23,107,82,0.2)', fontSize: '11.5px' }}>
                    <strong>Dev Quick Link:</strong>{' '}
                    <a href={devLink} style={{ color: '#176B52', textDecoration: 'underline', wordBreak: 'break-all' }}>
                      Open Reset Page
                    </a>
                  </div>
                )}
              </div>

              <Link
                to="/login"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: '#176B52',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                }}
              >
                <ArrowLeft size={16} />
                <span>Return to Login</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label required">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    placeholder="staff@kkvgoldfinance.com"
                    className="input-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                  <Mail size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '44px',
                  backgroundColor: '#176B52',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  fontWeight: 700,
                }}
              >
                <Send size={15} />
                <span>{isSubmitting ? 'Sending Reset Link...' : 'Send Reset Link'}</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: '#64748B',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#64748B', fontSize: '11.5px' }}>
          <ShieldCheck size={14} style={{ color: '#176B52' }} />
          <span>Password reset requests are logged and monitored.</span>
        </div>
      </div>
    </div>
  );
};
