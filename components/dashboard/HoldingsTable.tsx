'use client';

import React, { useState } from 'react';
import { StockHolding } from '@/types';
import { ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { LiquidateModal } from './LiquidateModal';

interface HoldingsTableProps {
  holdings: StockHolding[];
  searchFilter: string;
  isLiveActive?: boolean;
  lastSynced?: string | null;
  marketStatus?: { status: string; label: string; lastTradeDate: string } | null;
}

export function HoldingsTable({
  holdings,
  searchFilter,
  isLiveActive,
  lastSynced,
  marketStatus,
}: HoldingsTableProps) {
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedHolding, setSelectedHolding] = useState<StockHolding | null>(null);

  // Filter holdings by search query and sector
  const filteredHoldings = holdings.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      h.ticker.toLowerCase().includes(searchFilter.toLowerCase()) ||
      h.sector.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesSector =
      selectedSector === 'ALL' || h.sector === selectedSector;

    return matchesSearch && matchesSector;
  });

  const sectors = ['ALL', ...Array.from(new Set(holdings.map((h) => h.sector)))];

  return (
    <div className="holdings-card">
      {/* Table Header */}
      <div className="holdings-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Company Shares & Market Watchlist
            </h3>
            <span
              style={{
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {filteredHoldings.length} Companies
            </span>
            {isLiveActive && (
              <>
                {/* Market status badge */}
                <span
                  style={{
                    backgroundColor: marketStatus?.status === 'open' ? '#e6f9f0' :
                                     marketStatus?.status === 'pre-market' || marketStatus?.status === 'after-hours' ? '#fef3c7' :
                                     '#f1f5f9',
                    color: marketStatus?.status === 'open' ? '#065f46' :
                           marketStatus?.status === 'pre-market' || marketStatus?.status === 'after-hours' ? '#92400e' :
                           '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '9999px',
                      backgroundColor: marketStatus?.status === 'open' ? '#10b981' :
                                       marketStatus?.status === 'pre-market' || marketStatus?.status === 'after-hours' ? '#f59e0b' :
                                       '#94a3b8',
                      display: 'inline-block',
                      animation: marketStatus?.status === 'open' ? 'pulse 2s infinite' : 'none',
                    }}
                  />
                  {marketStatus?.label || 'Connected'}
                </span>
                {/* Last synced timestamp */}
                {lastSynced && (
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                    Synced {lastSynced}
                  </span>
                )}
                {/* Show last trade date when market is closed */}
                {marketStatus && marketStatus.status !== 'open' && (
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                    • Last trade: {marketStatus.lastTradeDate}
                  </span>
                )}
              </>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', margin: 0 }}>
            Live market valuation and share distribution contributing to your $120.57M portfolio
          </p>
        </div>

        {/* Sector Quick Pills (Scrollable on small screens) */}
        <div className="sector-scroll-container">
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            <Filter style={{ width: '12px', height: '12px' }} /> Sector:
          </span>
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              style={{
                fontSize: '11px',
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedSector === sec ? '#0f172a' : '#f1f4f9',
                color: selectedSector === sec ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Keep the full table width inside its own swipeable viewport on mobile. */}
      <div className="holdings-table-scroll" role="region" aria-label="Company shares table" tabIndex={0}>
        <table className="holdings-table">
          <thead>
            <tr style={{ color: '#94a3b8', fontSize: '11px', borderBottom: '1px solid #f1f4f9', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <th style={{ padding: '12px 8px 12px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>Company / Ticker</th>
              <th style={{ padding: '12px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>Sector</th>
              <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Share Price</th>
              <th style={{ padding: '12px 0 12px 8px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>24h Change</th>
              <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Pre / Post Mkt</th>
              <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Shares Held</th>
              <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Total Value</th>
              <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Portfolio Weight</th>
              <th style={{ padding: '12px 0 12px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredHoldings.map((h) => {
              const isPositive = h.change >= 0;
              return (
                <tr
                  key={h.id}
                  className="table-row-hover"
                  onClick={() => setSelectedHolding(h)}
                  style={{ borderBottom: '1px solid #f8fafc', color: '#1e293b', cursor: 'pointer' }}
                >
                  {/* Company Ticker & Name */}
                  <td style={{ padding: '12px 8px 12px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          backgroundColor: h.logoBg,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {h.logoLetter}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a', lineHeight: '1.2' }}>
                          {h.ticker}
                        </strong>
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            display: 'block',
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: '1.2',
                            marginTop: '2px',
                          }}
                        >
                          {h.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Sector Badge */}
                  <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '3px 7px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        display: 'inline-block',
                      }}
                    >
                      {h.sector}
                    </span>
                  </td>

                  {/* Share Price */}
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    ${h.price.toFixed(2)}
                  </td>

                  {/* 24h Change */}
                  <td style={{ padding: '12px 0 12px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        backgroundColor: isPositive ? '#e6f9f0' : '#fee2e2',
                        color: isPositive ? '#10b981' : '#ef4444',
                        padding: '3px 7px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isPositive ? (
                        <ArrowUpRight style={{ width: '12px', height: '12px' }} />
                      ) : (
                        <ArrowDownRight style={{ width: '12px', height: '12px' }} />
                      )}
                      <span className="hidden md:inline">
                        {isPositive ? '+' : ''}{h.change.toFixed(2)}{' '}
                      </span>
                      <span>
                        ({isPositive ? '+' : ''}{h.changePercent.toFixed(2)}%)
                      </span>
                    </span>
                  </td>

                  {/* Pre/Post Market */}
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {h.prePostPrice !== undefined ? (
                      <div>
                        <span>${h.prePostPrice.toFixed(2)} </span>
                        <span style={{ color: (h.prePostChange || 0) >= 0 ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                          {(h.prePostChange || 0) >= 0 ? '+' : ''}
                          {(h.prePostChange || 0).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>No trades</span>
                    )}
                  </td>

                  {/* Position Shares */}
                  <td style={{ padding: '12px 10px', textAlign: 'right', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {h.shares.toLocaleString()}
                  </td>

                  {/* Total Value */}
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    ${h.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Portfolio Weight */}
                  <td style={{ padding: '12px 0 12px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '6px',
                          borderRadius: '9999px',
                          backgroundColor: '#f1f5f9',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(h.weight * 5, 100)}%`,
                            height: '100%',
                            backgroundColor: '#2563eb',
                            borderRadius: '9999px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155', minWidth: '40px' }}>
                        {h.weight}%
                      </span>
                    </div>
                  </td>

                  {/* Action: Liquidate */}
                  <td style={{ padding: '12px 0 12px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHolding(h);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fee2e2',
                        color: '#dc2626',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Liquidate
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredHoldings.length === 0 && (
          <div style={{ padding: '36px 0', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            <p style={{ margin: 0, fontWeight: 500 }}>
              No companies found matching &ldquo;{searchFilter}&rdquo;
            </p>
            {selectedSector !== 'ALL' && (
              <button
                onClick={() => setSelectedSector('ALL')}
                style={{
                  marginTop: '10px',
                  padding: '6px 14px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  borderRadius: '9999px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Show all sectors
              </button>
            )}
          </div>
        )}
      </div>

      {/* Share Liquidation Modal with Contract Lockout Pop-up */}
      <LiquidateModal
        holding={selectedHolding}
        isOpen={!!selectedHolding}
        onClose={() => setSelectedHolding(null)}
      />
    </div>
  );
}
