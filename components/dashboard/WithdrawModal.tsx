'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  ArrowRight,
  ArrowUpRight,
  Coins,
  Building2,
  Globe,
  Lock,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Wallet,
  Sparkles,
  Timer,
  Ban,
  XCircle,
  Mail,
  FileText,
} from 'lucide-react';
import { validateCryptoAddress } from '@/lib/crypto/blockchain';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { ModernTopBar, ModernButtonSpinner } from '@/components/ui/ModernLoader';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WithdrawalRail = 'crypto' | 'fedwire' | 'swift';
type CryptoAsset = 'USDT' | 'BTC' | 'ETH';
type CryptoNetwork = 'TRC20' | 'ERC20' | 'Native';

interface NetworkOption {
  id: CryptoNetwork;
  name: string;
  shortName: string;
  badge?: string;
  fee: number;
  feeSymbol: string;
  feeUsd: string;
  arrivalTime: string;
  minAmount: number;
  prefixGuide: string;
}

const CRYPTO_ASSETS: Record<
  CryptoAsset,
  {
    name: string;
    symbol: string;
    iconSymbol: string;
    color: string;
    accentBg: string;
    usdRate: number;
    networks: NetworkOption[];
  }
> = {
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    iconSymbol: '₮',
    color: '#10b981',
    accentBg: '#ecfdf5',
    usdRate: 1.0,
    networks: [
      {
        id: 'TRC20',
        name: 'Tron (TRC-20)',
        shortName: 'TRC-20',
        badge: 'Lowest Fee',
        fee: 1.0,
        feeSymbol: 'USDT',
        feeUsd: '$1.00',
        arrivalTime: '~2 mins',
        minAmount: 10,
        prefixGuide: 'Starts with "T" (34 chars)',
      },
      {
        id: 'ERC20',
        name: 'Ethereum (ERC-20)',
        shortName: 'ERC-20',
        badge: 'EVM Standard',
        fee: 4.5,
        feeSymbol: 'USDT',
        feeUsd: '$4.50',
        arrivalTime: '~5 mins',
        minAmount: 10,
        prefixGuide: 'Starts with "0x" (42 chars)',
      },
    ],
  },
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    iconSymbol: '₿',
    color: '#f59e0b',
    accentBg: '#fffbeb',
    usdRate: 95000,
    networks: [
      {
        id: 'Native',
        name: 'Bitcoin Native (SegWit)',
        shortName: 'BTC SegWit',
        badge: 'Native Blockchain',
        fee: 0.0001,
        feeSymbol: 'BTC',
        feeUsd: '~$9.50',
        arrivalTime: '~30-60 mins',
        minAmount: 0.001,
        prefixGuide: 'Starts with "bc1", "1", or "3"',
      },
    ],
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    iconSymbol: 'Ξ',
    color: '#6366f1',
    accentBg: '#eef2ff',
    usdRate: 3500,
    networks: [
      {
        id: 'ERC20',
        name: 'Ethereum Mainnet',
        shortName: 'ERC-20',
        badge: 'Mainnet',
        fee: 0.0015,
        feeSymbol: 'ETH',
        feeUsd: '~$5.25',
        arrivalTime: '~5 mins',
        minAmount: 0.02,
        prefixGuide: 'Starts with "0x" (42 chars)',
      },
    ],
  },
};

type ViewScreen =
  | 'loading'
  | 'lockdown'
  | 'declined'
  | 'no-balance'
  | 'form'
  | 'processing'
  | 'submitted';

interface WithdrawalPolicyState {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  dailyRemaining: number | null;
  lockdown24hEnabled: boolean;
  allowedRails: {
    fedwire: boolean;
    crypto: boolean;
    swift: boolean;
    debit: boolean;
  };
}

