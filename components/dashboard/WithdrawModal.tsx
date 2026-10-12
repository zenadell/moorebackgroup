'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
        minAmount: 50,
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
        minAmount: 50,
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

export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const [selectedRail, setSelectedRail] = useState<WithdrawalRail>('crypto');

  // Crypto state
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAsset>('USDT');
  const [cryptoNetwork, setCryptoNetwork] = useState<CryptoNetwork>('TRC20');
  const [cryptoAddress, setCryptoAddress] = useState<string>('');
  const [cryptoAmount, setCryptoAmount] = useState<string>('50000');
  const [addressTouched, setAddressTouched] = useState<boolean>(false);

  // Traditional bank wire state
  const [fiatAmount, setFiatAmount] = useState<string>('150000');
  const [bankName, setBankName] = useState<string>('JPMorgan Chase Bank, N.A.');
  const [accountNumber, setAccountNumber] = useState<string>('••••••••4819');
  const [routingNumber, setRoutingNumber] = useState<string>('021000021');

  // Submission & Lockout state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [lockNotice, setLockNotice] = useState<string>(
    'Capital disbursements are locked until full contract maturity. Early releases cannot be processed prior to the scheduled contract end date. Please refer to your portfolio terms for details.'
  );
  const [submittedSnapshot, setSubmittedSnapshot] = useState<{
    rail: string;
    assetSymbol?: string;
    networkName?: string;
    destination: string;
    amountFormatted: string;
    feeFormatted?: string;
    receiveFormatted?: string;
    recordId?: string;
  } | null>(null);

  const currentAsset = CRYPTO_ASSETS[cryptoAsset];

  // Auto-align network if switching coin
  useEffect(() => {
    const isValidNetwork = currentAsset.networks.some((n) => n.id === cryptoNetwork);
    if (!isValidNetwork) {
      setCryptoNetwork(currentAsset.networks[0].id);
    }
  }, [cryptoAsset, currentAsset, cryptoNetwork]);

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

  // Fetch lock message from database
  useEffect(() => {
    if (isOpen) {
      fetch('/api/withdrawals')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.withdrawals?.lockMessage) {
            setLockNotice(d.withdrawals.lockMessage);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Amount & fee math
  const parsedCryptoAmount = parseFloat(cryptoAmount) || 0;
  const netCryptoReceive = Math.max(0, parsedCryptoAmount - currentNetwork.fee);
  const isAmountValid =
    selectedRail === 'crypto'
      ? parsedCryptoAmount >= currentNetwork.minAmount
      : (parseFloat(fiatAmount) || 0) >= 50000;

  const canSubmit =
    selectedRail === 'crypto'
      ? addressValidation.valid && isAmountValid && !isSubmitting
      : isAmountValid && !isSubmitting;

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

    if (selectedRail === 'crypto') {
      setAddressTouched(true);
      if (!addressValidation.valid) {
        setServerError(addressValidation.error || 'Please enter a valid address.');
        return;
      }
      if (!isAmountValid) {
        setServerError(`Min withdrawal: ${currentNetwork.minAmount} ${cryptoAsset}`);
        return;
      }
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
            }
          : {
              rail: selectedRail,
              amount: parseFloat(fiatAmount) || 0,
              beneficiary: 'Declan Salo',
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

      if (data.validationError) {
        setServerError(data.error);
        return;
      }

      setSubmittedSnapshot({
        rail: selectedRail === 'crypto' ? 'Crypto Outbound' : selectedRail === 'fedwire' ? 'Fedwire Transfer' : 'SWIFT Global',
        assetSymbol: selectedRail === 'crypto' ? cryptoAsset : 'USD',
        networkName: selectedRail === 'crypto' ? currentNetwork.name : undefined,
        destination:
          selectedRail === 'crypto'
            ? cryptoAddress.trim()
            : `${bankName} • ${accountNumber}`,
        amountFormatted:
          selectedRail === 'crypto'
            ? `${parsedCryptoAmount.toLocaleString()} ${cryptoAsset}`
            : `$${Number(fiatAmount || 0).toLocaleString()} USD`,
        feeFormatted:
          selectedRail === 'crypto'
            ? `${currentNetwork.fee} ${currentNetwork.feeSymbol} (${currentNetwork.feeUsd})`
            : '$0.00 (Tier 1)',
        receiveFormatted:
          selectedRail === 'crypto'
            ? `${netCryptoReceive.toLocaleString()} ${cryptoAsset}`
            : `$${Number(fiatAmount || 0).toLocaleString()} USD`,
        recordId: data.recordId || data.record?.id,
      });

      if (data.blocked) {
        if (data.error) setLockNotice(data.error);
        setIsBlocked(true);
      } else {
        if (data.error) setLockNotice(data.error);
        setIsBlocked(true);
      }
    } catch {
      setIsSubmitting(false);
      setIsBlocked(true);
    }
  };

  const handleModalClose = () => {
    setIsBlocked(false);
    setIsSubmitting(false);
    setServerError(null);
    onClose();
  };

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
        {/* ============================================================== */}
        {/* TOP BRAND HEADER */}
        {/* ============================================================== */}
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
                backgroundColor: isBlocked ? '#fee2e2' : '#0f172a',
                color: isBlocked ? '#dc2626' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
              }}
            >
              {isBlocked ? (
                <Lock style={{ width: '17px', height: '17px' }} />
              ) : (
                <ArrowUpRight style={{ width: '18px', height: '18px' }} />
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.2px' }}>
                {isBlocked ? 'Disbursement Clearance' : 'Withdraw Funds'}
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

        {/* ============================================================== */}
        {/* SCROLLABLE MODAL CONTENT */}
        {/* ============================================================== */}
        <div
          style={{
            overflowY: 'auto',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {isBlocked ? (
            /* ========================================================== */
            /* ULTRA-MODERN INSTITUTIONAL LOCKOUT VIEW */
            /* ========================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '6px 0' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
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
                <Lock style={{ width: '28px', height: '28px' }} />
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
                  Withdrawals Unavailable
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                  Active Contract Lock
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: 0, padding: '0 10px' }}>
                  Withdrawals are currently unavailable and will remain restricted until the end of the active contract period. Please refer to your portfolio agreement for the scheduled release date.
                </p>
              </div>

              {submittedSnapshot && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Disbursement Rail</span>
                    <strong style={{ color: '#0f172a' }}>{submittedSnapshot.rail}</strong>
                  </div>

                  {submittedSnapshot.networkName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Network Chain</span>
                      <strong style={{ color: '#2563eb' }}>{submittedSnapshot.networkName}</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Destination</span>
                    <span
                      style={{
                        fontFamily: 'ui-monospace, monospace',
                        fontWeight: 600,
                        color: '#0f172a',
                        maxWidth: '60%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={submittedSnapshot.destination}
                    >
                      {submittedSnapshot.destination}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #edf2f7', paddingTop: '8px' }}>
                    <span style={{ color: '#64748b' }}>Requested Amount</span>
                    <strong style={{ color: '#dc2626', fontSize: '13px' }}>{submittedSnapshot.amountFormatted}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Audit Reference</span>
                    <span style={{ fontFamily: 'ui-monospace, monospace', color: '#64748b' }}>
                      {submittedSnapshot.recordId || 'CTR-88429-HOLD'}
                    </span>
                  </div>
                </div>
              )}

              {/* Custody Warning Card */}
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
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', color: '#78350f', marginBottom: '2px' }}>
                    Compliance Notice:
                  </strong>
                  <span>{lockNotice}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsBlocked(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Edit Request
                </button>
                <button
                  type="button"
                  onClick={handleModalClose}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Acknowledge & Close
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================== */
            /* ULTRA-MODERN FINTECH WITHDRAWAL FORM */
            /* ========================================================== */
            <form onSubmit={handleAttemptWithdrawal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  const isActive = selectedRail === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedRail(tab.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '9px',
                        border: 'none',
                        backgroundColor: isActive ? '#ffffff' : 'transparent',
                        color: isActive ? '#0f172a' : '#64748b',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon style={{ width: '14px', height: '14px', color: isActive ? '#2563eb' : '#94a3b8' }} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

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

                  {/* Modern Amount Card with Presets */}
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
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Portfolio: <strong style={{ color: '#0f172a' }}>$120.57M (100% Equities Deployed)</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#94a3b8' }}>$</span>
                        <input
                          type="number"
                          value={cryptoAmount}
                          onChange={(e) => setCryptoAmount(e.target.value)}
                          placeholder="50000"
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

                    {/* Compact Quick Preset Chips */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['50000', '100000', '250000', '500000', '1000000'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setCryptoAmount(chip)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          +${Number(chip).toLocaleString()}
                        </button>
                      ))}
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
                        placeholder="50000"
                        style={{ width: '100%', border: 'none', backgroundColor: 'transparent', fontSize: '18px', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                      />
                    </div>
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
                    <span>Verifying On-Chain Clearance...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {selectedRail === 'crypto'
                        ? `Withdraw ${netCryptoReceive.toLocaleString()} ${cryptoAsset} →`
                        : 'Submit Wire Request →'}
                    </span>
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                <ShieldCheck style={{ width: '13px', height: '13px', color: '#10b981' }} />
                <span>256-Bit Cryptographically Audited Vault Clearance</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
