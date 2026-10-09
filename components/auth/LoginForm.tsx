'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading, revocationNotice, clearRevocationNotice } = useAuth();
  const [email, setEmail] = useState('declansalo@gmail.com');
  const [password, setPassword] = useState('Declan2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearRevocationNotice();

    // Detect browser/device description
    let deviceName = 'Web Browser';
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      if (/iphone/i.test(ua)) deviceName = 'Safari on iPhone';
      else if (/ipad/i.test(ua)) deviceName = 'Safari on iPad';
      else if (/macintosh|mac os x/i.test(ua)) deviceName = 'Mac Desktop';
      else if (/windows/i.test(ua)) deviceName = 'Windows PC';
      else if (/android/i.test(ua)) deviceName = 'Android Mobile';
    }

    const res = await login(email, password, deviceName);
    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || 'Authentication failed. Please check your password.');
    }
  };

  const handleQuickFill = () => {
    setEmail('declansalo@gmail.com');
    setPassword('Declan2026!');
    setError('');
    clearRevocationNotice();
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
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e9edf3',
          padding: '36px 32px',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '16px' }}>
            Orion Dashboard
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Private Portfolio Access for <strong>Declan Salo</strong>
          </p>
        </div>

        {/* Remote Revocation Alert Banner */}
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
              <span>Session Terminated</span>
            </div>
            <p style={{ marginTop: '4px', margin: 0 }}>{revocationNotice}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginTop: '16px',
              borderRadius: '8px',
              backgroundColor: '#fee2e2',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#dc2626',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Account Email</label>
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Mail style={{ width: '16px', height: '16px' }} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="declansalo@gmail.com"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Password</label>
              <button
                type="button"
                onClick={handleQuickFill}
                style={{
                  fontSize: '11px',
                  color: '#2563eb',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                Use default password
              </button>
            </div>
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Lock style={{ width: '16px', height: '16px' }} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 38px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff style={{ width: '15px', height: '15px' }} />
                ) : (
                  <Eye style={{ width: '15px', height: '15px' }} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '10px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '11px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {isLoading ? 'Authenticating...' : 'Sign In as Declan Salo'}
            <ArrowRight style={{ width: '14px', height: '14px' }} />
          </button>
        </form>

        <div style={{ marginTop: '22px', borderTop: '1px solid #f1f4f9', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
          <ShieldCheck style={{ width: '14px', height: '14px', color: '#10b981' }} />
          <span>Active Session Control • Managed by Declan Salo</span>
        </div>
      </div>
    </div>
  );
}
