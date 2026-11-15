'use client';

import React from 'react';
import {
  Mail,
  ArrowUpRight,
  KeyRound,
  MonitorSmartphone,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  AdminTabId,
  BeneficiaryInfo,
  OtpLog,
  SessionItem,
  TwoFactorSettings,
  WithdrawalConfig,
  WithdrawalRequest,
  saloPrimaryBtn,
  saloSecondaryBtn,
  saloSurface,
} from './types';
import type { SentEmailRecord, SmtpSummary } from '@/lib/email/service';
import type { GeminiAdminConfigSummary } from '@/lib/ai/types';

interface OverviewTabProps {
  onSelectTab: (tab: AdminTabId) => void;
  withdrawalConfig: WithdrawalConfig;
  withdrawalRequests: WithdrawalRequest[];
  twoFactorSettings: TwoFactorSettings;
  otpLogs: OtpLog[];
  sessions: SessionItem[];
  beneficiaryForm: BeneficiaryInfo;
  emailHistory: SentEmailRecord[];
  smtpSummary: SmtpSummary | null;
  geminiConfig: GeminiAdminConfigSummary | null;
}

export function OverviewTab({
  onSelectTab,
  withdrawalConfig,
  withdrawalRequests,
  twoFactorSettings,
  otpLogs,
  sessions,
  beneficiaryForm,
  emailHistory,
  smtpSummary,
  geminiConfig,
}: OverviewTabProps) {
  const pendingWithdrawals = withdrawalRequests.filter(
    (r) => r.status !== 'completed' && r.status !== 'transferred' && r.status !== 'rejected'
  );
  const activeSessions = sessions.filter((s) => !s.isRevoked);
  const activeOtps = otpLogs.filter((o) => !o.used && o.expiresAt > Date.now());
  const sentSuccessCount = emailHistory.filter((e) => e.status === 'sent').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Clean Top Action Strip */}
      <div
        style={{
          ...saloSurface,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#111827' }}>
            Treasury & Communications Overview
          </h2>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
            Portfolio #MO-88429 •{' '}
            {smtpSummary?.provider === 'resend'
              ? `Mailer: Resend (${smtpSummary.fromEmail || 'support@moorebachgroup.com'})`
              : smtpSummary?.resendStatus === 'invalid'
                ? 'Mailer: Resend Key Invalid — Replace Required'
                : `SMTP: ${smtpSummary?.configured ? smtpSummary.user : 'Not configured'}`}{' '}
            • AI: {geminiConfig?.configured ? geminiConfig.model : 'Key required'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => onSelectTab('withdrawals')} style={saloSecondaryBtn}>
            <ArrowUpRight style={{ width: '13px', height: '13px' }} />
            <span>Withdrawals ({pendingWithdrawals.length})</span>
          </button>
          <button type="button" onClick={() => onSelectTab('email')} style={saloPrimaryBtn}>
            <Sparkles style={{ width: '13px', height: '13px' }} />
            <span>Draft AI Email</span>
          </button>
        </div>
      </div>

      {/* 4 Crisp Tabular KPI Cards */}
      <div className="salo-kpi-grid">
        <div
          onClick={() => onSelectTab('withdrawals')}
          style={{ ...saloSurface, padding: '16px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>
              24h Withdrawal Lock
            </span>
            {withdrawalConfig.lockdown24hEnabled !== false ? (
              <Lock style={{ width: '15px', height: '15px', color: '#d97706' }} />
            ) : (
              <CheckCircle2 style={{ width: '15px', height: '15px', color: '#059669' }} />
            )}
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#111827',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {withdrawalConfig.lockdown24hEnabled !== false ? 'Active' : 'Off'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '4px' }}>
            {pendingWithdrawals.length} pending • Post-lock decline{' '}
            {withdrawalConfig.postLockdownDeclineEnabled !== false ? 'on' : 'off'}
          </div>
        </div>

        <div
          onClick={() => onSelectTab('email')}
          style={{ ...saloSurface, padding: '16px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>
              Dispatched Emails
            </span>
            <Mail style={{ width: '15px', height: '15px', color: '#4b5563' }} />
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#111827',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {sentSuccessCount}
          </div>
          <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '4px' }}>
            AI model: {geminiConfig?.model || 'gemini-4-hydrogen'}
          </div>
        </div>

        <div
          onClick={() => onSelectTab('two-factor')}
          style={{ ...saloSurface, padding: '16px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>
              Active OTP Challenges
            </span>
            <KeyRound style={{ width: '15px', height: '15px', color: '#4b5563' }} />
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#111827',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {activeOtps.length}
          </div>
          <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '4px' }}>
            2FA sign-in: {twoFactorSettings.enabled ? 'Enforced' : 'Off'}
          </div>
        </div>

        <div
          onClick={() => onSelectTab('sessions')}
          style={{ ...saloSurface, padding: '16px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>
              Active Sessions
            </span>
            <MonitorSmartphone style={{ width: '15px', height: '15px', color: '#4b5563' }} />
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#111827',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {activeSessions.length}
          </div>
          <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Beneficiary: {beneficiaryForm.name || 'Unset'}
          </div>
        </div>
      </div>

      {/* Dense Workhorse Tables */}
      <div className="salo-two-col">
        {/* Recent Withdrawals */}
        <div style={{ ...saloSurface, padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: '#111827' }}>
              Recent Withdrawals
            </h3>
            <button
              type="button"
              onClick={() => onSelectTab('withdrawals')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1d4ed8',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              View all
            </button>
          </div>

          {withdrawalRequests.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: '12.5px', color: '#6b7280' }}>
              No withdrawal requests submitted yet.
            </div>
          ) : (
            <div>
              {withdrawalRequests.slice(0, 5).map((w, i) => {
                const isDone = w.status === 'completed' || w.status === 'transferred';
                const isRejected = w.status === 'rejected';
                return (
                  <div
                    key={w.id}
                    style={{
                      padding: '11px 18px',
                      borderBottom: i === Math.min(withdrawalRequests.length, 5) - 1 ? 'none' : '1px solid #f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#111827',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        ${Number(w.amount).toLocaleString()} {w.asset || 'USDT'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#6b7280' }}>
                        {w.rail} • {new Date(w.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        textTransform: 'capitalize',
                        backgroundColor: isDone ? '#ecfdf5' : isRejected ? '#fef2f2' : '#fffbeb',
                        color: isDone ? '#065f46' : isRejected ? '#991b1b' : '#92400e',
                      }}
                    >
                      {w.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Outbound Emails */}
        <div style={{ ...saloSurface, padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: '#111827' }}>
              Recent Sent Emails
            </h3>
            <button
              type="button"
              onClick={() => onSelectTab('email')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1d4ed8',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Open studio
            </button>
          </div>

          {emailHistory.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: '12.5px', color: '#6b7280' }}>
              No emails dispatched yet.
            </div>
          ) : (
            <div>
              {emailHistory.slice(0, 5).map((eml, i) => (
                <div
                  key={eml.id}
                  style={{
                    padding: '11px 18px',
                    borderBottom: i === Math.min(emailHistory.length, 5) - 1 ? 'none' : '1px solid #f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#111827',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {eml.subject}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#6b7280' }}>
                      To: {eml.toEmail} • {new Date(eml.sentAt).toLocaleString()}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      textTransform: 'capitalize',
                      backgroundColor: eml.status === 'sent' ? '#ecfdf5' : '#fef2f2',
                      color: eml.status === 'sent' ? '#065f46' : '#991b1b',
                      flexShrink: 0,
                    }}
                  >
                    {eml.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
