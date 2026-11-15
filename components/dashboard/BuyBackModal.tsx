'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  X,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Check,
  Building2,
} from 'lucide-react';
import { StockHolding } from '@/types';
import { ModernButtonSpinner } from '@/components/ui/ModernLoader';

interface BuyBackModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: StockHolding[];
  liquidatedBalance: number;
  portfolioTotal: number;
  initialTicker?: string | null;
  onBuyBackSuccess?: () => void;
}

interface CompletedBuyBack {
  id: string;
  ticker: string;
  companyName: string;
  sharesPurchased: number;
  sharePrice: number;
  amountSpent: number;
  timestamp: number;
  newTotalRevenue: number;
}

export function BuyBackModal({
  isOpen,
  onClose,
  holdings,
  liquidatedBalance,
  portfolioTotal,
  initialTicker,
  onBuyBackSuccess,
}: BuyBackModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const amountInputId = useId();
  const amountErrorId = useId();
  const stockSelectId = useId();

  const [stage, setStage] = useState<'configure' | 'processing' | 'success'>('configure');
  const [selectedTicker, setSelectedTicker] = useState<string>('LMT');
  const [amountInput, setAmountInput] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');
  const [serverError, setServerError] = useState<string>('');
  const [touchedAmount, setTouchedAmount] = useState<boolean>(false);
  const [completedBuyBack, setCompletedBuyBack] = useState<CompletedBuyBack | null>(null);

  const selectedHolding =
    holdings.find((h) => h.ticker === selectedTicker) || holdings[0] || null;

  // Synchronize native <dialog> top-layer modal open/close state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      const preferred =
        (initialTicker && holdings.find((h) => h.ticker === initialTicker)?.ticker) ||
        holdings.find((h) => h.ticker === 'LMT')?.ticker ||
        holdings[0]?.ticker ||
        'LMT';

      setStage('configure');
      setSelectedTicker(preferred);
      setAmountInput(liquidatedBalance > 0 ? liquidatedBalance.toFixed(2) : '');
      setAmountError('');
      setServerError('');
      setTouchedAmount(false);
      setCompletedBuyBack(null);

      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, initialTicker]);

  // Safari / WebKit light-dismiss fallback when closedby="any" is unsupported
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    let pointerDownOnBackdrop = false;
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownOnBackdrop = e.target === dialog;
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pointerDownOnBackdrop && e.target === dialog && stage !== 'processing') {
        dialog.close('backdrop');
      }
      pointerDownOnBackdrop = false;
    };

    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
    };
  }, [stage]);

  const validateAmount = (rawValue: string): string => {
    const cleaned = rawValue.replace(/,/g, '').trim();
    if (!cleaned) {
      return 'Enter a USD amount to allocate toward share buyback.';
    }
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 'Enter a valid amount greater than $0.00.';
    }
    if (parsed > liquidatedBalance + 0.005) {
      return `Amount exceeds your $${liquidatedBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} available liquid cash.`;
    }
    if (selectedHolding && parsed / selectedHolding.price < 0.0001) {
      return 'Amount is too small for at least 0.0001 shares at current price.';
    }
    return '';
  };

  const parsedSpendRaw = Number(amountInput.replace(/,/g, '').trim());
  const validSpend =
    Number.isFinite(parsedSpendRaw) && parsedSpendRaw > 0
      ? Math.min(Number(parsedSpendRaw.toFixed(2)), liquidatedBalance)
      : 0;

  const estimatedShares =
    selectedHolding && selectedHolding.price > 0 && validSpend > 0
      ? Number((validSpend / selectedHolding.price).toFixed(4))
      : 0;

  const projectedNewPosition = selectedHolding
    ? Number((selectedHolding.shares + estimatedShares).toFixed(4))
    : 0;
  const projectedTotalRevenue = Number((portfolioTotal + validSpend).toFixed(2));
  const projectedRemainingCash = Number(Math.max(0, liquidatedBalance - validSpend).toFixed(2));

  const handleAmountChange = (value: string) => {
    setAmountInput(value);
    setServerError('');
    if (touchedAmount || amountError) {
      const nextErr = validateAmount(value);
      if (!nextErr) {
        setAmountError('');
      }
    }
  };

  const handleAmountBlur = () => {
    if (!amountInput.trim() && !touchedAmount) return;
    setTouchedAmount(true);
    setAmountError(validateAmount(amountInput));
  };

  const handleQuickFill = (fraction: number) => {
    if (liquidatedBalance <= 0) return;
    const raw =
      fraction >= 1
        ? liquidatedBalance
        : Number((liquidatedBalance * fraction).toFixed(2));
    const formatted = raw.toFixed(2);
    setAmountInput(formatted);
    setTouchedAmount(true);
    setServerError('');
    setAmountError(validateAmount(formatted));
  };

  const handleDialogCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    if (stage === 'processing') {
      e.preventDefault();
    }
  };

  const handleDialogClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHolding || stage === 'processing') return;

    setTouchedAmount(true);
    const err = validateAmount(amountInput);
    if (err) {
      setAmountError(err);
      amountInputRef.current?.focus();
      return;
    }

    const spendAmount = Math.min(Number(parsedSpendRaw.toFixed(2)), liquidatedBalance);
    setStage('processing');
    setServerError('');

    try {
      const res = await fetch('/api/holdings/buyback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedHolding.ticker,
          companyName: selectedHolding.name,
          amountSpent: spendAmount,
          sharePrice: selectedHolding.price,
          currency: 'USDT',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.record) {
        setStage('configure');
        setServerError(data.error || 'Share buyback could not be completed.');
        return;
      }

      setCompletedBuyBack({
        id: data.record.id,
        ticker: data.record.ticker,
        companyName: data.record.companyName,
        sharesPurchased: data.record.sharesPurchased,
        sharePrice: data.record.sharePrice,
        amountSpent: data.record.amountSpent,
        timestamp: data.record.timestamp,
        newTotalRevenue: Number((portfolioTotal + data.record.amountSpent).toFixed(2)),
      });
      setStage('success');

      try {
        const bc = new BroadcastChannel('moback_realtime_sync');
        bc.postMessage({ type: 'BUYBACK_SUCCESS' });
        bc.close();
      } catch {}

      if (onBuyBackSuccess) {
        onBuyBackSuccess();
      }
    } catch {
      setStage('configure');
      setServerError('Network error while executing share buyback.');
    }
  };

  const formattedSpendButton =
    validSpend > 0
      ? `$${validSpend.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : '$0.00';

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      onCancel={handleDialogCancel}
      onClose={handleDialogClose}
      className="buyback-dialog"
    >
      <div
        style={{
          width: '100%',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.24)',
          padding: stage === 'success' ? '24px' : '22px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        {stage === 'configure' && (
          <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                    flexShrink: 0,
                  }}
                >
                  <TrendingUp style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <h2
                    id={titleId}
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                      lineHeight: 1.25,
                    }}
                  >
                    Buy Back Shares
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                    Convert liquidated reserves back into equity positions
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close modal"
                onClick={() => dialogRef.current?.close('button')}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X style={{ width: '15px', height: '15px' }} />
              </button>
            </div>

            {/* Available Liquid Reserves Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                borderRadius: '12px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#065f46' }}>
                Available Liquidated Cash
              </span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                ${liquidatedBalance.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                USDT
              </span>
            </div>

            {serverError && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <AlertCircle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                <span>{serverError}</span>
              </div>
            )}

            {/* Target Security Selector */}
            <div>
              <label
                htmlFor={stockSelectId}
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Select Company Holding
              </label>
              <select
                id={stockSelectId}
                value={selectedTicker}
                onChange={(e) => {
                  setSelectedTicker(e.target.value);
                  setServerError('');
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                {holdings.map((h) => (
                  <option key={h.ticker} value={h.ticker}>
                    {h.ticker} — {h.name} (${h.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/sh)
                  </option>
                ))}
              </select>
              {selectedHolding && (
                <div
                  style={{
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11.5px',
                    color: '#64748b',
                  }}
                >
                  <span>
                    Current Position:{' '}
                    <strong style={{ color: '#0f172a' }}>
                      {selectedHolding.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })} shares
                    </strong>
                  </span>
                  <span>
                    Market Price:{' '}
                    <strong style={{ color: '#0f172a' }}>
                      ${selectedHolding.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Spend Amount Input */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  gap: '8px',
                }}
              >
                <label
                  htmlFor={amountInputId}
                  style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}
                >
                  Amount to Reinvest (USD)
                </label>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {[
                    { label: '25%', frac: 0.25 },
                    { label: '50%', frac: 0.5 },
                    { label: '75%', frac: 0.75 },
                    { label: 'Max', frac: 1 },
                  ].map((pill) => (
                    <button
                      key={pill.label}
                      type="button"
                      disabled={liquidatedBalance <= 0}
                      onClick={() => handleQuickFill(pill.frac)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        color: '#334155',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: liquidatedBalance <= 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                >
                  $
                </span>
                <input
                  id={amountInputId}
                  ref={amountInputRef}
                  className="buyback-amount-input"
                  type="text"
                  inputMode="decimal"
                  required
                  value={amountInput}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onBlur={handleAmountBlur}
                  aria-invalid={Boolean(amountError)}
                  aria-describedby={amountError ? amountErrorId : undefined}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '11px 64px 11px 28px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    padding: '3px 7px',
                    borderRadius: '6px',
                    pointerEvents: 'none',
                  }}
                >
                  USD
                </span>
              </div>

              {amountError && (
                <p
                  id={amountErrorId}
                  style={{
                    margin: '6px 0 0',
                    fontSize: '12px',
                    color: '#dc2626',
                    fontWeight: 500,
                  }}
                >
                  {amountError}
                </p>
              )}
            </div>

            {/* Live Impact Summary */}
            <div
              style={{
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '13px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '12.5px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Shares Added ({selectedHolding?.ticker})</span>
                <strong style={{ color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>
                  +{estimatedShares.toLocaleString('en-US', { maximumFractionDigits: 4 })} shares
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Updated {selectedHolding?.ticker} Position</span>
                <span style={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {selectedHolding?.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}{' '}
                  <ArrowRight style={{ width: '11px', height: '11px', display: 'inline', verticalAlign: 'middle' }} />{' '}
                  {projectedNewPosition.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Remaining Liquid Cash</span>
                <span style={{ fontWeight: 600, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                  ${projectedRemainingCash.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div
                style={{
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '8px',
                  marginTop: '2px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600, color: '#0f172a' }}>New Total Revenue</span>
                <strong style={{ color: '#059669', fontSize: '13.5px', fontVariantNumeric: 'tabular-nums' }}>
                  ${projectedTotalRevenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '2px' }}>
              <button
                type="button"
                onClick={() => dialogRef.current?.close('cancel')}
                style={{
                  flex: '0 0 auto',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={liquidatedBalance <= 0}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: liquidatedBalance <= 0 ? '#94a3b8' : '#0f172a',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: liquidatedBalance <= 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                }}
              >
                <TrendingUp style={{ width: '15px', height: '15px' }} />
                <span>Buy Back Shares ({formattedSpendButton})</span>
              </button>
            </div>
          </form>
        )}

        {stage === 'processing' && (
          <div
            style={{
              padding: '38px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ModernButtonSpinner size={22} />
            </div>
            <div>
              <h3 id={titleId} style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                Allocating Reserves to {selectedHolding?.ticker}
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                Recording equity purchase and updating Total Revenue...
              </p>
            </div>
          </div>
        )}

        {stage === 'success' && completedBuyBack && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label="Close receipt"
              onClick={() => dialogRef.current?.close('done')}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check style={{ width: '11px', height: '11px', strokeWidth: 3 }} />
                </span>
                Share buyback completed
              </span>
            </div>

            <div
              id={titleId}
              style={{
                textAlign: 'center',
                fontSize: '28px',
                fontWeight: 800,
                color: '#10b981',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              +{completedBuyBack.sharesPurchased.toLocaleString('en-US', { maximumFractionDigits: 4 })}{' '}
              {completedBuyBack.ticker}
            </div>
            <p
              style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#64748b',
                margin: '4px 0 18px',
              }}
            >
              ${completedBuyBack.amountSpent.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              converted at ${completedBuyBack.sharePrice.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              /share
            </p>

            <div
              style={{
                borderTop: '1px solid #f1f5f9',
                borderBottom: '1px solid #f1f5f9',
                padding: '10px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '12.5px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b' }}>Equity</span>
                <span style={{ fontWeight: 700, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 style={{ width: '13px', height: '13px', color: '#2563eb' }} />
                  {completedBuyBack.companyName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b' }}>Capital Deployed</span>
                <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  ${completedBuyBack.amountSpent.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b' }}>Total Revenue</span>
                <strong style={{ color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                  ${completedBuyBack.newTotalRevenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b' }}>Reference</span>
                <code style={{ fontSize: '11.5px', color: '#334155', fontFamily: 'ui-monospace, monospace' }}>
                  #{completedBuyBack.id}
                </code>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dialogRef.current?.close('done')}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '11px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
