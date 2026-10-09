'use client';

import React, { useState } from 'react';
import { StockHolding, Transaction } from '@/types';
import { ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

interface HoldingsTableProps {
  holdings: StockHolding[];
  transactions: Transaction[];
  searchFilter: string;
}

export function HoldingsTable({
  holdings,
  transactions,
  searchFilter,
}: HoldingsTableProps) {
  const [activeView, setActiveView] = useState<'transactions' | 'holdings'>('transactions');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');

  // Filter holdings
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
      {/* Table Header with Toggle matching Image 1 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f1f4f9',
          paddingBottom: '14px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
            {activeView === 'transactions' ? 'Recent transactions' : 'Portfolio Shares & Holdings'}
          </h3>
        </div>

        {/* User View Selector */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f4f9',
            borderRadius: '8px',
            padding: '3px',
            fontSize: '12px',
          }}
        >
          <button
            onClick={() => setActiveView('transactions')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontWeight: activeView === 'transactions' ? 600 : 500,
              backgroundColor: activeView === 'transactions' ? '#ffffff' : 'transparent',
              color: activeView === 'transactions' ? '#0f172a' : '#64748b',
              boxShadow: activeView === 'transactions' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Recent transactions
          </button>
          <button
            onClick={() => setActiveView('holdings')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontWeight: activeView === 'holdings' ? 600 : 500,
              backgroundColor: activeView === 'holdings' ? '#ffffff' : 'transparent',
              color: activeView === 'holdings' ? '#0f172a' : '#64748b',
              boxShadow: activeView === 'holdings' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Portfolio Shares (17)
          </button>
        </div>
      </div>

      {/* Sector Filter for Portfolio Shares View */}
      {activeView === 'holdings' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '12px', paddingBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter style={{ width: '12px', height: '12px' }} /> Sector:
          </span>
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              style={{
                fontSize: '11px',
                fontWeight: 500,
                padding: '3px 9px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedSector === sec ? '#0f172a' : '#f1f4f9',
                color: selectedSector === sec ? '#ffffff' : '#475569',
              }}
            >
              {sec}
            </button>
          ))}
        </div>
      )}

      {/* Table Content */}
      <div style={{ marginTop: '10px', overflowX: 'auto' }}>
        {activeView === 'transactions' ? (
          /* Exact Match to Image 1: Recent transactions */
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #f1f4f9' }}>
                <th style={{ padding: '12px 16px 12px 0', fontWeight: 500 }}>User</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Plan</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px 0 12px 16px', textAlign: 'right', fontWeight: 500 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  style={{ borderBottom: '1px solid #f8fafc', color: '#1e293b' }}
                >
                  <td style={{ padding: '14px 16px 14px 0', fontWeight: 500 }}>
                    {tx.userOrEntity}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    {tx.planOrAction}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                    {tx.formattedAmount}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        backgroundColor: tx.status === 'Completed' ? '#e6f9f0' : '#fef2f2',
                        color: tx.status === 'Completed' ? '#10b981' : '#ef4444',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'inline-block',
                      }}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 0 14px 16px', textAlign: 'right', color: '#64748b' }}>
                    {tx.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Portfolio Shares View with All 17 Companies */
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #f1f4f9' }}>
                <th style={{ padding: '12px 16px 12px 0', fontWeight: 500 }}>Company / Ticker</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Sector</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Share Price</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>24h Change</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Position Shares</th>
                <th style={{ padding: '12px 0 12px 16px', textAlign: 'right', fontWeight: 500 }}>Total Value</th>
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
                    <td style={{ padding: '12px 16px 12px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: h.logoBg,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {h.logoLetter}
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a' }}>{h.ticker}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{h.name}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        {h.sector}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                      ${h.price.toFixed(2)}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          backgroundColor: isPositive ? '#e6f9f0' : '#fee2e2',
                          color: isPositive ? '#10b981' : '#ef4444',
                          padding: '2px 8px',
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
                        {h.changePercent.toFixed(2)}%
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>
                      {h.shares.toLocaleString()}
                    </td>

                    <td style={{ padding: '12px 0 12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      ${h.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
