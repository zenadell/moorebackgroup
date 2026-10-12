'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Edit3,
  Save,
  Search,
  Wallet,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { ModernTopBar, ModernButtonSpinner } from '@/components/ui/ModernLoader';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreditSuccess?: (amount: number, asset: string, txId: string) => void;
}

export type CryptoAsset = 'USDT' | 'BTC' | 'ETH';
export type UsdtNetwork = 'TRC20' | 'ERC20';

interface CryptoAssetConfig {
  name: string;
  symbol: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  network: string;
  confirmations: string;
  estTime: string;
  minDeposit: string;
  warningText: string;
  iconBg: string;
  iconSymbol: string;
  usdRate: number;
  explorerBaseUrl: string;
}

interface DetectedTx {
  txId: string;
  amount: number;
  symbol: string;
  confirmations: number;
  status: 'mempool' | 'confirmed';
  timestamp: number;
  from?: string;
  to: string;
  explorerUrl: string;
  blockHeight?: number;
}

interface VerificationScanResult {
  asset: CryptoAsset;
  network: string;
  address: string;
  hasDeposit: boolean;
  checkedAt: string;
  source: string;
  balance?: number;
  transactions: DetectedTx[];
  summary: {
    totalReceived: number;
    unconfirmedCount: number;
    confirmedCount: number;
    statusMessage: string;
  };
}

