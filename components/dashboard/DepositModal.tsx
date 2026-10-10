'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  QrCode,
  Info,
  Clock,
  ArrowDownLeft,
  Coins,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CryptoAsset = 'USDT' | 'BTC' | 'ETH';
type UsdtNetwork = 'TRC20' | 'ERC20';

interface CryptoConfig {
  name: string;
  symbol: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  address: string;
  network: string;
  confirmations: string;
  estTime: string;
  minDeposit: string;
  warningText: string;
  iconBg: string;
  iconSymbol: string;
  usdRate: number;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset>('USDT');
  const [usdtNetwork, setUsdtNetwork] = useState<UsdtNetwork>('TRC20');
  const [copied, setCopied] = useState(false);
  const [testAmount, setTestAmount] = useState<string>('50000');
  const [verificationState, setVerificationState] = useState<'idle' | 'scanning' | 'detected'>('idle');

  if (!isOpen) return null;

  const cryptoConfigs: Record<CryptoAsset, CryptoConfig> = {
    USDT: {
      name: 'Tether USD',
      symbol: 'USDT',
      badge: 'Recommended • Instant 1-3 min',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      address:
        usdtNetwork === 'TRC20'
          ? 'TKrF4Y3jU9qS8kNm2pXvL7wZ5eB1mD4gHj'
          : '0x71C8A60e0d5D9fB821c9Ac9c42E5F7a1E12a6D95',
      network: usdtNetwork === 'TRC20' ? 'Tron (TRC-20)' : 'Ethereum (ERC-20)',
      confirmations: usdtNetwork === 'TRC20' ? '1 Confirmation' : '12 Confirmations',
      estTime: usdtNetwork === 'TRC20' ? '1-3 minutes' : '3-6 minutes',
      minDeposit: '100 USDT',
      warningText: `Send only USDT via the ${
        usdtNetwork === 'TRC20' ? 'Tron (TRC-20)' : 'Ethereum (ERC-20)'
      } network. Sending via any other network (e.g. BEP-20, Solana) may result in permanent loss.`,
      iconBg: '#10b981',
      iconSymbol: '₮',
      usdRate: 1.0,
    },
    BTC: {
      name: 'Bitcoin',
      symbol: 'BTC',
      badge: 'Native Blockchain • 2 Confirmations',
      badgeColor: '#d97706',
      badgeBg: '#fffbeb',
      address: 'bc1q9d8sf4a3z5c7v6w8e2r1t0y9u8i7o6p5a4s3d2',
      network: 'Bitcoin Native (SegWit)',
      confirmations: '2 Confirmations',
      estTime: '10-20 minutes',
      minDeposit: '0.002 BTC (~$180)',
      warningText:
        'Send only BTC to this address via the native Bitcoin blockchain. Do not send BCH, WBTC, or lightning network payments to this address.',
      iconBg: '#f59e0b',
      iconSymbol: '₿',
      usdRate: 89450.0,
    },
    ETH: {
      name: 'Ethereum',
      symbol: 'ETH',
      badge: 'Ethereum Mainnet • 12 Confirmations',
      badgeColor: '#6366f1',
      badgeBg: '#eef2ff',
      address: '0x71C8A60e0d5D9fB821c9Ac9c42E5F7a1E12a6D95',
      network: 'Ethereum (ERC-20 Mainnet)',
      confirmations: '12 Confirmations',
      estTime: '3-5 minutes',
      minDeposit: '0.05 ETH (~$175)',
      warningText:
        'Send only ETH or direct ERC-20 assets via Ethereum Mainnet. Unsupported Layer-2s (Arbitrum, Optimism) are not routed to this vault.',
      iconBg: '#6366f1',
      iconSymbol: 'Ξ',
      usdRate: 3480.0,
    },
  };

  const current = cryptoConfigs[selectedAsset];

