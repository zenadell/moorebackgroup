'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Wallet,
  Coins,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Laptop,
  Smartphone,
  Globe,
  Trash2,
  Clock,
  Save,
  Copy,
  Check,
  LogOut,
  Mail,
  Send,
  Sliders,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  User,
  UserCheck,
  Camera,
  Upload,
  Image as ImageIcon,
  FileCheck2,
  Award,
} from 'lucide-react';
import { validateCryptoAddress } from '@/lib/crypto/blockchain';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { ModernTopBar, ModernButtonSpinner } from '@/components/ui/ModernLoader';
import { BeneficiaryInfo } from '@/types';
import { ScreenSecurityShield } from '@/components/security/ScreenSecurityShield';

interface OtpLog {
  id: string;
  code: string;
  email: string;
  deviceName: string;
  ipAddress: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

interface TwoFactorConfig {
  enabled: boolean;
  notifyEmail: string;
  smtpConfigured: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpFrom?: string;
}

interface AuthSessionItem {
  id: string;
  deviceName: string;
  ipAddress: string;
  location: string;
  createdAt: number;
  lastActiveAt: number;
  isMaster: boolean;
  isCurrent: boolean;
}

interface WithdrawalReq {
  id: string;
  asset: string;
  network?: string;
  amount: number;
  address?: string;
  method?: string;
  status: 'pending' | 'reviewing' | 'completed' | 'rejected' | 'held';
  timestamp: number;
  userEmail?: string;
  auditCode?: string;
}

export default function SaloMasterPage() {
  // Master Gate State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterKey, setMasterKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Active Terminal Tab
  const [activeTab, setActiveTab] = useState<
    'vaults' | 'withdrawals' | 'two-factor' | 'profile' | 'beneficiary' | 'scanner' | 'sessions' | 'security'
  >('vaults');

  // Vault Addresses State
  const [addresses, setAddresses] = useState({
    USDT_TRC20: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
    USDT_ERC20: '0x71C8A60e0d5D9fB821c9Ac9c42E5F7a1E12a6D95',
    BTC: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    ETH: '0x71C8A60e0d5D9fB821c9Ac9c42E5F7a1E12a6D95',
  });
  const [isSavingAddresses, setIsSavingAddresses] = useState(false);
  const [addressStatus, setAddressStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [nodeCheckResult, setNodeCheckResult] = useState<Record<string, any>>({});
  const [isCheckingNode, setIsCheckingNode] = useState<string | null>(null);

  // Withdrawal Gateway Configuration State
  const [withdrawalConfig, setWithdrawalConfig] = useState({
    enabled: false,
    lockMessage:
      'Capital disbursements are locked until full contract maturity. Early releases cannot be processed prior to the scheduled contract end date. Please refer to your portfolio terms for details.',
    minAmount: 1000,
    maxAmount: 5000000,
    allowedRails: {
      fedwire: true,
      crypto: true,
      swift: true,
      debit: false,
    },
    requireTwoFactor: true,
    dailyLimit: 2500000,
  });
  const [isSavingWithdrawals, setIsSavingWithdrawals] = useState(false);
  const [withdrawalStatusMsg, setWithdrawalStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalReq[]>([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);

  // 2FA & OTP Monitor State
  const [twoFactorConfig, setTwoFactorConfig] = useState<TwoFactorConfig>({
    enabled: true,
    notifyEmail: 'declansalo1@gmail.com',
    smtpConfigured: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpFrom: '',
  });
  const [smtpPass, setSmtpPass] = useState('');
  const [otpLogs, setOtpLogs] = useState<OtpLog[]>([]);
  const [isSaving2FA, setIsSaving2FA] = useState(false);
  const [twoFactorStatusMsg, setTwoFactorStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active Sessions & Remote Kick-out
  const [sessions, setSessions] = useState<AuthSessionItem[]>([]);
  const [sessionActionStatus, setSessionActionStatus] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Password Management
  const [currentMasterPass, setCurrentMasterPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmMasterPass, setConfirmMasterPass] = useState('');
  const [passStatus, setPassStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Multi-chain Scanner
  const [allDetectedTxs, setAllDetectedTxs] = useState<any[]>([]);
  const [isScanningAll, setIsScanningAll] = useState(false);

  // Principal Profile State
  const [principalProfile, setPrincipalProfile] = useState<{
    name: string;
    email: string;
    location: string;
    avatarUrl: string;
    role: string;
  }>({
    name: 'Declan Salo',
    email: 'declansalo1@gmail.com',
    location: 'Nashville Tennessee, United States',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'Account Owner & Portfolio Principal',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStatusMsg, setProfileStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sole Beneficiary State
  const [beneficiaryForm, setBeneficiaryForm] = useState<BeneficiaryInfo>({
    name: 'Elena Rostova',
    relationship: 'Sole Primary Beneficiary (100% Allocation)',
    email: 'elena.rostova@icloud.com',
    address: '1200 Broadway, Penthouse 42B, Nashville, TN 37203, United States',
    allocationPercent: 100,
    covenantId: 'MBG-BEN-88429-PRI',
    designationDate: 'April 12, 2026',
    status: 'Active & Legally Verified',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    notes: 'Designated 100% sole irrevocable beneficiary under MooreBach Group Portfolio Succession Charter.',
  });
  const [isSavingBeneficiary, setIsSavingBeneficiary] = useState(false);
  const [beneficiaryStatusMsg, setBeneficiaryStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Bulletproof cross-browser copy helper (Safari macOS + iOS + Chrome)
  const handleCopy = (text: string, id: string) => {
    copyToClipboard(text);
    setCopiedKey(id);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === id ? null : prev));
    }, 2500);
  };

  // Global indicator for any ongoing asynchronous Salo operation
  const isBusy =
    isAuthenticating ||
    isSavingAddresses ||
    isSavingWithdrawals ||
    isSaving2FA ||
    isLoadingWithdrawals ||
    isLoadingSessions ||
    isUpdatingPass ||
    isScanningAll ||
    Boolean(isCheckingNode);

  // Check saved master clearance in session
  useEffect(() => {
    const savedKey = sessionStorage.getItem('salo_master_key');
    if (savedKey) {
      setMasterKey(savedKey);
      setIsUnlocked(true);
    }
  }, []);

  // 1. Authenticate / Unlock Salo Terminal
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);

    if (!masterKey.trim()) {
      setUnlockError('Master clearance key is required.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: masterKey.trim() }),
      });

      const data = await res.json();
      setIsAuthenticating(false);

      if (data.success && data.authorized) {
        setIsUnlocked(true);
        sessionStorage.setItem('salo_master_key', masterKey.trim());
      } else {
        setUnlockError(data.error || 'Access Denied: Invalid Master Clearance Key.');
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      setUnlockError(err.message || 'Connection failure authorizing master key.');
    }
  };

  // Lock Terminal
  const handleLockTerminal = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('salo_master_key');
    setMasterKey('');
  };

  // Load All Admin Data when Unlocked
  const loadVaultAddresses = useCallback(async () => {
    try {
      const res = await fetch('/api/crypto/config', {
        headers: { 'x-salo-key': masterKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config?.addresses) {
          setAddresses(data.config.addresses);
        }
      }
    } catch {}
  }, [masterKey]);

  const loadAdminConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/config', {
        headers: { 'x-salo-key': masterKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config?.withdrawals) {
          setWithdrawalConfig(data.config.withdrawals);
        }
      }
    } catch {}
  }, [masterKey]);

  const loadWithdrawalRequests = useCallback(async () => {
    setIsLoadingWithdrawals(true);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        headers: { 'x-salo-key': masterKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.withdrawals) {
          setWithdrawalRequests(data.withdrawals);
        }
      }
    } catch {}
    setIsLoadingWithdrawals(false);
  }, [masterKey]);

  const loadTwoFactorData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/two-factor', {
        headers: { 'x-salo-key': masterKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.settings) setTwoFactorConfig(data.settings);
          if (data.logs) setOtpLogs(data.logs);
        }
      }
    } catch {}
  }, [masterKey]);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: { 'x-salo-key': masterKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sessions) {
          setSessions(data.sessions);
        }
      }
    } catch {}
    setIsLoadingSessions(false);
  }, [masterKey]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setPrincipalProfile({
            name: data.user.name || 'Declan Salo',
            email: data.user.email || 'declansalo1@gmail.com',
            location: data.user.location || 'Nashville Tennessee, United States',
            avatarUrl: data.user.avatarUrl || '',
            role: data.user.role || 'Account Owner & Portfolio Principal',
          });
        }
      }
    } catch {}
  }, []);

  const loadBeneficiary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/beneficiary');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.beneficiary) {
          setBeneficiaryForm(data.beneficiary);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;
    loadVaultAddresses();
    loadAdminConfig();
    loadWithdrawalRequests();
    loadTwoFactorData();
    loadSessions();
    loadProfile();
    loadBeneficiary();

    // Poll 2FA logs & sessions every 4s for real-time monitoring
    const interval = setInterval(() => {
      loadTwoFactorData();
      loadSessions();
    }, 4000);

    return () => clearInterval(interval);
  }, [isUnlocked, loadVaultAddresses, loadAdminConfig, loadWithdrawalRequests, loadTwoFactorData, loadSessions, loadProfile, loadBeneficiary]);

  // Image Upload Compress & Resize Helper
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileStatusMsg({ type: 'error', message: 'Image must be under 5MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setPrincipalProfile((prev) => ({ ...prev, avatarUrl: compressed }));
          setProfileStatusMsg({ type: 'success', message: 'Photo loaded! Click "Save Profile Changes" to apply.' });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleBeneficiaryPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setBeneficiaryStatusMsg({ type: 'error', message: 'Image must be under 5MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setBeneficiaryForm((prev) => ({ ...prev, avatarUrl: compressed }));
          setBeneficiaryStatusMsg({ type: 'success', message: 'Photo loaded! Click "Save Beneficiary Records" to apply.' });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileStatusMsg(null);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(principalProfile),
      });
      const data = await res.json();
      if (data.success) {
        setProfileStatusMsg({ type: 'success', message: 'Profile & avatar updated and synced across MooreBach Group.' });
      } else {
        setProfileStatusMsg({ type: 'error', message: data.error || 'Failed to update profile.' });
      }
    } catch (err: any) {
      setProfileStatusMsg({ type: 'error', message: err.message || 'Network error updating profile.' });
    }
    setIsSavingProfile(false);
  };

  const handleSaveBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBeneficiary(true);
    setBeneficiaryStatusMsg(null);
    try {
      const res = await fetch('/api/admin/beneficiary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(beneficiaryForm),
      });
      const data = await res.json();
      if (data.success) {
        setBeneficiaryStatusMsg({ type: 'success', message: 'Sole Beneficiary dossier updated and locked to MooreBach Group ledger.' });
      } else {
        setBeneficiaryStatusMsg({ type: 'error', message: data.error || 'Failed to update beneficiary.' });
      }
    } catch (err: any) {
      setBeneficiaryStatusMsg({ type: 'error', message: err.message || 'Network error updating beneficiary.' });
    }
    setIsSavingBeneficiary(false);
  };

  // Save Vault Addresses
  const handleSaveAddresses = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressStatus(null);

    const v1 = validateCryptoAddress('USDT', 'TRC20', addresses.USDT_TRC20);
    if (!v1.valid) return setAddressStatus({ type: 'error', message: v1.error || 'Invalid USDT TRC20 address' });
    const v2 = validateCryptoAddress('USDT', 'ERC20', addresses.USDT_ERC20);
    if (!v2.valid) return setAddressStatus({ type: 'error', message: v2.error || 'Invalid USDT ERC20 address' });
    const v3 = validateCryptoAddress('BTC', 'Native', addresses.BTC);
    if (!v3.valid) return setAddressStatus({ type: 'error', message: v3.error || 'Invalid BTC address' });
    const v4 = validateCryptoAddress('ETH', 'ERC20', addresses.ETH);
    if (!v4.valid) return setAddressStatus({ type: 'error', message: v4.error || 'Invalid ETH address' });

    setIsSavingAddresses(true);
    try {
      const res = await fetch('/api/crypto/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-salo-key': masterKey,
        },
        body: JSON.stringify({ addresses }),
      });
      const data = await res.json();
      setIsSavingAddresses(false);
      if (data.success) {
        setAddressStatus({
          type: 'success',
          message: 'All deposit vault addresses successfully updated in database and pushed to GitHub Gist!',
        });
        setTimeout(() => setAddressStatus(null), 4000);
      } else {
        setAddressStatus({ type: 'error', message: data.error || 'Failed to save addresses.' });
      }
    } catch (e: any) {
      setIsSavingAddresses(false);
      setAddressStatus({ type: 'error', message: e.message || 'Network error saving addresses.' });
    }
  };

  // Node query check
  const handleCheckNode = async (asset: 'USDT' | 'BTC' | 'ETH', network: string, address: string, key: string) => {
    setIsCheckingNode(key);
    try {
      const res = await fetch('/api/crypto/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({ asset, network, address }),
      });
      const data = await res.json();
      setNodeCheckResult((prev) => ({ ...prev, [key]: data }));
    } catch (e: any) {
      setNodeCheckResult((prev) => ({
        ...prev,
        [key]: { success: false, error: e.message || 'Verification failed' },
      }));
    } finally {
      setIsCheckingNode(null);
    }
  };

  // Save Withdrawal Directive
  const handleSaveWithdrawals = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalStatusMsg(null);
    setIsSavingWithdrawals(true);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({ withdrawals: withdrawalConfig }),
      });
      const data = await res.json();
      setIsSavingWithdrawals(false);
      if (data.success) {
        setWithdrawalStatusMsg({
          type: 'success',
          message: 'Withdrawal directive successfully saved & enforced across all portals.',
        });
        setTimeout(() => setWithdrawalStatusMsg(null), 4000);
      } else {
        setWithdrawalStatusMsg({ type: 'error', message: data.error || 'Failed to update withdrawals.' });
      }
    } catch (e: any) {
      setIsSavingWithdrawals(false);
      setWithdrawalStatusMsg({ type: 'error', message: e.message || 'Network error updating directive.' });
    }
  };

  // Save 2FA Settings
  const handleSave2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorStatusMsg(null);
    setIsSaving2FA(true);

    try {
      const res = await fetch('/api/admin/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({
          enabled: twoFactorConfig.enabled,
          notifyEmail: twoFactorConfig.notifyEmail,
          smtpHost: twoFactorConfig.smtpHost,
          smtpPort: twoFactorConfig.smtpPort,
          smtpUser: twoFactorConfig.smtpUser,
          smtpPass: smtpPass || undefined,
          smtpFrom: twoFactorConfig.smtpFrom,
        }),
      });

      const data = await res.json();
      setIsSaving2FA(false);

      if (data.success) {
        setTwoFactorStatusMsg({
          type: 'success',
          message: 'Two-Factor Authentication policy and relay settings saved.',
        });
        setSmtpPass('');
        setTimeout(() => setTwoFactorStatusMsg(null), 4000);
      } else {
        setTwoFactorStatusMsg({ type: 'error', message: data.error || 'Failed to save 2FA settings.' });
      }
    } catch (e: any) {
      setIsSaving2FA(false);
      setTwoFactorStatusMsg({ type: 'error', message: e.message || 'Network error saving 2FA.' });
    }
  };

  // Kick Out Session
  const handleKickOutSession = async (sessionId: string) => {
    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({ sessionId, reason: 'Device session terminated by Declan Salo from Master Portal' }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionActionStatus('Selected device session kicked out immediately.');
        loadSessions();
        setTimeout(() => setSessionActionStatus(null), 3000);
      }
    } catch {}
  };

  // Terminate All Other Sessions
  const handleTerminateAllOtherSessions = async () => {
    if (!confirm('Are you sure you want to kick out all other connected devices immediately?')) return;
    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({
          revokeAllOthers: true,
          reason: 'Emergency session purge executed by Declan Salo',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionActionStatus(`Emergency Purge Complete: ${data.count ?? 'All'} guest devices kicked out.`);
        loadSessions();
        setTimeout(() => setSessionActionStatus(null), 4000);
      }
    } catch {}
  };

  // Update Master Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatus(null);

    if (newMasterPass.length < 6) {
      setPassStatus({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newMasterPass !== confirmMasterPass) {
      setPassStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setIsUpdatingPass(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-salo-key': masterKey },
        body: JSON.stringify({
          currentPassword: currentMasterPass || masterKey,
          newPassword: newMasterPass,
          revokeOthers: true,
        }),
      });
      const data = await res.json();
      setIsUpdatingPass(false);

      if (data.success) {
        setPassStatus({
          type: 'success',
          message: 'Master password updated successfully. All other devices have been disconnected.',
        });
        setMasterKey(newMasterPass);
        sessionStorage.setItem('salo_master_key', newMasterPass);
        setCurrentMasterPass('');
        setNewMasterPass('');
        setConfirmMasterPass('');
      } else {
        setPassStatus({ type: 'error', message: data.error || 'Failed to update master password.' });
      }
    } catch (e: any) {
      setIsUpdatingPass(false);
      setPassStatus({ type: 'error', message: e.message || 'Network error updating password.' });
    }
  };

  // =========================================================================
  // RENDER: MASTER LOCK SCREEN
  // =========================================================================
  if (!isUnlocked) {
    return (
      <div
        className="secure-financial-vault"
        style={{
          minHeight: '100vh',
          backgroundColor: '#090d16',
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          position: 'relative',
        }}
      >
        <ScreenSecurityShield principalName="Declan Salo (Master Terminal)" covenantId="MBG-ADMIN-CLEARANCE" />
        <ModernTopBar active={isAuthenticating} />

        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '20px',
            padding: '36px 32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(37, 99, 235, 0.1)',
            textAlign: 'center',
          }}
        >
          {/* Security Halo & Lock Icon */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              backgroundColor: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Lock style={{ width: '32px', height: '32px' }} />
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              margin: '0 0 6px',
            }}
          >
            DECLAN SALO MASTER TERMINAL
          </h1>

          <p
            style={{
              fontSize: '13px',
              color: '#94a3b8',
              lineHeight: 1.5,
              margin: '0 0 24px',
            }}
          >
            High-Security Administrative Gateway. Enter Master Security Clearance Key to unlock administrative authority.
          </p>

          {unlockError && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '12px',
                marginBottom: '20px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span>{unlockError}</span>
            </div>
          )}

          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative', textAlign: 'left' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  marginBottom: '6px',
                }}
              >
                Master Clearance Key / Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  placeholder="Enter Declan Salo Master Password..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showKey ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '10px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                marginTop: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              {isAuthenticating ? (
                <>
                  <ModernButtonSpinner size={16} />
                  <span>Verifying Clearance...</span>
                </>
              ) : (
                <>
                  <Unlock style={{ width: '16px', height: '16px' }} />
                  <span>Unlock Master Console</span>
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              paddingTop: '18px',
              borderTop: '1px solid #1e293b',
              fontSize: '11px',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>🔐 256-Bit Cryptographic Vault</span>
            <span style={{ color: '#10b981' }}>● Gist Sync Online</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: UNLOCKED SALO MASTER PORTAL
  // =========================================================================
  return (
    <div
      className="secure-financial-vault"
      style={{
        minHeight: '100vh',
        backgroundColor: '#0b1120',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <ScreenSecurityShield principalName="Declan Salo (Master Terminal)" covenantId="MBG-ADMIN-CLEARANCE" />
      <ModernTopBar active={isBusy} />
      {/* Master Top Header */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0f172a',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px',
            }}
          >
            DS
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                DECLAN SALO MASTER TERMINAL
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '1px 7px',
                  borderRadius: '9999px',
                }}
              >
                ● SECURED & ACTIVE
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Full Control over Vaults, 2FA, OTP Radar, Withdrawals & Sessions
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1e293b',
              color: '#cbd5e1',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid #334155',
            }}
          >
            <span>View User Dashboard</span>
            <ExternalLink style={{ width: '13px', height: '13px' }} />
          </a>

          <button
            onClick={handleLockTerminal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Lock style={{ width: '13px', height: '13px' }} />
            <span>Lock Terminal</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Navigation Tabs Pill Bar */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            backgroundColor: '#0f172a',
            padding: '5px',
            borderRadius: '12px',
            border: '1px solid #1e293b',
            marginBottom: '24px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'vaults', label: '🪙 Vault Addresses', badge: null },
            { id: 'withdrawals', label: '🔒 Withdrawal Directive', badge: !withdrawalConfig.enabled ? 'LOCKED' : null },
            { id: 'two-factor', label: '🛡️ 2FA & Live OTP Radar', badge: `${otpLogs.filter((l) => !l.used && Date.now() < l.expiresAt).length} Active` },
            { id: 'profile', label: '👤 Principal Profile', badge: null },
            { id: 'beneficiary', label: '🏛️ Sole Beneficiary', badge: '100%' },
            { id: 'scanner', label: '📡 Inbound Ledger Scanner', badge: null },
            { id: 'sessions', label: '💻 Device Sessions', badge: `${sessions.length}` },
            { id: 'security', label: '🔑 Master Password', badge: null },
          ].map((tab) => {
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isSel ? '#2563eb' : 'transparent',
                  color: isSel ? '#ffffff' : '#94a3b8',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      backgroundColor: isSel ? 'rgba(255,255,255,0.2)' : '#1e293b',
                      color: isSel ? '#ffffff' : '#cbd5e1',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: VAULT ADDRESSES */}
        {/* ========================================================================= */}
        {activeTab === 'vaults' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>
                  Institutional Crypto Vault Addresses
                </h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  These addresses are immediately served on the user dashboard Deposit modal and recorded in SQLite & GitHub Gist.
                </p>
              </div>

              {addressStatus && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: addressStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: addressStatus.type === 'success' ? '#34d399' : '#f87171',
                    border: `1px solid ${addressStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  {addressStatus.type === 'success' ? <CheckCircle2 style={{ width: '16px', height: '16px' }} /> : <AlertTriangle style={{ width: '16px', height: '16px' }} />}
                  <span>{addressStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveAddresses} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {[
                  { key: 'USDT_TRC20', label: 'Tether USDT (TRC-20 Tron)', asset: 'USDT', network: 'TRC20', color: '#ef4444' },
                  { key: 'USDT_ERC20', label: 'Tether USDT (ERC-20 Ethereum)', asset: 'USDT', network: 'ERC20', color: '#3b82f6' },
                  { key: 'BTC', label: 'Bitcoin (BTC Native SegWit / Legacy)', asset: 'BTC', network: 'Native', color: '#f59e0b' },
                  { key: 'ETH', label: 'Ethereum (ETH ERC-20)', asset: 'ETH', network: 'ERC20', color: '#8b5cf6' },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: item.color }} />
                        {item.label}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleCheckNode(item.asset as any, item.network, (addresses as any)[item.key], item.key)}
                        disabled={isCheckingNode === item.key}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#94a3b8',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <RefreshCw style={{ width: '11px', height: '11px', animation: isCheckingNode === item.key ? 'spin 1s linear infinite' : 'none' }} />
                        Verify on Node
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={(addresses as any)[item.key]}
                        onChange={(e) => setAddresses({ ...addresses, [item.key]: e.target.value.trim() })}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#ffffff',
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '13px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy((addresses as any)[item.key], item.key)}
                        style={{
                          padding: '0 14px',
                          backgroundColor: '#334155',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {copiedKey === item.key ? <Check style={{ width: '15px', height: '15px', color: '#10b981' }} /> : <Copy style={{ width: '15px', height: '15px' }} />}
                      </button>
                    </div>

                    {nodeCheckResult[item.key] && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#0f172a',
                          fontSize: '11px',
                          color: nodeCheckResult[item.key].hasDeposit ? '#34d399' : '#94a3b8',
                          border: '1px solid #334155',
                        }}
                      >
                        Node response: {nodeCheckResult[item.key].summary?.statusMessage || 'Address checked.'} • Total Inbound: {nodeCheckResult[item.key].summary?.totalReceived ?? 0} {item.asset}
                      </div>
                    )}
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={isSavingAddresses}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      padding: '11px 24px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: isSavingAddresses ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSavingAddresses ? <ModernButtonSpinner size={16} /> : <Save style={{ width: '16px', height: '16px' }} />}
                    <span>{isSavingAddresses ? 'Deploying to Ledger...' : 'Deploy & Save Vault Addresses'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: WITHDRAWAL DIRECTIVE */}
        {/* ========================================================================= */}
        {activeTab === 'withdrawals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>
                  Institutional Withdrawal Directive & Lockout
                </h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  Enforce quarterly cryptographic holds, configure error directives, and approve/reject user withdrawal requests.
                </p>
              </div>

              {withdrawalStatusMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: withdrawalStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: withdrawalStatusMsg.type === 'success' ? '#34d399' : '#f87171',
                    border: `1px solid ${withdrawalStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                  <span>{withdrawalStatusMsg.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveWithdrawals} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Master Switch Card */}
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '14px', color: '#ffffff', display: 'block' }}>
                      Withdrawal Gateway State
                    </strong>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {withdrawalConfig.enabled
                        ? '🟢 Gateway is OPEN. Users can submit withdrawal requests.'
                        : '🔴 Gateway is LOCKED. All user withdrawal attempts trigger the lock directive below.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWithdrawalConfig({ ...withdrawalConfig, enabled: !withdrawalConfig.enabled })}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: withdrawalConfig.enabled ? '#10b981' : '#ef4444',
                      color: '#ffffff',
                    }}
                  >
                    {withdrawalConfig.enabled ? 'GATEWAY OPEN' : 'GATEWAY LOCKED'}
                  </button>
                </div>

                {/* Directive Message */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Custom Lockout Directive (Displayed to User on Withdrawal Failure)
                  </label>
                  <textarea
                    rows={3}
                    value={withdrawalConfig.lockMessage}
                    onChange={(e) => setWithdrawalConfig({ ...withdrawalConfig, lockMessage: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontFamily: '-apple-system, sans-serif',
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                {/* Limits Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Minimum Withdrawal Limit ($)
                    </label>
                    <input
                      type="number"
                      value={withdrawalConfig.minAmount}
                      onChange={(e) => setWithdrawalConfig({ ...withdrawalConfig, minAmount: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Maximum Single Transaction Limit ($)
                    </label>
                    <input
                      type="number"
                      value={withdrawalConfig.maxAmount}
                      onChange={(e) => setWithdrawalConfig({ ...withdrawalConfig, maxAmount: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="submit"
                    disabled={isSavingWithdrawals}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      padding: '11px 24px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: isSavingWithdrawals ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSavingWithdrawals ? <ModernButtonSpinner size={16} /> : <Save style={{ width: '16px', height: '16px' }} />}
                    <span>{isSavingWithdrawals ? 'Saving Directive...' : 'Save Directive'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: 2FA & LIVE OTP RADAR */}
        {/* ========================================================================= */}
        {activeTab === 'two-factor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Real-time Live OTP Highlight Card */}
            {otpLogs.length > 0 && !otpLogs[0].used && Date.now() < otpLogs[0].expiresAt && (
              <div
                style={{
                  backgroundColor: 'rgba(37, 99, 235, 0.12)',
                  border: '2px solid #3b82f6',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '9999px', backgroundColor: '#3b82f6', animation: 'pulse 1.5s infinite' }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#93c5fd', letterSpacing: '0.05em' }}>
                      LATEST ACTIVE VERIFICATION CODE (AWAITING INPUT)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                    <span
                      onClick={() => handleCopy(otpLogs[0].code, 'active-otp')}
                      title="Click to copy OTP"
                      style={{
                        fontSize: '38px',
                        fontWeight: 900,
                        fontFamily: 'ui-monospace, monospace',
                        letterSpacing: '6px',
                        color: copiedKey === 'active-otp' ? '#34d399' : '#60a5fa',
                        cursor: 'pointer',
                        userSelect: 'all',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {otpLogs[0].code}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Requested from: <strong style={{ color: '#ffffff' }}>{otpLogs[0].deviceName}</strong> ({otpLogs[0].ipAddress})
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#ef4444' }}>
                    Expires in {Math.max(0, Math.round((otpLogs[0].expiresAt - Date.now()) / 1000))}s
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(otpLogs[0].code, 'active-otp')}
                  style={{
                    backgroundColor: copiedKey === 'active-otp' ? '#10b981' : '#2563eb',
                    color: '#ffffff',
                    border: `1px solid ${copiedKey === 'active-otp' ? '#059669' : '#3b82f6'}`,
                    borderRadius: '10px',
                    padding: '12px 22px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: copiedKey === 'active-otp' ? '0 4px 16px rgba(16, 185, 129, 0.4)' : '0 4px 12px rgba(37, 99, 235, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {copiedKey === 'active-otp' ? <Check style={{ width: '16px', height: '16px' }} /> : <Copy style={{ width: '16px', height: '16px' }} />}
                  <span>{copiedKey === 'active-otp' ? 'COPIED TO CLIPBOARD!' : 'Copy Active Code'}</span>
                </button>
              </div>
            )}

            {/* 2FA Configuration Form */}
            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>
                  Two-Factor Authentication (OTP Policy)
                </h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  When enabled, any login attempt requires a 6-digit verification code. The code is sent to your email and displays right here in real time.
                </p>
              </div>

              {twoFactorStatusMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: twoFactorStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: twoFactorStatusMsg.type === 'success' ? '#34d399' : '#f87171',
                    border: `1px solid ${twoFactorStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                  <span>{twoFactorStatusMsg.message}</span>
                </div>
              )}

              <form onSubmit={handleSave2FA} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* 2FA Toggle Card */}
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '14px', color: '#ffffff', display: 'block' }}>
                      Require Two-Factor Authentication
                    </strong>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {twoFactorConfig.enabled
                        ? 'Enforced. Anyone logging in with password must enter the 6-digit OTP code sent to your email.'
                        : 'Disabled. Direct login without OTP.'}
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={twoFactorConfig.enabled}
                    onChange={(e) => setTwoFactorConfig({ ...twoFactorConfig, enabled: e.target.checked })}
                    style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Declan Salo Security Notification Email
                  </label>
                  <input
                    type="email"
                    value={twoFactorConfig.notifyEmail}
                    onChange={(e) => setTwoFactorConfig({ ...twoFactorConfig, notifyEmail: e.target.value.trim() })}
                    placeholder="declansalo1@gmail.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      fontSize: '13px',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    All verification OTPs are dispatched to this address.
                  </span>
                </div>

                {/* SMTP Relay Settings (Optional for live delivery) */}
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    padding: '18px',
                    border: '1px solid #334155',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <strong style={{ fontSize: '13px', color: '#ffffff' }}>
                      Custom SMTP Email Relay (Optional)
                    </strong>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: twoFactorConfig.smtpConfigured ? 'rgba(16, 185, 129, 0.2)' : '#0f172a',
                        color: twoFactorConfig.smtpConfigured ? '#34d399' : '#94a3b8',
                      }}
                    >
                      {twoFactorConfig.smtpConfigured ? 'SMTP Configured' : 'Live Radar Fallback'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>SMTP Host</label>
                      <input
                        type="text"
                        placeholder="smtp.gmail.com"
                        value={twoFactorConfig.smtpHost || ''}
                        onChange={(e) => setTwoFactorConfig({ ...twoFactorConfig, smtpHost: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>SMTP Port</label>
                      <input
                        type="number"
                        placeholder="587"
                        value={twoFactorConfig.smtpPort || 587}
                        onChange={(e) => setTwoFactorConfig({ ...twoFactorConfig, smtpPort: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>SMTP Username / Email</label>
                      <input
                        type="text"
                        placeholder="declansalo1@gmail.com"
                        value={twoFactorConfig.smtpUser || ''}
                        onChange={(e) => setTwoFactorConfig({ ...twoFactorConfig, smtpUser: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>SMTP Password / App Key</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={isSaving2FA}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: isSaving2FA ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSaving2FA ? <ModernButtonSpinner size={15} /> : <Save style={{ width: '15px', height: '15px' }} />}
                    <span>{isSaving2FA ? 'Updating Security Policy...' : 'Save 2FA Policy'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* LIVE REAL-TIME OTP RADAR LOG TABLE */}
            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>
                    Live OTP Code Radar & Dispatch History
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                    Every 6-digit code generated when someone enters credentials appears here instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadTwoFactorData}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw style={{ width: '12px', height: '12px' }} />
                  Refresh Codes
                </button>
              </div>

              {otpLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: '13px' }}>
                  No OTP codes generated yet. When someone tries to log in, their code will appear here.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>OTP Code</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px' }}>Target Email</th>
                        <th style={{ padding: '10px 12px' }}>Requesting Device</th>
                        <th style={{ padding: '10px 12px' }}>IP Address</th>
                        <th style={{ padding: '10px 12px' }}>Generated</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otpLogs.map((log) => {
                        const isExpired = Date.now() > log.expiresAt;
                        const isValid = !log.used && !isExpired;

                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td
                              onClick={() => handleCopy(log.code, log.id)}
                              title="Click to copy OTP"
                              style={{
                                padding: '12px',
                                fontWeight: 800,
                                fontFamily: 'ui-monospace, monospace',
                                fontSize: '14px',
                                color: copiedKey === log.id ? '#34d399' : isValid ? '#60a5fa' : '#94a3b8',
                                cursor: 'pointer',
                                userSelect: 'all',
                                transition: 'color 0.15s ease',
                              }}
                            >
                              {log.code}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {log.used ? (
                                <span style={{ backgroundColor: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600 }}>
                                  Used
                                </span>
                              ) : isExpired ? (
                                <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600 }}>
                                  Expired
                                </span>
                              ) : (
                                <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600 }}>
                                  ● Valid & Active
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px', color: '#cbd5e1' }}>{log.email}</td>
                            <td style={{ padding: '12px', color: '#94a3b8' }}>{log.deviceName}</td>
                            <td style={{ padding: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{log.ipAddress}</td>
                            <td style={{ padding: '12px', color: '#64748b' }}>
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleCopy(log.code, log.id)}
                                style={{
                                  backgroundColor: copiedKey === log.id ? '#10b981' : '#1e293b',
                                  border: `1px solid ${copiedKey === log.id ? '#059669' : '#334155'}`,
                                  color: copiedKey === log.id ? '#ffffff' : '#cbd5e1',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: copiedKey === log.id ? 700 : 500,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {copiedKey === log.id ? <Check style={{ width: '12px', height: '12px' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
                                <span>{copiedKey === log.id ? 'Copied!' : 'Copy'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: PRINCIPAL PROFILE & AVATAR */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>
                    Portfolio Principal Profile & Avatar
                  </h2>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    Upload or update Declan Salo's executive profile image and identity parameters displayed on MooreBach Group.
                  </p>
                </div>
                <span
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#60a5fa',
                    border: '1px solid #334155',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                  }}
                >
                  Principal Account
                </span>
              </div>

              {profileStatusMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    fontWeight: 500,
                    backgroundColor: profileStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: profileStatusMsg.type === 'success' ? '#34d399' : '#f87171',
                    border: profileStatusMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {profileStatusMsg.type === 'success' ? <CheckCircle2 style={{ width: '16px', height: '16px' }} /> : <AlertTriangle style={{ width: '16px', height: '16px' }} />}
                  <span>{profileStatusMsg.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Avatar Uploader Section */}
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '14px',
                    padding: '20px',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '24px',
                  }}
                >
                  {/* Photo Preview Circle */}
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        border: '3px solid #3b82f6',
                        backgroundColor: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                      }}
                    >
                      {principalProfile.avatarUrl ? (
                        <img
                          src={principalProfile.avatarUrl}
                          alt={principalProfile.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '32px', fontWeight: 700, color: '#60a5fa' }}>
                          {principalProfile.name[0] || 'D'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Upload Controls */}
                  <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      Profile Photo Upload
                    </span>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                      Choose an image file from your device (JPEG, PNG, WebP) or paste an image URL. Automatically resized and optimized.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <label
                        htmlFor="principal-photo-upload"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                        }}
                      >
                        <Upload style={{ width: '14px', height: '14px' }} />
                        <span>Select File to Upload</span>
                      </label>
                      <input
                        id="principal-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        style={{ display: 'none' }}
                      />

                      {principalProfile.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setPrincipalProfile({ ...principalProfile, avatarUrl: '' })}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: 'transparent',
                            color: '#94a3b8',
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Clear Photo
                        </button>
                      )}
                    </div>

                    <div style={{ marginTop: '4px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                        Or Paste Image URL directly:
                      </label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={principalProfile.avatarUrl.startsWith('data:') ? '(Uploaded from local image file)' : principalProfile.avatarUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val.startsWith('(Uploaded')) {
                            setPrincipalProfile({ ...principalProfile, avatarUrl: val });
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Account Details Form */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Principal Full Name
                    </label>
                    <input
                      type="text"
                      value={principalProfile.name}
                      onChange={(e) => setPrincipalProfile({ ...principalProfile, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Login & Notification Email
                    </label>
                    <input
                      type="email"
                      value={principalProfile.email}
                      onChange={(e) => setPrincipalProfile({ ...principalProfile, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Executive Legal Jurisdiction / Location
                    </label>
                    <input
                      type="text"
                      value={principalProfile.location}
                      onChange={(e) => setPrincipalProfile({ ...principalProfile, location: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 24px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                      opacity: isSavingProfile ? 0.7 : 1,
                    }}
                  >
                    {isSavingProfile ? (
                      <>
                        <ModernButtonSpinner size={14} />
                        <span>Saving Profile Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save style={{ width: '15px', height: '15px' }} />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: SOLE BENEFICIARY MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'beneficiary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>
                    Sole Primary Beneficiary Designation
                  </h2>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    Configure the sole beneficiary dossier, portrait, physical address, and legally binding covenant for MooreBach Group ($120.57M portfolio).
                  </p>
                </div>
                <span
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                  }}
                >
                  100% Primary Allocation
                </span>
              </div>

              {beneficiaryStatusMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    fontWeight: 500,
                    backgroundColor: beneficiaryStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: beneficiaryStatusMsg.type === 'success' ? '#34d399' : '#f87171',
                    border: beneficiaryStatusMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {beneficiaryStatusMsg.type === 'success' ? <CheckCircle2 style={{ width: '16px', height: '16px' }} /> : <AlertTriangle style={{ width: '16px', height: '16px' }} />}
                  <span>{beneficiaryStatusMsg.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveBeneficiary} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Beneficiary Portrait Upload Card */}
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '14px',
                    padding: '20px',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '24px',
                  }}
                >
                  {/* Photo Preview Circle */}
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        border: '3px solid #10b981',
                        backgroundColor: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
                      }}
                    >
                      {beneficiaryForm.avatarUrl ? (
                        <img
                          src={beneficiaryForm.avatarUrl}
                          alt={beneficiaryForm.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '32px', fontWeight: 700, color: '#34d399' }}>
                          {beneficiaryForm.name[0] || 'B'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Upload Controls */}
                  <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      Beneficiary Photo Upload
                    </span>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                      Upload an official photograph of the designated sole beneficiary. This image appears on the primary user dashboard beneficiary verification card.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <label
                        htmlFor="beneficiary-photo-upload"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          backgroundColor: '#059669',
                          color: '#ffffff',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(5,150,105,0.3)',
                        }}
                      >
                        <Camera style={{ width: '14px', height: '14px' }} />
                        <span>Upload Beneficiary Photo</span>
                      </label>
                      <input
                        id="beneficiary-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleBeneficiaryPhotoUpload}
                        style={{ display: 'none' }}
                      />

                      {beneficiaryForm.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setBeneficiaryForm({ ...beneficiaryForm, avatarUrl: '' })}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: 'transparent',
                            color: '#94a3b8',
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Clear Photo
                        </button>
                      )}
                    </div>

                    <div style={{ marginTop: '4px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                        Or Paste Image URL directly:
                      </label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={beneficiaryForm.avatarUrl.startsWith('data:') ? '(Uploaded from local image file)' : beneficiaryForm.avatarUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val.startsWith('(Uploaded')) {
                            setBeneficiaryForm({ ...beneficiaryForm, avatarUrl: val });
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Dossier Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Beneficiary Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Elena Rostova"
                      value={beneficiaryForm.name}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Relationship / Title
                    </label>
                    <input
                      type="text"
                      placeholder="Sole Primary Beneficiary (100% Allocation)"
                      value={beneficiaryForm.relationship}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, relationship: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Beneficiary Registered Email
                    </label>
                    <input
                      type="email"
                      placeholder="elena.rostova@icloud.com"
                      value={beneficiaryForm.email}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Covenant Reference ID
                    </label>
                    <input
                      type="text"
                      placeholder="MBG-BEN-88429-PRI"
                      value={beneficiaryForm.covenantId}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, covenantId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Legal Physical Residential Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1200 Broadway, Penthouse 42B, Nashville, TN 37203, United States"
                      value={beneficiaryForm.address}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, address: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Legal Verification Status
                    </label>
                    <select
                      value={beneficiaryForm.status}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, status: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    >
                      <option value="Active & Legally Verified">Active & Legally Verified</option>
                      <option value="Pending Verification">Pending Verification</option>
                      <option value="Active">Active</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Designation Effective Date
                    </label>
                    <input
                      type="text"
                      placeholder="April 12, 2026"
                      value={beneficiaryForm.designationDate}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, designationDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                      Succession Charter Terms & Covenant Notes
                    </label>
                    <textarea
                      rows={3}
                      value={beneficiaryForm.notes}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, notes: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '13px',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={isSavingBeneficiary}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 24px',
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: isSavingBeneficiary ? 'not-allowed' : 'pointer',
                      opacity: isSavingBeneficiary ? 0.7 : 1,
                    }}
                  >
                    {isSavingBeneficiary ? (
                      <>
                        <ModernButtonSpinner size={14} />
                        <span>Saving Beneficiary Dossier...</span>
                      </>
                    ) : (
                      <>
                        <Save style={{ width: '15px', height: '15px' }} />
                        <span>Save Beneficiary Records</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SCANNER */}
        {/* ========================================================================= */}
        {activeTab === 'scanner' && (
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>
                  Multi-Chain Inbound Blockchain Scanner
                </h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  Polls TronGrid, Etherscan, and Blockchain.info for live inbound deposits to your vault addresses.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setIsScanningAll(true);
                  try {
                    const res = await fetch('/api/crypto/scan', { headers: { 'x-salo-key': masterKey } });
                    const data = await res.json();
                    if (data.success && data.results) {
                      setAllDetectedTxs(data.results);
                    }
                  } catch {}
                  setIsScanningAll(false);
                }}
                disabled={isScanningAll}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: isScanningAll ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw style={{ width: '13px', height: '13px', animation: isScanningAll ? 'spin 1s linear infinite' : 'none' }} />
                {isScanningAll ? 'Scanning Nodes...' : 'Scan All Networks Now'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {allDetectedTxs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
                  No pending mempool or inbound transactions detected on live nodes.
                </div>
              ) : (
                allDetectedTxs.map((tx, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      border: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '13px' }}>{tx.asset} • {tx.network}</strong>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px' }}>
                        TxID: {tx.txId}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: '#10b981', fontSize: '14px' }}>+{tx.amount} {tx.asset}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{tx.confirmations} confirmations</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CONNECTED SESSIONS & REMOTE KILL SWITCH */}
        {/* ========================================================================= */}
        {activeTab === 'sessions' && (
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>
                  Connected Device Radar & Remote Kill Switch
                </h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  Monitor all active devices logged into Declan Salo’s portfolio. Terminate any guest device with 1 click.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTerminateAllOtherSessions}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 style={{ width: '14px', height: '14px' }} />
                Terminate All Other Devices
              </button>
            </div>

            {sessionActionStatus && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                {sessionActionStatus}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#60a5fa',
                      }}
                    >
                      {s.deviceName.toLowerCase().includes('phone') ? (
                        <Smartphone style={{ width: '20px', height: '20px' }} />
                      ) : (
                        <Laptop style={{ width: '20px', height: '20px' }} />
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#ffffff', fontSize: '13px' }}>{s.deviceName}</strong>
                        {s.isCurrent && (
                          <span style={{ fontSize: '10px', backgroundColor: '#2563eb', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Current Terminal
                          </span>
                        )}
                        {s.isMaster && !s.isCurrent && (
                          <span style={{ fontSize: '10px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '1px 6px', borderRadius: '4px' }}>
                            Master Console
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                        IP: {s.ipAddress} • {s.location} • Last active: {new Date(s.lastActiveAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleKickOutSession(s.id)}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Kick Out Device
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MASTER SECURITY & PASSWORD */}
        {/* ========================================================================= */}
        {activeTab === 'security' && (
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>
                Master Security & Account Password
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                Update your master account password. Changing the password will immediately kick out all other connected devices.
              </p>
            </div>

            {passStatus && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  backgroundColor: passStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: passStatus.type === 'success' ? '#34d399' : '#f87171',
                  border: `1px solid ${passStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                {passStatus.message}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Current Master Password
                </label>
                <input
                  type="password"
                  value={currentMasterPass}
                  onChange={(e) => setCurrentMasterPass(e.target.value)}
                  placeholder="Enter current password..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  New Master Password
                </label>
                <input
                  type="password"
                  value={newMasterPass}
                  onChange={(e) => setNewMasterPass(e.target.value)}
                  placeholder="At least 6 characters..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Confirm New Master Password
                </label>
                <input
                  type="password"
                  value={confirmMasterPass}
                  onChange={(e) => setConfirmMasterPass(e.target.value)}
                  placeholder="Re-type new password..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={isUpdatingPass}
                  style={{
                    width: '100%',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '11px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: isUpdatingPass ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {isUpdatingPass ? (
                    <>
                      <ModernButtonSpinner size={15} />
                      <span>Updating Master Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound style={{ width: '15px', height: '15px' }} />
                      <span>Update Master Password & Disconnect Others</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
