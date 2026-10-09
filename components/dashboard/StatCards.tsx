'use client';

import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { PortfolioSummary } from '@/types';

interface StatCardsProps {
  summary: PortfolioSummary;
}

export function StatCards({ summary }: StatCardsProps) {
  const [showFullNumber, setShowFullNumber] = useState(false);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '16px',
      }}
    >
      {/* Card 1: Total Revenue / Total Balance (Hard-locked $120.57 Million) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e9edf3',
          padding: '18px 20px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
          Total Revenue
        </p>
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={() => setShowFullNumber(!showFullNumber)}
            title="Click to toggle full number"
            style={{
              fontSize: showFullNumber ? '22px' : '28px',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'block',
            }}
          >
            {showFullNumber ? (
              <span>${summary.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            ) : (
              <span>$120.57M</span>
            )}
          </button>
        </div>
      </div>

      {/* Card 2: Active Users (Matches Image 1: 3,248 / +3.8%) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e9edf3',
          padding: '18px 20px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
          Active Users
        </p>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            3,248
          </span>
          <span
            style={{
              backgroundColor: '#e6f9f0',
              color: '#10b981',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            +3.8%
          </span>
        </div>
      </div>

      {/* Card 3: Monthly Growth (Matches Image 1: +12.4% / +12.4%) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e9edf3',
          padding: '18px 20px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
          Monthly Growth
        </p>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', letterSpacing: '-0.02em' }}>
            +12.4%
          </span>
          <span
            style={{
              backgroundColor: '#e6f9f0',
              color: '#10b981',
              padding: '2px 8px',
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
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e9edf3',
          padding: '18px 20px',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
          Conversion Rate
        </p>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            4.8%
          </span>
          <span
            style={{
              backgroundColor: '#e6f9f0',
              color: '#10b981',
              padding: '2px 8px',
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
