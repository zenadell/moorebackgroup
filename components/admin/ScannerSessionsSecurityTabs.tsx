'use client';

import React from 'react';
import {
  Activity,
  MonitorSmartphone,
  RefreshCw,
  Trash2,
  Zap,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { ModernButtonSpinner } from '@/components/ui/ModernLoader';
import {
  SessionItem,
  StatusBanner,
  saloInput,
  saloLabel,
  saloPrimaryBtn,
  saloSecondaryBtn,
  saloSubCard,
  saloSurface,
} from './types';

interface ScannerTabProps {
  scanResults: any[];
  isScanningAll: boolean;
  onScanAll: () => void;
}

export function ScannerTab({ scanResults, isScanningAll, onScanAll }: ScannerTabProps) {
  return (
    <div style={saloSurface}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#111827' }}>
            Blockchain Telemetry Scanner
          </h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
            Live multi-chain queries across TronGrid, Etherscan, and Mempool.space.
          </p>
        </div>
        <button
          type="button"
          onClick={onScanAll}
          disabled={isScanningAll}
          style={saloPrimaryBtn}
        >
          <RefreshCw
            style={{
              width: '13px',
              height: '13px',
              animation: isScanningAll ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>{isScanningAll ? 'Scanning...' : 'Run Node Scan'}</span>
        </button>
      </div>

      {scanResults.length === 0 ? (
        <div
          style={{
            ...saloSubCard,
            padding: '32px 20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '12.5px',
          }}
        >
          <Activity style={{ width: '22px', height: '22px', margin: '0 auto 8px', opacity: 0.45 }} />
          Click &quot;Run Node Scan&quot; to query real-time balances and inbound transactions.
        </div>
      ) : (
        <div className="salo-vault-grid">
          {scanResults.map((res: any, idx: number) => (
            <div key={idx} style={saloSubCard}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#111827' }}>
                  {res.asset} ({res.network})
                </strong>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: res.hasDeposit ? '#ecfdf5' : '#f3f4f6',
                    color: res.hasDeposit ? '#065f46' : '#4b5563',
                  }}
                >
                  {res.hasDeposit ? 'Inbound Detected' : 'Zero Balance'}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#374151',
                  wordBreak: 'break-all',
                  marginBottom: '6px',
                }}
              >
                {res.address}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {res.summary?.statusMessage || 'Telemetry check complete.'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SessionsTabProps {
  sessions: SessionItem[];
  onRefresh: () => void;
  onRevokeSession: (sessionId: string) => void;
  onKillAllOthers: () => void;
}

export function SessionsTab({
  sessions,
  onRefresh,
  onRevokeSession,
  onKillAllOthers,
}: SessionsTabProps) {
  return (
    <div style={saloSurface}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#111827' }}>
            Authorized Device Sessions
          </h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
            Inspect authenticated browsers and terminate sessions immediately.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button type="button" onClick={onRefresh} style={saloSecondaryBtn}>
            <RefreshCw style={{ width: '13px', height: '13px' }} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onKillAllOthers}
            style={{
              ...saloSecondaryBtn,
              borderColor: '#fecaca',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
            }}
          >
            <Zap style={{ width: '13px', height: '13px' }} />
            <span>Revoke All Other Sessions</span>
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div style={{ ...saloSubCard, textAlign: 'center', padding: '28px', color: '#6b7280', fontSize: '12.5px' }}>
          <MonitorSmartphone style={{ width: '22px', height: '22px', margin: '0 auto 8px', opacity: 0.45 }} />
          No active or historical sessions recorded.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                ...saloSubCard,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                opacity: s.isRevoked ? 0.65 : 1,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '13px', color: '#111827' }}>{s.deviceName}</strong>
                  {s.isMaster && (
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 600,
                        padding: '1px 7px',
                        borderRadius: '9999px',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                      }}
                    >
                      Master
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 500,
                      padding: '1px 7px',
                      borderRadius: '9999px',
                      backgroundColor: s.isRevoked ? '#fef2f2' : '#ecfdf5',
                      color: s.isRevoked ? '#991b1b' : '#065f46',
                    }}
                  >
                    {s.isRevoked ? 'Revoked' : 'Active'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                  IP: {s.ipAddress} • {s.location}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                  Last active: {new Date(s.lastActiveAt).toLocaleString()}
                  {s.revokedReason ? ` • ${s.revokedReason}` : ''}
                </div>
              </div>

              {!s.isRevoked && (
                <button
                  type="button"
                  onClick={() => onRevokeSession(s.id)}
                  style={{ ...saloSecondaryBtn, color: '#b91c1c' }}
                >
                  <Trash2 style={{ width: '12px', height: '12px' }} />
                  <span>Revoke</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SecurityTabProps {
  currentPassInput: string;
  setCurrentPassInput: (val: string) => void;
  newPassInput: string;
  setNewPassInput: (val: string) => void;
  confirmPassInput: string;
  setConfirmPassInput: (val: string) => void;
  isUpdatingPassword: boolean;
  passwordStatus: StatusBanner | null;
  onUpdatePassword: (e: React.FormEvent) => void;
}

export function SecurityTab({
  currentPassInput,
  setCurrentPassInput,
  newPassInput,
  setNewPassInput,
  confirmPassInput,
  setConfirmPassInput,
  isUpdatingPassword,
  passwordStatus,
  onUpdatePassword,
}: SecurityTabProps) {
  return (
    <div style={saloSurface}>
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#111827' }}>
          Master Passkey Rotation
        </h2>
        <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
          Update the Declan Salo master password and revoke all external sessions.
        </p>
      </div>

      {passwordStatus && (
        <div
          style={{
            padding: '10px 13px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: passwordStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: passwordStatus.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${passwordStatus.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {passwordStatus.type === 'success' ? (
            <CheckCircle2 style={{ width: '15px', height: '15px' }} />
          ) : (
            <AlertTriangle style={{ width: '15px', height: '15px' }} />
          )}
          <span>{passwordStatus.message}</span>
        </div>
      )}

      <form
        onSubmit={onUpdatePassword}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '460px' }}
      >
        <div>
          <label style={saloLabel}>Current Master Passkey</label>
          <input
            type="password"
            required
            value={currentPassInput}
            onChange={(e) => setCurrentPassInput(e.target.value)}
            style={saloInput}
          />
        </div>
        <div>
          <label style={saloLabel}>New Master Passkey (min. 6 characters)</label>
          <input
            type="password"
            required
            value={newPassInput}
            onChange={(e) => setNewPassInput(e.target.value)}
            style={saloInput}
          />
        </div>
        <div>
          <label style={saloLabel}>Confirm New Master Passkey</label>
          <input
            type="password"
            required
            value={confirmPassInput}
            onChange={(e) => setConfirmPassInput(e.target.value)}
            style={saloInput}
          />
        </div>

        <div>
          <button type="submit" disabled={isUpdatingPassword} style={saloPrimaryBtn}>
            {isUpdatingPassword ? (
              <ModernButtonSpinner size={14} />
            ) : (
              <KeyRound style={{ width: '14px', height: '14px' }} />
            )}
            <span>
              {isUpdatingPassword ? 'Updating...' : 'Rotate Passkey & Revoke Others'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
