'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Save,
  Send,
  XCircle,
  Check,
  Copy,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { ModernButtonSpinner } from '@/components/ui/ModernLoader';
import {
  NotificationConfig,
  StatusBanner,
  WithdrawalConfig,
  WithdrawalRequest,
  saloInput,
  saloLabel,
  saloPrimaryBtn,
  saloSecondaryBtn,
  saloSubCard,
  saloSurface,
} from './types';

interface WithdrawalsTabProps {
  withdrawalConfig: WithdrawalConfig;
  setWithdrawalConfig: React.Dispatch<React.SetStateAction<WithdrawalConfig>>;
  notificationConfig: NotificationConfig;
  setNotificationConfig: React.Dispatch<React.SetStateAction<NotificationConfig>>;
  beneficiaryName?: string;
  withdrawalRequests: WithdrawalRequest[];
  isSavingWithdrawals: boolean;
  isSavingNotifications: boolean;
  testingAlertKind: 'withdrawal' | 'liquidation' | 'official_admin' | null;
  isClearingCooldown: boolean;
  withdrawalStatusMsg: StatusBanner | null;
  notificationStatusMsg: StatusBanner | null;
  onSaveWithdrawals: (e: React.FormEvent) => void;
  onSaveNotifications: (e: React.FormEvent) => void;
  onSendTestAlert: (kind: 'withdrawal' | 'liquidation' | 'official_admin') => Promise<void>;
  onQuickPersistConfig: (nextConfig: WithdrawalConfig, msg?: string) => Promise<void>;
  onClearLockdownCooldown: () => void;
  onRefreshQueue: () => void;
  onUpdateStatus: (id: string, status: string, reason?: string) => Promise<void>;
  onConfirmTransfer: (id: string, txHash: string) => Promise<void>;
}

