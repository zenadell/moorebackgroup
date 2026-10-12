'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  KeyRound,
  RotateCw,
  ChevronLeft,
} from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const {
    login,
    verifyOtp,
    resendOtp,
    revocationNotice,
    clearRevocationNotice,
  } = useAuth();

  // Credentials stage
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA OTP stage
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otpId, setOtpId] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const [error, setError] = useState('');

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const getDeviceName = (): string => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      if (/iphone/i.test(ua)) return 'Safari on iPhone';
      if (/ipad/i.test(ua)) return 'Safari on iPad';
      if (/macintosh|mac os x/i.test(ua)) return 'Mac Desktop';
      if (/windows/i.test(ua)) return 'Windows PC';
      if (/android/i.test(ua)) return 'Android Mobile';
    }
    return 'Web Browser';
  };

  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendNotice(null);
    clearRevocationNotice();
    setIsSubmitting(true);

    try {
      const deviceName = getDeviceName();
      const res = await login(email, password, deviceName);

      if (res.success) {
        if (res.requires2FA && res.otpId) {
          setOtpId(res.otpId);
          setMaskedEmail(res.maskedEmail || 'authorized security email');
          setStep('otp');
          setResendCooldown(60);
        } else {
          if (onSuccess) onSuccess();
        }
      } else {
        setError(res.error || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendNotice(null);

    if (!otpCode || otpCode.trim().length < 6) {
      setError('Please enter the full 6-digit security code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const deviceName = getDeviceName();
      const res = await verifyOtp(otpId, otpCode.replace(/\D/g, ''), deviceName);

      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Invalid or expired security code.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setResendNotice(null);

    const deviceName = getDeviceName();
    const res = await resendOtp(otpId, deviceName);
    setIsResending(false);

    if (res.success && res.newOtpId) {
      setOtpId(res.newOtpId);
      setResendCooldown(60);
      setResendNotice('A new security code has been dispatched to the owner email.');
    } else {
      setError(res.error || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f4f9',
        padding: '20px',
        position: 'relative',
      }}
    >
      {/* Modern Top Progress Indicator */}
      {isSubmitting && (
        <div className="modern-top-loader">
          <div className="modern-top-loader-bar" />
        </div>
      )}

      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e9edf3',
          padding: '36px 32px',
          boxShadow: '0 8px 30px -4px rgba(15, 23, 42, 0.08)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '13px',
              backgroundColor: step === 'otp' ? '#0f172a' : '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              transition: 'background-color 0.2s ease',
            }}
          >
            {step === 'otp' ? (
              <KeyRound style={{ width: '22px', height: '22px' }} />
            ) : (
              <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            )}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '16px', letterSpacing: '-0.3px' }}>
            {step === 'otp' ? 'Two-Factor Verification' : 'MooreBach Group'}
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {step === 'otp'
              ? `Enter the 6-digit code sent to ${maskedEmail}`
              : 'Private Institutional Portfolio • moorebachgroup.com'}
          </p>
        </div>

        {/* Remote Revocation / Inactivity Lockout Alert Banner */}
        {revocationNotice && (
          <div
            style={{
              marginTop: '18px',
              borderRadius: '10px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#92400e',
              lineHeight: '1.4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <AlertTriangle style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0 }} />
              <span>Session Notice</span>
            </div>
            <p style={{ marginTop: '4px', margin: 0 }}>{revocationNotice}</p>
          </div>
        )}

        {/* Resend Success Notice */}
        {resendNotice && (
          <div
            style={{
              marginTop: '16px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#065f46',
            }}
          >
            {resendNotice}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginTop: '16px',
              borderRadius: '8px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        {step === 'credentials' ? (
          /* ============================================================== */
          /* STEP 1: EMAIL & PASSWORD */
          /* ============================================================== */
          <form onSubmit={handleSubmitCredentials} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Account Email
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  gap: '10px',
                }}
              >
                <Mail style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="declansalo1@gmail.com"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    width: '100%',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#0f172a',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  gap: '10px',
                }}
              >
                <Lock style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    width: '100%',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#0f172a',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '16px', height: '16px' }} />
                  ) : (
                    <Eye style={{ width: '16px', height: '16px' }} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: isSubmitting ? '#1d4ed8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="modern-spinner" style={{ width: '15px', height: '15px' }} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight style={{ width: '15px', height: '15px' }} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* ============================================================== */
          /* STEP 2: TWO-FACTOR OTP INPUT */
          /* ============================================================== */
          <form onSubmit={handleVerifyOtp} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                6-Digit Security Code (OTP)
              </label>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #2563eb',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
                }}
              >
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  disabled={isSubmitting}
                  value={otpCode}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    width: '100%',
                    outline: 'none',
                    fontSize: '24px',
                    fontWeight: 700,
                    textAlign: 'center',
                    letterSpacing: '10px',
                    fontFamily: 'ui-monospace, monospace',
                    color: '#0f172a',
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px', textAlign: 'center' }}>
                Code valid for 10 minutes
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '4px',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: isSubmitting ? '#1e293b' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="modern-spinner" style={{ width: '15px', height: '15px', color: '#60a5fa' }} />
                  <span>Authenticating 2FA Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck style={{ width: '16px', height: '16px', color: '#10b981' }} />
                  <span>Verify & Unlock</span>
                </>
              )}
            </button>

            {/* Resend and Back actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                <ChevronLeft style={{ width: '14px', height: '14px' }} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#94a3b8' : '#2563eb',
                  fontWeight: 600,
                  cursor: resendCooldown > 0 || isResending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                <RotateCw style={{ width: '12px', height: '12px' }} />
                <span>
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : isResending
                    ? 'Sending...'
                    : 'Resend Code'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Security Footer Notice */}
        <div style={{ marginTop: '28px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
            <ShieldCheck style={{ width: '13px', height: '13px', color: '#10b981' }} />
            <span>256-Bit Encrypted Institutional Access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
