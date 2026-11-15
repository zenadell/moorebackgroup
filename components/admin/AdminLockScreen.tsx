'use client';

import React from 'react';
import { Eye, EyeOff, Lock, ArrowRight } from 'lucide-react';
import { ModernButtonSpinner } from '@/components/ui/ModernLoader';

interface AdminLockScreenProps {
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  isVerifying: boolean;
  authError: string;
  onUnlock: (e: React.FormEvent) => void;
}

export function AdminLockScreen({
  passwordInput,
  setPasswordInput,
  showPassword,
  setShowPassword,
  isVerifying,
  authError,
  onUnlock,
}: AdminLockScreenProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#111827',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '28px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Georgia, serif',
              fontSize: '16px',
              fontWeight: 700,
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            M
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
              MooreBach Group Admin
            </h1>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '1px 0 0' }}>
              Treasury & Governance Console
            </p>
          </div>
        </div>

        <form onSubmit={onUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              Master Passkey
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '14px',
                  height: '14px',
                  color: '#9ca3af',
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter master passkey"
                autoFocus
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 34px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  color: '#111827',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '3px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? (
                  <EyeOff style={{ width: '14px', height: '14px' }} />
                ) : (
                  <Eye style={{ width: '14px', height: '14px' }} />
                )}
              </button>
            </div>
          </div>

          {authError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '9px 11px',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: 1.45,
              }}
            >
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying || !passwordInput}
            style={{
              backgroundColor: '#111827',
              color: '#ffffff',
              border: '1px solid #111827',
              borderRadius: '6px',
              padding: '9px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: isVerifying || !passwordInput ? 'not-allowed' : 'pointer',
              opacity: isVerifying || !passwordInput ? 0.55 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
            }}
          >
            {isVerifying ? (
              <>
                <ModernButtonSpinner size={14} />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Sign in to Console</span>
                <ArrowRight style={{ width: '14px', height: '14px' }} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '18px',
            paddingTop: '14px',
            borderTop: '1px solid #f3f4f6',
            fontSize: '11px',
            color: '#9ca3af',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Authorized Principal Only</span>
          <span>Declan Salo</span>
        </div>
      </div>
    </div>
  );
}