export function WithdrawalsTab({
  withdrawalConfig,
  setWithdrawalConfig,
  notificationConfig,
  setNotificationConfig,
  beneficiaryName,
  withdrawalRequests,
  isSavingWithdrawals,
  isSavingNotifications,
  testingAlertKind,
  isClearingCooldown,
  withdrawalStatusMsg,
  notificationStatusMsg,
  onSaveWithdrawals,
  onSaveNotifications,
  onSendTestAlert,
  onQuickPersistConfig,
  onClearLockdownCooldown,
  onRefreshQueue,
  onUpdateStatus,
  onConfirmTransfer,
}: WithdrawalsTabProps) {
  const [transferTarget, setTransferTarget] = useState<WithdrawalRequest | null>(null);
  const [txHashInput, setTxHashInput] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openTransferDialog = (item: WithdrawalRequest) => {
    setTransferTarget(item);
    setTxHashInput(
      item.txHash ||
        `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    );
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget) return;
    setIsSubmittingTransfer(true);
    try {
      await onConfirmTransfer(transferTarget.id, txHashInput.trim());
      setTransferTarget(null);
      setTxHashInput('');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const copyAddr = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Gateway Policy Controls */}
      <div style={saloSurface}>
        <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#111827' }}>
            24-Hour Lock &amp; Decline Rules
          </h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
            Control the 24-hour security lockdown, post-lockdown Payment Declined notice, withdrawal limits, and settlement rails.
          </p>
        </div>

        {withdrawalStatusMsg && (
          <div
            style={{
              padding: '10px 13px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: withdrawalStatusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: withdrawalStatusMsg.type === 'success' ? '#065f46' : '#991b1b',
              border: `1px solid ${
                withdrawalStatusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'
              }`,
            }}
          >
            {withdrawalStatusMsg.type === 'success' ? (
              <CheckCircle2 style={{ width: '15px', height: '15px', flexShrink: 0 }} />
            ) : (
              <AlertTriangle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
            )}
            <span>{withdrawalStatusMsg.message}</span>
          </div>
        )}

        <form onSubmit={onSaveWithdrawals} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 24-Hour Security Cooldown Toggle */}
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
            <div>
              <strong style={{ fontSize: '13px', color: '#111827', display: 'block' }}>
                24-Hour Security Cooldown
              </strong>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {withdrawalConfig.lockdown24hEnabled !== false
                  ? 'Enforced (1 withdrawal per 24h).'
                  : 'Bypassed for testing.'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={onClearLockdownCooldown}
                disabled={isClearingCooldown}
                style={{ ...saloSecondaryBtn, padding: '6px 10px', fontSize: '11.5px' }}
              >
                {isClearingCooldown ? 'Clearing...' : 'Reset Timer'}
              </button>
              <button
                type="button"
                disabled={isSavingWithdrawals}
                onClick={() => {
                  const nextVal = !(withdrawalConfig.lockdown24hEnabled !== false);
                  const next = { ...withdrawalConfig, lockdown24hEnabled: nextVal };
                  void onQuickPersistConfig(
                    next,
                    nextVal
                      ? '24-hour security cooldown enabled.'
                      : '24-hour security cooldown turned OFF.'
                  );
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: isSavingWithdrawals ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    withdrawalConfig.lockdown24hEnabled !== false ? '#fffbeb' : '#ecfdf5',
                  borderColor:
                    withdrawalConfig.lockdown24hEnabled !== false ? '#fde68a' : '#a7f3d0',
                  color:
                    withdrawalConfig.lockdown24hEnabled !== false ? '#92400e' : '#065f46',
                }}
              >
                {withdrawalConfig.lockdown24hEnabled !== false ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {/* Post-Lockdown Payment Declined Rule */}
          <div style={saloSubCard}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#111827', display: 'block' }}>
                  Post-Lockdown Payment Declined Notice
                </strong>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Shown after 24-hour lockdown finishes when a user opens or submits a new withdrawal.
                </span>
              </div>

              <button
                type="button"
                disabled={isSavingWithdrawals}
                onClick={() => {
                  const nextVal = !(withdrawalConfig.postLockdownDeclineEnabled !== false);
                  const next = { ...withdrawalConfig, postLockdownDeclineEnabled: nextVal };
                  void onQuickPersistConfig(
                    next,
                    nextVal
                      ? 'Post-lockdown Payment Declined rule activated.'
                      : 'Post-lockdown Payment Declined rule disabled.'
                  );
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: isSavingWithdrawals ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    withdrawalConfig.postLockdownDeclineEnabled !== false ? '#fef2f2' : '#f3f4f6',
                  borderColor:
                    withdrawalConfig.postLockdownDeclineEnabled !== false ? '#fecaca' : '#d1d5db',
                  color:
                    withdrawalConfig.postLockdownDeclineEnabled !== false ? '#991b1b' : '#4b5563',
                }}
              >
                {withdrawalConfig.postLockdownDeclineEnabled !== false
                  ? 'Rule Active'
                  : 'Rule Disabled'}
              </button>
            </div>

            <div className="salo-composer-grid" style={{ gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="salo-two-col">
                  <div>
                    <label style={saloLabel}>Dialog Title</label>
                    <input
                      type="text"
                      value={withdrawalConfig.declineTitle ?? 'Payment Declined'}
                      onChange={(e) =>
                        setWithdrawalConfig({
                          ...withdrawalConfig,
                          declineTitle: e.target.value,
                        })
                      }
                      style={saloInput}
                    />
                  </div>
                  <div>
                    <label style={saloLabel}>Support Email (mailto link)</label>
                    <input
                      type="email"
                      value={
                        withdrawalConfig.declineSupportEmail ?? 'support@moorebachgroup.com'
                      }
                      onChange={(e) =>
                        setWithdrawalConfig({
                          ...withdrawalConfig,
                          declineSupportEmail: e.target.value,
                        })
                      }
                      style={saloInput}
                    />
                  </div>
                </div>
                <div className="salo-two-col">
                  <div>
                    <label style={saloLabel}>Button Label</label>
                    <input
                      type="text"
                      value={withdrawalConfig.declineButtonText ?? 'Contact Support'}
                      onChange={(e) =>
                        setWithdrawalConfig({
                          ...withdrawalConfig,
                          declineButtonText: e.target.value,
                        })
                      }
                      style={saloInput}
                    />
                  </div>
                  <div>
                    <label style={saloLabel}>Trigger Timing</label>
                    <select
                      value={withdrawalConfig.declineTriggerMode ?? 'immediate'}
                      onChange={(e) =>
                        setWithdrawalConfig({
                          ...withdrawalConfig,
                          declineTriggerMode:
                            e.target.value === 'on_submit' ? 'on_submit' : 'immediate',
                        })
                      }
                      style={saloInput}
                    >
                      <option value="immediate">Immediate (on opening Withdraw)</option>
                      <option value="on_submit">On Submit (after form submission)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={saloLabel}>Notification Message</label>
                  <textarea
                    rows={2}
                    value={
                      withdrawalConfig.declineMessage ??
                      'Oops! Sorry your withdrawal cannot be completed. Please contact support'
                    }
                    onChange={(e) =>
                      setWithdrawalConfig({
                        ...withdrawalConfig,
                        declineMessage: e.target.value,
                      })
                    }
                    style={{ ...saloInput, resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Minimal Dialog Preview */}
              <div
                style={{
                  backgroundColor: '#e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: '270px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ padding: '16px 16px 14px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      {withdrawalConfig.declineTitle || 'Payment Declined'}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#4b5563', lineHeight: 1.4 }}>
                      {withdrawalConfig.declineMessage ||
                        'Oops! Sorry your withdrawal cannot be completed. Please contact support'}
                    </div>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid #e5e7eb',
                      padding: '10px 8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#2563eb',
                    }}
                  >
                    {withdrawalConfig.declineButtonText || 'Contact Support'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Withdrawal Limits & Allowed Rails */}
          <div style={saloSubCard}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#111827', display: 'block' }}>
                  Withdrawal Limits &amp; Allowed Rails
                </strong>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Set per-transaction bounds, 24h cumulative ceiling (0 = unlimited), and enabled disbursement channels.
                </span>
              </div>
              <button
                type="button"
                disabled={isSavingWithdrawals}
                onClick={() => {
                  const next = {
                    ...withdrawalConfig,
                    requireTwoFactor: !withdrawalConfig.requireTwoFactor,
                  };
                  void onQuickPersistConfig(
                    next,
                    next.requireTwoFactor
                      ? '2FA confirmation required for withdrawals.'
                      : 'Withdrawal 2FA requirement turned off.'
                  );
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  backgroundColor: withdrawalConfig.requireTwoFactor ? '#eff6ff' : '#f3f4f6',
                  borderColor: withdrawalConfig.requireTwoFactor ? '#bfdbfe' : '#d1d5db',
                  color: withdrawalConfig.requireTwoFactor ? '#1d4ed8' : '#4b5563',
                }}
              >
                2FA Gate: {withdrawalConfig.requireTwoFactor ? 'Required' : 'Optional'}
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <div>
                <label style={saloLabel}>Minimum Amount (USD)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={withdrawalConfig.minAmount}
                  onChange={(e) =>
                    setWithdrawalConfig({
                      ...withdrawalConfig,
                      minAmount: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  style={saloInput}
                />
              </div>
              <div>
                <label style={saloLabel}>Max Per Transaction (USD)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={withdrawalConfig.maxAmount}
                  onChange={(e) =>
                    setWithdrawalConfig({
                      ...withdrawalConfig,
                      maxAmount: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  style={saloInput}
                />
              </div>
              <div>
                <label style={saloLabel}>24h Daily Limit (USD)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={withdrawalConfig.dailyLimit}
                  onChange={(e) =>
                    setWithdrawalConfig({
                      ...withdrawalConfig,
                      dailyLimit: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  style={saloInput}
                />
              </div>
            </div>

            <div>
              <label style={saloLabel}>Allowed Settlement Rails</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(
                  [
                    { key: 'crypto', label: 'Crypto Outbound' },
                    { key: 'fedwire', label: 'Fedwire Wire' },
                    { key: 'swift', label: 'SWIFT Global' },
                    { key: 'debit', label: 'Instant Debit' },
                  ] as const
                ).map((item) => {
                  const active = Boolean(withdrawalConfig.allowedRails?.[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={isSavingWithdrawals}
                      onClick={() => {
                        const next = {
                          ...withdrawalConfig,
                          allowedRails: {
                            ...withdrawalConfig.allowedRails,
                            [item.key]: !active,
                          },
                        };
                        void onQuickPersistConfig(
                          next,
                          `${item.label} rail ${!active ? 'enabled' : 'disabled'}.`
                        );
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        border: '1px solid',
                        cursor: isSavingWithdrawals ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: active ? '#ecfdf5' : '#ffffff',
                        borderColor: active ? '#a7f3d0' : '#d1d5db',
                        color: active ? '#065f46' : '#6b7280',
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '9999px',
                          backgroundColor: active ? '#10b981' : '#d1d5db',
                        }}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSavingWithdrawals}
              style={{
                ...saloPrimaryBtn,
                opacity: isSavingWithdrawals ? 0.65 : 1,
                cursor: isSavingWithdrawals ? 'not-allowed' : 'pointer',
              }}
            >
              {isSavingWithdrawals ? (
                <ModernButtonSpinner size={14} />
              ) : (
                <Save style={{ width: '14px', height: '14px' }} />
              )}
              <span>{isSavingWithdrawals ? 'Saving...' : 'Save Limits & Directives'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Automated Email Alerts for Withdrawals & Liquidations */}
      <div style={saloSurface}>
        <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <Mail style={{ width: '16px', height: '16px', color: '#2563eb' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#111827' }}>
              Automated Alert Email Routing
            </h2>
          </div>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
            Route client-facing confirmations to the user&apos;s inbox and internal treasury operations alerts separately to your official admin email.
          </p>
        </div>

        {notificationStatusMsg && (
          <div
            style={{
              marginBottom: '14px',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: notificationStatusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${notificationStatusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              color: notificationStatusMsg.type === 'success' ? '#065f46' : '#991b1b',
            }}
          >
            {notificationStatusMsg.type === 'success' ? (
              <CheckCircle2 style={{ width: '15px', height: '15px', flexShrink: 0 }} />
            ) : (
              <AlertTriangle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
            )}
            <span>{notificationStatusMsg.message}</span>
          </div>
        )}

        <form onSubmit={onSaveNotifications} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={saloSubCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: '#111827', display: 'block' }}>
                  Alert Recipient Name (Beneficiary / User)
                </strong>
                <span style={{ fontSize: '11.5px', color: '#6b7280' }}>
                  Controls the greeting &amp; addressee (&quot;Dear {notificationConfig.clientAlertName.trim() || beneficiaryName?.trim() || 'Recipient'},&quot;) on automated withdrawal and liquidation emails instead of the main portfolio owner.
                </span>
              </div>
              {beneficiaryName?.trim() &&
                notificationConfig.clientAlertName.trim() !== beneficiaryName.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      setNotificationConfig({
                        ...notificationConfig,
                        clientAlertName: beneficiaryName.trim(),
                      })
                    }
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#2563eb',
                      cursor: 'pointer',
                    }}
                  >
                    Use Sole Beneficiary ({beneficiaryName.trim()})
                  </button>
                )}
            </div>
            <input
              type="text"
              value={notificationConfig.clientAlertName}
              onChange={(e) =>
                setNotificationConfig({
                  ...notificationConfig,
                  clientAlertName: e.target.value,
                })
              }
              placeholder={beneficiaryName?.trim() || 'e.g. NGO LIEN A'}
              style={saloInput}
            />
          </div>

          <div className="salo-two-col">
            <div style={saloSubCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#111827', display: 'block' }}>
                    Client Withdrawal Confirmation
                  </strong>
                  <span style={{ fontSize: '11.5px', color: '#6b7280' }}>
                    Sent to the recipient when a withdrawal is submitted (&quot;Dear {notificationConfig.clientAlertName.trim() || beneficiaryName?.trim() || 'Recipient'},&quot;).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotificationConfig({
                      ...notificationConfig,
                      withdrawalAlertsEnabled: !notificationConfig.withdrawalAlertsEnabled,
                    })
                  }
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    backgroundColor: notificationConfig.withdrawalAlertsEnabled ? '#ecfdf5' : '#f3f4f6',
                    borderColor: notificationConfig.withdrawalAlertsEnabled ? '#a7f3d0' : '#d1d5db',
                    color: notificationConfig.withdrawalAlertsEnabled ? '#065f46' : '#4b5563',
                  }}
                >
                  {notificationConfig.withdrawalAlertsEnabled ? 'Active' : 'Muted'}
                </button>
              </div>
              <label style={saloLabel}>User Email(s) for Withdrawals</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={notificationConfig.withdrawalAlertEmail}
                  onChange={(e) =>
                    setNotificationConfig({
                      ...notificationConfig,
                      withdrawalAlertEmail: e.target.value,
                    })
                  }
                  placeholder="client@example.com (comma-separated allowed)"
                  style={saloInput}
                />
                <button
                  type="button"
                  disabled={testingAlertKind !== null || !notificationConfig.withdrawalAlertEmail.trim()}
                  onClick={() => onSendTestAlert('withdrawal')}
                  style={{
                    ...saloSecondaryBtn,
                    whiteSpace: 'nowrap',
                    opacity:
                      testingAlertKind !== null || !notificationConfig.withdrawalAlertEmail.trim()
                        ? 0.6
                        : 1,
                  }}
                >
                  {testingAlertKind === 'withdrawal' ? 'Sending...' : 'Test'}
                </button>
              </div>
            </div>

            <div style={saloSubCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#111827', display: 'block' }}>
                    Client Liquidation Confirmation
                  </strong>
                  <span style={{ fontSize: '11.5px', color: '#6b7280' }}>
                    Sent to the recipient when shares are liquidated (&quot;Dear {notificationConfig.clientAlertName.trim() || beneficiaryName?.trim() || 'Recipient'},&quot;).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotificationConfig({
                      ...notificationConfig,
                      liquidationAlertsEnabled: !notificationConfig.liquidationAlertsEnabled,
                    })
                  }
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    backgroundColor: notificationConfig.liquidationAlertsEnabled ? '#ecfdf5' : '#f3f4f6',
                    borderColor: notificationConfig.liquidationAlertsEnabled ? '#a7f3d0' : '#d1d5db',
                    color: notificationConfig.liquidationAlertsEnabled ? '#065f46' : '#4b5563',
                  }}
                >
                  {notificationConfig.liquidationAlertsEnabled ? 'Active' : 'Muted'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ ...saloLabel, marginBottom: 0 }}>User Email(s) for Liquidations</label>
                {notificationConfig.withdrawalAlertEmail.trim() &&
                  notificationConfig.liquidationAlertEmail !== notificationConfig.withdrawalAlertEmail && (
                    <button
                      type="button"
                      onClick={() =>
                        setNotificationConfig({
                          ...notificationConfig,
                          liquidationAlertEmail: notificationConfig.withdrawalAlertEmail,
                        })
                      }
                      style={{
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#2563eb',
                        cursor: 'pointer',
                      }}
                    >
                      Use same email
                    </button>
                  )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={notificationConfig.liquidationAlertEmail}
                  onChange={(e) =>
                    setNotificationConfig({
                      ...notificationConfig,
                      liquidationAlertEmail: e.target.value,
                    })
                  }
                  placeholder="client@example.com (comma-separated allowed)"
                  style={saloInput}
                />
                <button
                  type="button"
                  disabled={testingAlertKind !== null || !notificationConfig.liquidationAlertEmail.trim()}
                  onClick={() => onSendTestAlert('liquidation')}
                  style={{
                    ...saloSecondaryBtn,
                    whiteSpace: 'nowrap',
                    opacity:
                      testingAlertKind !== null || !notificationConfig.liquidationAlertEmail.trim()
                        ? 0.6
                        : 1,
                  }}
                >
                  {testingAlertKind === 'liquidation' ? 'Sending...' : 'Test'}
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              ...saloSubCard,
              borderColor: '#fde68a',
              backgroundColor: '#fffbeb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: '13px', color: '#78350f', display: 'block' }}>
                  Official Admin Operations Alert (Internal Audit)
                </strong>
                <span style={{ fontSize: '11.5px', color: '#92400e' }}>
                  Sends full treasury telemetry, origin IP/device, and Admin Console links to your official desk inbox whenever a withdrawal or liquidation occurs.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setNotificationConfig({
                    ...notificationConfig,
                    officialAdminAlertsEnabled: !notificationConfig.officialAdminAlertsEnabled,
                  })
                }
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  backgroundColor: notificationConfig.officialAdminAlertsEnabled ? '#ecfdf5' : '#f3f4f6',
                  borderColor: notificationConfig.officialAdminAlertsEnabled ? '#a7f3d0' : '#d1d5db',
                  color: notificationConfig.officialAdminAlertsEnabled ? '#065f46' : '#4b5563',
                }}
              >
                {notificationConfig.officialAdminAlertsEnabled ? 'Active' : 'Muted'}
              </button>
            </div>
            <label style={{ ...saloLabel, color: '#78350f' }}>Official Admin Email(s)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={notificationConfig.officialAdminAlertEmail}
                onChange={(e) =>
                  setNotificationConfig({
                    ...notificationConfig,
                    officialAdminAlertEmail: e.target.value,
                  })
                }
                placeholder="support@moorebachgroup.com (comma-separated allowed)"
                style={saloInput}
              />
              <button
                type="button"
                disabled={testingAlertKind !== null || !notificationConfig.officialAdminAlertEmail.trim()}
                onClick={() => onSendTestAlert('official_admin')}
                style={{
                  ...saloSecondaryBtn,
                  whiteSpace: 'nowrap',
                  opacity:
                    testingAlertKind !== null || !notificationConfig.officialAdminAlertEmail.trim()
                      ? 0.6
                      : 1,
                }}
              >
                {testingAlertKind === 'official_admin' ? 'Sending...' : 'Test'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '11.5px', color: '#6b7280' }}>
              Delivered via your configured Resend API / SMTP transport (`Email Studio` keeps a full audit copy).
            </span>
            <button
              type="submit"
              disabled={isSavingNotifications}
              style={{
                ...saloPrimaryBtn,
                opacity: isSavingNotifications ? 0.65 : 1,
                cursor: isSavingNotifications ? 'not-allowed' : 'pointer',
              }}
            >
              {isSavingNotifications ? (
                <ModernButtonSpinner size={14} />
              ) : (
                <Save style={{ width: '14px', height: '14px' }} />
              )}
              <span>{isSavingNotifications ? 'Saving...' : 'Save Alert Emails'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Live Request Queue */}
      <div style={{ ...saloSurface, padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#111827' }}>
              Withdrawal Requests ({withdrawalRequests.length})
            </h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
              Confirm settlement transfers (&quot;I Have Transferred&quot;) to push live receipts &amp; emails.
            </p>
          </div>

          <button type="button" onClick={onRefreshQueue} style={saloSecondaryBtn}>
            <RefreshCw style={{ width: '13px', height: '13px' }} />
            <span>Refresh</span>
          </button>
        </div>

        {withdrawalRequests.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
            No withdrawal requests in queue.
          </div>
        ) : (
          <>
            <div className="salo-table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '11.5px' }}>
                    <th style={{ padding: '10px 16px', fontWeight: 500 }}>Requested</th>
                    <th style={{ padding: '10px 16px', fontWeight: 500 }}>Amount</th>
                    <th style={{ padding: '10px 16px', fontWeight: 500 }}>Destination</th>
                    <th style={{ padding: '10px 16px', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalRequests.map((item) => {
                    const isSettled = item.status === 'completed' || item.status === 'transferred';
                    const isRejected = item.status === 'rejected';
                    const dest = item.walletAddress || item.destination;

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '11px 16px', color: '#4b5563', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          <div>{new Date(item.timestamp).toLocaleString()}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>
                            {item.id}
                          </div>
                        </td>
                        <td style={{ padding: '11px 16px', fontVariantNumeric: 'tabular-nums' }}>
                          <strong style={{ color: '#111827', fontWeight: 600 }}>
                            ${Number(item.amount).toLocaleString()} {item.asset || 'USDT'}
                          </strong>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {item.rail} ({item.network || 'ERC20'})
                          </div>
                        </td>
                        <td style={{ padding: '11px 16px', maxWidth: '230px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '11.5px',
                                color: '#374151',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {dest}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyAddr(dest, item.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                            >
                              {copiedId === item.id ? (
                                <Check style={{ width: '12px', height: '12px', color: '#059669' }} />
                              ) : (
                                <Copy style={{ width: '12px', height: '12px' }} />
                              )}
                            </button>
                          </div>
                          {item.txHash && (
                            <div style={{ fontSize: '11px', color: '#047857', fontFamily: 'monospace' }}>
                              TX: {item.txHash.slice(0, 18)}...
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              textTransform: 'capitalize',
                              backgroundColor: isSettled
                                ? '#ecfdf5'
                                : isRejected
                                ? '#fef2f2'
                                : '#fffbeb',
                              color: isSettled ? '#065f46' : isRejected ? '#991b1b' : '#92400e',
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {!isSettled && !isRejected ? (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => openTransferDialog(item)}
                                style={{
                                  ...saloPrimaryBtn,
                                  backgroundColor: '#047857',
                                  borderColor: '#047857',
                                  padding: '5px 10px',
                                  fontSize: '11.5px',
                                }}
                              >
                                <Send style={{ width: '11px', height: '11px' }} />
                                <span>I Have Transferred</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateStatus(item.id, 'rejected', 'Declined by Treasury Desk')
                                }
                                style={{
                                  ...saloSecondaryBtn,
                                  padding: '5px 9px',
                                  fontSize: '11.5px',
                                  color: '#b91c1c',
                                }}
                              >
                                <XCircle style={{ width: '11px', height: '11px' }} />
                                <span>Decline</span>
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#9ca3af' }}>Finalized</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="salo-mobile-cards" style={{ padding: '12px' }}>
              {withdrawalRequests.map((item) => {
                const isSettled = item.status === 'completed' || item.status === 'transferred';
                const isRejected = item.status === 'rejected';
                const dest = item.walletAddress || item.destination;

                return (
                  <div key={item.id} style={saloSubCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                        ${Number(item.amount).toLocaleString()} {item.asset || 'USDT'}
                      </strong>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          backgroundColor: isSettled
                            ? '#ecfdf5'
                            : isRejected
                            ? '#fef2f2'
                            : '#fffbeb',
                          color: isSettled ? '#065f46' : isRejected ? '#991b1b' : '#92400e',
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#6b7280', marginBottom: '4px' }}>
                      {item.rail} • {new Date(item.timestamp).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#374151', wordBreak: 'break-all', marginBottom: '10px' }}>
                      {dest}
                    </div>
                    {!isSettled && !isRejected && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => openTransferDialog(item)}
                          style={{
                            ...saloPrimaryBtn,
                            flex: 1,
                            backgroundColor: '#047857',
                            borderColor: '#047857',
                          }}
                        >
                          I Have Transferred
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStatus(item.id, 'rejected', 'Declined by Treasury Desk')
                          }
                          style={{ ...saloSecondaryBtn, color: '#b91c1c' }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Confirm Transfer Modal */}
      {transferTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <form
            onSubmit={submitTransfer}
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '22px',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                Confirm Capital Disbursement
              </h3>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#4b5563', lineHeight: 1.45 }}>
                Confirming{' '}
                <strong>
                  ${Number(transferTarget.amount).toLocaleString()} {transferTarget.asset || 'USDT'}
                </strong>{' '}
                will issue the client payment receipt and confirmation email immediately.
              </p>
            </div>

            <div>
              <label style={saloLabel}>Transaction Hash / Wire Reference</label>
              <input
                type="text"
                required
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value)}
                style={{ ...saloInput, fontFamily: 'monospace' }}
                placeholder="0x..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                style={saloSecondaryBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingTransfer}
                style={{
                  ...saloPrimaryBtn,
                  backgroundColor: '#047857',
                  borderColor: '#047857',
                }}
              >
                {isSubmittingTransfer && <ModernButtonSpinner size={13} />}
                <span>{isSubmittingTransfer ? 'Confirming...' : 'Confirm & Issue Receipt'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
