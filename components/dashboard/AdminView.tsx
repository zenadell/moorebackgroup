'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Lock,
  Unlock,
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
  Search,
  Check,
  Copy,
  Eye,
  Sliders,
  LogOut,
  KeyRound,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { AuthSessionInfo } from '@/types';
import { AdminConfigFile, WithdrawalRequestRecord } from '@/lib/admin/service';
import { validateCryptoAddress } from '@/lib/crypto/blockchain';

export function AdminView() {
  const { user, isMaster, fetchSessions, revokeSession, revokeAllOtherSessions, changePassword } = useAuth();

  const [activeAdminTab, setActiveAdminTab] = useState<'vaults' | 'withdrawals' | 'transactions' | 'sessions'>(
    'vaults'
  );

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
  const [withdrawalConfig, setWithdrawalConfig] = useState<AdminConfigFile['withdrawals']>({
    minAmount: 10,
    maxAmount: 5000000,
    allowedRails: {
      fedwire: true,
      crypto: true,
      swift: true,
      debit: false,
    },
    requireTwoFactor: true,
    dailyLimit: 2500000,
    lockdown24hEnabled: true,
    postLockdownDeclineEnabled: true,
  });
  const [isSavingWithdrawals, setIsSavingWithdrawals] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Withdrawal Requests Log
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestRecord[]>([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);

  // Active Device Sessions
  const [sessions, setSessions] = useState<AuthSessionInfo[]>([]);
  const [sessionActionStatus, setSessionActionStatus] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Password reset state
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmMasterPass, setConfirmMasterPass] = useState('');
  const [passStatus, setPassStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Multi-Chain Inbound Transactions Monitor
  const [allDetectedTxs, setAllDetectedTxs] = useState<any[]>([]);
  const [isScanningAll, setIsScanningAll] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Load active vault addresses
  const loadVaultAddresses = useCallback(async () => {
    try {
      const res = await fetch('/api/crypto/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config?.addresses) {
          setAddresses(data.config.addresses);
        }
      }
    } catch {}
  }, []);

  // 2. Load admin configuration
  const loadAdminConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config?.withdrawals) {
          setWithdrawalConfig(data.config.withdrawals);
        }
      }
    } catch {}
  }, []);

  // 3. Load withdrawal requests log
  const loadWithdrawalRequests = useCallback(async () => {
    setIsLoadingWithdrawals(true);
    try {
      const res = await fetch('/api/admin/withdrawals');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.withdrawals) {
          setWithdrawalRequests(data.withdrawals);
        }
      }
    } catch {}
    setIsLoadingWithdrawals(false);
  }, []);

  // 4. Load sessions
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    const res = await fetchSessions();
    if (res.success && res.sessions) {
      setSessions(res.sessions);
    }
    setIsLoadingSessions(false);
  }, [fetchSessions]);

  useEffect(() => {
    loadVaultAddresses();
    loadAdminConfig();
    loadWithdrawalRequests();
    loadSessions();
  }, [loadVaultAddresses, loadAdminConfig, loadWithdrawalRequests, loadSessions]);

  // Handle saving vault addresses
  const handleSaveAddresses = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressStatus(null);
    if (!isMaster) {
      setAddressStatus({ type: 'error', message: 'Restricted to Declan Salo (Master Account).' });
      return;
    }

    // Validate all addresses
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses }),
      });
      const data = await res.json();
      setIsSavingAddresses(false);
      if (data.success) {
        setAddressStatus({
          type: 'success',
          message: 'All deposit vault addresses successfully updated and active for all users and testers!',
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

  // Test live node query for a specific address
  const handleCheckNode = async (asset: 'USDT' | 'BTC' | 'ETH', network: string, address: string, key: string) => {
    setIsCheckingNode(key);
    try {
      const res = await fetch('/api/crypto/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, network, address }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setNodeCheckResult((prev) => ({
          ...prev,
          [key]: data.result,
        }));
      } else {
        setNodeCheckResult((prev) => ({
          ...prev,
          [key]: { error: data.error || 'Failed to query node' },
        }));
      }
    } catch (err: any) {
      setNodeCheckResult((prev) => ({
        ...prev,
        [key]: { error: err.message },
      }));
    } finally {
      setIsCheckingNode(null);
    }
  };

  // Handle saving withdrawal settings
  const handleSaveWithdrawalConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalStatus(null);
    if (!isMaster) {
      setWithdrawalStatus({ type: 'error', message: 'Restricted to Declan Salo (Master Account).' });
      return;
    }

    setIsSavingWithdrawals(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawals: withdrawalConfig }),
      });
      const data = await res.json();
      setIsSavingWithdrawals(false);
      if (data.success) {
        setWithdrawalStatus({
          type: 'success',
          message: `Withdrawal rules updated! 24h lock is currently ${
            withdrawalConfig.lockdown24hEnabled !== false ? 'ENABLED' : 'OFF'
          }.`,
        });
        setTimeout(() => setWithdrawalStatus(null), 4000);
      } else {
        setWithdrawalStatus({ type: 'error', message: data.error || 'Failed to update withdrawal rules.' });
      }
    } catch (e: any) {
      setIsSavingWithdrawals(false);
      setWithdrawalStatus({ type: 'error', message: e.message || 'Network error.' });
    }
  };

  // Handle updating a single withdrawal record status
  const handleUpdateWithdrawalRecord = async (
    id: string,
    status: 'pending' | 'blocked' | 'approved' | 'rejected',
    reason?: string
  ) => {
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, reason }),
      });
      const data = await res.json();
      if (data.success && data.withdrawals) {
        setWithdrawalRequests(data.withdrawals);
      }
    } catch {}
  };

  // Handle single session kick out
  const handleKickOutSession = async (sessionId: string, deviceName: string) => {
    setSessionActionStatus(null);
    const res = await revokeSession(sessionId);
    if (res.success) {
      setSessionActionStatus(`Terminated session for ${deviceName}. They have been kicked out immediately.`);
      loadSessions();
    } else {
      setSessionActionStatus(`Error: ${res.error || 'Failed to kick out session'}`);
    }
    setTimeout(() => setSessionActionStatus(null), 5000);
  };

  // Handle kick out all other sessions
  const handleKickOutAllOthers = async () => {
    setSessionActionStatus(null);
    const res = await revokeAllOtherSessions();
    if (res.success) {
      setSessionActionStatus(
        `Kicked out ${res.count || 0} other device(s). Only your current session remains active.`
      );
      loadSessions();
    } else {
      setSessionActionStatus(`Error: ${res.error || 'Failed to revoke sessions'}`);
    }
    setTimeout(() => setSessionActionStatus(null), 5000);
  };

  // Scan all 4 vaults for on-chain transactions
  const handleScanAllVaults = async () => {
    setIsScanningAll(true);
    const results: any[] = [];
    try {
      const tasks = [
        fetch('/api/crypto/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset: 'USDT', network: 'TRC20', address: addresses.USDT_TRC20 }),
        }),
        fetch('/api/crypto/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset: 'USDT', network: 'ERC20', address: addresses.USDT_ERC20 }),
        }),
        fetch('/api/crypto/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset: 'BTC', network: 'Native', address: addresses.BTC }),
        }),
        fetch('/api/crypto/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset: 'ETH', network: 'MAINNET', address: addresses.ETH }),
        }),
      ];

      const responses = await Promise.all(tasks);
      for (const r of responses) {
        if (r.ok) {
          const json = await r.json();
          if (json.success && json.result?.transactions) {
            results.push(...json.result.transactions);
          }
        }
      }
      setAllDetectedTxs(results);
    } catch {}
    setIsScanningAll(false);
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Admin Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.25)',
            }}
          >
            <ShieldAlert style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Declan Salo • Master Administration
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                }}
              >
                MASTER ACCESS
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>
              Real-time control over crypto deposit addresses, live blockchain verification, withdrawal gateway, and guest sessions
            </p>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#e2e8f0',
            borderRadius: '10px',
            padding: '3px',
            gap: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveAdminTab('vaults')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeAdminTab === 'vaults' ? '#ffffff' : 'transparent',
              color: activeAdminTab === 'vaults' ? '#0f172a' : '#64748b',
              boxShadow: activeAdminTab === 'vaults' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            🪙 Deposit Vaults
          </button>
          <button
            type="button"
            onClick={() => setActiveAdminTab('withdrawals')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeAdminTab === 'withdrawals' ? '#ffffff' : 'transparent',
              color: activeAdminTab === 'withdrawals' ? '#0f172a' : '#64748b',
              boxShadow: activeAdminTab === 'withdrawals' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            💸 Withdrawal Gateway
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveAdminTab('transactions');
              handleScanAllVaults();
            }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeAdminTab === 'transactions' ? '#ffffff' : 'transparent',
              color: activeAdminTab === 'transactions' ? '#0f172a' : '#64748b',
              boxShadow: activeAdminTab === 'transactions' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            ⛓️ Inbound Ledger
          </button>
          <button
            type="button"
            onClick={() => setActiveAdminTab('sessions')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeAdminTab === 'sessions' ? '#ffffff' : 'transparent',
              color: activeAdminTab === 'sessions' ? '#0f172a' : '#64748b',
              boxShadow: activeAdminTab === 'sessions' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            👥 Sessions ({otherSessionsCount} Guest)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEPOSIT VAULT ADDRESSES                                            */}
      {/* ========================================================================= */}
      {activeAdminTab === 'vaults' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Message Banner */}
          {addressStatus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: addressStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: addressStatus.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${addressStatus.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {addressStatus.type === 'success' ? (
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981', flexShrink: 0 }} />
              ) : (
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#ef4444', flexShrink: 0 }} />
              )}
              <span>{addressStatus.message}</span>
            </div>
          )}

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <ShieldCheck style={{ width: '20px', height: '20px', color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '13px', color: '#1e40af' }}>
                Master Wallet & Receiving Address Manager
              </strong>
              <p style={{ fontSize: '12px', color: '#1e3a8a', margin: '4px 0 0', lineHeight: 1.5 }}>
                Enter the real crypto wallet addresses where you want funds received. Any address saved here immediately updates across the entire dashboard and deposit modal. When anyone checks or verifies deposits, the system queries the live blockchain explorer directly for these addresses.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSaveAddresses}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '22px',
            }}
          >
            {/* 1. Tether USD TRC-20 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    Tether USD (USDT)
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px' }}>
                    Tron (TRC-20 Network)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckNode('USDT', 'TRC20', addresses.USDT_TRC20, 'USDT_TRC20')}
                  disabled={isCheckingNode === 'USDT_TRC20'}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #bfdbfe',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isCheckingNode === 'USDT_TRC20' ? (
                    <RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <RefreshCw style={{ width: '12px', height: '12px' }} />
                  )}
                  <span>Query Live Tron Node</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={addresses.USDT_TRC20}
                  onChange={(e) => setAddresses((prev) => ({ ...prev, USDT_TRC20: e.target.value }))}
                  placeholder="Paste your Tron TRC-20 address (Starts with T)"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'ui-monospace, monospace',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(addresses.USDT_TRC20);
                    setCopiedKey('USDT_TRC20');
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: copiedKey === 'USDT_TRC20' ? '#ecfdf5' : '#ffffff',
                    color: copiedKey === 'USDT_TRC20' ? '#059669' : '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedKey === 'USDT_TRC20' ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                  <span>{copiedKey === 'USDT_TRC20' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {nodeCheckResult['USDT_TRC20'] && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#334155' }}>
                    Live Node: <strong>{nodeCheckResult['USDT_TRC20'].source || 'TronGrid'}</strong> •{' '}
                    Balance: <strong>{nodeCheckResult['USDT_TRC20'].balance || 0} USDT</strong> •{' '}
                    Detected Transfers:{' '}
                    <strong>{nodeCheckResult['USDT_TRC20'].transactions?.length || 0}</strong>
                  </span>
                  <a
                    href={`https://tronscan.org/#/address/${addresses.USDT_TRC20}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    <span>TronScan Explorer</span>
                    <ExternalLink style={{ width: '12px', height: '12px' }} />
                  </a>
                </div>
              )}
            </div>

            {/* 2. Tether USD ERC-20 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    Tether USD (USDT)
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '4px' }}>
                    Ethereum (ERC-20 Network)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckNode('USDT', 'ERC20', addresses.USDT_ERC20, 'USDT_ERC20')}
                  disabled={isCheckingNode === 'USDT_ERC20'}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #bfdbfe',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isCheckingNode === 'USDT_ERC20' ? (
                    <RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <RefreshCw style={{ width: '12px', height: '12px' }} />
                  )}
                  <span>Query Ethereum Node</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={addresses.USDT_ERC20}
                  onChange={(e) => setAddresses((prev) => ({ ...prev, USDT_ERC20: e.target.value }))}
                  placeholder="Paste Ethereum ERC-20 address (Starts with 0x)"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'ui-monospace, monospace',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(addresses.USDT_ERC20);
                    setCopiedKey('USDT_ERC20');
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: copiedKey === 'USDT_ERC20' ? '#ecfdf5' : '#ffffff',
                    color: copiedKey === 'USDT_ERC20' ? '#059669' : '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedKey === 'USDT_ERC20' ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                  <span>{copiedKey === 'USDT_ERC20' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {nodeCheckResult['USDT_ERC20'] && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#334155' }}>
                    Live Node: <strong>Ethereum Mainnet RPC</strong> • On-Chain Balance:{' '}
                    <strong>{nodeCheckResult['USDT_ERC20'].balance || 0} USDT</strong>
                  </span>
                  <a
                    href={`https://etherscan.io/address/${addresses.USDT_ERC20}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    <span>Etherscan</span>
                    <ExternalLink style={{ width: '12px', height: '12px' }} />
                  </a>
                </div>
              )}
            </div>

            {/* 3. Bitcoin Native SegWit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    Bitcoin (BTC)
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#fffbeb', color: '#b45309', padding: '2px 8px', borderRadius: '4px' }}>
                    Native SegWit (bc1)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckNode('BTC', 'Native', addresses.BTC, 'BTC')}
                  disabled={isCheckingNode === 'BTC'}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #bfdbfe',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isCheckingNode === 'BTC' ? (
                    <RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <RefreshCw style={{ width: '12px', height: '12px' }} />
                  )}
                  <span>Query Mempool.space</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={addresses.BTC}
                  onChange={(e) => setAddresses((prev) => ({ ...prev, BTC: e.target.value }))}
                  placeholder="Paste Bitcoin SegWit address (bc1q...)"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'ui-monospace, monospace',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(addresses.BTC);
                    setCopiedKey('BTC');
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: copiedKey === 'BTC' ? '#ecfdf5' : '#ffffff',
                    color: copiedKey === 'BTC' ? '#059669' : '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedKey === 'BTC' ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                  <span>{copiedKey === 'BTC' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {nodeCheckResult['BTC'] && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#334155' }}>
                    Live Mempool: <strong>mempool.space</strong> • Confirmed Balance:{' '}
                    <strong>{nodeCheckResult['BTC'].balance || 0} BTC</strong> •{' '}
                    Mempool Unconfirmed: <strong>{nodeCheckResult['BTC'].summary?.unconfirmedCount || 0}</strong>
                  </span>
                  <a
                    href={`https://mempool.space/address/${addresses.BTC}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    <span>Mempool Explorer</span>
                    <ExternalLink style={{ width: '12px', height: '12px' }} />
                  </a>
                </div>
              )}
            </div>

            {/* 4. Ethereum Mainnet */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    Ethereum (ETH)
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#eef2ff', color: '#6366f1', padding: '2px 8px', borderRadius: '4px' }}>
                    Mainnet Native
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckNode('ETH', 'MAINNET', addresses.ETH, 'ETH')}
                  disabled={isCheckingNode === 'ETH'}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #bfdbfe',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isCheckingNode === 'ETH' ? (
                    <RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <RefreshCw style={{ width: '12px', height: '12px' }} />
                  )}
                  <span>Query Ethereum Node</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={addresses.ETH}
                  onChange={(e) => setAddresses((prev) => ({ ...prev, ETH: e.target.value }))}
                  placeholder="Paste Ethereum Mainnet address (0x...)"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'ui-monospace, monospace',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(addresses.ETH);
                    setCopiedKey('ETH');
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: copiedKey === 'ETH' ? '#ecfdf5' : '#ffffff',
                    color: copiedKey === 'ETH' ? '#059669' : '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedKey === 'ETH' ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                  <span>{copiedKey === 'ETH' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {nodeCheckResult['ETH'] && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#334155' }}>
                    Live Node: <strong>Publicnode JSON-RPC</strong> • On-Chain Balance:{' '}
                    <strong>{nodeCheckResult['ETH'].balance || 0} ETH</strong>
                  </span>
                  <a
                    href={`https://etherscan.io/address/${addresses.ETH}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    <span>Etherscan</span>
                    <ExternalLink style={{ width: '12px', height: '12px' }} />
                  </a>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div style={{ paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isSavingAddresses}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '11px 24px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                }}
              >
                {isSavingAddresses ? (
                  <>
                    <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
                    <span>Persisting Addresses...</span>
                  </>
                ) : (
                  <>
                    <Save style={{ width: '15px', height: '15px' }} />
                    <span>Save & Deploy Vault Addresses</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WITHDRAWAL GATEWAY CONFIGURATION & AUDIT LOG                       */}
      {/* ========================================================================= */}
      {activeAdminTab === 'withdrawals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {withdrawalStatus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: withdrawalStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: withdrawalStatus.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${withdrawalStatus.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {withdrawalStatus.type === 'success' ? (
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981', flexShrink: 0 }} />
              ) : (
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#ef4444', flexShrink: 0 }} />
              )}
              <span>{withdrawalStatus.message}</span>
            </div>
          )}

          {/* Master Withdrawal Switch & Settings Form */}
          <form
            onSubmit={handleSaveWithdrawalConfig}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  24-Hour Lock &amp; Decline Rules
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
                  Configure the 24-hour lockdown toggle, limits, and allowed rails
                </p>
              </div>

              {/* 24h Lockdown Toggle */}
              <button
                type="button"
                onClick={() =>
                  setWithdrawalConfig((prev) => ({
                    ...prev,
                    lockdown24hEnabled: !(prev.lockdown24hEnabled !== false),
                  }))
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  border:
                    withdrawalConfig.lockdown24hEnabled !== false
                      ? '1px solid #d97706'
                      : '1px solid #10b981',
                  backgroundColor:
                    withdrawalConfig.lockdown24hEnabled !== false ? '#fffbeb' : '#ecfdf5',
                  color:
                    withdrawalConfig.lockdown24hEnabled !== false ? '#92400e' : '#047857',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {withdrawalConfig.lockdown24hEnabled !== false ? (
                  <>
                    <Lock style={{ width: '16px', height: '16px' }} />
                    <span>24h Lock ACTIVE</span>
                  </>
                ) : (
                  <>
                    <Unlock style={{ width: '16px', height: '16px' }} />
                    <span>24h Lock OFF</span>
                  </>
                )}
              </button>
            </div>

            {/* Limits & Rails */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Minimum Withdrawal Amount (USD)
                </label>
                <input
                  type="number"
                  value={withdrawalConfig.minAmount}
                  onChange={(e) =>
                    setWithdrawalConfig((prev) => ({ ...prev, minAmount: parseFloat(e.target.value) || 0 }))
                  }
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Maximum Single Transaction (USD)
                </label>
                <input
                  type="number"
                  value={withdrawalConfig.maxAmount}
                  onChange={(e) =>
                    setWithdrawalConfig((prev) => ({ ...prev, maxAmount: parseFloat(e.target.value) || 0 }))
                  }
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Allowed Rails Checkboxes */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Allowed Withdrawal Rails
              </label>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {(['fedwire', 'crypto', 'swift', 'debit'] as const).map((rail) => (
                  <label key={rail} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={withdrawalConfig.allowedRails[rail]}
                      onChange={(e) =>
                        setWithdrawalConfig((prev) => ({
                          ...prev,
                          allowedRails: {
                            ...prev.allowedRails,
                            [rail]: e.target.checked,
                          },
                        }))
                      }
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ textTransform: 'capitalize' }}>
                      {rail === 'fedwire' ? 'Fedwire (Same-Day)' : rail === 'crypto' ? 'Crypto Multi-Sig' : rail === 'swift' ? 'SWIFT Global' : 'Debit Card'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
              <button
                type="submit"
                disabled={isSavingWithdrawals}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isSavingWithdrawals ? (
                  <RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Save style={{ width: '14px', height: '14px' }} />
                )}
                <span>Update Withdrawal Gateway Rules</span>
              </button>
            </div>
          </form>

          {/* Real Inbound Withdrawal Attempts Audit Log */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Withdrawal Attempts Log ({withdrawalRequests.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                  Real-time record of all withdrawal submissions from testers and devices
                </p>
              </div>

              <button
                type="button"
                onClick={loadWithdrawalRequests}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw style={{ width: '12px', height: '12px' }} />
                <span>Refresh Log</span>
              </button>
            </div>

            {withdrawalRequests.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No withdrawal attempts logged yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 8px' }}>Timestamp</th>
                      <th style={{ padding: '10px 8px' }}>Beneficiary</th>
                      <th style={{ padding: '10px 8px' }}>Amount</th>
                      <th style={{ padding: '10px 8px' }}>Rail / Destination</th>
                      <th style={{ padding: '10px 8px' }}>Device / IP</th>
                      <th style={{ padding: '10px 8px' }}>Status</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Admin Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalRequests.map((req) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid #f1f4f9' }}>
                        <td style={{ padding: '12px 8px', color: '#334155' }}>
                          {new Date(req.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 600, color: '#0f172a' }}>
                          {req.beneficiary}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: '#0f172a' }}>
                          ${req.amount.toLocaleString()} USD
                        </td>
                        <td style={{ padding: '12px 8px', color: '#475569' }}>
                          <span style={{ textTransform: 'uppercase', fontWeight: 600, color: '#2563eb' }}>
                            {req.rail}
                          </span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                            {req.destination}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#64748b', fontSize: '11px' }}>
                          {req.deviceName || 'Web Session'}
                          <span style={{ display: 'block', color: '#94a3b8' }}>{req.ipAddress}</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor:
                                req.status === 'blocked'
                                  ? '#fef2f2'
                                  : req.status === 'approved'
                                  ? '#ecfdf5'
                                  : req.status === 'rejected'
                                  ? '#fff1f2'
                                  : '#eff6ff',
                              color:
                                req.status === 'blocked'
                                  ? '#b91c1c'
                                  : req.status === 'approved'
                                  ? '#047857'
                                  : req.status === 'rejected'
                                  ? '#be123c'
                                  : '#1d4ed8',
                            }}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            {req.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateWithdrawalRecord(req.id, 'approved', 'Cleared by Declan')}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Approve
                              </button>
                            )}
                            {req.status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateWithdrawalRecord(req.id, 'rejected', 'Declined by Declan')}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INBOUND TRANSACTIONS MULTI-CHAIN LEDGER                            */}
      {/* ========================================================================= */}
      {activeAdminTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Real On-Chain Multi-Vault Deposit Monitor
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
                  Live scanning Mempool.space (BTC), TronGrid (USDT TRC-20), and Ethereum Mainnet nodes
                </p>
              </div>

              <button
                type="button"
                onClick={handleScanAllVaults}
                disabled={isScanningAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw
                  style={{
                    width: '13px',
                    height: '13px',
                    animation: isScanningAll ? 'spin 1s linear infinite' : 'none',
                  }}
                />
                <span>{isScanningAll ? 'Scanning Blockchain...' : 'Scan All 4 Vaults'}</span>
              </button>
            </div>

            {allDetectedTxs.length === 0 ? (
              <div
                style={{
                  padding: '30px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: '13px',
                }}
              >
                {isScanningAll
                  ? 'Querying public blockchain nodes for all vaults...'
                  : 'Click "Scan All 4 Vaults" to check for live incoming deposits across all configured addresses.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 8px' }}>Asset</th>
                      <th style={{ padding: '10px 8px' }}>Amount</th>
                      <th style={{ padding: '10px 8px' }}>Confirmations</th>
                      <th style={{ padding: '10px 8px' }}>Sender</th>
                      <th style={{ padding: '10px 8px' }}>TxID / Hash</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Explorer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDetectedTxs.map((tx, idx) => (
                      <tr key={tx.txId || idx} style={{ borderBottom: '1px solid #f1f4f9' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: '#0f172a' }}>
                          {tx.symbol}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: '#059669' }}>
                          +{tx.amount} {tx.symbol}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: tx.status === 'confirmed' ? '#ecfdf5' : '#fffbeb',
                              color: tx.status === 'confirmed' ? '#059669' : '#d97706',
                            }}
                          >
                            {tx.status === 'confirmed' ? `${tx.confirmations} Confirmed` : 'In Mempool'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#64748b', fontFamily: 'monospace' }}>
                          {tx.from ? `${tx.from.slice(0, 8)}...${tx.from.slice(-6)}` : 'External'}
                        </td>
                        <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: '#0f172a' }}>
                          {tx.txId.slice(0, 10)}...{tx.txId.slice(-8)}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#2563eb',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              textDecoration: 'none',
                              fontWeight: 600,
                            }}
                          >
                            <span>View</span>
                            <ExternalLink style={{ width: '12px', height: '12px' }} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SESSIONS & REMOTE KICK-OUT                                         */}
      {/* ========================================================================= */}
      {activeAdminTab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {sessionActionStatus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981', flexShrink: 0 }} />
              <span>{sessionActionStatus}</span>
            </div>
          )}

          {/* Active Devices Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Active Device Sessions ({sessions.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
                  Manage everyone who is currently logged into Declan Salo&apos;s portfolio. Kick out any guest session instantly.
                </p>
              </div>

              {otherSessionsCount > 0 && (
                <button
                  type="button"
                  onClick={handleKickOutAllOthers}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                  }}
                >
                  <LogOut style={{ width: '14px', height: '14px' }} />
                  <span>Kick Out All Other Sessions ({otherSessionsCount})</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: sess.isCurrent ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${sess.isCurrent ? '#bbf7d0' : '#e2e8f0'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: sess.isCurrent ? '#dcfce7' : '#e2e8f0',
                        color: sess.isCurrent ? '#15803d' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {sess.deviceName.toLowerCase().includes('iphone') ||
                      sess.deviceName.toLowerCase().includes('android') ? (
                        <Smartphone style={{ width: '18px', height: '18px' }} />
                      ) : (
                        <Laptop style={{ width: '18px', height: '18px' }} />
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{sess.deviceName}</strong>
                        {sess.isCurrent && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: '#10b981',
                              color: '#ffffff',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            THIS DEVICE (MASTER)
                          </span>
                        )}
                        {!sess.isCurrent && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            GUEST / TESTER SESSION
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        <span>IP: {sess.ipAddress}</span> • <span>{sess.location}</span> •{' '}
                        <span>Last active: {new Date(sess.lastActiveAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleKickOutSession(sess.id, sess.deviceName)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Trash2 style={{ width: '13px', height: '13px' }} />
                      <span>Kick Out Device</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