export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const [view, setView] = useState<ViewScreen>('loading');
  const [selectedRail, setSelectedRail] = useState<WithdrawalRail>('crypto');
  const [processingStep, setProcessingStep] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [declineInfo, setDeclineInfo] = useState<{
    title: string;
    message: string;
    supportEmail: string;
    buttonText: string;
  }>({
    title: 'Payment Declined',
    message: 'Oops! Sorry your withdrawal cannot be completed. Please contact support',
    supportEmail: 'support@moorebachgroup.com',
    buttonText: 'Contact Support',
  });

  // Crypto state
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAsset>('USDT');
  const [cryptoNetwork, setCryptoNetwork] = useState<CryptoNetwork>('TRC20');
  const [cryptoAddress, setCryptoAddress] = useState<string>('');
  const [cryptoAmount, setCryptoAmount] = useState<string>('');
  const [addressTouched, setAddressTouched] = useState<boolean>(false);

  // Traditional bank wire state
  const [fiatAmount, setFiatAmount] = useState<string>('');
  const [unavailableRailNotice, setUnavailableRailNotice] = useState<WithdrawalRail | null>(null);
  const [bankName, setBankName] = useState<string>('JPMorgan Chase Bank, N.A.');
  const [accountNumber, setAccountNumber] = useState<string>('••••••••4819');
  const [routingNumber, setRoutingNumber] = useState<string>('021000021');

  // Balance & lockdown state
  const [liquidatedBalance, setLiquidatedBalance] = useState<number>(0);
  const [lockdownData, setLockdownData] = useState<{
    isLocked: boolean;
    remainingMs: number;
    remainingFormatted: string;
    lastWithdrawalAmount?: number;
    lastWithdrawalAt?: number;
  } | null>(null);
  const [lockdownCountdown, setLockdownCountdown] = useState<string>('');
  const [gatewayPolicy, setGatewayPolicy] = useState<WithdrawalPolicyState>({
    minAmount: 0,
    maxAmount: 5000000,
    dailyLimit: 2500000,
    dailyRemaining: null,
    lockdown24hEnabled: true,
    allowedRails: { fedwire: false, crypto: true, swift: false, debit: false },
  });

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copiedRequestId, setCopiedRequestId] = useState<boolean>(false);
  const [submittedSnapshot, setSubmittedSnapshot] = useState<{
    rail: string;
    assetSymbol?: string;
    networkName?: string;
    shortReference?: string;
    destination: string;
    amountFormatted: string;
    heroAmount?: string;
    feeFormatted?: string;
    receiveFormatted?: string;
    recordId?: string;
    submittedAt?: number;
  } | null>(null);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const currentAsset = CRYPTO_ASSETS[cryptoAsset];

  // Escape key handler to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const loadWithdrawalState = useCallback(async (isInitialOpen = false) => {
    if (isInitialOpen) {
      setView('loading');
      setServerError(null);
      setSubmittedSnapshot(null);
    }

    try {
      const res = await fetch('/api/withdrawals', { cache: 'no-store' });
      const d = await res.json();
      if (!d.success) {
        if (isInitialOpen) setView('form');
        return;
      }

      const bal = d.liquidatedBalance || 0;
      setLiquidatedBalance(bal);

      const w = d.withdrawals || {};
      const nextPolicy: WithdrawalPolicyState = {
        minAmount: Number(w.minAmount ?? 0),
        maxAmount: Number(w.maxAmount ?? 0),
        dailyLimit: Number(w.dailyLimit ?? 0),
        dailyRemaining: typeof d.dailyRemaining === 'number' ? d.dailyRemaining : null,
        lockdown24hEnabled: w.lockdown24hEnabled !== false,
        allowedRails: {
          fedwire: Boolean(w.allowedRails?.fedwire),
          crypto: w.allowedRails?.crypto !== false,
          swift: Boolean(w.allowedRails?.swift),
          debit: Boolean(w.allowedRails?.debit),
        },
      };
      setGatewayPolicy(nextPolicy);

      // 1. 24-hour Security Lockdown
      if (d.lockdown?.isLocked) {
        setLockdownData(d.lockdown);
        setView('lockdown');
        return;
      }

      // 2. Post-24h lockdown Payment Declined notice
      if (d.postLockdownDecline?.isDeclined) {
        setDeclineInfo({
          title: d.postLockdownDecline.title || 'Payment Declined',
          message:
            d.postLockdownDecline.message ||
            'Oops! Sorry your withdrawal cannot be completed. Please contact support',
          supportEmail: d.postLockdownDecline.supportEmail || 'support@moorebachgroup.com',
          buttonText: d.postLockdownDecline.buttonText || 'Contact Support',
        });
        if (d.postLockdownDecline.triggerMode !== 'on_submit') {
          setView('declined');
          return;
        }
      }

      if (bal <= 0) {
        setView('no-balance');
        return;
      }

      // Ensure selected rail is enabled if at least one rail is open
      const railOrder: WithdrawalRail[] = ['crypto', 'fedwire', 'swift'];
      setSelectedRail((curr) =>
        nextPolicy.allowedRails[curr]
          ? curr
          : railOrder.find((r) => nextPolicy.allowedRails[r]) || curr
      );

      if (isInitialOpen) {
        setCryptoAmount('');
        setFiatAmount('');
        setUnavailableRailNotice(null);
        setView('form');
      } else {
        setView((curr) =>
          curr === 'lockdown' || curr === 'declined' ? 'form' : curr
        );
      }
    } catch {
      if (isInitialOpen) setView('form');
    }
  }, []);

  // Fetch withdrawal state on open & listen for live Admin policy updates
  useEffect(() => {
    if (!isOpen) return;
    loadWithdrawalState(true);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('moback_realtime_sync');
      bc.onmessage = (event) => {
        if (
          event.data?.type === 'ADMIN_CONFIG_UPDATED' ||
          event.data?.type === 'PAYMENT_TRANSFERRED' ||
          event.data?.type === 'LIQUIDATION_SUCCESS'
        ) {
          loadWithdrawalState(false);
        }
      };
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'moback_realtime_ping') {
        loadWithdrawalState(false);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [isOpen, loadWithdrawalState]);

  // Auto-align network if switching coin
  useEffect(() => {
    const isValidNetwork = currentAsset.networks.some((n) => n.id === cryptoNetwork);
    if (!isValidNetwork) {
      setCryptoNetwork(currentAsset.networks[0].id);
    }
  }, [cryptoAsset, currentAsset, cryptoNetwork]);

  // Live countdown timer for lockdown
  useEffect(() => {
    if (view !== 'lockdown' || !lockdownData) return;

    const endTime = Date.now() + lockdownData.remainingMs;

    const tick = () => {
      const diff = Math.max(0, endTime - Date.now());
      if (diff <= 0) {
        setLockdownCountdown('00:00:00');
        setView('form');
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setLockdownCountdown(
        `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    };

    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [view, lockdownData]);

  // Multi-step withdrawal processing animation
  useEffect(() => {
    if (view !== 'processing') return;

    const steps = [
      { delay: 0, progress: 15 },
      { delay: 500, progress: 40 },
      { delay: 1100, progress: 65 },
      { delay: 1600, progress: 85 },
      { delay: 2100, progress: 100 },
    ];

    const timers: NodeJS.Timeout[] = [];

    steps.forEach((step, idx) => {
      timers.push(
        setTimeout(() => {
          setProcessingStep(idx);
          setProcessingProgress(step.progress);
        }, step.delay)
      );
    });

    timers.push(
      setTimeout(() => {
        setView('submitted');
        setProcessingStep(0);
        setProcessingProgress(0);
      }, 2500)
    );

    return () => timers.forEach(clearTimeout);
  }, [view]);

  const currentNetwork = useMemo(() => {
    return currentAsset.networks.find((n) => n.id === cryptoNetwork) || currentAsset.networks[0];
  }, [currentAsset, cryptoNetwork]);

  // Live address validator
  const addressValidation = useMemo(() => {
    if (!cryptoAddress.trim()) {
      return {
        valid: false,
        error: undefined,
        instruction: `Enter ${cryptoAsset} address on ${currentNetwork.name}`,
        detectedFormat: undefined,
      };
    }
    return validateCryptoAddress(cryptoAsset, cryptoNetwork, cryptoAddress);
  }, [cryptoAsset, cryptoNetwork, cryptoAddress, currentNetwork]);

  // Amount & fee math
  const parsedCryptoAmount = parseFloat(cryptoAmount) || 0;
  const parsedFiatAmount = parseFloat(fiatAmount) || 0;
  const activeEnteredAmount = selectedRail === 'crypto' ? parsedCryptoAmount : parsedFiatAmount;
  const netCryptoReceive = Math.max(0, parsedCryptoAmount - currentNetwork.fee);

  const isSelectedRailAllowed = gatewayPolicy.allowedRails[selectedRail] !== false;
  const hasAnyAllowedRail =
    gatewayPolicy.allowedRails.crypto ||
    gatewayPolicy.allowedRails.fedwire ||
    gatewayPolicy.allowedRails.swift;

  const limitViolationMsg = useMemo(() => {
    if (!isSelectedRailAllowed) {
      return `${selectedRail.toUpperCase()} rail is currently disabled by treasury policy.`;
    }
    if (activeEnteredAmount <= 0) {
      return 'Enter a withdrawal amount.';
    }
    if (activeEnteredAmount > liquidatedBalance) {
      return `Exceeds available balance ($${liquidatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`;
    }
    if (gatewayPolicy.minAmount > 0) {
      if (cryptoAsset === 'USDT' || selectedRail !== 'crypto') {
        if (activeEnteredAmount < gatewayPolicy.minAmount) {
          return `Minimum withdrawal is $${gatewayPolicy.minAmount.toLocaleString('en-US')} USD.`;
        }
      } else if (activeEnteredAmount < currentNetwork.minAmount) {
        return `Network minimum is ${currentNetwork.minAmount} ${cryptoAsset}.`;
      }
    } else if (selectedRail === 'crypto' && activeEnteredAmount < currentNetwork.minAmount) {
      return `Network minimum is ${currentNetwork.minAmount} ${cryptoAsset}.`;
    }
    if (gatewayPolicy.maxAmount > 0 && activeEnteredAmount > gatewayPolicy.maxAmount) {
      return `Maximum per transaction is $${gatewayPolicy.maxAmount.toLocaleString('en-US')} USD.`;
    }
    if (
      gatewayPolicy.dailyLimit > 0 &&
      gatewayPolicy.dailyRemaining !== null &&
      activeEnteredAmount > gatewayPolicy.dailyRemaining
    ) {
      return `Exceeds 24h daily limit ($${gatewayPolicy.dailyRemaining.toLocaleString('en-US')} remaining of $${gatewayPolicy.dailyLimit.toLocaleString('en-US')}).`;
    }
    return null;
  }, [
    isSelectedRailAllowed,
    selectedRail,
    activeEnteredAmount,
    liquidatedBalance,
    gatewayPolicy,
    currentNetwork.minAmount,
    cryptoAsset,
  ]);

  if (!isOpen) return null;

  const isAmountValid = activeEnteredAmount > 0 && !limitViolationMsg;

  const canSubmit =
    isSelectedRailAllowed &&
    hasAnyAllowedRail &&
    (selectedRail === 'crypto' ? addressValidation.valid : true) &&
    isAmountValid &&
    !isSubmitting;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCryptoAddress(text.trim());
        setAddressTouched(true);
      }
    } catch {}
  };

  const handleAttemptWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!isSelectedRailAllowed) {
      setServerError(`${selectedRail.toUpperCase()} disbursements are disabled by treasury policy.`);
      return;
    }

    if (selectedRail === 'crypto') {
      setAddressTouched(true);
      if (!addressValidation.valid) {
        setServerError(addressValidation.error || 'Please enter a valid address.');
        return;
      }
    }

    if (limitViolationMsg) {
      setServerError(limitViolationMsg);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload =
        selectedRail === 'crypto'
          ? {
              rail: 'crypto',
              asset: cryptoAsset,
              network: cryptoNetwork,
              recipientAddress: cryptoAddress.trim(),
              amount: parsedCryptoAmount,
              fee: currentNetwork.fee,
              destination: `${cryptoAsset} (${currentNetwork.name}): ${cryptoAddress.trim()}`,
              beneficiary: 'Declan Salo',
              userEmail: 'declansalo1@gmail.com',
            }
          : {
              rail: selectedRail,
              amount: parsedFiatAmount,
              beneficiary: 'Declan Salo',
              userEmail: 'declansalo1@gmail.com',
              destination:
                selectedRail === 'fedwire'
                  ? `${bankName} (${accountNumber})`
                  : `${bankName} (Routing: ${routingNumber})`,
            };

      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setIsSubmitting(false);

      // 24-hour lockdown response
      if (data.locked24h) {
        setLockdownData({
          isLocked: true,
          remainingMs: data.remainingMs || 86400000,
          remainingFormatted: data.remainingFormatted || '24:00:00',
        });
        setView('lockdown');
        return;
      }

      // Post-lockdown decline response
      if (data.declined) {
        setDeclineInfo({
          title: data.title || 'Payment Declined',
          message:
            data.error ||
            'Oops! Sorry your withdrawal cannot be completed. Please contact support',
          supportEmail: data.supportEmail || 'support@moorebachgroup.com',
          buttonText: data.buttonText || 'Contact Support',
        });
        setView('declined');
        return;
      }

      if (!res.ok || !data.success) {
        setServerError(data.error || 'Withdrawal request failed.');
        return;
      }

      // Success - show submitted screen
      const fiatVal = Number(fiatAmount || 0);
      setCopiedRequestId(false);
      setSubmittedSnapshot({
        rail: selectedRail === 'crypto' ? 'Crypto Outbound' : selectedRail === 'fedwire' ? 'Fedwire Transfer' : 'SWIFT Global',
        assetSymbol: selectedRail === 'crypto' ? cryptoAsset : 'USD',
        networkName: selectedRail === 'crypto' ? currentNetwork.name : undefined,
        shortReference:
          selectedRail === 'crypto'
            ? `${cryptoAsset} (${currentNetwork.shortName})`
            : `USD (${selectedRail === 'fedwire' ? 'Fedwire' : 'SWIFT'})`,
        destination:
          selectedRail === 'crypto'
            ? cryptoAddress.trim()
            : `${bankName} • ${accountNumber}`,
        amountFormatted:
          selectedRail === 'crypto'
            ? `${parsedCryptoAmount.toLocaleString()} ${cryptoAsset}`
            : `$${fiatVal.toLocaleString()} USD`,
        heroAmount:
          selectedRail === 'crypto'
            ? cryptoAsset === 'USDT'
              ? `$${parsedCryptoAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `${parsedCryptoAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${cryptoAsset}`
            : `$${fiatVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        feeFormatted:
          selectedRail === 'crypto'
            ? `${currentNetwork.fee} ${currentNetwork.feeSymbol} (${currentNetwork.feeUsd})`
            : '$0.00 (Tier 1)',
        receiveFormatted:
          selectedRail === 'crypto'
            ? `${netCryptoReceive.toLocaleString()} ${cryptoAsset}`
            : `$${fiatVal.toLocaleString()} USD`,
        recordId: data.recordId || data.record?.id,
        submittedAt: Date.now(),
      });
      setView('processing');
    } catch {
      setIsSubmitting(false);
      setServerError('Network error. Please try again.');
    }
  };

  const handleModalClose = () => {
    setIsSubmitting(false);
    setServerError(null);
    setCopiedRequestId(false);
    setCryptoAmount('');
    setFiatAmount('');
    setUnavailableRailNotice(null);
    if (countdownRef.current) clearInterval(countdownRef.current);
    onClose();
  };

  // ================================================================
  // RENDER: LOCKDOWN SCREEN
  // ================================================================
  const renderLockdownScreen = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '6px 0' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '18px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          boxShadow: '0 8px 16px -4px rgba(220, 38, 38, 0.15)',
        }}
      >
        <Timer style={{ width: '30px', height: '30px' }} />
      </div>

      <div>
        <span
          style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'inline-block',
            marginBottom: '8px',
          }}
        >
          24-Hour Security Lockdown
        </span>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
          Withdrawal Gateway Locked
        </h3>
        <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: 0, padding: '0 10px' }}>
          For security purposes, capital disbursements are limited to one transaction every 24 hours.
          Your withdrawal gateway will reopen when the timer below reaches zero.
        </p>
      </div>

      {/* Live Countdown Timer */}
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Time Remaining
        </span>
        <span
          style={{
            fontSize: '36px',
            fontWeight: 800,
            color: '#ffffff',
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '3px',
          }}
        >
          {lockdownCountdown || lockdownData?.remainingFormatted || '23:59:59'}
        </span>
        <span style={{ fontSize: '11px', color: '#64748b' }}>Hours : Minutes : Seconds</span>
      </div>

      {/* Security Notice */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '12px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fef3c7',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          fontSize: '11px',
          color: '#92400e',
          textAlign: 'left',
          lineHeight: 1.45,
        }}
      >
        <ShieldCheck style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ display: 'block', color: '#78350f', marginBottom: '2px' }}>
            Security Protocol Active
          </strong>
          <span>
            This 24-hour cooldown period protects your portfolio from unauthorized rapid withdrawals.
            You will be able to initiate a new withdrawal once the lockdown period expires.
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleModalClose}
        style={{
          width: '100%',
          padding: '11px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Acknowledge & Close
      </button>
    </div>
  );

  // ================================================================
  // RENDER: NO BALANCE SCREEN
  // ================================================================
  const renderNoBalanceScreen = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '6px 0' }}>
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '16px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
        }}
      >
        <Coins style={{ width: '28px', height: '28px' }} />
      </div>

      <div>
        <span
          style={{
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'inline-block',
            marginBottom: '8px',
          }}
        >
          No Liquidated Capital
        </span>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
          Liquidate Shares First
        </h3>
        <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: 0, padding: '0 10px' }}>
          You need to liquidate one or more of your equity holdings before you can withdraw funds.
          Liquidating converts your shares into available cash reserves (USDT) that can be disbursed to your wallet.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
        }}
      >
        <span style={{ color: '#64748b' }}>Available Liquid Reserves</span>
        <strong style={{ color: '#0f172a', fontSize: '14px' }}>$0.00 USDT</strong>
      </div>

      <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
        Navigate to the Company Shares table and click &ldquo;Liquidate&rdquo; on any holding to convert it to cash.
      </p>

      <button
        type="button"
        onClick={handleModalClose}
        style={{
          width: '100%',
          padding: '11px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        View Holdings & Liquidate
      </button>
    </div>
  );

  // ================================================================
  // RENDER: PROCESSING & ROUTING ANIMATION
  // ================================================================
  const renderProcessingScreen = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 16px',
        gap: '24px',
        minHeight: '340px',
      }}
    >
      {/* Dual Orbital Ring Loader */}
      <div style={{ position: 'relative', width: '84px', height: '84px' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid #f1f5f9',
            borderTopColor: '#2563eb',
            borderRightColor: '#38bdf8',
            animation: 'spin 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '8px',
            borderRadius: '50%',
            border: '2.5px solid #f8fafc',
            borderBottomColor: '#10b981',
            borderLeftColor: '#34d399',
            animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite reverse',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            {processingProgress}%
          </span>
        </div>
      </div>

      {/* Multi-step Execution Indicator */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          maxWidth: '380px',
        }}
      >
        {[
          'Generating RSA-4096 cryptographic authorization...',
          'Validating blockchain network & destination routing...',
          'Securing institutional treasury liquidity channel...',
          'Dispatching directive to treasury clearance desk...',
          'Recording immutable audit log & locking gateway...',
        ].map((stepText, idx) => {
          const isDone = processingStep > idx;
          const isCurrent = processingStep === idx;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: isCurrent ? '#eff6ff' : 'transparent',
                border: isCurrent ? '1px solid #bfdbfe' : '1px solid transparent',
                opacity: processingStep >= idx ? 1 : 0.35,
                transition: 'all 0.3s ease',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: isDone ? '#10b981' : isCurrent ? '#ffffff' : '#f1f5f9',
                  border: isDone
                    ? 'none'
                    : isCurrent
                    ? '2px solid #2563eb'
                    : '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.25s ease',
                }}
              >
                {isDone ? (
                  <CheckCircle2 style={{ width: '13px', height: '13px', color: '#ffffff' }} />
                ) : isCurrent ? (
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                      animation: 'pulseGlow 1s infinite',
                    }}
                  />
                ) : null}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? '#1e40af' : isDone ? '#334155' : '#94a3b8',
                  transition: 'color 0.25s ease',
                }}
              >
                {stepText}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div
          style={{
            height: '5px',
            borderRadius: '9999px',
            backgroundColor: '#e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${processingProgress}%`,
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, #2563eb, #10b981)',
              transition: 'width 0.4s ease-out',
            }}
          />
        </div>
      </div>

      <span style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
        Cryptographic clearance active • Do not close or refresh this tab
      </span>
    </div>
  );

  // ================================================================
  // RENDER: LOADING SCREEN
  // ================================================================
  const renderLoadingScreen = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '16px' }}>
      <ModernButtonSpinner size={28} />
      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Checking withdrawal eligibility...</span>
    </div>
  );

  // ================================================================
  // RENDER: WITHDRAWAL FORM
  // ================================================================
  const renderWithdrawalForm = () => (
    <form onSubmit={handleAttemptWithdrawal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Available Balance Strip */}
      <div
        style={{
          backgroundColor: '#e6f9f0',
          borderRadius: '10px',
          border: '1px solid #a7f3d0',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
        }}
      >
        <span style={{ color: '#065f46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wallet style={{ width: '14px', height: '14px' }} />
          Available Liquid Reserves
        </span>
        <strong style={{ color: '#059669', fontSize: '14px' }}>
          ${liquidatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
        </strong>
      </div>

      {/* Method Selector Segmented Control */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          backgroundColor: '#f1f5f9',
          borderRadius: '12px',
          padding: '4px',
          gap: '4px',
        }}
      >
        {[
          { id: 'crypto' as WithdrawalRail, label: 'Crypto Outbound', icon: Coins },
          { id: 'fedwire' as WithdrawalRail, label: 'Fedwire Wire', icon: Building2 },
          { id: 'swift' as WithdrawalRail, label: 'SWIFT Global', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          const isAllowed = gatewayPolicy.allowedRails[tab.id] !== false;
          const isActive = selectedRail === tab.id && isAllowed;
          const isGreyedClicked = !isAllowed && unavailableRailNotice === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-disabled={!isAllowed}
              onClick={() => {
                if (!isAllowed) {
                  setUnavailableRailNotice(tab.id);
                  return;
                }
                setUnavailableRailNotice(null);
                setSelectedRail(tab.id);
                setServerError(null);
              }}
              style={{
                padding: '8px 10px',
                borderRadius: '9px',
                border: isGreyedClicked ? '1px solid #cbd5e1' : '1px solid transparent',
                backgroundColor: isActive
                  ? '#ffffff'
                  : isGreyedClicked
                  ? '#e2e8f0'
                  : 'transparent',
                color: !isAllowed
                  ? isGreyedClicked
                    ? '#64748b'
                    : '#94a3b8'
                  : isActive
                  ? '#0f172a'
                  : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '12px',
                cursor: isAllowed ? 'pointer' : 'not-allowed',
                opacity: !isAllowed ? (isGreyedClicked ? 0.72 : 0.65) : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
              title={isAllowed ? undefined : `${tab.label} is not available for now`}
            >
              <Icon
                style={{
                  width: '14px',
                  height: '14px',
                  color: !isAllowed
                    ? isGreyedClicked
                      ? '#64748b'
                      : '#cbd5e1'
                    : isActive
                    ? '#2563eb'
                    : '#94a3b8',
                }}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {unavailableRailNotice && (
        <div
          style={{
            padding: '9px 12px',
            borderRadius: '10px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            fontSize: '11.5px',
            color: '#64748b',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Lock style={{ width: '13px', height: '13px', color: '#94a3b8', flexShrink: 0 }} />
          <span>
            <strong style={{ color: '#475569' }}>
              {unavailableRailNotice === 'fedwire'
                ? 'Fedwire Wire'
                : unavailableRailNotice === 'swift'
                ? 'SWIFT Global'
                : 'This rail'}
            </strong>{' '}
            is not available for now. Please use Crypto Outbound to submit your withdrawal.
          </span>
        </div>
      )}

      {!hasAnyAllowedRail && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: '11.5px', color: '#991b1b', fontWeight: 500 }}>
          All withdrawal settlement rails are currently disabled by treasury policy.
        </div>
      )}

      {selectedRail === 'crypto' ? (
        <>
          {/* Crypto Asset Pills Row */}
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '6px' }}>
              Select Asset
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['USDT', 'BTC', 'ETH'] as CryptoAsset[]).map((asset) => {
                const cfg = CRYPTO_ASSETS[asset];
                const isSelected = cryptoAsset === asset;
                return (
                  <button
                    key={asset}
                    type="button"
                    onClick={() => {
                      setCryptoAsset(asset);
                      setAddressTouched(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${cfg.color}` : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? cfg.accentBg : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '9999px',
                          backgroundColor: cfg.color,
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {cfg.iconSymbol}
                      </span>
                      <div style={{ textAlign: 'left' }}>
                        <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>{cfg.symbol}</strong>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>{cfg.name}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Network Selector Tabs */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Network Chain
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                Fee: {currentNetwork.fee} {currentNetwork.feeSymbol} • {currentNetwork.arrivalTime}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {currentAsset.networks.map((net) => {
                const isSelected = cryptoNetwork === net.id;
                return (
                  <button
                    key={net.id}
                    type="button"
                    onClick={() => {
                      setCryptoNetwork(net.id);
                      setAddressTouched(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1e40af' : '#334155' }}>
                      {net.name}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: isSelected ? '#2563eb' : '#64748b', backgroundColor: isSelected ? '#ffffff' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      {net.badge || `${net.fee} ${net.feeSymbol}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Address Card */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Recipient {cryptoAsset} Address
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                {currentNetwork.prefixGuide}
              </span>
            </div>

            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '12px',
                border:
                  addressTouched && cryptoAddress.trim()
                    ? addressValidation.valid
                      ? '1.5px solid #10b981'
                      : '1.5px solid #ef4444'
                    : '1px solid #cbd5e1',
                backgroundColor:
                  addressTouched && cryptoAddress.trim() && !addressValidation.valid
                    ? '#fef2f2'
                    : '#ffffff',
                transition: 'border-color 0.15s ease',
              }}
            >
              <input
                type="text"
                value={cryptoAddress}
                onChange={(e) => {
                  setCryptoAddress(e.target.value);
                  setAddressTouched(true);
                  setServerError(null);
                }}
                onBlur={() => setAddressTouched(true)}
                placeholder={`Paste recipient's ${currentNetwork.shortName} address`}
                style={{
                  flex: 1,
                  padding: '11px 70px 11px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '12px',
                  fontFamily: 'ui-monospace, monospace',
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handlePaste}
                style={{
                  position: 'absolute',
                  right: '8px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Paste
              </button>
            </div>

            {/* Compact Live Validation Micro-Badge */}
            {addressTouched && cryptoAddress.trim() && (
              <div style={{ marginTop: '6px' }}>
                {addressValidation.valid ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                    <CheckCircle2 style={{ width: '13px', height: '13px', color: '#10b981' }} />
                    <span>Valid {currentNetwork.name} address verified</span>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#b91c1c', fontWeight: 600 }}>
                      <AlertCircle style={{ width: '13px', height: '13px', color: '#ef4444', flexShrink: 0 }} />
                      <span>{addressValidation.error}</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#7f1d1d', lineHeight: 1.35, paddingLeft: '19px' }}>
                      {addressValidation.instruction}
                    </span>
                    {addressValidation.detectedFormat === 'Ethereum (ERC-20)' && cryptoNetwork === 'TRC20' && (
                      <button
                        type="button"
                        onClick={() => setCryptoNetwork('ERC20')}
                        style={{
                          alignSelf: 'flex-start',
                          marginLeft: '19px',
                          marginTop: '2px',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #dc2626',
                          color: '#dc2626',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⚡ Switch network to Ethereum (ERC-20)
                      </button>
                    )}
                    {addressValidation.detectedFormat === 'Tron (TRC-20)' && cryptoNetwork === 'ERC20' && cryptoAsset === 'USDT' && (
                      <button
                        type="button"
                        onClick={() => setCryptoNetwork('TRC20')}
                        style={{
                          alignSelf: 'flex-start',
                          marginLeft: '19px',
                          marginTop: '2px',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #dc2626',
                          color: '#dc2626',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⚡ Switch network to Tron (TRC-20)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                Withdrawal Amount ({cryptoAsset})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#94a3b8' }}>$</span>
                <input
                  type="number"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
                {cryptoAsset}
              </span>
            </div>

            {limitViolationMsg && activeEnteredAmount > 0 && (
              <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                ⚠ {limitViolationMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '10.5px', color: '#64748b' }}>
              {gatewayPolicy.minAmount > 0 && (
                <span>Min: ${gatewayPolicy.minAmount.toLocaleString('en-US')}</span>
              )}
              {gatewayPolicy.maxAmount > 0 && (
                <span>Max: ${gatewayPolicy.maxAmount.toLocaleString('en-US')}</span>
              )}
              {gatewayPolicy.dailyLimit > 0 && gatewayPolicy.dailyRemaining !== null && (
                <span>24h Remaining: ${gatewayPolicy.dailyRemaining.toLocaleString('en-US')}</span>
              )}
            </div>

            {/* Clean 2-Line Summary */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Network Fee:</span>
                <span>{currentNetwork.fee} {currentNetwork.feeSymbol} ({currentNetwork.feeUsd})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 600 }}>
                <span>You will receive:</span>
                <strong style={{ color: '#059669', fontSize: '12px' }}>
                  {netCryptoReceive.toLocaleString()} {cryptoAsset}
                </strong>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Bank Wire View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Withdrawal Amount (USD)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#94a3b8' }}>$</span>
              <input
                type="number"
                value={fiatAmount}
                onChange={(e) => setFiatAmount(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', border: 'none', backgroundColor: 'transparent', fontSize: '18px', fontWeight: 700, color: '#0f172a', outline: 'none' }}
              />
            </div>
            {limitViolationMsg && activeEnteredAmount > 0 && (
              <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, marginTop: '6px' }}>
                ⚠ {limitViolationMsg}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Bank Name</span>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Account Number</span>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
      )}

      {serverError && (
        <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: '11px', color: '#b91c1c' }}>
          {serverError}
        </div>
      )}

      {/* Action Button */}
      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '12px',
          backgroundColor: canSubmit ? '#0f172a' : '#94a3b8',
          color: '#ffffff',
          border: 'none',
          fontSize: '13px',
          fontWeight: 700,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: canSubmit ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {isSubmitting ? (
          <>
            <ModernButtonSpinner size={15} />
            <span>Processing Withdrawal...</span>
          </>
        ) : (
          <span>
            {selectedRail === 'crypto'
              ? `Submit Withdrawal Request →`
              : 'Submit Wire Request →'}
          </span>
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
        <ShieldCheck style={{ width: '13px', height: '13px', color: '#10b981' }} />
        <span>256-Bit Cryptographically Audited Vault Clearance</span>
      </div>
    </form>
  );

  // ================================================================
  // MAIN RENDER
  // ================================================================
  const getHeaderTitle = () => {
    switch (view) {
      case 'lockdown': return '24-Hour Security Lockdown';
      case 'declined': return declineInfo.title || 'Payment Declined';
      case 'no-balance': return 'Withdraw Funds';
      default: return 'Withdraw Funds';
    }
  };

  const getHeaderIcon = () => {
    switch (view) {
      case 'lockdown':
        return <Lock style={{ width: '17px', height: '17px' }} />;
      case 'declined': return <XCircle style={{ width: '17px', height: '17px' }} />;
      default: return <ArrowUpRight style={{ width: '18px', height: '18px' }} />;
    }
  };

  const getHeaderIconStyle = () => {
    switch (view) {
      case 'lockdown':
        return { backgroundColor: '#fee2e2', color: '#dc2626' };
      default: return { backgroundColor: '#0f172a', color: '#ffffff' };
    }
  };

  // ================================================================
  // DEDICATED FLOATING RECEIPT CARD FOR WITHDRAWAL PENDING
  // (Clean minimal receipt layout matching PaymentReceivedModal)
  // ================================================================
  if (view === 'submitted') {
    const txIdentifier = submittedSnapshot?.recordId || 'PENDING';
    const displayTxId =
      txIdentifier.length > 16
        ? `${txIdentifier.slice(0, 6)}...${txIdentifier.slice(-4)}`
        : txIdentifier;

    const isBankRail =
      submittedSnapshot?.rail === 'Fedwire Transfer' ||
      submittedSnapshot?.rail === 'SWIFT Global';
    const rawDest = submittedSnapshot?.destination || 'External Wallet';
    const displayDest =
      !isBankRail && rawDest.length > 18
        ? `${rawDest.slice(0, 6)}...${rawDest.slice(-4)}`
        : rawDest;

    const dateObj = submittedSnapshot?.submittedAt
      ? new Date(submittedSnapshot.submittedAt)
      : new Date();
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const yearStr = dateObj.getFullYear();
    const monthShort = dateObj
      .toLocaleDateString('en-US', { month: 'short' })
      .toUpperCase();
    const dayNum = dateObj.getDate();

    const handleCopyRequestId = () => {
      copyToClipboard(txIdentifier);
      setCopiedRequestId(true);
      setTimeout(() => setCopiedRequestId(false), 2000);
    };

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleModalClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          style={{
            width: '100%',
            maxWidth: '410px',
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            padding: '28px 24px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Close 'X' Button */}
          <button
            type="button"
            onClick={handleModalClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>

          {/* Top Header Pill: ⏱ Withdrawal pending */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#f1f5f9',
                padding: '6px 14px 6px 7px',
                borderRadius: '9999px',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock style={{ width: '13px', height: '13px', color: '#ffffff', strokeWidth: 2.75 }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                Withdrawal pending
              </span>
            </div>
          </div>

          {/* Big Bold Clean Amount */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <div
              style={{
                fontSize: '38px',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
              }}
            >
              {submittedSnapshot?.heroAmount || submittedSnapshot?.amountFormatted || '$0.00'}
            </div>
          </div>

          {/* Dashed Horizontal Divider */}
          <div
            style={{
              width: '100%',
              borderTop: '1.5px dashed #e2e8f0',
              margin: '22px 0 18px',
            }}
          />

          {/* Receipt Key-Value Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Row 1: To */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>To</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span
                  style={{
                    color: '#0f172a',
                    fontSize: '14px',
                    fontWeight: 700,
                    fontFamily: isBankRail
                      ? 'inherit'
                      : 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    maxWidth: '215px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={rawDest}
                >
                  {displayDest}
                </span>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 2px 4px rgba(15, 23, 42, 0.2)',
                    flexShrink: 0,
                  }}
                >
                  {isBankRail ? (
                    <Building2 style={{ width: '14px', height: '14px' }} />
                  ) : (
                    <ArrowUpRight style={{ width: '15px', height: '15px', strokeWidth: 2.5 }} />
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Submitted on */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
                Submitted on
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700 }}>
                  {yearStr} {dayName}
                </span>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    backgroundColor: '#0f172a',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    lineHeight: 1,
                    padding: '2px',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '7px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                    {monthShort}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
                    {dayNum}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 3: Transaction number */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
                Transaction number
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                  title={txIdentifier}
                >
                  # {displayTxId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRequestId}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '3px',
                    color: copiedRequestId ? '#10b981' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Copy Transaction Number"
                >
                  {copiedRequestId ? (
                    <Check style={{ width: '13px', height: '13px' }} />
                  ) : (
                    <Copy style={{ width: '13px', height: '13px' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Row 4: Reference */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Reference</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700 }}>
                  {submittedSnapshot?.shortReference || submittedSnapshot?.rail || 'Withdrawal'}
                </span>
                <FileText style={{ width: '18px', height: '18px', color: '#94a3b8' }} />
              </div>
            </div>
          </div>

          {/* Done Button */}
          <button
            type="button"
            onClick={handleModalClose}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0f172a';
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ================================================================
  // DEDICATED MINIMALIST ALERT DIALOG FOR PAYMENT DECLINED
  // (Pure iOS Alert Simplicity: Clean card, title, message, hairline divider, action button)
  // ================================================================
  if (view === 'declined') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleModalClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          style={{
            width: '100%',
            maxWidth: '320px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            boxSizing: 'border-box',
            animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Content Area */}
          <div style={{ padding: '24px 20px 20px' }}>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#000000',
                margin: '0 0 8px',
                letterSpacing: '-0.3px',
                lineHeight: 1.3,
              }}
            >
              {declineInfo.title || 'Payment Declined'}
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: '#3c3c43',
                lineHeight: 1.45,
                margin: 0,
                fontWeight: 400,
              }}
            >
              {declineInfo.message ||
                'Oops! Sorry your withdrawal cannot be completed. Please contact support'}
            </p>
          </div>

          {/* Hairline Divider */}
          <div
            style={{
              height: '0.5px',
              backgroundColor: 'rgba(60, 60, 67, 0.2)',
              width: '100%',
            }}
          />

          {/* Bottom Action Button: Direct mailto link */}
          <a
            href={`mailto:${declineInfo.supportEmail || 'support@moorebachgroup.com'}?subject=Withdrawal%20Inquiry%20-%20Declan%20Salo&body=Hello%20MooreBach%20Treasury%20Support,%0A%0AMy%20withdrawal%20attempt%20could%20not%20be%20completed.%20Please%20assist%20with%20clearing%20this%20disbursement.`}
            onClick={handleModalClose}
            style={{
              display: 'block',
              width: '100%',
              padding: '14px 16px',
              backgroundColor: 'transparent',
              color: '#007aff',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
              textAlign: 'center',
              cursor: 'pointer',
              boxSizing: 'border-box',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {declineInfo.buttonText || 'Contact Support'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleModalClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <ModernTopBar active={isSubmitting} />

        {/* TOP HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                ...getHeaderIconStyle(),
              }}
            >
              {getHeaderIcon()}
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.2px' }}>
                {getHeaderTitle()}
              </h2>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Declan Salo • Portfolio #MO-88429
              </span>
            </div>
          </div>

          <button
            onClick={handleModalClose}
            aria-label="Close"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <X style={{ width: '15px', height: '15px' }} />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div
          style={{
            overflowY: 'auto',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {view === 'loading' && renderLoadingScreen()}
          {view === 'lockdown' && renderLockdownScreen()}
          {view === 'no-balance' && renderNoBalanceScreen()}
          {view === 'form' && renderWithdrawalForm()}
          {view === 'processing' && renderProcessingScreen()}
        </div>
      </div>
    </div>
  );
}
