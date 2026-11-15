'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Building,
} from 'lucide-react';
import { StockHolding } from '@/types';
import { ModernTopBar, ModernButtonSpinner } from '@/components/ui/ModernLoader';

interface LiquidateModalProps {
  holding: StockHolding | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenWithdraw?: () => void;
  onLiquidationSuccess?: () => void;
}

export function LiquidateModal({
  holding,
  isOpen,
  onClose,
  onOpenWithdraw,
  onLiquidationSuccess,
}: LiquidateModalProps) {
  const [stage, setStage] = useState<'configure' | 'processing' | 'success'>('configure');
  const [processingStep, setProcessingStep] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'TRC20' | 'ERC20'>('TRC20');
  const [liquidationPercentage, setLiquidationPercentage] = useState<number>(100);
  const [sharesCustom, setSharesCustom] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liquidationResult, setLiquidationResult] = useState<{
    shares: number;
    payout: number;
    newLiquidatedBalance: number;
    id: string;
  } | null>(null);

  // Reset state when modal opens or holding changes
  useEffect(() => {
    if (isOpen && holding) {
      setStage('configure');
      setProcessingStep(0);
      setProcessingProgress(0);
      setLiquidationPercentage(100);
      setSharesCustom(holding.shares);
      setSelectedNetwork('TRC20');
      setErrorMsg(null);
      setLiquidationResult(null);
    }
  }, [isOpen, holding]);

  // Multi-step processing animation
  useEffect(() => {
    if (stage !== 'processing') return;

    const steps = [
      { delay: 0, progress: 15 },
      { delay: 600, progress: 35 },
      { delay: 1200, progress: 70 },
      { delay: 1800, progress: 95 },
      { delay: 2200, progress: 100 },
    ];

    const timers: NodeJS.Timeout[] = [];

    steps.forEach((step, idx) => {
      timers.push(setTimeout(() => {
        setProcessingStep(idx);
        setProcessingProgress(step.progress);
      }, step.delay));
    });

    // Move to success after animation
    timers.push(setTimeout(() => {
      setStage('success');
      setProcessingStep(0);
      setProcessingProgress(0);
    }, 2600));

    return () => timers.forEach(clearTimeout);
  }, [stage]);

  if (!isOpen || !holding) return null;

  const sharesToLiquidate = Math.max(
    1,
    Math.min(holding.shares, Math.round((holding.shares * liquidationPercentage) / 100))
  );
  const remainingShares = Math.max(0, holding.shares - sharesToLiquidate);
  const estimatedUsdtPayout = Number((sharesToLiquidate * holding.price).toFixed(2));

  const handlePercentageChange = (pct: number) => {
    setLiquidationPercentage(pct);
    setSharesCustom(Math.round((holding.shares * pct) / 100));
  };

  const handleConfirmLiquidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/holdings/liquidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: holding.ticker,
          companyName: holding.name,
          sharesLiquidated: sharesToLiquidate,
          sharePrice: holding.price,
          payoutAmount: estimatedUsdtPayout,
          currency: 'USDT',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to complete liquidation. Please retry.');
        setIsProcessing(false);
        return;
      }

      setLiquidationResult({
        shares: sharesToLiquidate,
        payout: data.record?.payoutAmount || estimatedUsdtPayout,
        newLiquidatedBalance: data.liquidatedBalance || estimatedUsdtPayout,
        id: data.record?.id || `LIQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      });

      if (onLiquidationSuccess) {
        onLiquidationSuccess();
      }

      setStage('processing');
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error executing liquidation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceedToWithdraw = () => {
    onClose();
    if (onOpenWithdraw) {
      onOpenWithdraw();
    }
  };

  const handleClose = () => {
    setIsProcessing(false);
    setStage('configure');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ModernTopBar active={isProcessing} />

        {/* ============================================================== */}
        {/* MODAL HEADER */}
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
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor:
                  stage === 'success' ? '#e6f9f0' : stage === 'processing' ? '#f0fdf4' : '#eff6ff',
                color:
                  stage === 'success' ? '#10b981' : stage === 'processing' ? '#16a34a' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {stage === 'success' ? (
                <CheckCircle2 style={{ width: '20px', height: '20px' }} />
              ) : stage === 'processing' ? (
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid #16a34a',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              ) : (
                <Coins style={{ width: '18px', height: '18px' }} />
              )}
            </div>
            <div>
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.2px',
                }}
              >
                {stage === 'success'
                  ? 'Asset Successfully Liquidated'
                  : stage === 'processing'
                  ? 'Executing Institutional Settlement'
                  : 'Liquidate Share Position'}
              </h2>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                {stage === 'processing'
                  ? 'Reconciling order book • Stand by'
                  : `${holding.ticker} • ${holding.name}`}
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close modal"
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
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* ============================================================== */}
        {/* MODAL BODY */}
        {/* ============================================================== */}
        <div
          style={{
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {stage === 'configure' && (
            /* ========================================================== */
            /* STAGE 1: CONFIGURE LIQUIDATION */
            /* ========================================================== */
            <form onSubmit={handleConfirmLiquidation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMsg && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#dc2626',
                    fontSize: '12px',
                  }}
                >
                  <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Holding Metadata Header Box */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: holding.logoBg,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    {holding.logoLetter}
                  </div>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                      {holding.ticker}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{holding.sector}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Live Share Price</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                    ${holding.price.toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Liquidation Percentage Quick Select */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Select Shares to Liquidate
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Total Held: <strong>{holding.shares.toLocaleString()}</strong>
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentageChange(pct)}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: liquidationPercentage === pct ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: liquidationPercentage === pct ? '#eff6ff' : '#ffffff',
                        color: liquidationPercentage === pct ? '#1d4ed8' : '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {pct === 100 ? '100% MAX' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settlement Rail Network */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Settlement Settlement Rail (USDT)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['TRC20', 'ERC20'] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setSelectedNetwork(net)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: selectedNetwork === net ? '2px solid #10b981' : '1px solid #cbd5e1',
                        backgroundColor: selectedNetwork === net ? '#e6f9f0' : '#ffffff',
                        color: selectedNetwork === net ? '#065f46' : '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>USDT ({net})</span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {net === 'TRC20' ? 'Instant Settlement' : 'Standard'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculation Summary Card */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Shares Liquidated:</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                    {sharesToLiquidate.toLocaleString()} Shares ({liquidationPercentage}%)
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Remaining Equity Position:</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                    {remainingShares.toLocaleString()} Shares
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #edf2f7', paddingTop: '10px' }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>Net Liquid Cash Payout:</span>
                  <strong style={{ color: '#10b981', fontSize: '15px' }}>
                    +${estimatedUsdtPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                  </strong>
                </div>
              </div>

              {/* Notice */}
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                * Liquidating this position converts the selected equity shares into your portfolio&apos;s liquid cash reserves. Once liquidated, you can immediately initiate a withdrawal to your external wallet.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
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
                  disabled={isProcessing}
                  style={{
                    flex: 2,
                    padding: '11px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                  }}
                >
                  {isProcessing ? (
                    <>
                      <ModernButtonSpinner />
                      <span>Executing Liquidation...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Liquidate Asset</span>
                      <ArrowRight style={{ width: '15px', height: '15px' }} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================== */}
          {/* STAGE 2: PROCESSING & SETTLEMENT ANIMATION */}
          {/* ========================================================== */}
          {stage === 'processing' && (
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
                    borderTopColor: '#10b981',
                    borderRightColor: '#34d399',
                    animation: 'spin 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: '8px',
                    borderRadius: '50%',
                    border: '2.5px solid #f8fafc',
                    borderBottomColor: '#2563eb',
                    borderLeftColor: '#60a5fa',
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
                  maxWidth: '360px',
                }}
              >
                {[
                  'Submitting block order to liquidity provider...',
                  'Reconciling equity custody & trading desk...',
                  'Executing institutional market trade...',
                  'Settling liquid USDT into portfolio reserves...',
                  'Finalizing cryptographic audit receipt...',
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
                        backgroundColor: isCurrent ? '#f0fdf4' : 'transparent',
                        border: isCurrent ? '1px solid #bbf7d0' : '1px solid transparent',
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
                            ? '2px solid #10b981'
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
                              backgroundColor: '#10b981',
                              animation: 'pulseGlow 1s infinite',
                            }}
                          />
                        ) : null}
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: isCurrent ? 600 : 400,
                          color: isCurrent ? '#166534' : isDone ? '#334155' : '#94a3b8',
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
              <div style={{ width: '100%', maxWidth: '360px' }}>
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
                      background: 'linear-gradient(90deg, #10b981, #2563eb)',
                      transition: 'width 0.4s ease-out',
                    }}
                  />
                </div>
              </div>

              <span style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                Institutional settlement in progress • Please do not navigate away
              </span>
            </div>
          )}

          {/* ========================================================== */}
          {/* STAGE 3: LIQUIDATION SUCCESS SCREEN (Direct to Withdraw) */}
          {/* ========================================================== */}
          {stage === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'center' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '18px',
                  backgroundColor: '#e6f9f0',
                  border: '1px solid #a7f3d0',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '8px auto 0',
                  boxShadow: '0 6px 16px rgba(16, 185, 129, 0.15)',
                }}
              >
                <CheckCircle2 style={{ width: '32px', height: '32px' }} />
              </div>

              <div>
                <span
                  style={{
                    backgroundColor: '#e6f9f0',
                    color: '#065f46',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'inline-block',
                    marginBottom: '8px',
                  }}
                >
                  Liquidation Confirmed
                </span>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 6px',
                  }}
                >
                  Asset Converted to Liquid Reserves
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#64748b',
                    lineHeight: 1.5,
                    margin: 0,
                    padding: '0 10px',
                  }}
                >
                  Your <strong>{liquidationResult?.shares.toLocaleString()}</strong> shares of <strong>{holding.name} ({holding.ticker})</strong> have been successfully liquidated and credited to your available cash balance.
                </p>
              </div>

              {/* Settlement Receipt Card */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Liquidated Capital Payout</span>
                  <strong style={{ color: '#10b981', fontSize: '15px' }}>
                    +${(liquidationResult?.payout || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Credited Account</span>
                  <strong style={{ color: '#0f172a' }}>Liquidated Cash Reserves</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Total Available to Withdraw</span>
                  <strong style={{ color: '#2563eb', fontSize: '13px' }}>
                    ${(liquidationResult?.newLiquidatedBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #edf2f7', paddingTop: '10px' }}>
                  <span style={{ color: '#64748b' }}>Settlement Ref</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', color: '#64748b' }}>
                    {liquidationResult?.id}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Proceed to Withdraw or Keep in Reserves */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleProceedToWithdraw}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Proceed to Withdraw Funds</span>
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Keep in Reserves & Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
