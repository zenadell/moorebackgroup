'use client';

import React, { useState } from 'react';
import { StockHolding } from '@/types';
import { ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

interface HoldingsTableProps {
  holdings: StockHolding[];
  searchFilter: string;
}

export function HoldingsTable({
  holdings,
  searchFilter,
}: HoldingsTableProps) {
  const [selectedSector, setSelectedSector] = useState<string>('ALL');

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
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e9edf3',
        padding: '20px 24px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
      }}
    >
      {/* Table Header */}
      <div className="holdings-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

      {/* 17 Companies Table */}
      <div
        style={{
          marginTop: '12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <table style={{ width: '100%', minWidth: '820px', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ color: '#94a3b8', fontSize: '11px', borderBottom: '1px solid #f1f4f9', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <th style={{ padding: '12px 16px 12px 0', fontWeight: 600 }}>Company / Ticker</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Sector</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Share Price</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>24h Change</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Pre / Post Mkt</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Shares Held</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Total Value</th>
              <th style={{ padding: '12px 0 12px 16px', textAlign: 'right', fontWeight: 600 }}>Portfolio Weight</th>
            </tr>
          </thead>
          <tbody>
            {filteredHoldings.map((h) => {
              const isPositive = h.change >= 0;
              return (
                <tr
                  key={h.id}
                  style={{ borderBottom: '1px solid #f8fafc', color: '#1e293b' }}
                >
                  {/* Company Ticker & Name */}
                  <td style={{ padding: '14px 16px 14px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
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
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a' }}>
                          {h.ticker}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {h.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Sector */}
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                      }}
                    >
                      {h.sector}
                    </span>
                  </td>

                  {/* Share Price */}
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    ${h.price.toFixed(2)}
                  </td>

                  {/* 24h Change */}
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span
                      style={{
                        backgroundColor: isPositive ? '#e6f9f0' : '#fee2e2',
                        color: isPositive ? '#10b981' : '#ef4444',
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      {isPositive ? (
                        <ArrowUpRight style={{ width: '12px', height: '12px' }} />
                      ) : (
                        <ArrowDownRight style={{ width: '12px', height: '12px' }} />
                      )}
                      {isPositive ? '+' : ''}
                      {h.change.toFixed(2)} ({isPositive ? '+' : ''}
                      {h.changePercent.toFixed(2)}%)
                    </span>
                  </td>

                  {/* Pre/Post Market (as seen in TradingView screenshot) */}
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
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
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#475569', fontWeight: 500 }}>
                    {h.shares.toLocaleString()}
                  </td>

                  {/* Total Value */}
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    ${h.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Portfolio Weight */}
                  <td style={{ padding: '14px 0 14px 16px', textAlign: 'right' }}>
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
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredHoldings.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
            No companies found matching &ldquo;{searchFilter}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