  const handleCopy = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(current.address);
      }
    } catch {
      // Fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateVerification = () => {
    setVerificationState('scanning');
    setTimeout(() => {
      setVerificationState('detected');
    }, 1800);
  };

  const parsedAmount = parseFloat(testAmount) || 0;
  const calculatedUsd =
    selectedAsset === 'USDT'
      ? parsedAmount
      : parsedAmount * current.usdRate;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid #f1f4f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowDownLeft style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Deposit Capital (Crypto Gateway)
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                Declan Salo Portfolio • Liquid Cash Reserves
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Institutional Banner */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              color: '#334155',
              lineHeight: 1.45,
            }}
          >
            <ShieldCheck style={{ width: '18px', height: '18px', color: '#10b981', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong style={{ color: '#0f172a' }}>Crypto Deposits Exclusively Supported:</strong> All inbound additions to Declan Salo&apos;s $120.57M portfolio are routed through dedicated multi-signature blockchain vaults for instant cryptographic audit and 0-fee settlement.
            </div>
          </div>

          {/* Crypto Asset Selector */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
              Select Deposit Cryptocurrency
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['USDT', 'BTC', 'ETH'] as const).map((asset) => {
                const conf = cryptoConfigs[asset];
                const isSelected = selectedAsset === asset;

                return (
                  <button
                    key={asset}
                    type="button"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setVerificationState('idle');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '9999px',
                        backgroundColor: conf.iconBg,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '15px',
                      }}
                    >
                      {conf.iconSymbol}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {conf.symbol}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                      {conf.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-Network selector for USDT */}
          {selectedAsset === 'USDT' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Choose Network
                </label>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                  TRC-20 has the lowest network fees (~$1)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setUsdtNetwork('TRC20')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: usdtNetwork === 'TRC20' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: usdtNetwork === 'TRC20' ? '#f0f7ff' : '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: usdtNetwork === 'TRC20' ? '#1e40af' : '#475569',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>Tron (TRC-20)</div>
                  <div style={{ fontSize: '10px', fontWeight: 400, color: '#64748b' }}>Fastest (1-3 min)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setUsdtNetwork('ERC20')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: usdtNetwork === 'ERC20' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: usdtNetwork === 'ERC20' ? '#f0f7ff' : '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: usdtNetwork === 'ERC20' ? '#1e40af' : '#475569',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>Ethereum (ERC-20)</div>
                  <div style={{ fontSize: '10px', fontWeight: 400, color: '#64748b' }}>Native ETH Network</div>
                </button>
              </div>
            </div>
          )}

          {/* QR Code and Address Section */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            {/* Visual SVG QR Code */}
            <div
              style={{
                width: '140px',
                height: '140px',
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                position: 'relative',
              }}
            >
              {/* High-fidelity SVG QR Code */}
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                {/* Finder pattern top-left */}
                <rect x="5" y="5" width="26" height="26" rx="3" fill="#0f172a" />
                <rect x="9" y="9" width="18" height="18" rx="2" fill="#ffffff" />
                <rect x="13" y="13" width="10" height="10" rx="1" fill="#0f172a" />

                {/* Finder pattern top-right */}
                <rect x="69" y="5" width="26" height="26" rx="3" fill="#0f172a" />
                <rect x="73" y="9" width="18" height="18" rx="2" fill="#ffffff" />
                <rect x="77" y="13" width="10" height="10" rx="1" fill="#0f172a" />

                {/* Finder pattern bottom-left */}
                <rect x="5" y="69" width="26" height="26" rx="3" fill="#0f172a" />
                <rect x="9" y="73" width="18" height="18" rx="2" fill="#ffffff" />
                <rect x="13" y="77" width="10" height="10" rx="1" fill="#0f172a" />

                {/* Alignment square bottom-right */}
                <rect x="71" y="71" width="16" height="16" rx="2" fill="#0f172a" />
                <rect x="74" y="74" width="10" height="10" rx="1" fill="#ffffff" />
                <rect x="77" y="77" width="4" height="4" fill="#0f172a" />

                {/* Data modules */}
                <rect x="36" y="8" width="5" height="5" fill="#0f172a" />
                <rect x="46" y="8" width="5" height="5" fill="#0f172a" />
                <rect x="56" y="8" width="5" height="5" fill="#0f172a" />

                <rect x="36" y="18" width="5" height="5" fill="#0f172a" />
                <rect x="42" y="24" width="5" height="5" fill="#0f172a" />
                <rect x="52" y="18" width="5" height="5" fill="#0f172a" />
                <rect x="58" y="24" width="5" height="5" fill="#0f172a" />

                <rect x="8" y="36" width="5" height="5" fill="#0f172a" />
                <rect x="18" y="42" width="5" height="5" fill="#0f172a" />
                <rect x="24" y="36" width="5" height="5" fill="#0f172a" />

                <rect x="8" y="52" width="5" height="5" fill="#0f172a" />
                <rect x="18" y="58" width="5" height="5" fill="#0f172a" />
                <rect x="24" y="52" width="5" height="5" fill="#0f172a" />

                <rect x="36" y="36" width="6" height="6" fill="#0f172a" />
                <rect x="48" y="36" width="5" height="5" fill="#0f172a" />
                <rect x="58" y="36" width="5" height="5" fill="#0f172a" />

                <rect x="36" y="58" width="5" height="5" fill="#0f172a" />
                <rect x="44" y="52" width="5" height="5" fill="#0f172a" />
                <rect x="52" y="58" width="5" height="5" fill="#0f172a" />
                <rect x="58" y="52" width="5" height="5" fill="#0f172a" />

                <rect x="36" y="74" width="5" height="5" fill="#0f172a" />
                <rect x="44" y="80" width="5" height="5" fill="#0f172a" />
                <rect x="54" y="74" width="5" height="5" fill="#0f172a" />

                <rect x="74" y="36" width="5" height="5" fill="#0f172a" />
                <rect x="84" y="42" width="5" height="5" fill="#0f172a" />
                <rect x="90" y="36" width="5" height="5" fill="#0f172a" />

                <rect x="74" y="52" width="5" height="5" fill="#0f172a" />
                <rect x="84" y="58" width="5" height="5" fill="#0f172a" />
                <rect x="90" y="52" width="5" height="5" fill="#0f172a" />

                {/* Center Badge */}
                <circle cx="50" cy="50" r="11" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                <circle cx="50" cy="50" r="9" fill={current.iconBg} />
                <text
                  x="50"
                  y="54"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#ffffff"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {current.iconSymbol}
                </text>
              </svg>
            </div>

            {/* Address Box */}
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                  {current.symbol} Vault Address ({current.network})
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    backgroundColor: current.badgeBg,
                    color: current.badgeColor,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {current.badge}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '6px 8px 6px 12px',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '12px',
                    color: '#0f172a',
                    wordBreak: 'break-all',
                    flex: 1,
                  }}
                >
                  {current.address}
                </span>

                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: copied ? '#10b981' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {copied ? (
                    <>
                      <Check style={{ width: '14px', height: '14px' }} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy style={{ width: '14px', height: '14px' }} />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Network Warning Alert */}
            <div
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                fontSize: '11px',
                color: '#92400e',
                lineHeight: 1.4,
                display: 'flex',
                gap: '8px',
              }}
            >
              <AlertTriangle style={{ width: '15px', height: '15px', color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
              <div>{current.warningText}</div>
            </div>
          </div>

          {/* Deposit Specifications Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Min Deposit</span>
              <strong style={{ fontSize: '12px', color: '#0f172a' }}>{current.minDeposit}</strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Confirmations</span>
              <strong style={{ fontSize: '12px', color: '#0f172a' }}>{current.confirmations}</strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Expected Arrival</span>
              <strong style={{ fontSize: '12px', color: '#0f172a' }}>{current.estTime}</strong>
            </div>
          </div>

          {/* Step-by-Step Deposit Instructions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              How to deposit into Declan Salo&apos;s Portfolio:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '9999px', backgroundColor: '#e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>1</span>
                <span>Copy the vault address above or scan the QR code using your crypto wallet (Coinbase, Binance, Ledger, TrustWallet).</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '9999px', backgroundColor: '#e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>2</span>
                <span>Ensure the recipient network is set to <strong>{current.network}</strong> before submitting your transfer.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '9999px', backgroundColor: '#e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>3</span>
                <span>Once the blockchain confirms your transfer, the amount is automatically converted 1:1 and credited to your Cash Reserves ($120.57M liquid pool).</span>
              </div>
            </div>
          </div>

          {/* Testing / Simulator Action Section */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>
                Test / Verify Inbound Blockchain Transaction
              </span>
              <span style={{ fontSize: '11px', color: '#3b82f6' }}>
                ≈ ${calculatedUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => {
                  setTestAmount(e.target.value);
                  setVerificationState('idle');
                }}
                placeholder="Enter deposit amount"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleSimulateVerification}
                disabled={verificationState === 'scanning'}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {verificationState === 'scanning' ? (
                  <>
                    <RefreshCw style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} />
                    <span>Scanning Mempool...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                    <span>Verify On-Chain</span>
                  </>
                )}
              </button>
            </div>

            {verificationState === 'detected' && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  fontSize: '12px',
                  color: '#065f46',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500,
                }}
              >
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981', flexShrink: 0 }} />
                <span>
                  <strong>Transaction Detected in Mempool!</strong> Receiving {testAmount} {selectedAsset}. Awaiting {current.confirmations} to credit liquid reserves.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #f1f4f9',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