export function DepositModal({ isOpen, onClose, onCreditSuccess }: DepositModalProps) {
  const { isMaster } = useAuth();

  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset>('USDT');
  const [usdtNetwork, setUsdtNetwork] = useState<UsdtNetwork>('TRC20');
  const [copied, setCopied] = useState(false);

  // Dynamic Vault Addresses from persistent storage
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // Master Account Edit Address State
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressInput, setEditAddressInput] = useState('');
  const [addressSaveError, setAddressSaveError] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Real On-Chain Verification States
  const [verifyMode, setVerifyMode] = useState<'scan' | 'txid'>('scan');
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'scanning' | 'no_tx' | 'detected' | 'error'
  >('idle');
  const [scanResult, setScanResult] = useState<VerificationScanResult | null>(null);
  const [txLookupResult, setTxLookupResult] = useState<any | null>(null);
  const [customTxHash, setCustomTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creditedTxs, setCreditedTxs] = useState<string[]>([]);
  const [creditNotice, setCreditNotice] = useState<string | null>(null);

  // Fetch active config from server on mount
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/crypto/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config?.addresses) {
          setAddresses(data.config.addresses);
          setIsConfigLoaded(true);
        }
      }
    } catch {
      // Use fallback defaults
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      setVerificationStatus('idle');
      setScanResult(null);
      setTxLookupResult(null);
      setErrorMessage(null);
      setCreditNotice(null);
      setIsEditingAddress(false);
    }
  }, [isOpen, fetchConfig]);

  if (!isOpen) return null;

  if (!isConfigLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <div className="data-skeleton h-8 w-2/3 rounded-lg" />
          <div className="data-skeleton mt-5 h-40 rounded-xl" />
          <div className="data-skeleton mt-4 h-10 rounded-lg" />
        </div>
      </div>
    );
  }

  // Resolve current active address based on selection
  let currentAddress = addresses.USDT_TRC20;
  if (selectedAsset === 'USDT') {
    currentAddress = usdtNetwork === 'TRC20' ? addresses.USDT_TRC20 : addresses.USDT_ERC20;
  } else if (selectedAsset === 'BTC') {
    currentAddress = addresses.BTC;
  } else if (selectedAsset === 'ETH') {
    currentAddress = addresses.ETH;
  }

  const assetConfigs: Record<CryptoAsset, CryptoAssetConfig> = {
    USDT: {
      name: 'Tether USD',
      symbol: 'USDT',
      badge: usdtNetwork === 'TRC20' ? 'TRC-20 • Low Fee 1-3 min' : 'ERC-20 • High Security',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      network: usdtNetwork === 'TRC20' ? 'Tron (TRC-20)' : 'Ethereum (ERC-20)',
      confirmations: usdtNetwork === 'TRC20' ? '1 Confirmation' : '12 Confirmations',
      estTime: usdtNetwork === 'TRC20' ? '1-3 minutes' : '3-6 minutes',
      minDeposit: '100 USDT',
      warningText: `Send only USDT via the ${
        usdtNetwork === 'TRC20' ? 'Tron (TRC-20)' : 'Ethereum (ERC-20)'
      } network. Sending via other networks (e.g. BEP-20, Solana, Arbitrum) may result in permanent loss.`,
      iconBg: '#10b981',
      iconSymbol: '₮',
      usdRate: 1.0,
      explorerBaseUrl: usdtNetwork === 'TRC20' ? 'https://tronscan.org/#/transaction/' : 'https://etherscan.io/tx/',
    },
    BTC: {
      name: 'Bitcoin',
      symbol: 'BTC',
      badge: 'Native Blockchain • 2 Confirmations',
      badgeColor: '#d97706',
      badgeBg: '#fffbeb',
      network: 'Bitcoin Native (SegWit)',
      confirmations: '2 Confirmations',
      estTime: '10-20 minutes',
      minDeposit: '0.002 BTC (~$180)',
      warningText:
        'Send only BTC to this address via the native Bitcoin blockchain. Do not send BCH, WBTC, or lightning network payments to this vault address.',
      iconBg: '#f59e0b',
      iconSymbol: '₿',
      usdRate: 89450.0,
      explorerBaseUrl: 'https://mempool.space/tx/',
    },
    ETH: {
      name: 'Ethereum',
      symbol: 'ETH',
      badge: 'Ethereum Mainnet • 12 Confirmations',
      badgeColor: '#6366f1',
      badgeBg: '#eef2ff',
      network: 'Ethereum Mainnet',
      confirmations: '12 Confirmations',
      estTime: '3-5 minutes',
      minDeposit: '0.05 ETH (~$175)',
      warningText:
        'Send only ETH or direct ERC-20 assets via Ethereum Mainnet. Unsupported Layer-2s (Base, Arbitrum, Optimism) are not routed to this vault.',
      iconBg: '#6366f1',
      iconSymbol: 'Ξ',
      usdRate: 3480.0,
      explorerBaseUrl: 'https://etherscan.io/tx/',
    },
  };

  const current = assetConfigs[selectedAsset];

  const handleCopy = () => {
    copyToClipboard(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Master Account Edit Address Handler
  const handleStartEditAddress = () => {
    setEditAddressInput(currentAddress);
    setAddressSaveError(null);
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    setAddressSaveError(null);
    const cleaned = editAddressInput.trim();
    if (!cleaned) {
      setAddressSaveError('Address cannot be empty.');
      return;
    }

    setIsSavingAddress(true);

    const updatePayload: Record<string, string> = {};
    if (selectedAsset === 'USDT') {
      if (usdtNetwork === 'TRC20') updatePayload.USDT_TRC20 = cleaned;
      else updatePayload.USDT_ERC20 = cleaned;
    } else if (selectedAsset === 'BTC') {
      updatePayload.BTC = cleaned;
    } else if (selectedAsset === 'ETH') {
      updatePayload.ETH = cleaned;
    }

    try {
      const res = await fetch('/api/crypto/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: updatePayload }),
      });
      const data = await res.json();
      setIsSavingAddress(false);

      if (data.success && data.config?.addresses) {
        setAddresses(data.config.addresses);
        setIsEditingAddress(false);
        // Reset verification state when address changes
        setVerificationStatus('idle');
        setScanResult(null);
      } else {
        setAddressSaveError(data.error || 'Failed to update vault address.');
      }
    } catch (e: any) {
      setIsSavingAddress(false);
      setAddressSaveError(e.message || 'Network error saving address.');
    }
  };

  // Real On-Chain Address Scan
  const handleScanBlockchain = async () => {
    setVerificationStatus('scanning');
    setErrorMessage(null);
    setScanResult(null);
    setTxLookupResult(null);
    setCreditNotice(null);

    try {
      const res = await fetch('/api/crypto/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: selectedAsset,
          network: selectedAsset === 'USDT' ? usdtNetwork : 'MAINNET',
          address: currentAddress,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setVerificationStatus('error');
        setErrorMessage(data.error || 'Failed to query blockchain node.');
        return;
      }

      const scan: VerificationScanResult = data.result;
      setScanResult(scan);

      if (scan.hasDeposit && scan.transactions.length > 0) {
        setVerificationStatus('detected');
      } else {
        setVerificationStatus('no_tx');
      }
    } catch (err: any) {
      setVerificationStatus('error');
      setErrorMessage(err.message || 'Network query failure connecting to blockchain node.');
    }
  };

  // Manual TxID Lookup
  const handleLookupTxId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTxHash.trim()) {
      setErrorMessage('Please enter a valid Transaction Hash (TxID).');
      return;
    }

    setVerificationStatus('scanning');
    setErrorMessage(null);
    setScanResult(null);
    setTxLookupResult(null);
    setCreditNotice(null);

    try {
      const res = await fetch('/api/crypto/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: selectedAsset,
          network: selectedAsset === 'USDT' ? usdtNetwork : 'MAINNET',
          address: currentAddress,
          txHash: customTxHash.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setVerificationStatus('error');
        setErrorMessage(data.error || 'Failed to verify transaction hash.');
        return;
      }

      setTxLookupResult(data.result);
      if (data.result.found && data.result.validForVault) {
        setVerificationStatus('detected');
      } else {
        setVerificationStatus('no_tx');
      }
    } catch (err: any) {
      setVerificationStatus('error');
      setErrorMessage(err.message || 'Failed to query blockchain for hash.');
    }
  };

  const handleCreditDeposit = (txId: string, amount: number, symbol: string) => {
    if (creditedTxs.includes(txId)) return;
    setCreditedTxs((prev) => [...prev, txId]);
    setCreditNotice(`Successfully credited ${amount} ${symbol} to Declan Salo's Portfolio Holdings!`);

    if (onCreditSuccess) {
      onCreditSuccess(amount, symbol, txId);
    }

    setTimeout(() => {
      setCreditNotice(null);
    }, 6000);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    currentAddress
  )}&margin=8&bgcolor=ffffff&color=0f172a`;

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
          maxWidth: '580px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <ModernTopBar active={verificationStatus === 'scanning' || isSavingAddress} />
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
                Declan Salo Portfolio • Total Equity Holdings ($120.57M)
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
        <div
          style={{
            overflowY: 'auto',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Institutional Security Notice */}
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
            <ShieldCheck
              style={{
                width: '18px',
                height: '18px',
                color: '#10b981',
                flexShrink: 0,
                marginTop: '1px',
              }}
            />
            <div>
              <strong style={{ color: '#0f172a' }}>Real On-Chain Settlement:</strong> Deposits to
              Declan Salo&apos;s portfolio are verified directly on the public blockchain. No simulated or dummy credits are permitted; incoming transactions require genuine mempool broadcast and cryptographic proof.
            </div>
          </div>

          {/* Crypto Asset Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '8px',
              }}
            >
              Select Deposit Asset
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {(['USDT', 'BTC', 'ETH'] as CryptoAsset[]).map((asset) => {
                const conf = assetConfigs[asset];
                const isSelected = selectedAsset === asset;
                return (
                  <button
                    key={asset}
                    type="button"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setVerificationStatus('idle');
                      setScanResult(null);
                      setTxLookupResult(null);
                      setIsEditingAddress(false);
                    }}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
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
                        fontSize: '16px',
                        fontWeight: 700,
                      }}
                    >
                      {conf.iconSymbol}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {conf.symbol}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>{conf.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* USDT Network Selector */}
          {selectedAsset === 'USDT' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '8px',
                }}
              >
                Select USDT Network Rail
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setUsdtNetwork('TRC20');
                    setVerificationStatus('idle');
                    setScanResult(null);
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: usdtNetwork === 'TRC20' ? '2px solid #059669' : '1px solid #e2e8f0',
                    backgroundColor: usdtNetwork === 'TRC20' ? '#ecfdf5' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: usdtNetwork === 'TRC20' ? '#065f46' : '#0f172a',
                      }}
                    >
                      Tron (TRC-20)
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontWeight: 700,
                      }}
                    >
                      RECOMMENDED
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    ~1-3 min arrival • 1 Confirmation
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUsdtNetwork('ERC20');
                    setVerificationStatus('idle');
                    setScanResult(null);
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: usdtNetwork === 'ERC20' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                    backgroundColor: usdtNetwork === 'ERC20' ? '#eef2ff' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: usdtNetwork === 'ERC20' ? '#4338ca' : '#0f172a',
                    }}
                  >
                    Ethereum (ERC-20)
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    ~3-6 min arrival • 12 Confirmations
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Dedicated Vault Address & QR Code Box */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            {/* Dynamic QR Code */}
            <div
              style={{
                width: '160px',
                height: '160px',
                backgroundColor: '#ffffff',
                padding: '8px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt={`${current.symbol} deposit QR code`}
                style={{ width: '100%', height: '100%', borderRadius: '6px', objectFit: 'contain' }}
              />
            </div>

            {/* Address Box */}
            <div style={{ width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                  {current.symbol} Vault Address ({current.network})
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                  {isMaster && !isEditingAddress && (
                    <button
                      type="button"
                      onClick={handleStartEditAddress}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: 'none',
                        background: 'none',
                        color: '#2563eb',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Edit3 style={{ width: '12px', height: '12px' }} />
                      <span>Edit Vault</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Edit Form for Master Account */}
              {isEditingAddress ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #2563eb',
                    borderRadius: '10px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#1e3a8a' }}>
                    Configure Declan&apos;s Real {current.symbol} ({current.network}) Address:
                  </label>
                  <input
                    type="text"
                    value={editAddressInput}
                    onChange={(e) => setEditAddressInput(e.target.value)}
                    placeholder={`Paste valid ${current.symbol} address`}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontFamily: 'ui-monospace, monospace',
                      color: '#0f172a',
                      outline: 'none',
                    }}
                  />
                  {addressSaveError && (
                    <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 500 }}>
                      {addressSaveError}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      disabled={isSavingAddress}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isSavingAddress ? (
                        <RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Save style={{ width: '12px', height: '12px' }} />
                      )}
                      <span>Save Address</span>
                    </button>
                  </div>
                </div>
              ) : (
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
                    {currentAddress}
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
              )}
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
              <AlertTriangle
                style={{
                  width: '15px',
                  height: '15px',
                  color: '#d97706',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              />
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

          {/* REAL ON-CHAIN BLOCKCHAIN VERIFICATION SECTION */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                  Live On-Chain Blockchain Verification
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Query real public explorer & mempool nodes • Zero dummy fallback
                </span>
              </div>

              {/* Mode switch pills */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '6px',
                  padding: '2px',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setVerifyMode('scan');
                    setVerificationStatus('idle');
                    setErrorMessage(null);
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: verifyMode === 'scan' ? '#ffffff' : 'transparent',
                    color: verifyMode === 'scan' ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Address Scan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyMode('txid');
                    setVerificationStatus('idle');
                    setErrorMessage(null);
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: verifyMode === 'txid' ? '#ffffff' : 'transparent',
                    color: verifyMode === 'txid' ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Lookup TxID
                </button>
              </div>
            </div>

            {/* MODE 1: Automated Address Scan */}
            {verifyMode === 'scan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                  Scan the live {current.network} blockchain for any incoming deposits sent to this vault address.
                </p>
                <button
                  type="button"
                  onClick={handleScanBlockchain}
                  disabled={verificationStatus === 'scanning'}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  {verificationStatus === 'scanning' ? (
                    <>
                      <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
                      <span>Scanning Mempool & Blockchain...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw style={{ width: '15px', height: '15px' }} />
                      <span>Check Blockchain for Inbound Deposits</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* MODE 2: Specific TxID Lookup */}
            {verifyMode === 'txid' && (
              <form onSubmit={handleLookupTxId} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                  Enter the transaction hash (TxID) generated by your wallet to verify its cryptographic receipt:
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={customTxHash}
                    onChange={(e) => setCustomTxHash(e.target.value)}
                    placeholder="Enter 64-char transaction hash / TxID"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontFamily: 'ui-monospace, monospace',
                      color: '#0f172a',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={verificationStatus === 'scanning'}
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
                    {verificationStatus === 'scanning' ? (
                      <RefreshCw style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Search style={{ width: '13px', height: '13px' }} />
                    )}
                    <span>Verify TxID</span>
                  </button>
                </div>
              </form>
            )}

            {/* ERROR STATE */}
            {verificationStatus === 'error' && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  fontSize: '12px',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>Query Notice:</strong>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* NO TRANSACTION RECEIVED ON-CHAIN (Honest, Real State) */}
            {verificationStatus === 'no_tx' && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock style={{ width: '18px', height: '18px', color: '#d97706', flexShrink: 0 }} />
                  <strong style={{ fontSize: '13px', color: '#92400e' }}>
                    No Incoming On-Chain Transfers Detected
                  </strong>
                </div>

                <div style={{ fontSize: '12px', color: '#78350f', lineHeight: 1.5 }}>
                  {verifyMode === 'scan' ? (
                    <>
                      The public blockchain explorer (
                      <strong>{scanResult?.source || 'Public RPC Nodes'}</strong>) verified 0 incoming transfers to vault address{' '}
                      <code style={{ fontSize: '11px', backgroundColor: '#fef3c7', padding: '2px 4px', borderRadius: '4px' }}>
                        {currentAddress.slice(0, 10)}...{currentAddress.slice(-8)}
                      </code>
                      .
                      <br />
                      If you sent a deposit from your wallet, please allow 30–60 seconds for block gossip propagation and click &apos;Check Blockchain&apos; again.
                    </>
                  ) : (
                    <>
                      {txLookupResult?.message ||
                        'Transaction hash was not detected in mempool or completed blocks for this vault address.'}
                    </>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '11px',
                    color: '#b45309',
                    paddingTop: '4px',
                    borderTop: '1px dashed #fde68a',
                  }}
                >
                  <span>Mempool: 0 Unconfirmed</span>
                  <span>•</span>
                  <span>Confirmed: 0</span>
                  <span>•</span>
                  <span>Audit: Zero Dummy Fallback</span>
                </div>
              </div>
            )}

            {/* REAL ON-CHAIN TRANSACTION DETECTED */}
            {verificationStatus === 'detected' && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 style={{ width: '20px', height: '20px', color: '#10b981', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: '#065f46', display: 'block' }}>
                      Genuine On-Chain Deposit Detected!
                    </strong>
                    <span style={{ fontSize: '11px', color: '#047857' }}>
                      Cryptographic confirmation verified on public blockchain
                    </span>
                  </div>
                </div>

                {/* Display detected transactions list */}
                {scanResult?.transactions && scanResult.transactions.length > 0 ? (
                  scanResult.transactions.map((tx) => {
                    const isCredited = creditedTxs.includes(tx.txId);
                    return (
                      <div
                        key={tx.txId}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #d1fae5',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#065f46' }}>
                            +{tx.amount} {tx.symbol}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: tx.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                              color: tx.status === 'confirmed' ? '#166534' : '#92400e',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {tx.status === 'confirmed'
                              ? `${tx.confirmations} Confirmation(s)`
                              : 'In Mempool (0 Conf)'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#475569' }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                            TxID: {tx.txId.slice(0, 14)}...{tx.txId.slice(-10)}
                          </span>
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#2563eb',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              textDecoration: 'none',
                            }}
                          >
                            <span>Explorer</span>
                            <ExternalLink style={{ width: '11px', height: '11px' }} />
                          </a>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleCreditDeposit(tx.txId, tx.amount, tx.symbol)}
                            disabled={isCredited}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: isCredited ? '#94a3b8' : '#10b981',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: isCredited ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {isCredited ? (
                              <>
                                <CheckCheck style={{ width: '13px', height: '13px' }} />
                                <span>Credited to Portfolio</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft style={{ width: '13px', height: '13px' }} />
                                <span>Credit to Portfolio</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : txLookupResult?.validForVault ? (
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #d1fae5',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#065f46' }}>
                        +{txLookupResult.amount} {selectedAsset}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {txLookupResult.confirmations || 1} Confirmation(s)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#475569' }}>
                      <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                        TxID: {txLookupResult.txId.slice(0, 14)}...{txLookupResult.txId.slice(-10)}
                      </span>
                      {txLookupResult.explorerUrl && (
                        <a
                          href={txLookupResult.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#2563eb',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            textDecoration: 'none',
                          }}
                        >
                          <span>Explorer</span>
                          <ExternalLink style={{ width: '11px', height: '11px' }} />
                        </a>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          handleCreditDeposit(txLookupResult.txId, txLookupResult.amount, selectedAsset)
                        }
                        disabled={creditedTxs.includes(txLookupResult.txId)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: creditedTxs.includes(txLookupResult.txId) ? '#94a3b8' : '#10b981',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: creditedTxs.includes(txLookupResult.txId) ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {creditedTxs.includes(txLookupResult.txId) ? (
                          <>
                            <CheckCheck style={{ width: '13px', height: '13px' }} />
                            <span>Credited to Portfolio</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft style={{ width: '13px', height: '13px' }} />
                            <span>Credit to Portfolio</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Toast feedback when credited */}
                {creditNotice && (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCheck style={{ width: '14px', height: '14px' }} />
                    <span>{creditNotice}</span>
                  </div>
                )}
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
