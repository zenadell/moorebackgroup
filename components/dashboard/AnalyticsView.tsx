'use client';

import React from 'react';
import { StockHolding } from '@/types';
import { TrendingUp, ShieldAlert, Zap, BarChart2 } from 'lucide-react';

interface AnalyticsViewProps {
  holdings: StockHolding[];
}

export function AnalyticsView({ holdings }: AnalyticsViewProps) {
  const topGainers = [...holdings].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
  const topPositions = [...holdings].sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Portfolio Analytics</h2>
          <p className="text-xs text-slate-500">Risk-weighted asset performance & exposure analysis</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Sharpe Ratio: 2.14 (High Efficiency)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600">
            <Zap className="h-4 w-4" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Top Daily Performers</h4>
          </div>
          <div className="mt-4 space-y-3">
            {topGainers.map((stock) => (
              <div key={stock.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{stock.ticker}</span>
                  <span className="text-slate-400 text-[11px] truncate max-w-[120px]">{stock.name}</span>
                </div>
                <span className={`font-semibold ${stock.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600">
            <BarChart2 className="h-4 w-4" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Largest Capital Allocations</h4>
          </div>
          <div className="mt-4 space-y-3">
            {topPositions.map((stock) => (
              <div key={stock.id} className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{stock.ticker}</span>
                <span className="font-bold text-slate-900">
                  ${(stock.totalValue / 1_000_000).toFixed(2)}M ({stock.weight}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-4 w-4" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Risk & Beta Metrics</h4>
          </div>
          <div className="mt-4 space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Portfolio Beta</span>
              <span className="font-bold text-slate-900">0.92 (Defensive)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Annualized Volatility</span>
              <span className="font-bold text-slate-900">14.2%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Value at Risk (95% 1-Day)</span>
              <span className="font-bold text-slate-900">-$1.42M</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Max Drawdown (1Y)</span>
              <span className="font-bold text-emerald-600">-6.8%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
