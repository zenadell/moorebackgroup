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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Total Balance / Total Revenue (Hard-locked $120.57 Million) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">Total Balance</p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
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
                <span className="text-2xl font-bold">
                  ${summary.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-3xl font-bold">
                  $120.57M
                </span>
              )}
            </button>
            <p className="mt-1 text-[11px] text-slate-400">
              {showFullNumber ? 'Click for compact view' : '$120,570,000.00 • Across 17 Assets'}
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Active Users / Holdings (Matches Image 1: 3,248 / +3.8%) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">Active Users</p>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <ArrowUpRight className="h-3 w-3" />
            +3.8%
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-bold tracking-tight text-slate-900">3,248</span>
            <p className="mt-1 text-[11px] text-slate-400">
              17 Verified corporate holdings
            </p>
          </div>
        </div>
      </div>

      {/* Card 3: Monthly Growth (Matches Image 1: +12.4% / +12.4%) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">Monthly Growth</p>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <ArrowUpRight className="h-3 w-3" />
            +12.4%
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-bold tracking-tight text-emerald-600">+12.4%</span>
            <p className="mt-1 text-[11px] text-slate-400">
              +$14.8M net asset appreciation
            </p>
          </div>
        </div>
      </div>

      {/* Card 4: Conversion Rate / Portfolio Yield (Matches Image 1: 4.8% / +1.20%) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">Conversion Rate</p>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <ArrowUpRight className="h-3 w-3" />
            +1.20%
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-bold tracking-tight text-slate-900">4.8%</span>
            <p className="mt-1 text-[11px] text-slate-400">
              Dividend yield & cashflow return
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
