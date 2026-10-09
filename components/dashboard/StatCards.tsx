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
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}
    >
      {/* Card 1: Total Balance / Total Revenue (Hard-locked $120.57 Million) */}
      <div
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
        }}
      >
        <div className="flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="text-xs font-medium text-slate-500" style={{ fontSize: '12px', color: '#64748b' }}>Total Balance</p>
          <span
            className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
            style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600 }}
          >
            Target Locked
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <button
              onClick={() => setShowFullNumber(!showFullNumber)}
              className="text-left font-bold tracking-tight text-slate-900 transition-colors hover:text-blue-600 focus:outline-none"
              title="Click to toggle between $120.57M and full dollar value"
            >
              {showFullNumber ? (
                <span className="text-2xl font-bold" style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                  ${summary.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-3xl font-bold" style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
                  $120.57M
                </span>
              )}
            </button>
            <p className="mt-1 text-[11px] text-slate-400" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              {showFullNumber ? 'Click for compact view' : '$120,570,000.00 • Across 17 Assets'}
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Active Users / Holdings (Matches Image 1: 3,248 / +3.8%) */}
      <div
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
        }}
      >
        <div className="flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="text-xs font-medium text-slate-500" style={{ fontSize: '12px', color: '#64748b' }}>Active Users</p>
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
            style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
          >
            <ArrowUpRight className="h-3 w-3" style={{ width: '12px', height: '12px' }} />
            +3.8%
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-bold tracking-tight text-slate-900" style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
              3,248
            </span>
            <p className="mt-1 text-[11px] text-slate-400" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              17 Verified corporate holdings
            </p>
          </div>
        </div>
      </div>

      {/* Card 3: Monthly Growth (Matches Image 1: +12.4% / +12.4%) */}
      <div
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
        }}
      >
        <div className="flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="text-xs font-medium text-slate-500" style={{ fontSize: '12px', color: '#64748b' }}>Monthly Growth</p>
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
            style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
          >
            <ArrowUpRight className="h-3 w-3" style={{ width: '12px', height: '12px' }} />
            +12.4%
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-bold tracking-tight text-emerald-600" style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>
              +12.4%
            </span>
            <p className="mt-1 text-[11px] text-slate-400" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              +$14.8M net asset appreciation
            </p>
          </div>
        </div>
      </div>

      {/* Card 4: Conversion Rate / Portfolio Yield (Matches Image 1: 4.8% / +1.20%) */}
      <div
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
        }}
      >
        <div className="flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="text-xs font-medium text-slate-500" style={{ fontSize: '12px', color: '#64748b' }}>Conversion Rate</p>
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
            style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
          >
            <ArrowUpRight className="h-3 w-3" style={{ width: '12px', height: '12px' }} />
            +1.20%
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-bold tracking-tight text-slate-900" style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
              4.8%
            </span>
            <p className="mt-1 text-[11px] text-slate-400" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Dividend yield & cashflow return
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
