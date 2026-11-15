'use client';

import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { PortfolioSummary } from '@/types';

interface StatCardsProps {
  summary: PortfolioSummary;
  liquidatedBalance?: number;
  onOpenBuyBack?: () => void;
}

export function StatCards({ summary, liquidatedBalance = 0, onOpenBuyBack }: StatCardsProps) {
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [showFullLiquidated, setShowFullLiquidated] = useState(false);

  return (
    <div className="stat-cards-grid">
      {/* Card 1: live total value of the share portfolio */}
      <div className="kpi-card">
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', margin: 0 }}>
          Total Revenue
        </p>
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => setShowFullNumber(!showFullNumber)}
            title="Click to toggle full number"
            className="kpi-value"
            style={{
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'block',
              fontSize: showFullNumber ? '18px' : undefined,
            }}
          >
            {showFullNumber ? (
              <span>${summary.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            ) : (
              <span>${(summary.totalBalance / 1_000_000).toFixed(2)}M</span>
            )}
          </button>
        </div>
      </div>

      {/* Card 2: Liquidated Shares (Live Liquid Reserves) */}
      <div className="kpi-card">
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', margin: 0 }}>
          Liquidated Shares
        </p>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {liquidatedBalance > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setShowFullLiquidated(!showFullLiquidated)}
                className="kpi-value"
                style={{
                  fontWeight: 700,
                  color: '#10b981',
                  letterSpacing: '-0.02em',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'block',
                  fontSize: showFullLiquidated ? '18px' : undefined,
                }}
              >
                {showFullLiquidated ? (
                  <span>${liquidatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                ) : liquidatedBalance >= 1_000_000 ? (
                  <span>${(liquidatedBalance / 1_000_000).toFixed(2)}M</span>
                ) : (
                  <span>${liquidatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                )}
              </button>
              <span
                style={{
                  backgroundColor: '#e6f9f0',
                  color: '#065f46',
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Liquid USDT
              </span>
              {onOpenBuyBack && (
                <button
                  type="button"
                  onClick={onOpenBuyBack}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 9px',
                    borderRadius: '9999px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '2px',
                  }}
                >
                  <TrendingUp style={{ width: '11px', height: '11px' }} />
                  <span>Buy Back Shares</span>
                </button>
              )}
            </>
          ) : (
            <span className="kpi-value" style={{ fontWeight: 700, color: '#94a3b8', letterSpacing: '-0.02em' }}>
              $0.00
            </span>
          )}
        </div>
      </div>

      {/* Card 3: Monthly Growth (Matches Image 1: +12.4% / +12.4%) */}
      <div className="kpi-card">
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', margin: 0 }}>
          Monthly Growth
        </p>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="kpi-value" style={{ fontWeight: 700, color: '#10b981', letterSpacing: '-0.02em' }}>
            +12.4%
          </span>
          <span
            style={{
              backgroundColor: '#e6f9f0',
              color: '#10b981',
              padding: '2px 7px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            +12.4%
          </span>
        </div>
      </div>

      {/* Card 4: Conversion Rate (Matches Image 1: 4.8% / +1.20%) */}
      <div className="kpi-card">
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', margin: 0 }}>
          Conversion Rate
        </p>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="kpi-value" style={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            4.8%
          </span>
          <span
            style={{
              backgroundColor: '#e6f9f0',
              color: '#10b981',
              padding: '2px 7px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            +1.20%
          </span>
        </div>
      </div>
    </div>
  );
}
