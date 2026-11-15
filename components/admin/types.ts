import React from 'react';

export type AdminTabId =
  | 'overview'
  | 'email'
  | 'withdrawals'
  | 'charges'
  | 'vaults'
  | 'two-factor'
  | 'scanner'
  | 'sessions'
  | 'profile'
  | 'beneficiary'
  | 'security';

export interface VaultAddresses {
  USDT_TRC20: string;
  USDT_ERC20: string;
  BTC: string;
  ETH: string;
}

export interface WithdrawalConfig {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  allowedRails: {
    fedwire: boolean;
    crypto: boolean;
    swift: boolean;
    debit: boolean;
  };
  requireTwoFactor: boolean;
  lockdown24hEnabled: boolean;
  postLockdownDeclineEnabled: boolean;
  declineTriggerMode: 'immediate' | 'on_submit';
  declineTitle: string;
  declineMessage: string;
  declineSupportEmail: string;
  declineButtonText: string;
  lastUpdated: number;
}

export interface WithdrawalRequest {
  id: string;
  timestamp: number;
  amount: number;
  rail: string;
  beneficiary: string;
  destination: string;
  status: string;
  statusReason?: string;
  ipAddress?: string;
  deviceName?: string;
  txHash?: string;
  transferredAt?: number;
  userAcknowledged?: boolean;
  asset?: string;
  network?: string;
  walletAddress?: string;
}

export interface SessionItem {
  id: string;
  deviceName: string;
  ipAddress: string;
  location: string;
  createdAt: number;
  lastActiveAt: number;
  isRevoked: boolean;
  revokedReason?: string;
  isMaster: boolean;
}

export interface TwoFactorSettings {
  enabled: boolean;
  notifyEmail: string;
  resendConfigured?: boolean;
  maskedResendKey?: string;
  resendStatus?: 'active' | 'invalid' | 'missing';
  resendStatusMessage?: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassSet: boolean;
  smtpFrom: string;
}

export interface OtpLog {
  id: string;
  challengeId?: string | null;
  code: string;
  email: string;
  deviceName: string;
  ipAddress: string;
  location: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  superseded?: boolean;
}

export interface DbRuntimeStatus {
  engine: 'neon-postgres' | 'sqlite-local' | 'sqlite-ephemeral-serverless';
  isPostgres: boolean;
  isServerless: boolean;
  detectedEnvVar: string | null;
}

export interface PrincipalProfile {
  name: string;
  email: string;
  location: string;
  avatarUrl: string;
  role: string;
}

export interface BeneficiaryInfo {
  name: string;
  relationship: string;
  email: string;
  address: string;
  avatarUrl: string;
  status: 'Active & Legally Verified' | 'Pending Verification' | 'Active';
  allocation: string;
  designationDate: string;
  covenantId: string;
  notes: string;
}

export interface StatusBanner {
  type: 'success' | 'error';
  message: string;
}

export const saloSurface: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
};

export const saloSubCard: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '14px',
};

export const saloInput: React.CSSProperties = {
  width: '100%',
  padding: '8px 11px',
  borderRadius: '6px',
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  color: '#111827',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

export const saloLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '5px',
};

export const saloPrimaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  padding: '9px 16px',
  borderRadius: '6px',
  backgroundColor: '#111827',
  border: '1px solid #111827',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
};

export const saloSecondaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '7px 12px',
  borderRadius: '6px',
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  color: '#374151',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
};
