'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { ModernButtonSpinner } from '@/components/ui/ModernLoader';
import {
  AdminPortfolioSummary,
  StatusBanner,
  saloInput,
  saloPrimaryBtn,
  saloSecondaryBtn,
  saloSubCard,
  saloSurface,
} from './types';

interface PortfolioTabProps {
  portfolioSummary: AdminPortfolioSummary | null;
  isLoadingPortfolio: boolean;
  isResettingPortfolio: boolean;
  adjustingTicker: string | null;
  portfolioStatusMsg: StatusBanner | null;
  onRefreshPortfolio: () => void;
  onAdjustShares: (ticker: string, mode: 'add' | 'set' | 'reset', shares?: number) => Promise<void>;
  onResetPortfolio: (includeCharges: boolean) => Promise<void>;
}

function formatUsd(val: number): string {
  return `$${Number(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PortfolioTab({
  portfolioSummary,
  isLoadingPortfolio,
  isResettingPortfolio,
  adjustingTicker,
  portfolioStatusMsg,
  onRefreshPortfolio,
  onAdjustShares,
  onResetPortfolio,
}: PortfolioTabProps) {
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [shareInputs, setShareInputs] = useState<Record<string, string>>({});
  const [inputModes, setInputModes] = useState<Record<string, 'add' | 'set'>>({});
  const [includeChargesReset, setIncludeChargesReset] = useState(true);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/stocks/quotes', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data?.quotes) return;
        const map: Record<string, number> = {};
        Object.entries<any>(data.quotes).forEach(([ticker, q]) => {
          if (typeof q?.price === 'number' && q.price > 0) {
            map[ticker.toUpperCase()] = q.price;
          }
        });
        setLivePrices(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const holdings = portfolioSummary?.holdings || [];
  const totalLiveEquityValue = holdings.reduce((sum, h) => {
    const price = livePrices[h.ticker.toUpperCase()] || h.referencePrice;
    return sum + h.currentShares * price;
  }, 0);
  const totalPortfolioFunds =
    totalLiveEquityValue + (portfolioSummary?.liquidatedBalance || 0);

  const totalHistoryRecords = portfolioSummary
    ? portfolioSummary.counts.ledgerEntries +
      portfolioSummary.counts.withdrawals +
      portfolioSummary.counts.liquidations +
      portfolioSummary.counts.buybacks +
      portfolioSummary.counts.shareAdjustments +
      portfolioSummary.counts.chargePayments
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {portfolioStatusMsg && (
        <div
          style={{
            padding: '11px 14px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor:
              portfolioStatusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${portfolioStatusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: portfolioStatusMsg.type === 'success' ? '#065f46' : '#991b1b',
          }}
        >
          {portfolioStatusMsg.type === 'success' ? (
            <CheckCircle2 style={{ width: '15px', height: '15px', flexShrink: 0 }} />
          ) : (
            <AlertTriangle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
          )}
          <span>{portfolioStatusMsg.message}</span>
        </div>
      )}

      {/* Top KPI Row */}
      <div className="salo-kpi-grid">
        <div style={{ ...saloSurface, padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
            Total Portfolio Value
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
            {formatUsd(totalPortfolioFunds)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '4px' }}>
            Equities {formatUsd(totalLiveEquityValue)} + Cash{' '}
            {formatUsd(portfolioSummary?.liquidatedBalance || 0)}
          </div>
        </div>

        <div style={{ ...saloSurface, padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
            Total Shares Held
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
            {(portfolioSummary?.totalCurrentShares || 0).toLocaleString('en-US', {
              maximumFractionDigits: 4,
            })}
          </div>
          <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '4px' }}>
            Baseline:{' '}
            {(portfolioSummary?.totalBaseShares || 0).toLocaleString('en-US')}{' '}
            • Net Delta:{' '}
            <strong
              style={{
                color:
                  (portfolioSummary?.totalAddedSharesDelta || 0) > 0
                    ? '#059669'
                    : (portfolioSummary?.totalAddedSharesDelta || 0) < 0
                      ? '#d97706'
                      : '#4b5563',
              }}
            >
              {(portfolioSummary?.totalAddedSharesDelta || 0) > 0 ? '+' : ''}
              {(portfolioSummary?.totalAddedSharesDelta || 0).toLocaleString('en-US', {
                maximumFractionDigits: 4,
              })}
            </strong>
          </div>
        </div>

        <div style={{ ...saloSurface, padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
            Liquid Cash Reserves
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
            {formatUsd(portfolioSummary?.liquidatedBalance || 0)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '4px' }}>
            Liquidated {formatUsd(portfolioSummary?.totalLiquidated || 0)} • Buybacks{' '}
            {formatUsd(portfolioSummary?.totalBuybackSpent || 0)}
          </div>
        </div>

        <div style={{ ...saloSurface, padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
            Mutable Test / Activity Rows
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
            {totalHistoryRecords}
          </div>
          <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '4px' }}>
            {portfolioSummary?.counts.ledgerEntries || 0} ledger •{' '}
            {portfolioSummary?.counts.withdrawals || 0} withdrawals •{' '}
            {portfolioSummary?.counts.liquidations || 0} liquidations
          </div>
        </div>
      </div>

      {/* Reset Everything Back to Original Card */}
      <div
        style={{
          ...saloSurface,
          padding: '20px',
          borderColor: '#fecaca',
          backgroundColor: '#fffafa',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 360px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <RotateCcw style={{ width: '16px', height: '16px', color: '#dc2626' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                Reset Everything Back to Original Baseline
              </h2>
            </div>
            <p style={{ fontSize: '12.5px', color: '#7f1d1d', margin: '0 0 12px', lineHeight: 1.55 }}>
              Clears all transaction ledger entries, withdrawal requests, share liquidations, buybacks, and share adjustments—instantly restoring every stock to its original share count and setting Liquid Reserves to $0.00. Administrative credentials, alert emails, vault addresses, and wallet configs remain untouched.
            </p>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#7f1d1d',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={includeChargesReset}
                onChange={(e) => setIncludeChargesReset(e.target.checked)}
              />
              Also reset Tax &amp; Charge settlement payment history back to unpaid baseline
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {!confirmResetOpen ? (
              <button
                type="button"
                disabled={isResettingPortfolio}
                onClick={() => setConfirmResetOpen(true)}
                style={{
                  ...saloPrimaryBtn,
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                }}
              >
                <RotateCcw style={{ width: '14px', height: '14px' }} />
                <span>Reset Everything to Original</span>
              </button>
            ) : (
              <div
                style={{
                  ...saloSubCard,
                  borderColor: '#fca5a5',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>
                  Confirm full reset?
                </span>
                <button
                  type="button"
                  disabled={isResettingPortfolio}
                  onClick={async () => {
                    await onResetPortfolio(includeChargesReset);
                    setConfirmResetOpen(false);
                  }}
                  style={{
                    ...saloPrimaryBtn,
                    backgroundColor: '#b91c1c',
                    borderColor: '#b91c1c',
                  }}
                >
                  {isResettingPortfolio ? (
                    <ModernButtonSpinner size={14} />
                  ) : (
                    <RotateCcw style={{ width: '13px', height: '13px' }} />
                  )}
                  <span>{isResettingPortfolio ? 'Resetting...' : 'Yes, Reset Now'}</span>
                </button>
                <button
                  type="button"
                  disabled={isResettingPortfolio}
                  onClick={() => setConfirmResetOpen(false)}
                  style={saloSecondaryBtn}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Allocation & Fund Top-Up Table */}
      <div style={{ ...saloSurface, padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <TrendingUp style={{ width: '16px', height: '16px', color: '#2563eb' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Increase Funds by Adding Shares
              </h2>
            </div>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
              Add extra shares (or set exact share balances) on any portfolio holding. Updates reflect live across the client dashboard and liquidation balance without creating fake ledger deposits.
            </p>
          </div>
          <button
            type="button"
            disabled={isLoadingPortfolio}
            onClick={onRefreshPortfolio}
            style={saloSecondaryBtn}
          >
            <RefreshCw style={{ width: '13px', height: '13px' }} />
            <span>{isLoadingPortfolio ? 'Syncing...' : 'Refresh Shares'}</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12.5px',
              minWidth: '820px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Security</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Live Price</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Original Shares</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Current Shares</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Delta</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Position Value</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Add / Set Shares</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const livePrice = livePrices[h.ticker.toUpperCase()] || h.referencePrice;
                const posValue = h.currentShares * livePrice;
                const mode = inputModes[h.ticker] || 'add';
                const valStr = shareInputs[h.ticker] ?? '';
                const parsedVal = Number(valStr);
                const isBusy = adjustingTicker === h.ticker;

                return (
                  <tr
                    key={h.ticker}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{h.ticker}</div>
                      <div style={{ fontSize: '11.5px', color: '#6b7280' }}>{h.name}</div>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>
                      {formatUsd(livePrice)}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6b7280' }}>
                      {h.baseShares.toLocaleString('en-US')}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#111827' }}>
                      {h.currentShares.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor:
                            h.sharesDelta > 0
                              ? '#ecfdf5'
                              : h.sharesDelta < 0
                                ? '#fffbeb'
                                : '#f3f4f6',
                          color:
                            h.sharesDelta > 0
                              ? '#065f46'
                              : h.sharesDelta < 0
                                ? '#92400e'
                                : '#6b7280',
                        }}
                      >
                        {h.sharesDelta === 0
                          ? 'Original'
                          : `${h.sharesDelta > 0 ? '+' : ''}${h.sharesDelta.toLocaleString('en-US', {
                              maximumFractionDigits: 4,
                            })}`}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#111827' }}>
                      {formatUsd(posValue)}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                        <select
                          value={mode}
                          onChange={(e) =>
                            setInputModes((prev) => ({
                              ...prev,
                              [h.ticker]: e.target.value as 'add' | 'set',
                            }))
                          }
                          style={{
                            ...saloInput,
                            width: '72px',
                            padding: '6px 8px',
                            fontSize: '11.5px',
                          }}
                        >
                          <option value="add">+ Add</option>
                          <option value="set">= Set</option>
                        </select>
                        <input
                          type="number"
                          step="any"
                          min={mode === 'add' ? '0.0001' : '0'}
                          value={valStr}
                          onChange={(e) =>
                            setShareInputs((prev) => ({
                              ...prev,
                              [h.ticker]: e.target.value,
                            }))
                          }
                          placeholder={mode === 'add' ? 'Shares to add' : 'New share total'}
                          style={{
                            ...saloInput,
                            width: '122px',
                            padding: '6px 9px',
                            fontSize: '12px',
                          }}
                        />
                        <button
                          type="button"
                          disabled={
                            isBusy ||
                            !valStr.trim() ||
                            !Number.isFinite(parsedVal) ||
                            (mode === 'add' ? parsedVal <= 0 : parsedVal < 0)
                          }
                          onClick={async () => {
                            await onAdjustShares(h.ticker, mode, parsedVal);
                            setShareInputs((prev) => ({ ...prev, [h.ticker]: '' }));
                          }}
                          style={{
                            ...saloPrimaryBtn,
                            padding: '6px 10px',
                            fontSize: '11.5px',
                            opacity:
                              isBusy ||
                              !valStr.trim() ||
                              !Number.isFinite(parsedVal) ||
                              (mode === 'add' ? parsedVal <= 0 : parsedVal < 0)
                                ? 0.55
                                : 1,
                          }}
                        >
                          {isBusy ? (
                            <ModernButtonSpinner size={12} />
                          ) : (
                            <Plus style={{ width: '12px', height: '12px' }} />
                          )}
                          <span>{mode === 'add' ? 'Add' : 'Apply'}</span>
                        </button>
                        {h.sharesDelta !== 0 && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onAdjustShares(h.ticker, 'reset')}
                            title={`Restore ${h.ticker} to ${h.baseShares.toLocaleString('en-US')} shares`}
                            style={{
                              ...saloSecondaryBtn,
                              padding: '6px 8px',
                              fontSize: '11px',
                            }}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
