'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Coins,
} from 'lucide-react';
import { StockHolding } from '@/types';
import { ModernTopBar, ModernButtonSpinner } from '@/components/ui/ModernLoader';

interface LiquidateModalProps {
  holding: StockHolding | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LiquidateModal({ holding, isOpen, onClose }: LiquidateModalProps) {
  const [stage, setStage] = useState<'configure' | 'locked'>('configure');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'TRC20' | 'ERC20'>('TRC20');
  const [liquidationPercentage, setLiquidationPercentage] = useState<number>(100);

  // Reset state when a new holding is selected or modal opens
  useEffect(() => {
    if (isOpen) {
      setStage('configure');
      setLiquidationPercentage(100);
      setSelectedNetwork('TRC20');
    }
  }, [isOpen, holding]);

  if (!isOpen || !holding) return null;

  const sharesToLiquidate = Math.max(
    1,
    Math.round((holding.shares * liquidationPercentage) / 100)
  );
  const estimatedUsdtPayout = Number(
    (sharesToLiquidate * holding.price).toFixed(2)
  );

  const handleAttemptLiquidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStage('locked');
    }, 650);
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
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
                backgroundColor: stage === 'locked' ? '#fee2e2' : '#eff6ff',
                color: stage === 'locked' ? '#dc2626' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {stage === 'locked' ? (
                <Lock style={{ width: '18px', height: '18px' }} />
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
                {stage === 'locked' ? 'Liquidation Restricted' : 'Liquidate Share Position'}
              </h2>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                {holding.ticker} • {holding.name}
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
          {stage === 'locked' ? (
            /* ========================================================== */
            /* POP-UP: CANNOT LIQUIDATE ASSET UNTIL END OF CONTRACT */
            /* ========================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '4px auto 0',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.12)',
                }}
              >
                <Lock style={{ width: '26px', height: '26px' }} />
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
                    letterSpacing: '0.6px',
                    display: 'inline-block',
                    marginBottom: '8px',
                  }}
                >
                  Contractual Custody Lock
                </span>
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 6px',
                    letterSpacing: '-0.3px',
                  }}
                >
                  Cannot Liquidate Asset Until End of Contract
                </h3>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    lineHeight: 1.55,
                    margin: 0,
                    padding: '0 8px',
                  }}
                >
                  Liquidation of <strong>{holding.name} ({holding.ticker})</strong> is restricted under institutional portfolio covenant <strong>#MO-88429</strong>. Equity holdings cannot be liquidated into USDT until the contract reaches its official maturity date.
                </p>
              </div>

              {/* Institutional Covenant Metadata Card */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '14px 16px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '9px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Restricted Asset</span>
                  <strong style={{ color: '#0f172a' }}>
                    {holding.ticker} • {holding.name}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Shares Locked</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: '#0f172a' }}>
                    {sharesToLiquidate.toLocaleString()} Shares
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Locked Valuation</span>
                  <strong style={{ color: '#dc2626' }}>
                    ${estimatedUsdtPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #edf2f7', paddingTop: '9px' }}>
                  <span style={{ color: '#64748b' }}>Custody Covenant</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', color: '#475569' }}>
                    COV-88429-CONTRACT-MATURITY
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Holding Status</span>
                  <span style={{ fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#dc2626', display: 'inline-block' }} />
                    Locked (Active Contract)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setStage('configure')}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Back to Shares
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                  }}
                >
                  Understood & Close
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================== */
            /* CONFIGURE LIQUIDATION IN USDT FORM */
            /* ========================================================== */
            <form onSubmit={handleAttemptLiquidation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Asset Highlight Card */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        backgroundColor: holding.logoBg,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {holding.logoLetter}
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                        {holding.ticker}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {holding.name} • {holding.exchange}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                      ${holding.price.toFixed(2)}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: holding.change >= 0 ? '#10b981' : '#ef4444',
                      }}
                    >
                      {holding.change >= 0 ? '+' : ''}{holding.change.toFixed(2)} ({holding.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '10px',
                    fontSize: '11px',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Shares Owned</span>
                    <strong style={{ color: '#0f172a' }}>{holding.shares.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Total Value</span>
                    <strong style={{ color: '#0f172a' }}>${holding.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Portfolio Weight</span>
                    <strong style={{ color: '#2563eb' }}>{holding.weight}%</strong>
                  </div>
                </div>
              </div>

              {/* Settlement Asset (USDT) */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Settlement Currency
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #10b981',
                    backgroundColor: '#ecfdf5',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '9999px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                      }}
                    >
                      ₮
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                        Tether USD (USDT)
                      </strong>
                      <span style={{ fontSize: '10px', color: '#059669' }}>
                        Fixed Peg: 1 USD = 1.00 USDT
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    OTC Direct
                  </span>
                </div>
              </div>

              {/* Network Chain Selection */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  USDT Settlement Network
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'TRC20' as const, name: 'Tron (TRC-20)', note: 'Recommended • Fast' },
                    { id: 'ERC20' as const, name: 'Ethereum (ERC-20)', note: 'EVM Standard' },
                  ].map((net) => {
                    const isSelected = selectedNetwork === net.id;
                    return (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => setSelectedNetwork(net.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <strong style={{ fontSize: '12px', color: isSelected ? '#1e3a8a' : '#0f172a', display: 'block' }}>
                          {net.name}
                        </strong>
                        <span style={{ fontSize: '10px', color: isSelected ? '#3b82f6' : '#64748b' }}>
                          {net.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Liquidation Percentage Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Liquidation Proportion
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
                    {sharesToLiquidate.toLocaleString()} / {holding.shares.toLocaleString()} Shares ({liquidationPercentage}%)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[25, 50, 75, 100].map((pct) => {
                    const isSelected = liquidationPercentage === pct;
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setLiquidationPercentage(pct)}
                        style={{
                          padding: '7px 0',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#0f172a' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#475569',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {pct === 100 ? 'All (100%)' : `${pct}%`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payout Summary Card */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Shares to Convert:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{sharesToLiquidate.toLocaleString()} {holding.ticker}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Price per Share:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>${holding.price.toFixed(2)} USD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Liquidity OTC Fee:</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>0.00 USDT (Waived)</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  <span>Estimated USDT Payout:</span>
                  <span style={{ color: '#059669' }}>
                    {estimatedUsdtPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px -2px rgba(220, 38, 38, 0.35)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {isProcessing ? (
                  <>
                    <ModernButtonSpinner size={16} />
                    <span>Verifying Smart Contract Covenant...</span>
                  </>
                ) : (
                  <>
                    <Coins style={{ width: '16px', height: '16px' }} />
                    <span>Liquidate Position to USDT</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
