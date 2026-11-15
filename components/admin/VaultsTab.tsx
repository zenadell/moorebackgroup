'use client';

import React from 'react';
import { Check, CheckCircle2, AlertTriangle, Copy, RefreshCw, Save } from 'lucide-react';
import { ModernButtonSpinner } from '@/components/ui/ModernLoader';
import {
  StatusBanner,
  VaultAddresses,
  saloInput,
  saloPrimaryBtn,
  saloSecondaryBtn,
  saloSubCard,
  saloSurface,
} from './types';

interface VaultsTabProps {
  addresses: VaultAddresses;
  setAddresses: React.Dispatch<React.SetStateAction<VaultAddresses>>;
  isSavingAddresses: boolean;
  addressStatus: StatusBanner | null;
  copiedKey: string | null;
  isCheckingNode: string | null;
  nodeCheckResult: Record<string, any>;
  onSaveAddresses: (e: React.FormEvent) => void;
  onCheckNode: (asset: 'USDT' | 'BTC' | 'ETH', network: string, address: string, key: string) => void;
  onCopy: (text: string, key: string) => void;
}

const VAULT_CONFIGS = [
  { key: 'USDT_TRC20', label: 'Tether USDT (TRC-20 Tron)', asset: 'USDT' as const, network: 'TRC20' },
  { key: 'USDT_ERC20', label: 'Tether USDT (ERC-20 Ethereum)', asset: 'USDT' as const, network: 'ERC20' },
  { key: 'BTC', label: 'Bitcoin (Native SegWit / Legacy)', asset: 'BTC' as const, network: 'Native' },
  { key: 'ETH', label: 'Ethereum (ETH ERC-20)', asset: 'ETH' as const, network: 'ERC20' },
];

export function VaultsTab({
  addresses,
  setAddresses,
  isSavingAddresses,
  addressStatus,
  copiedKey,
  isCheckingNode,
  nodeCheckResult,
  onSaveAddresses,
  onCheckNode,
  onCopy,
}: VaultsTabProps) {
  return (
    <div style={saloSurface}>
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#111827' }}>
          Custody Vault Deposit Addresses
        </h2>
        <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
          Served immediately inside the user deposit modal and persisted across deployments.
        </p>
      </div>

      {addressStatus && (
        <div
          style={{
            padding: '10px 13px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: addressStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: addressStatus.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${addressStatus.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {addressStatus.type === 'success' ? (
            <CheckCircle2 style={{ width: '15px', height: '15px' }} />
          ) : (
            <AlertTriangle style={{ width: '15px', height: '15px' }} />
          )}
          <span>{addressStatus.message}</span>
        </div>
      )}

      <form onSubmit={onSaveAddresses} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="salo-vault-grid">
          {VAULT_CONFIGS.map((item) => (
            <div key={item.key} style={saloSubCard}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827' }}>
                  {item.label}
                </label>

                <button
                  type="button"
                  onClick={() =>
                    onCheckNode(
                      item.asset,
                      item.network,
                      (addresses as unknown as Record<string, string>)[item.key],
                      item.key
                    )
                  }
                  disabled={isCheckingNode === item.key}
                  style={{ ...saloSecondaryBtn, padding: '4px 9px', fontSize: '11px' }}
                >
                  <RefreshCw
                    style={{
                      width: '11px',
                      height: '11px',
                      animation: isCheckingNode === item.key ? 'spin 1s linear infinite' : 'none',
                    }}
                  />
                  <span>Verify Node</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={(addresses as unknown as Record<string, string>)[item.key]}
                  onChange={(e) =>
                    setAddresses({ ...addresses, [item.key]: e.target.value.trim() })
                  }
                  style={{ ...saloInput, fontFamily: 'monospace', fontSize: '12px' }}
                />
                <button
                  type="button"
                  onClick={() =>
                    onCopy(
                      (addresses as unknown as Record<string, string>)[item.key],
                      item.key
                    )
                  }
                  style={{ ...saloSecondaryBtn, padding: '0 10px', flexShrink: 0 }}
                >
                  {copiedKey === item.key ? (
                    <Check style={{ width: '14px', height: '14px', color: '#059669' }} />
                  ) : (
                    <Copy style={{ width: '14px', height: '14px' }} />
                  )}
                </button>
              </div>

              {nodeCheckResult[item.key] && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    backgroundColor: '#ffffff',
                    fontSize: '11.5px',
                    color: nodeCheckResult[item.key].hasDeposit ? '#065f46' : '#4b5563',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {nodeCheckResult[item.key].summary?.statusMessage || 'Checked'} • Total Inbound:{' '}
                  {nodeCheckResult[item.key].summary?.totalReceived ?? 0} {item.asset}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={isSavingAddresses} style={saloPrimaryBtn}>
            {isSavingAddresses ? (
              <ModernButtonSpinner size={14} />
            ) : (
              <Save style={{ width: '14px', height: '14px' }} />
            )}
            <span>{isSavingAddresses ? 'Saving...' : 'Save Vault Addresses'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
