'use client';

import React from 'react';
import {
  Check,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { ModernButtonSpinner } from '@/components/ui/ModernLoader';
import {
  DbRuntimeStatus,
  NotificationConfig,
  OtpLog,
  StatusBanner,
  TwoFactorSettings,
  saloInput,
  saloLabel,
  saloPrimaryBtn,
  saloSecondaryBtn,
  saloSubCard,
  saloSurface,
} from './types';

interface TwoFactorTabProps {
  twoFactorSettings: TwoFactorSettings;
  setTwoFactorSettings: React.Dispatch<React.SetStateAction<TwoFactorSettings>>;
  resendApiKeyInput?: string;
  setResendApiKeyInput?: (val: string) => void;
  showResendKey?: boolean;
  setShowResendKey?: (val: boolean) => void;
  smtpPassInput: string;
  setSmtpPassInput: (val: string) => void;
  showSmtpPass: boolean;
  setShowSmtpPass: (val: boolean) => void;
  isSaving2FA: boolean;
  isRemovingResendKey?: boolean;
  twoFactorStatusMsg: StatusBanner | null;
  otpLogs: OtpLog[];
  dbStatus?: DbRuntimeStatus | null;
  notificationConfig?: NotificationConfig;
  copiedOtp: string | null;
  onSave2FA: (e: React.FormEvent) => void;
  onRemoveResendKey?: () => void;
  onRefreshOtp: () => void;
  onCopyOtp: (code: string) => void;
  onOpenWithdrawalsTab?: () => void;
}

export function TwoFactorTab({
  twoFactorSettings,
  setTwoFactorSettings,
  resendApiKeyInput = '',
  setResendApiKeyInput,
  showResendKey = false,
  setShowResendKey,
  smtpPassInput,
  setSmtpPassInput,
  showSmtpPass,
  setShowSmtpPass,
  isSaving2FA,
  isRemovingResendKey = false,
  twoFactorStatusMsg,
  otpLogs,
  dbStatus,
  notificationConfig,
  copiedOtp,
  onSave2FA,
  onRemoveResendKey,
  onRefreshOtp,
  onCopyOtp,
  onOpenWithdrawalsTab,
}: TwoFactorTabProps) {
  const isResendActive =
    twoFactorSettings.resendStatus === 'active' ||
    (Boolean(twoFactorSettings.resendConfigured) && twoFactorSettings.resendStatus !== 'invalid');
  const isResendInvalid = twoFactorSettings.resendStatus === 'invalid';
  const hasPersonalOutbound =
    (twoFactorSettings.smtpHost || '').toLowerCase().includes('gmail') ||
    (twoFactorSettings.smtpUser || '').toLowerCase().includes('@gmail.com') ||
    (twoFactorSettings.smtpUser || '').toLowerCase().includes('declansalo');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Live OTP Radar */}
      <div style={saloSurface}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '14px',
            paddingBottom: '12px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#111827' }}>
              Live OTP Verification Radar
            </h2>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
              Real-time 6-digit login challenge codes (auto-refreshes every 4s).
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {dbStatus && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  backgroundColor: dbStatus.isPostgres
                    ? '#ecfdf5'
                    : dbStatus.engine === 'sqlite-ephemeral-serverless'
                    ? '#fef2f2'
                    : '#f3f4f6',
                  color: dbStatus.isPostgres
                    ? '#065f46'
                    : dbStatus.engine === 'sqlite-ephemeral-serverless'
                    ? '#991b1b'
                    : '#4b5563',
                  border: `1px solid ${
                    dbStatus.isPostgres
                      ? '#a7f3d0'
                      : dbStatus.engine === 'sqlite-ephemeral-serverless'
                      ? '#fecaca'
                      : '#e5e7eb'
                  }`,
                }}
              >
                {dbStatus.isPostgres
                  ? `Neon PostgreSQL (${dbStatus.detectedEnvVar || 'DB'})`
                  : dbStatus.engine === 'sqlite-ephemeral-serverless'
                  ? 'Ephemeral /tmp SQLite (Missing DATABASE_URL)'
                  : 'Local SQLite'}
              </span>
            )}
            <button type="button" onClick={onRefreshOtp} style={saloSecondaryBtn}>
              <RefreshCw style={{ width: '13px', height: '13px' }} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {otpLogs.length === 0 ? (
          <div style={{ ...saloSubCard, textAlign: 'center', padding: '24px', color: '#6b7280', fontSize: '12.5px' }}>
            No OTP authentication codes generated yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {otpLogs.map((otp) => {
              const isExpired = otp.expiresAt < Date.now();
              const isSuperseded = Boolean(otp.superseded) && !otp.used;
              const isActive = !otp.used && !isSuperseded && !isExpired;
              const statusLabel = otp.used
                ? 'Consumed'
                : isSuperseded
                ? 'Superseded'
                : isExpired
                ? 'Expired'
                : 'Active';
              const badgeBg = otp.used
                ? '#f3f4f6'
                : isSuperseded
                ? '#fffbeb'
                : isExpired
                ? '#fef2f2'
                : '#ecfdf5';
              const badgeColor = otp.used
                ? '#4b5563'
                : isSuperseded
                ? '#92400e'
                : isExpired
                ? '#991b1b'
                : '#065f46';

              return (
                <div
                  key={otp.id}
                  style={{
                    ...saloSubCard,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => onCopyOtp(otp.code)}
                      title="Copy OTP code"
                      style={{
                        backgroundColor: '#ffffff',
                        border: isActive ? '1px solid #10b981' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '17px',
                          fontWeight: 700,
                          letterSpacing: '3px',
                          color: isActive ? '#065f46' : '#6b7280',
                        }}
                      >
                        {otp.code}
                      </span>
                      {copiedOtp === otp.code ? (
                        <Check style={{ width: '13px', height: '13px', color: '#059669' }} />
                      ) : (
                        <Copy style={{ width: '13px', height: '13px', color: '#9ca3af' }} />
                      )}
                    </button>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                        {otp.deviceName || 'Web Browser'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#6b7280' }}>
                        {otp.email} • {otp.ipAddress} • {new Date(otp.createdAt).toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: '#9ca3af',
                          fontFamily: 'monospace',
                          marginTop: '2px',
                        }}
                      >
                        {otp.challengeId ? `Session: ${otp.challengeId.slice(0, 20)}… • ` : ''}
                        DB: {otp.id}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: badgeBg,
                      color: badgeColor,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2FA & Official Company Mail Gateway Config */}
      <div style={saloSurface}>
        <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#111827' }}>
            2FA Policy &amp; Official Company Mail Gateway
          </h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
            All outbound dispatches send strictly from <code>support@moorebachgroup.com</code> via Resend (primary) or official domain SMTP fallback. Personal Gmail accounts are disabled for outbound mail.
          </p>
        </div>

        {twoFactorStatusMsg && (
          <div
            style={{
              padding: '10px 13px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: twoFactorStatusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: twoFactorStatusMsg.type === 'success' ? '#065f46' : '#991b1b',
              border: `1px solid ${
                twoFactorStatusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'
              }`,
            }}
          >
            {twoFactorStatusMsg.type === 'success' ? (
              <CheckCircle2 style={{ width: '15px', height: '15px' }} />
            ) : (
              <AlertTriangle style={{ width: '15px', height: '15px' }} />
            )}
            <span>{twoFactorStatusMsg.message}</span>
          </div>
        )}

        <form onSubmit={onSave2FA} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Primary Delivery: Resend Transactional API */}
          <div
            style={{
              ...saloSubCard,
              backgroundColor: isResendInvalid
                ? '#fef2f2'
                : isResendActive
                  ? '#f0fdf4'
                  : '#f8fafc',
              borderColor: isResendInvalid
                ? '#fecaca'
                : isResendActive
                  ? '#bbf7d0'
                  : '#e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: '#111827', display: 'block' }}>
                  Resend API Key (Verified Official Domain)
                </strong>
                <span style={{ fontSize: '12px', color: '#4b5563' }}>
                  Primary HTTPS delivery strictly from <code>support@moorebachgroup.com</code> (AES-256-GCM encrypted in PostgreSQL database).
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {isResendInvalid ? (
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                    }}
                  >
                    Revoked / Invalid Key — Replace Required
                  </span>
                ) : isResendActive ? (
                  <>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        fontFamily: 'monospace',
                      }}
                    >
                      Active ({twoFactorSettings.maskedResendKey || 'Configured'})
                    </span>
                    {onRemoveResendKey && (
                      <button
                        type="button"
                        disabled={isRemovingResendKey}
                        onClick={onRemoveResendKey}
                        style={{
                          ...saloSecondaryBtn,
                          padding: '4px 9px',
                          fontSize: '11.5px',
                          color: '#991b1b',
                          borderColor: '#fecaca',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <Trash2 style={{ width: '12px', height: '12px' }} />
                        <span>{isRemovingResendKey ? 'Removing...' : 'Remove Key'}</span>
                      </button>
                    )}
                  </>
                ) : (
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                    }}
                  >
                    Not Set
                  </span>
                )}
              </div>
            </div>

            {isResendInvalid && (
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <span>
                  <strong>Delivery Blocked:</strong>{' '}
                  {twoFactorSettings.resendStatusMessage ||
                    'Resend rejected the saved API key ("API key is invalid"). Generate a fresh Sending-Access key and click Verify & Save below.'}
                </span>
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#991b1b',
                    textDecoration: 'underline',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>Create Key on Resend</span>
                  <ExternalLink style={{ width: '12px', height: '12px' }} />
                </a>
              </div>
            )}

            {setResendApiKeyInput && (
              <div style={{ position: 'relative' }}>
                <input
                  type={showResendKey ? 'text' : 'password'}
                  value={resendApiKeyInput}
                  onChange={(e) => setResendApiKeyInput(e.target.value)}
                  placeholder={
                    isResendActive
                      ? 'Leave blank to keep active Resend key, or paste new re_... key'
                      : 'Paste fresh Resend API key (re_...) and click Verify & Save'
                  }
                  style={{ ...saloInput, fontFamily: 'monospace', paddingRight: '36px' }}
                />
                {setShowResendKey && (
                  <button
                    type="button"
                    onClick={() => setShowResendKey(!showResendKey)}
                    style={{
                      position: 'absolute',
                      right: '9px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                    }}
                  >
                    {showResendKey ? (
                      <EyeOff style={{ width: '14px', height: '14px' }} />
                    ) : (
                      <Eye style={{ width: '14px', height: '14px' }} />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {hasPersonalOutbound && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '6px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: '1 1 320px' }}>
                <AlertTriangle style={{ width: '15px', height: '15px', flexShrink: 0, marginTop: '1px' }} />
                <span>
                  <strong>Personal Gmail / Non-Company Sender Blocked:</strong> Outbound email must strictly use
                  <strong> support@moorebachgroup.com</strong> via Resend or official company SMTP (<code>mail.privateemail.com</code>).
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setTwoFactorSettings({
                    ...twoFactorSettings,
                    smtpHost: 'mail.privateemail.com',
                    smtpPort: 465,
                    smtpUser: 'support@moorebachgroup.com',
                    smtpFrom: 'MooreBach Group Treasury <support@moorebachgroup.com>',
                  })
                }
                style={{
                  padding: '6px 11px',
                  borderRadius: '6px',
                  backgroundColor: '#111827',
                  border: '1px solid #111827',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Reset to Official Company SMTP
              </button>
            </div>
          )}

          <div
            style={{
              ...saloSubCard,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <strong style={{ fontSize: '13px', color: '#111827', display: 'block' }}>
                Enforce 2FA Verification on Sign-In
              </strong>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                Require 6-digit email OTP verification after password login.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setTwoFactorSettings({
                  ...twoFactorSettings,
                  enabled: !twoFactorSettings.enabled,
                })
              }
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: twoFactorSettings.enabled ? '#ecfdf5' : '#f3f4f6',
                borderColor: twoFactorSettings.enabled ? '#a7f3d0' : '#d1d5db',
                color: twoFactorSettings.enabled ? '#065f46' : '#4b5563',
              }}
            >
              {twoFactorSettings.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="salo-two-col">
            <div>
              <label style={saloLabel}>2FA OTP Alert Inbox (Incoming To: Only)</label>
              <input
                type="email"
                required
                value={twoFactorSettings.notifyEmail}
                onChange={(e) =>
                  setTwoFactorSettings({ ...twoFactorSettings, notifyEmail: e.target.value })
                }
                style={saloInput}
              />
              <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                Destination for incoming 2FA login codes only — never used as outbound sender.
              </span>
            </div>

            <div>
              <label style={saloLabel}>Official Outbound Sender (From:)</label>
              <input
                type="text"
                value={twoFactorSettings.smtpFrom}
                onChange={(e) =>
                  setTwoFactorSettings({ ...twoFactorSettings, smtpFrom: e.target.value })
                }
                placeholder="MooreBach Group Treasury <support@moorebachgroup.com>"
                style={saloInput}
              />
            </div>

            <div>
              <label style={saloLabel}>Official Domain SMTP Host (Fallback)</label>
              <input
                type="text"
                value={twoFactorSettings.smtpHost}
                onChange={(e) =>
                  setTwoFactorSettings({ ...twoFactorSettings, smtpHost: e.target.value })
                }
                placeholder="mail.privateemail.com"
                style={saloInput}
              />
            </div>

            <div>
              <label style={saloLabel}>SMTP Port</label>
              <input
                type="number"
                value={twoFactorSettings.smtpPort}
                onChange={(e) =>
                  setTwoFactorSettings({
                    ...twoFactorSettings,
                    smtpPort: Number(e.target.value) || 465,
                  })
                }
                style={saloInput}
              />
            </div>

            <div>
              <label style={saloLabel}>Official Domain SMTP User (From:)</label>
              <input
                type="text"
                value={twoFactorSettings.smtpUser}
                onChange={(e) =>
                  setTwoFactorSettings({ ...twoFactorSettings, smtpUser: e.target.value })
                }
                placeholder="support@moorebachgroup.com"
                style={saloInput}
              />
            </div>

            <div>
              <label style={saloLabel}>
                Official Mailbox Password (SMTP Fallback){' '}
                {twoFactorSettings.smtpPassSet && (
                  <span style={{ color: '#059669' }}>(Configured)</span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSmtpPass ? 'text' : 'password'}
                  value={smtpPassInput}
                  onChange={(e) => setSmtpPassInput(e.target.value)}
                  placeholder={
                    twoFactorSettings.smtpPassSet
                      ? 'Leave blank to retain current password'
                      : 'Optional if Resend API is active'
                  }
                  style={{ ...saloInput, paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPass(!showSmtpPass)}
                  style={{
                    position: 'absolute',
                    right: '9px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  {showSmtpPass ? (
                    <EyeOff style={{ width: '14px', height: '14px' }} />
                  ) : (
                    <Eye style={{ width: '14px', height: '14px' }} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {notificationConfig && (
            <div
              style={{
                ...saloSubCard,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                <strong style={{ color: '#111827' }}>Automated Email Routing:</strong>{' '}
                Recipient{' '}
                <span style={{ color: '#6b7280' }}>
                  ({notificationConfig.clientAlertName.trim() || 'Beneficiary default'})
                </span>{' '}
                • Withdrawals{' '}
                <span style={{ color: '#6b7280' }}>
                  (
                  {notificationConfig.withdrawalAlertsEnabled && notificationConfig.withdrawalAlertEmail
                    ? notificationConfig.withdrawalAlertEmail
                    : 'Paused / unset'}
                  )
                </span>{' '}
                • Liquidations{' '}
                <span style={{ color: '#6b7280' }}>
                  (
                  {notificationConfig.liquidationAlertsEnabled && notificationConfig.liquidationAlertEmail
                    ? notificationConfig.liquidationAlertEmail
                    : 'Paused / unset'}
                  )
                </span>{' '}
                • Official Admin{' '}
                <span style={{ color: '#6b7280' }}>
                  (
                  {notificationConfig.officialAdminAlertsEnabled && notificationConfig.officialAdminAlertEmail
                    ? notificationConfig.officialAdminAlertEmail
                    : 'Paused / unset'}
                  )
                </span>
              </div>
              {onOpenWithdrawalsTab && (
                <button
                  type="button"
                  onClick={onOpenWithdrawalsTab}
                  style={{ ...saloSecondaryBtn, fontSize: '11.5px', padding: '5px 10px' }}
                >
                  Configure in Withdrawals →
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={isSaving2FA} style={saloPrimaryBtn}>
              {isSaving2FA ? (
                <ModernButtonSpinner size={14} />
              ) : (
                <Save style={{ width: '14px', height: '14px' }} />
              )}
              <span>
                {isSaving2FA
                  ? resendApiKeyInput.trim()
                    ? 'Verifying & Saving...'
                    : 'Saving...'
                  : resendApiKeyInput.trim()
                    ? 'Verify & Save'
                    : 'Save Mail Settings'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
